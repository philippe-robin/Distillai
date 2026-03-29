import { useState, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  accept?: string[];
  onDrop: (files: File[]) => void;
  maxSize?: number;
  multiple?: boolean;
  progress?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept = [],
  onDrop,
  maxSize,
  multiple = false,
  progress,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      setError(null);
      const valid: File[] = [];

      for (const file of files) {
        // Check extension
        if (accept.length > 0) {
          const ext = "." + file.name.split(".").pop()?.toLowerCase();
          if (!accept.includes(ext)) {
            setError(`Invalid file type: ${ext}. Accepted: ${accept.join(", ")}`);
            continue;
          }
        }
        // Check size
        if (maxSize && file.size > maxSize) {
          setError(
            `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max: ${(maxSize / 1024 / 1024).toFixed(0)} MB`,
          );
          continue;
        }
        valid.push(file);
      }

      return valid;
    },
    [accept, maxSize],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const valid = validateFiles(files);
      if (valid.length > 0) onDrop(valid);
    },
    [disabled, validateFiles, onDrop],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const valid = validateFiles(files);
      if (valid.length > 0) onDrop(valid);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [validateFiles, onDrop],
  );

  const showProgress = progress !== undefined && progress >= 0 && progress < 100;

  return (
    <div className={className}>
      <div
        className={clsx(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-150",
          isDragOver
            ? "border-accent bg-accent/10"
            : "border-border hover:border-text-secondary",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept.join(",")}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
        />

        <Upload
          size={32}
          className={clsx(
            "mb-3",
            isDragOver ? "text-accent" : "text-text-secondary",
          )}
        />

        <p className="text-sm font-medium text-text-primary">
          {isDragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="mt-1 text-xs text-text-secondary">
          or click to browse
        </p>

        {accept.length > 0 && (
          <p className="mt-2 text-xs text-text-secondary">
            Accepted: {accept.join(", ")}
          </p>
        )}

        {showProgress && (
          <div className="mt-4 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-primary">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {Math.round(progress)}%
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-error">{error}</p>
      )}
    </div>
  );
}
