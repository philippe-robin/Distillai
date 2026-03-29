"""OpenFOAM case directory generation and solver invocation."""

from __future__ import annotations

import logging
import re
import subprocess
import textwrap
from pathlib import Path
from typing import Any

import numpy as np

from app.models.simulation import Simulation, SimulationType

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Case directory generation
# ---------------------------------------------------------------------------

def generate_case_directory(
    simulation: Simulation,
    mesh_path: str | Path,
    output_dir: str | Path,
) -> Path:
    """Create a complete OpenFOAM case directory for the simulation.

    Parameters
    ----------
    simulation:
        The ORM Simulation with physics_config, solver_config, boundary_conditions.
    mesh_path:
        Path to the .msh file (Gmsh format) that will be converted to OpenFOAM.
    output_dir:
        Directory under which the case will be created.

    Returns
    -------
    Path to the case directory.
    """
    case_dir = Path(output_dir) / f"case_{simulation.id}"
    case_dir.mkdir(parents=True, exist_ok=True)

    physics = simulation.physics_config or {}
    solver = simulation.solver_config or {}
    bcs = simulation.boundary_conditions or []

    # system/
    system_dir = case_dir / "system"
    system_dir.mkdir(exist_ok=True)

    _write_control_dict(system_dir / "controlDict", simulation=simulation, solver_cfg=solver)
    _write_fv_schemes(system_dir / "fvSchemes", sim_type=simulation.sim_type)
    _write_fv_solution(system_dir / "fvSolution", solver_cfg=solver)

    # constant/
    constant_dir = case_dir / "constant"
    constant_dir.mkdir(exist_ok=True)

    fluid = physics.get("fluid", {})
    _write_transport_properties(constant_dir / "transportProperties", fluid=fluid)
    _write_turbulence_properties(
        constant_dir / "turbulenceProperties",
        turbulence_model=solver.get("turbulence_model", "kEpsilon"),
    )

    # 0/ (boundary conditions)
    zero_dir = case_dir / "0"
    zero_dir.mkdir(exist_ok=True)
    _write_boundary_conditions(zero_dir, bcs, physics)

    # polyMesh placeholder
    poly_dir = constant_dir / "polyMesh"
    poly_dir.mkdir(exist_ok=True)

    return case_dir


def _write_control_dict(path: Path, simulation: Simulation, solver_cfg: dict[str, Any]) -> None:
    n_iters = solver_cfg.get("n_iterations", 1000)
    write_interval = solver_cfg.get("write_interval", 100)

    if simulation.sim_type == SimulationType.cfd_steady:
        application = "simpleFoam"
        delta_t = "1"
    else:
        application = "pisoFoam"
        delta_t = "0.001"

    content = _header("controlDict") + textwrap.dedent(f"""\
        application     {application};
        startFrom       startTime;
        startTime       0;
        stopAt          endTime;
        endTime         {n_iters};
        deltaT          {delta_t};
        writeControl    timeStep;
        writeInterval   {write_interval};
        purgeWrite      3;
        writeFormat     ascii;
        writePrecision  8;
        writeCompression off;
        timeFormat      general;
        timePrecision   6;
        runTimeModifiable true;

        functions
        {{
            residuals
            {{
                type            residuals;
                functionObjectLibs ("libutilityFunctionObjects.so");
                writeControl    timeStep;
                writeInterval   1;
                fields (p U);
            }}
        }}
    """)
    path.write_text(content)


def _write_fv_schemes(path: Path, sim_type: SimulationType) -> None:
    ddt = "steadyState" if sim_type == SimulationType.cfd_steady else "Euler"
    content = _header("fvSchemes") + textwrap.dedent(f"""\
        ddtSchemes
        {{
            default         {ddt};
        }}

        gradSchemes
        {{
            default         Gauss linear;
            grad(p)         Gauss linear;
            grad(U)         cellLimited Gauss linear 1;
        }}

        divSchemes
        {{
            default         none;
            div(phi,U)      bounded Gauss linearUpwind grad(U);
            div(phi,k)      bounded Gauss upwind;
            div(phi,epsilon) bounded Gauss upwind;
            div(phi,omega)  bounded Gauss upwind;
            div((nuEff*dev2(T(grad(U))))) Gauss linear;
        }}

        laplacianSchemes
        {{
            default         Gauss linear corrected;
        }}

        interpolationSchemes
        {{
            default         linear;
        }}

        snGradSchemes
        {{
            default         corrected;
        }}
    """)
    path.write_text(content)


