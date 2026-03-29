"""Geometry processing: metadata extraction, STEP->STL conversion, primitive generation."""

from __future__ import annotations

import io
import struct
import tempfile
from pathlib import Path
from typing import Any

import numpy as np

from app.models.geometry import GeometryFormat


def process_uploaded_geometry(data: bytes, fmt: GeometryFormat) -> dict[str, Any]:
    """Process uploaded geometry bytes and return metadata.

    Returns a dict with keys: bounding_box, face_count.
    """
    if fmt == GeometryFormat.stl:
        return _process_stl(data)
    elif fmt == GeometryFormat.step:
        return _process_step(data)
    return {}


def _process_stl(data: bytes) -> dict[str, Any]:
    """Extract bounding box and face count from an STL file (binary or ASCII)."""
    try:
        # Try binary STL first
        if len(data) < 84:
            return {}

        # Binary STL: 80 byte header + 4 byte triangle count
        n_triangles = struct.unpack_from("<I", data, 80)[0]
        expected_size = 84 + n_triangles * 50
        if abs(len(data) - expected_size) <= 1:
            # Binary STL
            vertices = []
            offset = 84
            for _ in range(n_triangles):
                # Skip normal (12 bytes), read 3 vertices (36 bytes), skip attr (2 bytes)
                offset += 12  # normal
                for _ in range(3):
                    x, y, z = struct.unpack_from("<fff", data, offset)
                    vertices.append((x, y, z))
                    offset += 12
                offset += 2  # attribute byte count

            if vertices:
                arr = np.array(vertices)
                mins = arr.min(axis=0).tolist()
                maxs = arr.max(axis=0).tolist()
                return {
                    "bounding_box": {
                        "min": {"x": mins[0], "y": mins[1], "z": mins[2]},
                        "max": {"x": maxs[0], "y": maxs[1], "z": maxs[2]},
                    },
                    "face_count": n_triangles,
                }
            return {"face_count": n_triangles}

        # Fallback: try ASCII STL
        return _process_stl_ascii(data)

    except Exception:
        return _process_stl_ascii(data)


def _process_stl_ascii(data: bytes) -> dict[str, Any]:
    """Parse an ASCII STL and extract metadata."""
    text = data.decode("utf-8", errors="ignore")
    vertices: list[tuple[float, float, float]] = []
    face_count = 0
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("vertex"):
            parts = stripped.split()
            if len(parts) >= 4:
                vertices.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif stripped.startswith("endfacet"):
            face_count += 1

    result: dict[str, Any] = {"face_count": face_count}
    if vertices:
        arr = np.array(vertices)
        mins = arr.min(axis=0).tolist()
        maxs = arr.max(axis=0).tolist()
        result["bounding_box"] = {
            "min": {"x": mins[0], "y": mins[1], "z": mins[2]},
            "max": {"x": maxs[0], "y": maxs[1], "z": maxs[2]},
        }
    return result


def _process_step(data: bytes) -> dict[str, Any]:
    """Convert a STEP file to STL using Gmsh to extract metadata."""
    try:
        import gmsh

        gmsh.initialize()
        gmsh.option.setNumber("General.Verbosity", 0)

        with tempfile.NamedTemporaryFile(suffix=".step", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        try:
            gmsh.open(tmp_path)
            gmsh.model.occ.synchronize()

            # Get bounding box
            bbox = gmsh.model.getBoundingBox(-1, -1)
            bounding_box = {
                "min": {"x": bbox[0], "y": bbox[1], "z": bbox[2]},
                "max": {"x": bbox[3], "y": bbox[4], "z": bbox[5]},
            }

            # Mesh to get face count (coarse mesh just for counting)
            gmsh.model.mesh.generate(2)
            _, _, node_tags_by_face = gmsh.model.mesh.getElements(2)
            face_count = sum(len(tags) // 3 for tags in node_tags_by_face)

            return {"bounding_box": bounding_box, "face_count": face_count}
        finally:
            Path(tmp_path).unlink(missing_ok=True)
            gmsh.finalize()

    except ImportError:
        return {}


def generate_primitive(prim_type: str, params: dict[str, Any]) -> dict[str, Any]:
    """Generate a primitive geometry using the Gmsh Python API.

    Returns a dict with keys: stl_data (bytes), bounding_box, face_count.
    """
    import gmsh

    gmsh.initialize()
    gmsh.option.setNumber("General.Verbosity", 0)

    try:
        if prim_type == "box":
            x = params.get("x", 0.0)
            y = params.get("y", 0.0)
            z = params.get("z", 0.0)
            dx = params.get("dx", 1.0)
            dy = params.get("dy", 1.0)
            dz = params.get("dz", 1.0)
            gmsh.model.occ.addBox(x, y, z, dx, dy, dz)

        elif prim_type == "cylinder":
            x = params.get("x", 0.0)
            y = params.get("y", 0.0)
            z = params.get("z", 0.0)
            dx = params.get("dx", 0.0)
            dy = params.get("dy", 0.0)
            dz = params.get("dz", 1.0)
            r = params.get("radius", 0.5)
            gmsh.model.occ.addCylinder(x, y, z, dx, dy, dz, r)

        elif prim_type == "sphere":
            x = params.get("x", 0.0)
            y = params.get("y", 0.0)
            z = params.get("z", 0.0)
            r = params.get("radius", 0.5)
            gmsh.model.occ.addSphere(x, y, z, r)

        elif prim_type == "tube":
            x = params.get("x", 0.0)
            y = params.get("y", 0.0)
            z = params.get("z", 0.0)
            dx = params.get("dx", 0.0)
            dy = params.get("dy", 0.0)
            dz = params.get("dz", 1.0)
            r_outer = params.get("outer_radius", 0.5)
            r_inner = params.get("inner_radius", 0.3)
            # Create tube as difference of two cylinders
            outer = gmsh.model.occ.addCylinder(x, y, z, dx, dy, dz, r_outer)
            inner = gmsh.model.occ.addCylinder(x, y, z, dx, dy, dz, r_inner)
            gmsh.model.occ.cut([(3, outer)], [(3, inner)])

        else:
            raise ValueError(f"Unknown primitive type: {prim_type}")

        gmsh.model.occ.synchronize()

        # Set mesh size
        mesh_size = params.get("mesh_size", 0.1)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", mesh_size)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", mesh_size * 0.5)

        # Generate surface mesh
        gmsh.model.mesh.generate(2)

        # Get bounding box
        bbox = gmsh.model.getBoundingBox(-1, -1)
        bounding_box = {
            "min": {"x": bbox[0], "y": bbox[1], "z": bbox[2]},
            "max": {"x": bbox[3], "y": bbox[4], "z": bbox[5]},
        }

        # Count faces
        _, _, node_tags_by_face = gmsh.model.mesh.getElements(2)
        face_count = sum(len(tags) // 3 for tags in node_tags_by_face)

        # Export to STL
        with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            gmsh.write(tmp_path)
            stl_data = Path(tmp_path).read_bytes()
        finally:
            Path(tmp_path).unlink(missing_ok=True)

        return {
            "stl_data": stl_data,
            "bounding_box": bounding_box,
            "face_count": face_count,
        }

    finally:
        gmsh.finalize()
