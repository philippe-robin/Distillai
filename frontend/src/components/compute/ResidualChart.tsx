import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ResidualData } from "@/types/api";

interface ResidualChartProps {
  data: ResidualData[];
}

const RESIDUAL_COLORS = {
  pressure: "#3b82f6",
  Ux: "#ef4444",
  Uy: "#22c55e",
  Uz: "#eab308",
};

export function ResidualChart({ data }: ResidualChartProps) {
  // Transform data for log scale (replace 0 or negative with small value)
  const chartData = data.map((d) => ({
    ...d,
    pressure: Math.max(d.pressure, 1e-15),
    Ux: Math.max(d.Ux, 1e-15),
    Uy: Math.max(d.Uy, 1e-15),
    Uz: Math.max(d.Uz, 1e-15),
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <XAxis
            dataKey="iteration"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={{ stroke: "#2d3348" }}
            tickLine={false}
            label={{
              value: "Iteration",
              position: "insideBottomRight",
              offset: -5,
              style: { fontSize: 9, fill: "#94a3b8" },
            }}
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            axisLine={{ stroke: "#2d3348" }}
            tickLine={false}
            tickFormatter={(value: number) => value.toExponential(0)}
            width={45}
            label={{
              value: "Residual",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 9, fill: "#94a3b8" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1d2e",
              border: "1px solid #2d3348",
              borderRadius: "6px",
              fontSize: "11px",
            }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value: number) => value.toExponential(3)}
          />
          <Legend
            wrapperStyle={{ fontSize: "10px" }}
            iconType="line"
          />
          {Object.entries(RESIDUAL_COLORS).map(([key, color]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
