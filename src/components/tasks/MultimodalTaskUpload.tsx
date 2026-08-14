/**
 * Mixed-file drop zone: each file becomes its own task
 * (image / video / audio / pdf / text), typed by MIME + extension.
 */

import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  uploadTypedFilesAsSeparateTasks,
  formatDriveAuthError,
  detectUploadFileType,
  type DetectedFileType,
} from "@/lib/mediaUpload";

interface MultimodalTaskUploadProps {
  projectId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const LIMITS: Record<Exclude<DetectedFileType, "text">, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
};
const TXT_LIMIT = 2 * 1024 * 1024;

const TYPE_LABEL: Record<DetectedFileType, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  text: "Text",
};

type QueueItem = {
  id: string;
  file: File;
  type: DetectedFileType;
  progress?: number;
  error?: string;
};

let _id = 0;
function nextId() {
  _id += 1;
  return `f-${_id}-${Date.now()}`;
}

export function MultimodalTaskUpload({ projectId, onSuccess, onCancel }: MultimodalTaskUploadProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [doneSummary, setDoneSummary] = useState<string | null>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);

  const applyFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (!list.length) return;

    const nextNotices: string[] = [];
    const accepted: QueueItem[] = [];

    for (const file of list) {
      const type = detectUploadFileType(file);
      if (!type) {
        nextNotices.push(`${file.name}: unsupported type`);
        continue;
      }
      if (type === "text") {
        if (file.size > TXT_LIMIT) {
          nextNotices.push(`${file.name}: exceeds 2MB`);
          continue;
        }
      } else if (file.size > LIMITS[type]) {
        nextNotices.push(`${file.name}: exceeds ${type} size limit`);
        continue;
      }
      accepted.push({ id: nextId(), file, type });
    }

    if (!accepted.length) {
      setError(nextNotices.join("\n") || "No valid files");
      setNotices([]);
      return;
    }

    setError("");
    setNotices(nextNotices);
    setDoneSummary(null);
    setItems((prev) => [...prev, ...accepted]);
  }, []);

  const handleClear = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setNotices([]);
    setError("");
    setDoneSummary(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (uploading) return;
    applyFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!items.length) {
      setError("Drop at least one file");
      return;
    }

    setUploading(true);
    setError("");
    setDoneSummary(null);

    try {
      const results = await uploadTypedFilesAsSeparateTasks({
        projectId,
        items: items.map((i) => ({ file: i.file, mediaType: i.type })),
        concurrency: 3,
        onFileProgress: (file, percent) => {
          setItems((prev) =>
            prev.map((x) => (x.file === file ? { ...x, progress: percent } : x))
          );
        },
        onFileComplete: (result) => {
          if (!result.success) {
            setItems((prev) =>
              prev.map((x) =>
                x.file === result.file ? { ...x, error: result.error, progress: undefined } : x
              )
            );
          }
        },
      });

      const ok = results.filter((r) => r.success).length;
      const fail = results.length - ok;
      setDoneSummary(`Created ${ok} task(s)${fail ? `, ${fail} failed` : ""}`);

      if (ok > 0 && fail === 0) {
        onSuccess();
      } else if (ok > 0) {
        setItems((prev) => prev.filter((_, idx) => !results[idx]?.success));
      } else {
        setError(results.map((r) => r.error || "failed").join("\n"));
      }
    } catch (err: any) {
      setError(formatDriveAuthError(err?.message || "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Drop any mix of files — <strong>each file becomes its own task</strong>, typed by
        extension (image / video / audio / PDF / .txt).
      </p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && multiInputRef.current?.click()}
        className={`
          relative rounded-lg border-2 border-dashed px-4 py-10 text-center cursor-pointer transition-colors
          ${dragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"}
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <Upload className={`h-8 w-8 mx-auto mb-2 ${dragOver ? "text-indigo-600" : "text-gray-400"}`} />
        <p className="text-sm font-medium text-gray-800">
          {dragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          1 file = 1 task · click to browse
        </p>
        <input
          ref={multiInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,application/pdf,.pdf,.txt,text/plain"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) applyFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{items.length} file(s) → {items.length} task(s)</p>
            {!uploading && (
              <button type="button" className="text-xs text-gray-400 hover:text-gray-700 underline" onClick={handleClearAll}>
                Clear all
              </button>
            )}
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium text-indigo-600 mr-2">
                    {TYPE_LABEL[item.type]}
                  </span>
                  <span className="text-gray-700 truncate">{item.file.name}</span>
                  {typeof item.progress === "number" && uploading && (
                    <span className="text-xs text-indigo-600 ml-2">{item.progress}%</span>
                  )}
                  {item.error && (
                    <span className="text-xs text-red-500 ml-2">{item.error}</span>
                  )}
                </div>
                {!uploading && (
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear(item.id);
                    }}
                    aria-label={`Remove ${item.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notices.length > 0 && (
        <div className="text-sm text-amber-800 whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded-md p-3">
          {notices.join("\n")}
        </div>
      )}

      {doneSummary && (
        <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-md p-3">
          {doneSummary}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 whitespace-pre-wrap bg-red-50 border border-red-100 rounded-md p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleUpload} disabled={uploading || !items.length}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Layers className="h-4 w-4 mr-2" />
              Create {items.length || ""} Task{items.length === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
