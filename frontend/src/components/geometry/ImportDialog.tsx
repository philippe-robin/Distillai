import { useState, useCallback } from "react";
import { FileBox, Upload } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { FileUpload } from "@/components/common/FileUpload";
import { useSimulationStore } from "@/stores/simulationStore";
import { ACCEPTED_GEOMETRY_FORMATS, MAX_UPLOAD_SIZE } from "@/lib/constants";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(
    undefined,
  );
  const { uploadGeometry, isLoading } = useSimulationStore();

  const handleDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setSelectedFile(files[0]);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploadProgress(0);

    // Simulate progress (real progress would come from axios onUploadProgress)
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p === undefined || p >= 90) {
          clearInterval(interval);
          return p;
        }
        return p + 10;
      });
    }, 200);

    try {
      await uploadGeometry(selectedFile);
      setUploadProgress(100);
      clearInterval(interval);
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(undefined);
        onClose();
      }, 500);
    } catch {
      clearInterval(interval);
      setUploadProgress(undefined);
    }
  }, [selectedFile, uploadGeometry, onClose]);

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setSelectedFile(null);
      setUploadProgress(undefined);
      onClose();
    }
  }, [isLoading, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Geometry">
      <div className="space-y-4">
        <FileUpload
          accept={ACCEPTED_GEOMETRY_FORMATS}
          maxSize={MAX_UPLOAD_SIZE}
          onDrop={handleDrop}
          progress={uploadProgress}
          disabled={isLoading}
        />

        {selectedFile && !isLoading && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-primary p-3">
            <FileBox size={20} className="text-accent" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {selectedFile.name}
              </p>
              <p className="text-xs text-text-secondary">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={14} />}
            onClick={handleUpload}
            disabled={!selectedFile}
            isLoading={isLoading}
          >
            Upload
          </Button>
        </div>
      </div>
    </Modal>
  );
}
