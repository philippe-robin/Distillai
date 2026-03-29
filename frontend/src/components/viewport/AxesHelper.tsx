import { Html } from "@react-three/drei";

interface AxesHelperProps {
  size?: number;
}

export function AxesHelper({ size = 2 }: AxesHelperProps) {
  return (
    <group>
      <axesHelper args={[size]} />

      {/* X label */}
      <Html position={[size + 0.2, 0, 0]} center>
        <span className="select-none text-[10px] font-bold text-red-500">
          X
        </span>
      </Html>

      {/* Y label */}
      <Html position={[0, size + 0.2, 0]} center>
        <span className="select-none text-[10px] font-bold text-green-500">
          Y
        </span>
      </Html>

      {/* Z label */}
      <Html position={[0, 0, size + 0.2]} center>
        <span className="select-none text-[10px] font-bold text-blue-500">
          Z
        </span>
      </Html>
    </group>
  );
}