def _write_fv_solution(path: Path, solver_cfg: dict[str, Any]) -> None:
    convergence = solver_cfg.get("convergence_threshold", 1e-4)
    content = _header("fvSolution") + textwrap.dedent(f"""\
        solvers
        {{
            p
            {{
                solver          GAMG;
                smoother        GaussSeidel;
                tolerance       {convergence};
                relTol          0.1;
            }}

            "(U|k|epsilon|omega)"
            {{
                solver          smoothSolver;
                smoother        symGaussSeidel;
                tolerance       {convergence};
                relTol          0.1;
            }}
        }}

        SIMPLE
        {{
            nNonOrthogonalCorrectors 1;
            consistent      yes;

            residualControl
            {{
                p               {convergence};
                U               {convergence};
                "(k|epsilon|omega)" {convergence};
            }}
        }}

        relaxationFactors
        {{
            fields
            {{
                p               0.3;
            }}
            equations
            {{
                U               0.7;
                k               0.7;
                epsilon         0.7;
                omega           0.7;
            }}
        }}
    """)
    path.write_text(content)


def _write_transport_properties(path: Path, fluid: dict[str, Any]) -> None:
    density = fluid.get("density", 1.225)
    viscosity = fluid.get("viscosity", 1.789e-5)
    nu = viscosity / density if density > 0 else viscosity

    content = _header("transportProperties") + textwrap.dedent(f"""\
        transportModel  Newtonian;

        nu              [0 2 -1 0 0 0 0] {nu:.6e};
    """)
    path.write_text(content)


def _write_turbulence_properties(path: Path, turbulence_model: str) -> None:
    if turbulence_model == "laminar":
        content = _header("turbulenceProperties") + textwrap.dedent("""\
            simulationType  laminar;
        """)
    else:
        content = _header("turbulenceProperties") + textwrap.dedent(f"""\
            simulationType  RAS;

            RAS
            {{
                RASModel        {turbulence_model};
                turbulence      on;
                printCoeffs     on;
            }}
        """)
    path.write_text(content)


def _write_boundary_conditions(
    zero_dir: Path,
    bcs: list[dict[str, Any]],
    physics: dict[str, Any],
) -> None:
    by_field: dict[str, list[dict[str, Any]]] = {}
    for bc in bcs:
        field = bc.get("field", "U")
        by_field.setdefault(field, []).append(bc)

    if "p" not in by_field:
        by_field["p"] = [
            {"patch_name": "inlet", "type": "zeroGradient", "field": "p"},
            {"patch_name": "outlet", "type": "fixedValue", "field": "p", "value": 0},
            {"patch_name": "walls", "type": "zeroGradient", "field": "p"},
        ]
    if "U" not in by_field:
        by_field["U"] = [
            {"patch_name": "inlet", "type": "fixedValue", "field": "U", "value": [1.0, 0.0, 0.0]},
            {"patch_name": "outlet", "type": "zeroGradient", "field": "U"},
            {"patch_name": "walls", "type": "noSlip", "field": "U"},
        ]

    for field_name, field_bcs in by_field.items():
        _write_field_file(zero_dir / field_name, field_name, field_bcs)


def _write_field_file(path: Path, field_name: str, bcs: list[dict[str, Any]]) -> None:
    dimensions = _DIMENSIONS.get(field_name, "[0 0 0 0 0 0 0]")
    internal = _INTERNAL_DEFAULTS.get(field_name, "uniform 0")

    patches = ""
    for bc in bcs:
        patches += _format_patch(bc) + "\n"

    content = _header(field_name) + textwrap.dedent(f"""\
        dimensions      {dimensions};
        internalField   {internal};

        boundaryField
        {{
        {patches}}}
    """)
    path.write_text(content)


