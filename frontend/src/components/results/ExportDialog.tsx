import { Image, FileSpreadsheet, FileCode, FileText } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const exportOptions = [
  {
    id: "png",
    label: "PNG Screenshot",
    description: "Export current viewport as image",
    icon: Image,
    available: true,
  },
  {
    id: "csv",
    label: "CSV Data",
    description: "Export field data as CSV",
    icon: FileSpreadsheet,
    available: true,
  },
  {
    id: "vtk",
    label: "VTK File",
    description: "Export for ParaView / VTK",
    icon: FileCode,
    available: true,
  },
  {
    id: "pdf",
    label: "PDF Report",
    description: "Generate simulation report",
    icon: FileText,
    available: false,
  },
];

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const handleExport = (type: string) => {
    switch (type) {
      case "png": {
        // Find the R3F canvas and export
        const canvas = document.querySelector("canvas");
        if (canvas) {
          const link = document.createElement("a");
          link.download = `alchemsim-export-${Date.now()}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
        onClose();
        break;
      }
      case "csv":
        // Stub: would fetch CSV data from API
        console.log("Export CSV - not yet implemented");
        onClose();
        break;
      case "vtk":
        // Stub: would fetch VTK file from API
        console.log("Export VTK - not yet implemented");
        onClose();
        break;
      default:
        break;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Results">
      <div className="space-y-2">
        {exportOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              onClick={() => opt.available && handleExport(opt.id)}
              disabled={!opt.available}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-bg-primary p-3 text-left transition-colors hover:border-accent/50 hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-bg-primary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
                <Icon size={20} className="text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {opt.label}
                </p>
                <p className="text-xs text-text-secondary">
                  {opt.description}
                  {!opt.available && " (coming soon)"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
