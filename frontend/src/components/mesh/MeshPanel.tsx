import { Button } from "@/components/common/Button";
import { Grid3x3, Play } from "lucide-react";
import { MeshSettings } from "./MeshSettings";
import { MeshQuality } from "./MeshQuality";
import { useSimulationStore } from "@/stores/simulationStore";
import { useState } from "react";

export function MeshPanel() {
  const { mesh, isLoading, generateMesh } = useSimulationStore();
  const [elementSize, setElementSize] = useState(0.1);

  const handleGenerate = async () => {
    await generateMesh(elementSize);
  };

  return (
    <div className="flex flex-col">
      {/* Mesh settings */}
      <div className="panel-section">
        <h3 className="panel-section-title">Mesh Settings</h3>
        <MeshSettings
          elementSize={elementSize}
          onElementSizeChange={setElementSize}
        />
      </div>

      {/* Generate button */}
      <div className="panel-section">
        <Button
          variant="primary"
          size="md"
          icon={<Play size={14} />}
          onClick={handleGenerate}
          isLoading={isLoading}
          className="w-full"
        >
          {mesh ? "Regenerate Mesh" : "Generate Mesh"}
        </Button>
      </div>

      {/* Quality metrics (shown after generation) */}
      {mesh && (
        <div className="panel-section">
          <h3 className="panel-section-title">
            <Grid3x3 size={12} className="mr-1.5 inline" />
            Mesh Quality
          </h3>
          <MeshQuality mesh={mesh} />
        </div>
      )}
    </div>
  );
}
