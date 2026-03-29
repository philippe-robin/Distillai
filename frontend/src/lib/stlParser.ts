export interface STLParseResult {
  vertices: Float32Array;
  normals: Float32Array;
  faceCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

/**
 * Detect whether an ArrayBuffer contains a binary or ASCII STL.
 * Binary STL: 80-byte header + 4-byte uint32 triangle count + triangles.
 * ASCII STL: starts with "solid" keyword (text).
 */
function isBinarySTL(buffer: ArrayBuffer): boolean {
  // Heuristic: if "solid" is at the start AND the file is very short or
  // the expected binary size doesn't match, treat as ASCII.
  const view = new DataView(buffer);
  const header = new Uint8Array(buffer, 0, Math.min(80, buffer.byteLength));

  // Check for "solid" at the beginning
  const solidStr = String.fromCharCode(...header.slice(0, 5));
  if (solidStr === "solid") {
    // Could still be binary with "solid" in header.
    // Check if expected binary size matches actual size.
    if (buffer.byteLength >= 84) {
      const numTriangles = view.getUint32(80, true);
      const expectedSize = 84 + numTriangles * 50;
      if (expectedSize === buffer.byteLength) {
        return true; // Binary STL that happens to start with "solid"
      }
    }
    return false; // ASCII
  }
  return true; // Binary
}

function parseBinarySTL(buffer: ArrayBuffer): STLParseResult {
  const view = new DataView(buffer);
  const faceCount = view.getUint32(80, true);

  const vertices = new Float32Array(faceCount * 9); // 3 vertices * 3 coords
  const normals = new Float32Array(faceCount * 9); // normal repeated per vertex

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  let offset = 84;

  for (let i = 0; i < faceCount; i++) {
    // Normal vector
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    // Three vertices
    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      offset += 12;

      const idx = i * 9 + v * 3;
      vertices[idx] = x;
      vertices[idx + 1] = y;
      vertices[idx + 2] = z;

      normals[idx] = nx;
      normals[idx + 1] = ny;
      normals[idx + 2] = nz;

      // Update bounding box
      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }

    // Attribute byte count (unused)
    offset += 2;
  }

  return { vertices, normals, faceCount, boundingBox: { min, max } };
}

function parseASCIISTL(text: string): STLParseResult {
  const lines = text.split("\n");
  const tempVertices: number[] = [];
  const tempNormals: number[] = [];
  let currentNormal: [number, number, number] = [0, 0, 0];

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("facet normal")) {
      const parts = line.split(/\s+/);
      currentNormal = [
        parseFloat(parts[2] ?? "0"),
        parseFloat(parts[3] ?? "0"),
        parseFloat(parts[4] ?? "0"),
      ];
    } else if (line.startsWith("vertex")) {
      const parts = line.split(/\s+/);
      const x = parseFloat(parts[1] ?? "0");
      const y = parseFloat(parts[2] ?? "0");
      const z = parseFloat(parts[3] ?? "0");

      tempVertices.push(x, y, z);
      tempNormals.push(...currentNormal);

      if (x < min[0]) min[0] = x;
      if (y < min[1]) min[1] = y;
      if (z < min[2]) min[2] = z;
      if (x > max[0]) max[0] = x;
      if (y > max[1]) max[1] = y;
      if (z > max[2]) max[2] = z;
    }
  }

  const faceCount = tempVertices.length / 9;

  return {
    vertices: new Float32Array(tempVertices),
    normals: new Float32Array(tempNormals),
    faceCount,
    boundingBox: { min, max },
  };
}

/**
 * Parse an STL file (binary or ASCII) from an ArrayBuffer.
 */
export function parseSTL(buffer: ArrayBuffer): STLParseResult {
  if (isBinarySTL(buffer)) {
    return parseBinarySTL(buffer);
  }
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(buffer);
  return parseASCIISTL(text);
}

/**
 * Parse an STL file from a File object.
 */
export async function parseSTLFile(file: File): Promise<STLParseResult> {
  const buffer = await file.arrayBuffer();
  return parseSTL(buffer);
}
