/**
 * Color map lookup tables with 256 entries each.
 * Each entry is [r, g, b] in 0-1 range.
 */

type RGB = [number, number, number];

function interpolateColor(
  colors: RGB[],
  stops: number[],
  t: number,
): RGB {
  const clamped = Math.max(0, Math.min(1, t));

  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i]!;
    const end = stops[i + 1]!;
    if (clamped >= start && clamped <= end) {
      const frac = (clamped - start) / (end - start);
      const c0 = colors[i]!;
      const c1 = colors[i + 1]!;
      return [
        c0[0] + frac * (c1[0] - c0[0]),
        c0[1] + frac * (c1[1] - c0[1]),
        c0[2] + frac * (c1[2] - c0[2]),
      ];
    }
  }

  return colors[colors.length - 1]!;
}

function generateLUT(
  colors: RGB[],
  stops: number[],
  size: number = 256,
): RGB[] {
  const lut: RGB[] = [];
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    lut.push(interpolateColor(colors, stops, t));
  }
  return lut;
}

// Viridis color map key points
const viridisColors: RGB[] = [
  [0.267, 0.004, 0.329],
  [0.283, 0.141, 0.458],
  [0.254, 0.265, 0.530],
  [0.207, 0.372, 0.553],
  [0.164, 0.471, 0.558],
  [0.128, 0.567, 0.551],
  [0.135, 0.659, 0.518],
  [0.267, 0.749, 0.441],
  [0.478, 0.821, 0.318],
  [0.741, 0.873, 0.150],
  [0.993, 0.906, 0.144],
];
const viridisStops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

// Jet color map key points
const jetColors: RGB[] = [
  [0.0, 0.0, 0.5],
  [0.0, 0.0, 1.0],
  [0.0, 0.5, 1.0],
  [0.0, 1.0, 1.0],
  [0.5, 1.0, 0.5],
  [1.0, 1.0, 0.0],
  [1.0, 0.5, 0.0],
  [1.0, 0.0, 0.0],
  [0.5, 0.0, 0.0],
];
const jetStops = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0];

// Cool-warm (diverging) color map
const coolwarmColors: RGB[] = [
  [0.230, 0.299, 0.754],
  [0.552, 0.600, 0.880],
  [0.780, 0.780, 0.900],
  [0.865, 0.865, 0.865],
  [0.900, 0.780, 0.780],
  [0.880, 0.600, 0.552],
  [0.706, 0.016, 0.150],
];
const coolwarmStops = [0, 0.167, 0.333, 0.5, 0.667, 0.833, 1.0];

// Plasma color map key points
const plasmaColors: RGB[] = [
  [0.050, 0.030, 0.528],
  [0.294, 0.011, 0.631],
  [0.492, 0.012, 0.659],
  [0.658, 0.134, 0.588],
  [0.798, 0.280, 0.470],
  [0.899, 0.434, 0.340],
  [0.961, 0.598, 0.218],
  [0.978, 0.774, 0.135],
  [0.940, 0.975, 0.131],
];
const plasmaStops = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0];

// Pre-generated LUTs
const COLOR_MAPS: Record<string, RGB[]> = {
  viridis: generateLUT(viridisColors, viridisStops),
  jet: generateLUT(jetColors, jetStops),
  coolwarm: generateLUT(coolwarmColors, coolwarmStops),
  plasma: generateLUT(plasmaColors, plasmaStops),
};

/**
 * Map a scalar value to an RGB color using the specified color map.
 * Returns [r, g, b] in 0-1 range.
 */
export function mapValueToColor(
  value: number,
  min: number,
  max: number,
  colorMap: string = "viridis",
): RGB {
  const range = max - min;
  if (range === 0) {
    const lut = COLOR_MAPS[colorMap] ?? COLOR_MAPS["viridis"]!;
    return lut[128]!;
  }

  const normalized = Math.max(0, Math.min(1, (value - min) / range));
  const index = Math.round(normalized * 255);
  const lut = COLOR_MAPS[colorMap] ?? COLOR_MAPS["viridis"]!;
  return lut[index]!;
}

/**
 * Get a CSS gradient string for a color map (for use in legends).
 */
export function getColorMapGradient(colorMap: string = "viridis"): string {
  const lut = COLOR_MAPS[colorMap] ?? COLOR_MAPS["viridis"]!;
  const steps = 16;
  const colors: string[] = [];

  for (let i = 0; i < steps; i++) {
    const idx = Math.round((i / (steps - 1)) * 255);
    const [r, g, b] = lut[idx]!;
    colors.push(
      `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`,
    );
  }

  return `linear-gradient(to top, ${colors.join(", ")})`;
}

/**
 * Generate vertex colors from scalar data for a mesh.
 */
export function generateVertexColors(
  scalars: Float32Array,
  min: number,
  max: number,
  colorMap: string = "viridis",
): Float32Array {
  const colors = new Float32Array(scalars.length * 3);

  for (let i = 0; i < scalars.length; i++) {
    const [r, g, b] = mapValueToColor(scalars[i]!, min, max, colorMap);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

export const AVAILABLE_COLOR_MAPS = ["viridis", "jet", "coolwarm", "plasma"] as const;
