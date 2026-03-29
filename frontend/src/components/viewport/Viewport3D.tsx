import { Canvas } from "@react-three/fiber";
import { CameraControls } from "./CameraControls";
import { AxesHelper } from "./AxesHelper";
import { ViewportToolbar } from "./ViewportToolbar";
import { useViewportStore } from "@/stores/viewportStore";

interface Viewport3DProps {
  children?: React.ReactNode;
}

export function Viewport3D({ children }: Viewport3DProps) {
  const { showGrid, showAxes } = useViewportStore();

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Canvas must have explicit dimensions — use absolute positioning */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [3, 3, 3], fov: 50, near: 0.01, far: 1000 }}
          gl={{ antialias: true, alpha: false }}
          style={{ width: "100%", height: "100%" }}
          onCreated={({ gl }) => {
            gl.setClearColor("#0f1117");
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-3, 4, -3]} intensity={0.3} />

          {/* Helpers */}
          {showGrid && (
            <gridHelper
              args={[20, 20, "#2d3348", "#1a1d2e"]}
              position={[0, 0, 0]}
            />
          )}
          {showAxes && <AxesHelper size={2} />}

          {/* Camera controls */}
          <CameraControls />

          {/* Dynamic content */}
          {children}
        </Canvas>
      </div>

      {/* Floating toolbar */}
      <ViewportToolbar />
    </div>
  );
}