def _format_patch(bc: dict[str, Any]) -> str:
    name = bc.get("patch_name", "defaultPatch")
    bc_type = bc.get("type", "zeroGradient")
    value = bc.get("value")

    lines = [f"    {name}", "    {"]
    lines.append(f"        type            {bc_type};")

    if value is not None and bc_type not in ("zeroGradient", "noSlip"):
        if isinstance(value, list):
            val_str = f"uniform ({' '.join(str(v) for v in value)})"
        else:
            val_str = f"uniform {value}"
        lines.append(f"        value           {val_str};")

    lines.append("    }")
    return "\n".join(lines)


_DIMENSIONS = {
    "p": "[0 2 -2 0 0 0 0]",
    "U": "[0 1 -1 0 0 0 0]",
    "T": "[0 0 0 1 0 0 0]",
    "k": "[0 2 -2 0 0 0 0]",
    "epsilon": "[0 2 -3 0 0 0 0]",
    "omega": "[0 0 -1 0 0 0 0]",
    "nut": "[0 2 -1 0 0 0 0]",
}

_INTERNAL_DEFAULTS = {
    "p": "uniform 0",
    "U": "uniform (0 0 0)",
    "T": "uniform 300",
    "k": "uniform 0.1",
    "epsilon": "uniform 0.01",
    "omega": "uniform 1",
    "nut": "uniform 0",
}


# ---------------------------------------------------------------------------
# Solver execution
# ---------------------------------------------------------------------------

def run_solver(case_dir: str | Path, timeout: int = 3600) -> subprocess.CompletedProcess:
    """Run the OpenFOAM solver in the given case directory."""
    case_dir = Path(case_dir)
    control_dict = (case_dir / "system" / "controlDict").read_text()

    match = re.search(r"application\s+(\w+)\s*;", control_dict)
    app = match.group(1) if match else "simpleFoam"

    logger.info("Running %s in %s", app, case_dir)

    result = subprocess.run(
        [app, "-case", str(case_dir)],
        capture_output=True,
        text=True,
        timeout=timeout,
    )

    log_path = case_dir / f"{app}.log"
    log_path.write_text(result.stdout + "\n" + result.stderr)

    return result


# ---------------------------------------------------------------------------
# Residual parsing
# ---------------------------------------------------------------------------

def parse_residuals(log_path: str | Path) -> dict[str, list[float]]:
    """Parse OpenFOAM solver log and extract residual history."""
    log_path = Path(log_path)
    if not log_path.exists():
        return {}

    text = log_path.read_text()
    residuals: dict[str, list[float]] = {}

    pattern = re.compile(
        r"Solving for (\w+),\s+Initial residual\s*=\s*([\d.eE+-]+),\s*"
        r"Final residual\s*=\s*([\d.eE+-]+)"
    )

    for match in pattern.finditer(text):
        field = match.group(1)
        initial = float(match.group(2))
        residuals.setdefault(field, []).append(initial)

    return residuals


def get_convergence_data(case_dir: str | Path) -> dict[str, Any]:
    """Return structured convergence data for a completed or running case."""
    case_dir = Path(case_dir)

    log_files = list(case_dir.glob("*.log"))
    if not log_files:
        return {"residuals": {}, "iterations": 0, "converged": False}

    all_residuals: dict[str, list[float]] = {}
    for log_file in log_files:
        parsed = parse_residuals(log_file)
        for field, values in parsed.items():
            all_residuals.setdefault(field, []).extend(values)

    n_iterations = max((len(v) for v in all_residuals.values()), default=0)

    return {
        "residuals": all_residuals,
        "iterations": n_iterations,
        "converged": n_iterations > 0,
    }


def _header(name: str) -> str:
    return textwrap.dedent(f"""\
        FoamFile
        {{
            version     2.0;
            format      ascii;
            class       dictionary;
            object      {name};
        }}
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    """)
