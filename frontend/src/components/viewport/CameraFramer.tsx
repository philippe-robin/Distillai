import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraFramerProps {
  vertices: Float32Array | null;
}

/**
 * Auto-frames the camera to fit the given geometry vertices.
 * Runs once when vertices change from null to non-null.
 */
export function CameraFramer({ vertices }: CameraFramerProps) {
  const { camera, controls } = useThree();
  const hasFramed = useRef(false);

  useEffect(() => {
    if (!vertices || vertices.length === 0) {
      hasFramed.current = false;
      return;
    }

    // Only auto-frame once per geometry load
    if (hasFramed.current) return;
    hasFramed.current = true;

    // Compute bounding box
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    for (let i = 0; i < vertices.length; i += 3) {
      v.set(vertices[i]!, vertices[i + 1]!, vertices[i + 2]!);
      box.expandByPoint(v);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;

    // Position camera looking at center from a diagonal angle
    camera.position.set(
      center.x + distance * 0.6,
      center.y + distance * 0.5,
      center.z + distance * 0.6,
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    // Update orbit controls target
    const orbitControls = controls as unknown as { target: THREE.Vector3; update: () => void };
    if (orbitControls?.target) {
      orbitControls.target.copy(center);
      orbitControls.update();
    }
  }, [vertices, camera, controls]);

  return null;
}
