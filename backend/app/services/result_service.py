"""Result extraction and post-processing service."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

import numpy as np

from app.models.result import ResultField

logger = logging.getLogger(__name__)


def extract_results(
    case_dir: str | Path,
    simulation_id: str,
) -> list[dict[str, Any]]:
    """Scan an OpenFOAM case directory for result fields and return metadata.

    Returns a list of dicts suitable for creating Result ORM instances.
    """
    case_dir = Path(case_dir)
    results: list[dict[str, Any]] = []

    # Find time directories (numeric names > 0)
    time_dirs = []
    for entry in case_dir.iterdir():
        if entry.is_dir():
            try:
                t = float(entry.name)
                if t > 0:
                    time_dirs.append((t, entry))
            except ValueError:
                continue

    time_dirs.sort(key=lambda x: x[0])

    field_map = {
        "p": ResultField.p,
        "U": ResultField.U,
        "T": ResultField.T,
        "k": ResultField.k,
        "epsilon": ResultField.epsilon,
    }

    for time_val, time_dir in time_dirs:
        for of_field_name, result_field in field_map.items():
            field_path = time_dir / of_field_name
            if field_path.exists():
                min_val, max_val = _parse_field_range(field_path)
                time_step = int(time_val) if time_val == int(time_val) else None
                results.append({
                    "simulation_id": simulation_id,
                    "field": result_field,
                    "time_step": time_step,
                    "file_key": f"simulations/{simulation_id}/results/{of_field_name}_{int(time_val)}.vtk",
                    "min_value": min_val,
                    "max_value": max_val,
                })

    # Extract residuals
    residual_data = _extract_residual_data(case_dir)
    if residual_data:
        results.append({
            "simulation_id": simulation_id,
            "field": ResultField.residuals,
            "time_step": None,
            "file_key": f"simulations/{simulation_id}/results/residuals.json",
            "min_value": residual_data.get("min_residual"),
            "max_value": residual_data.get("max_residual"),
            "metadata_": residual_data,
        })

    return results


def _parse_field_range(field_path: Path) -> tuple[float | None, float | None]:
    """Parse an OpenFOAM field file to extract min and max values."""
    try:
        text = field_path.read_text(errors="ignore")

        uniform_match = re.search(r"internalField\s+uniform\s+([^;]+);", text)
        if uniform_match:
            val_str = uniform_match.group(1).strip()
            if val_str.startswith("("):
                nums = [float(x) for x in val_str.strip("()").split()]
                magnitude = float(np.linalg.norm(nums))
                return 0.0, magnitude
            return float(val_str), float(val_str)

        nonuniform_match = re.search(
            r"internalField\s+nonuniform\s+List<(\w+)>\s*\n\s*(\d+)\s*\n\s*\(",
            text,
        )
        if nonuniform_match:
            field_type = nonuniform_match.group(1)
            start = text.find("(", nonuniform_match.end() - 1) + 1
            end = text.find(")", start)
            values_text = text[start:end].strip()

            if field_type == "scalar":
                values = [float(v) for v in values_text.split() if v]
                if values:
                    return float(min(values)), float(max(values))
            elif field_type == "vector":
                magnitudes = []
                for m in re.finditer(r"\(([^)]+)\)", values_text):
                    nums = [float(x) for x in m.group(1).split()]
                    if len(nums) == 3:
                        magnitudes.append(float(np.linalg.norm(nums)))
                if magnitudes:
                    return float(min(magnitudes)), float(max(magnitudes))

    except Exception as exc:
        logger.warning("Failed to parse field file %s: %s", field_path, exc)

    return None, None


def _extract_residual_data(case_dir: Path) -> dict[str, Any] | None:
    """Extract residual data from solver logs."""
    from app.services.solver_service import parse_residuals

    log_files = list(case_dir.glob("*.log"))
    if not log_files:
        return None

    all_residuals: dict[str, list[float]] = {}
    for log_file in log_files:
        parsed = parse_residuals(log_file)
        for field, values in parsed.items():
            all_residuals.setdefault(field, []).extend(values)

    if not all_residuals:
        return None

    all_values = [v for vals in all_residuals.values() for v in vals]
    return {
        "fields": list(all_residuals.keys()),
        "iterations": max(len(v) for v in all_residuals.values()),
        "min_residual": float(min(all_values)) if all_values else None,
        "max_residual": float(max(all_values)) if all_values else None,
    }


def get_field_data_for_probe(
    case_dir: str | Path,
    point: list[float],
    field: str,
) -> float | list[float]:
    """Probe a single point value from results (stub)."""
    logger.info("Probing field %s at point %s in %s (stub)", field, point, case_dir)
    return 0.0


def get_field_data_for_line(
    case_dir: str | Path,
    start: list[float],
    end: list[float],
    field: str,
    n_points: int = 100,
) -> tuple[list[list[float]], list[float | list[float]]]:
    """Sample field values along a line (stub)."""
    logger.info(
        "Line probe for field %s from %s to %s (%d points) in %s (stub)",
        field, start, end, n_points, case_dir,
    )

    start_arr = np.array(start)
    end_arr = np.array(end)
    coordinates = []
    for i in range(n_points):
        t = i / max(n_points - 1, 1)
        pt = (start_arr + t * (end_arr - start_arr)).tolist()
        coordinates.append(pt)

    values: list[float | list[float]] = [0.0] * n_points
    return coordinates, values
