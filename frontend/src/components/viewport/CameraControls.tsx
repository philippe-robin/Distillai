import { OrbitControls } from "@react-three/drei";

export function CameraControls() {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.15}
      rotateSpeed={0.8}
      zoomSpeed={1.0}
      panSpeed={0.8}
      minDistance={0.1}
      maxDistance={500}
    />
  );
}
