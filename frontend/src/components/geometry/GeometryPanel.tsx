import { useState } from "react";
import { Upload, Trash2, FileBox } from "lucide-react";
import { Button } from "@/components/common/Button";
import { FileUpload } from "@/components/common/FileUpload";
import { ImportDialog } from "./ImportDialog";
import { useSimulationStore } from "@/stores/simulationStore";
import { ACCEPTED_GEOMETRY_FORMATS, MAX_UPLOAD_SIZE } from "@/lib/constants";

export function GeometryPanel() {
  const [showImport, setShowImport] = useState(false);
  const { geometry, isLoading } = useSimulationStore();

  return (
    <div className="flex flex-col">
      {/* Upload section */}
      <div className="panel-section">
        <h3 className="panel-section-title">Import Geometry</h3>

        {!geometry ? (
          <>
            <FileUpload
              accept={ACCEPTED_GEOMETRY_FORMATS}
              maxSize={MAX_UPLOAD_SIZE}
              onDrop={(files) => {
                if (files[0]) {
                  setShowImport(true);
                }
              }}
              disabled={isLoading}
            />

            <div className="mt-3">
              <Button
                variant="primary"
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => setShowImport(true)}
                isLoading={isLoading}
                className="w-full"
              >
                Import File
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {/* Geometry info card */}
            <div className="rounded-lg border border-border bg-bg-primary p-3">
              <div className="mb-2 flex items-center gap-2">
                <FileBox size={16} className="text-accent" />
                <span className="text-sm font-medium text-text-primary">
                  {geometry.filename ?? "geometry"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-secondary">Format:</span>
                  <span className="ml-1 text-text-primary uppercase">
                    {geometry.format}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Size:</span>
                  <span className="ml-1 text-text-primary">
                    {geometry.file_size != null ? formatFileSize(geometry.file_size) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Faces:</span>
                  <span className="ml-1 text-text-primary">
                    {geometry.face_count?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Vertices:</span>
                  <span className="ml-1 text-text-primary">
                    {geometry.vertex_count?.toLocaleString() ?? "—"}
                  </span>
                </div>
              </div>

              {/* Bounding box */}
              {geometry.bounding_box && (
              <div className="mt-2 border-t border-border pt-2">
                <span className="text-xs text-text-secondary">
                  Bounding Box:
                </span>
                <div className="mt-1 grid grid-cols-3 gap-1 text-xs font-mono">
                  <div className="text-center">
                    <span className="text-red-400">X</span>
                    <div className="text-text-secondary">
                      {geometry.bounding_box.min[0]?.toFixed(3) ?? "—"}
                    </div>
                    <div className="text-text-primary">
                      {geometry.bounding_box.max[0]?.toFixed(3) ?? "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-green-400">Y</span>
                    <div className="text-text-secondary">
                      {geometry.bounding_box.min[1]?.toFixed(3) ?? "—"}
                    </div>
                    <div className="text-text-primary">
                      {geometry.bounding_box.max[1]?.toFixed(3) ?? "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-blue-400">Z</span>
                    <div className="text-text-secondary">
                      {geometry.bounding_box.min[2]?.toFixed(3) ?? "—"}
                    </div>
                    <div className="text-text-primary">
                      {geometry.bounding_box.max[2]?.toFixed(3) ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Upload size={14} />}
                onClick={() => setShowImport(true)}
                className="flex-1"
              >
                Replace
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => useSimulationStore.getState().setGeometry(null)}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImportDialog isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
