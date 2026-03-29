import { getColorMapGradient } from "@/lib/colorMaps";

interface ColorMapLegendProps {
  fieldName: string;
  min: number;
  max: number;
  colorMap: string;
}

export function ColorMapLegend({
  fieldName,
  min,
  max,
  colorMap,
}: ColorMapLegendProps) {
  const gradient = getColorMapGradient(colorMap);

  return (
    <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center">
      {/* Field name */}
      <span className="mb-2 text-[10px] font-medium text-text-primary">
        {fieldName}
      </span>

      {/* Max value */}
      <span className="mb-1 text-[10px] font-mono text-text-secondary">
        {max.toFixed(2)}
      </span>

      {/* Gradient bar */}
      <div
        className="h-40 w-4 rounded-sm border border-border"
        style={{ background: gradient }}
      />

      {/* Min value */}
      <span className="mt-1 text-[10px] font-mono text-text-secondary">
        {min.toFixed(2)}
      </span>
    </div>
  );
}
