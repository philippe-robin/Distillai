import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Mesh } from "@/types/api";

interface MeshQualityProps {
  mesh: Mesh;
}

export function MeshQuality({ mesh }: MeshQualityProps) {
  // Convert histogram to chart data
  const histogramData = (mesh.quality_histogram ?? []).map((count, i) => ({
    range: `${(i * 0.1).toFixed(1)}-${((i + 1) * 0.1).toFixed(1)}`,
    count,
  }));

  return (
    <div className="space-y-3">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Elements" value={mesh.element_count?.toLocaleString() ?? "—"} />
        <StatCard label="Nodes" value={mesh.node_count?.toLocaleString() ?? "—"} />
        <StatCard
          label="Min Quality"
          value={mesh.min_quality?.toFixed(3) ?? "—"}
          color={mesh.min_quality != null && mesh.min_quality < 0.2 ? "text-error" : "text-success"}
        />
        <StatCard
          label="Avg Quality"
          value={mesh.avg_quality?.toFixed(3) ?? "—"}
          color={mesh.avg_quality != null && mesh.avg_quality < 0.5 ? "text-warning" : "text-success"}
        />
      </div>

      {/* Patches */}
      {(mesh.patches ?? []).length > 0 && (
        <div>
          <p className="mb-1 text-xs text-text-secondary">
            Patches ({(mesh.patches ?? []).length})
          </p>
          <div className="flex flex-wrap gap-1">
            {(mesh.patches ?? []).map((patch) => (
              <span
                key={patch}
                className="rounded bg-bg-primary px-2 py-0.5 text-xs text-text-secondary"
              >
                {patch}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quality histogram */}
      {histogramData.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-text-secondary">
            Element Quality Distribution
          </p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#2d3348" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#94a3b8" }}
                  axisLine={{ stroke: "#2d3348" }}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1d2e",
                    border: "1px solid #2d3348",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                  itemStyle={{ color: "#3b82f6" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-bg-primary p-2">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className={`text-sm font-semibold ${color ?? "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
