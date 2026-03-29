import { useMemo } from "react";
import * as THREE from "three";
import { useViewportStore } from "@/stores/viewportStore";
import { generateVertexColors } from "@/lib/colorMaps";
import { ColorMapLegend } from "../results/ColorMapLegend";

interface FieldRendererProps {
  vertices: Float32Array;
  normals: Float32Array;
  scalars: Float32Array;
  fieldName: string;
}

export function FieldRenderer({
  vertices,
  normals,
  scalars,
  fieldName,
}: FieldRendererProps) {
  const { colorMap, fieldRange } = useViewportStore();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));

    const colors = generateVertexColors(
      scalars,
      fieldRange.min,
      fieldRange.max,
      colorMap,
    );
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    geo.computeBoundingSphere();
    return geo;
  }, [vertices, normals, scalars, colorMap, fieldRange]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>

      <ColorMapLegend
        fieldName={fieldName}
        min={fieldRange.min}
        max={fieldRange.max}
        colorMap={colorMap}
      />
    </>
  );
}
