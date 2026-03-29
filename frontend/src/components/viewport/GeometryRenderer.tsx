import { useMemo } from "react";
import * as THREE from "three";
import { useViewportStore } from "@/stores/viewportStore";

interface GeometryRendererProps {
  vertices: Float32Array;
  normals: Float32Array;
}

export function GeometryRenderer({
  vertices,
  normals,
}: GeometryRendererProps) {
  const { displayMode } = useViewportStore();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geo.computeBoundingSphere();
    return geo;
  }, [vertices, normals]);

  const showSolid =
    displayMode === "solid" || displayMode === "solid+wireframe";
  const showWireframe =
    displayMode === "wireframe" || displayMode === "solid+wireframe";

  return (
    <group>
      {showSolid && (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color="#6b8cc7"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      )}

      {showWireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color="#94a3b8"
            wireframe
            transparent
            opacity={showSolid ? 0.15 : 0.5}
          />
        </mesh>
      )}
    </group>
  );
}
