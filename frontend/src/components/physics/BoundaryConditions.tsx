import type { BoundaryCondition, BoundaryConditionType } from "@/types/api";

interface BoundaryConditionsProps {
  conditions: BoundaryCondition[];
  onChange: (conditions: BoundaryCondition[]) => void;
}

const BC_TYPES: { value: BoundaryConditionType; label: string }[] = [
  { value: "inlet", label: "Inlet" },
  { value: "outlet", label: "Outlet" },
  { value: "wall", label: "Wall" },
  { value: "symmetry", label: "Symmetry" },
  { value: "farfield", label: "Far Field" },
];

export function BoundaryConditions({
  conditions,
  onChange,
}: BoundaryConditionsProps) {
  const updateCondition = (
    index: number,
    updates: Partial<BoundaryCondition>,
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index]!, ...updates };
    onChange(newConditions);
  };

  if (conditions.length === 0) {
    return (
      <p className="text-xs text-text-secondary italic">
        No mesh patches available. Generate mesh first.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {conditions.map((bc, index) => (
        <div
          key={bc.patch}
          className="rounded-lg border border-border bg-bg-primary p-3"
        >
          {/* Patch name */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              {bc.patch}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                bc.type === "inlet"
                  ? "bg-green-500/20 text-green-400"
                  : bc.type === "outlet"
                    ? "bg-blue-500/20 text-blue-400"
                    : bc.type === "wall"
                      ? "bg-gray-500/20 text-gray-400"
                      : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {bc.type}
            </span>
          </div>

          {/* BC type selector */}
          <select
            value={bc.type}
            onChange={(e) =>
              updateCondition(index, {
                type: e.target.value as BoundaryConditionType,
                // Reset type-specific fields
                velocity: undefined,
                flow_rate: undefined,
                pressure: undefined,
              })
            }
            className="input-field mb-2"
          >
            {BC_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Type-specific fields */}
          {bc.type === "inlet" && (
            <div className="space-y-2">
              <div>
                <label className="input-label">Velocity [m/s]</label>
                <div className="grid grid-cols-3 gap-1">
                  {["X", "Y", "Z"].map((axis, i) => (
                    <div key={axis} className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                        {axis}
                      </span>
                      <input
                        type="number"
                        step={0.1}
                        value={bc.velocity?.[i] ?? 0}
                        onChange={(e) => {
                          const vel: [number, number, number] = [
                            ...(bc.velocity ?? [0, 0, 0]),
                          ] as [number, number, number];
                          vel[i] = parseFloat(e.target.value) || 0;
                          updateCondition(index, { velocity: vel });
                        }}
                        className="input-field pl-6"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {bc.type === "outlet" && (
            <div>
              <label className="input-label">Pressure [Pa]</label>
              <input
                type="number"
                step={100}
                value={bc.pressure ?? 0}
                onChange={(e) =>
                  updateCondition(index, {
                    pressure: parseFloat(e.target.value) || 0,
                  })
                }
                className="input-field"
              />
            </div>
          )}

          {bc.type === "wall" && (
            <p className="text-xs text-text-secondary">
              No-slip condition (default)
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
