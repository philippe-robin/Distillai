"""Mesh generation service wrapping Gmsh Python API."""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class MeshResult:
    """Container for mesh generation output."""

    def __init__(
        self,
        mesh_data: bytes,
        node_count: int,
        element_count: int,
        min_quality: float,
        avg_quality: float,
        quality_histogram: dict[str, int] | None = None,
    ) -> None:
        self.mesh_data = mesh_data
        self.node_count = node_count
        self.element_count = element_count
        self.min_quality = min_quality
        self.avg_quality = avg_quality
        self.quality_histogram = quality_histogram or {}


def generate_mesh(
    geometry_path: str | Path,
    element_size: float = 0.1,
    refinement_zones: list[dict[str, Any]] | None = None,
) -> MeshResult:
    """Generate a volume mesh from a geometry file using Gmsh.

    Parameters
    ----------
    geometry_path:
        Path to an STL or STEP file on disk.
    element_size:
        Global characteristic length for the mesh elements.
    refinement_zones:
        Optional list of refinement zone dicts (type, center, size/radius, element_size).

    Returns
    -------
    MeshResult with the mesh binary data and quality metrics.
    """
    try:
        import gmsh
    except ImportError:
        logger.warning("Gmsh not available - returning synthetic mesh result")
        return _synthetic_mesh_result()

    gmsh.initialize()
    gmsh.option.setNumber("General.Verbosity", 0)

    try:
        geo_path = str(geometry_path)
        gmsh.open(geo_path)

        # Synchronise if needed (STEP/OCC files)
        ext = geo_path.rsplit(".", 1)[-1].lower()
        if ext in ("step", "stp"):
            gmsh.model.occ.synchronize()

        # Global mesh size
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", element_size)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", element_size * 0.3)

        # Apply refinement zones via distance fields
        if refinement_zones:
            _apply_refinement_zones(gmsh, refinement_zones)

        # Improve mesh quality settings
        gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)
        gmsh.option.setNumber("Mesh.Algorithm3D", 1)  # Delaunay

        # Generate 3D mesh
        gmsh.model.mesh.generate(3)

        # Optimise
        gmsh.model.mesh.optimize("Netgen")

        # Extract quality metrics
        node_count, element_count, min_quality, avg_quality, histogram = _compute_quality(gmsh)

        # Export to MSH format
        with tempfile.NamedTemporaryFile(suffix=".msh", delete=False) as tmp:
            out_path = tmp.name
        try:
            gmsh.write(out_path)
            mesh_data = Path(out_path).read_bytes()
        finally:
            Path(out_path).unlink(missing_ok=True)

        return MeshResult(
            mesh_data=mesh_data,
            node_count=node_count,
            element_count=element_count,
            min_quality=min_quality,
            avg_quality=avg_quality,
            quality_histogram=histogram,
        )

    finally:
        gmsh.finalize()


def _apply_refinement_zones(gmsh_module: Any, zones: list[dict[str, Any]]) -> None:
    """Create Gmsh mesh size fields for each refinement zone."""
    field_ids: list[int] = []
    for zone in zones:
        zone_type = zone.get("type", "box")
        zone_size = zone.get("element_size", 0.05)

        if zone_type == "box":
            center = zone.get("center", [0.0, 0.0, 0.0])
            size = zone.get("size", [0.5, 0.5, 0.5])
            fid = gmsh_module.model.mesh.field.add("Box")
            gmsh_module.model.mesh.field.setNumber(fid, "VIn", zone_size)
            gmsh_module.model.mesh.field.setNumber(fid, "VOut", zone_size * 5)
            gmsh_module.model.mesh.field.setNumber(fid, "XMin", center[0] - size[0] / 2)
            gmsh_module.model.mesh.field.setNumber(fid, "XMax", center[0] + size[0] / 2)
            gmsh_module.model.mesh.field.setNumber(fid, "YMin", center[1] - size[1] / 2)
            gmsh_module.model.mesh.field.setNumber(fid, "YMax", center[1] + size[1] / 2)
            gmsh_module.model.mesh.field.setNumber(fid, "ZMin", center[2] - size[2] / 2)
            gmsh_module.model.mesh.field.setNumber(fid, "ZMax", center[2] + size[2] / 2)
            field_ids.append(fid)

        elif zone_type == "sphere":
            center = zone.get("center", [0.0, 0.0, 0.0])
            radius = zone.get("radius", 0.25)
            fid = gmsh_module.model.mesh.field.add("Ball")
            gmsh_module.model.mesh.field.setNumber(fid, "VIn", zone_size)
            gmsh_module.model.mesh.field.setNumber(fid, "VOut", zone_size * 5)
            gmsh_module.model.mesh.field.setNumber(fid, "XCenter", center[0])
            gmsh_module.model.mesh.field.setNumber(fid, "YCenter", center[1])
            gmsh_module.model.mesh.field.setNumber(fid, "ZCenter", center[2])
            gmsh_module.model.mesh.field.setNumber(fid, "Radius", radius)
            field_ids.append(fid)

    if field_ids:
        min_fid = gmsh_module.model.mesh.field.add("Min")
        gmsh_module.model.mesh.field.setNumbers(min_fid, "FieldsList", field_ids)
        gmsh_module.model.mesh.field.setAsBackgroundMesh(min_fid)


def _compute_quality(gmsh_module: Any) -> tuple[int, int, float, float, dict[str, int]]:
    """Extract mesh quality metrics from the current Gmsh model.

    Returns (node_count, element_count, min_quality, avg_quality, quality_histogram).
    """
    node_tags, _, _ = gmsh_module.model.mesh.getNodes()
    node_count = len(node_tags)

    elem_types, elem_tags, _ = gmsh_module.model.mesh.getElements(3)
    element_count = sum(len(tags) for tags in elem_tags)

    qualities = []
    for et, tags in zip(elem_types, elem_tags):
        q = gmsh_module.model.mesh.getElementQualities(tags.tolist(), "sicn")
        qualities.extend(q)

    if qualities:
        q_arr = np.array(qualities)
        min_quality = float(np.min(q_arr))
        avg_quality = float(np.mean(q_arr))

        histogram: dict[str, int] = {}
        for i in range(10):
            low = i * 0.1
            high = (i + 1) * 0.1
            count = int(np.sum((q_arr >= low) & (q_arr < high)))
            histogram[f"{low:.1f}-{high:.1f}"] = count
    else:
        min_quality = 0.0
        avg_quality = 0.0
        histogram = {}

    return node_count, element_count, min_quality, avg_quality, histogram


def _synthetic_mesh_result() -> MeshResult:
    """Return a placeholder MeshResult when Gmsh is unavailable."""
    return MeshResult(
        mesh_data=b"",
        node_count=0,
        element_count=0,
        min_quality=0.0,
        avg_quality=0.0,
        quality_histogram={},
    )


def export_surface_stl(mesh_path: str | Path) -> bytes:
    """Re-export the surface mesh as STL for 3D preview."""
    try:
        import gmsh
    except ImportError:
        return b""

    gmsh.initialize()
    gmsh.option.setNumber("General.Verbosity", 0)

    try:
        gmsh.open(str(mesh_path))

        with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp:
            out_path = tmp.name
        try:
            gmsh.write(out_path)
            return Path(out_path).read_bytes()
        finally:
            Path(out_path).unlink(missing_ok=True)
    finally:
        gmsh.finalize()
