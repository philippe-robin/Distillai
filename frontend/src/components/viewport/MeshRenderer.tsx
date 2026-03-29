import { useMemo } from "react";
import * as THREE from "three";
import { useViewportStore } from "@/stores/viewportStore";

interface MeshRendererProps {
  vertices: Float32Array;
  edges?: Uint32Array;
}

export function MeshRenderer({ vertices, edges }: MeshRendererProps) {
  const showMesh = useViewportStore((s) => s.showMesh);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    if (edges && edges.length > 0) {
      // Use edge indices to build line segments
      const positions = new Float32Array(edges.length * 3);
      for (let i = 0; i < edges.length; i++) {
        const vertIdx = edges[i]!;
        positions[i * 3] = vertices[vertIdx * 3]!;
        positions[i * 3 + 1] = vertices[vertIdx * 3 + 1]!;
        positions[i * 3 + 2] = vertices[vertIdx * 3 + 2]!;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    } else {
      // Fall back to rendering all triangle edges as wireframe
      geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    }

    geo.computeBoundingSphere();
    return geo;
  }, [vertices, edges]);

  if (!showMesh) return null;

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.4}
        linewidth={1}
      />
    </lineSegments>
  );
}
