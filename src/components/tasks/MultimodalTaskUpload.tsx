/**
 * MultimodalTaskUpload — one task with up to one image + one video + one audio (+ optional text).
 */

import { useState } from "react";
import { Upload, Image as ImageIcon, Video, Music, Loader2, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  uploadMultimodalTask,
  formatDriveAuthError,
  type MediaType,
} from "@/lib/mediaUpload";

interface MultimodalTaskUploadProps {
  projectId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const LIMITS: Record<MediaType, number> = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
};

const SLOT_META: Array<{
  type: MediaType;
  label: string;
  accept: string;
  hint: string;
  icon: typeof ImageIcon;
}> = [
  { type: "image", label: "Image", accept: "image/*", hint: "PNG, JPG, GIF, WebP ≤ 10MB", icon: ImageIcon },
  { type: "video", label: "Video", accept: "video/*", hint: "MP4, WebM ≤ 100MB", icon: Video },
  { type: "audio", label: "Audio", accept: "audio/*", hint: "MP3, WAV, M4A ≤ 50MB", icon: Music },
];

export function MultimodalTaskUpload({ projectId, onSuccess, onCancel }: MultimodalTaskUploadProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Partial<Record<MediaType, File>>>({});
  const [progress, setProgress] = useState<Partial<Record<MediaType, number>>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const selectedCount = Object.keys(files).length;

  const handlePick = (type: MediaType, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setError("");

    const prefix =
      type === "image" ? "image/" : type === "video" ? "video/" : "audio/";
    if (!file.type.startsWith(prefix)) {
      setError(`${file.name}: not a valid ${type} file`);
      return;
    }
    if (file.size > LIMITS[type]) {
      setError(`${file.name}: exceeds size limit for ${type}`);
      return;
    }
    setFiles((prev) => ({ ...prev, [type]: file }));
  };

  const handleClearSlot = (type: MediaType) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const handleUpload = async () => {
    if (!selectedCount) {
      setError("Select at least one media file (image, video, or audio)");
      return;
    }

    setUploading(true);
    setError("");
    setProgress({});

    try {
      const slots = (Object.entries(files) as [MediaType, File][]).map(([mediaType, file]) => ({
        mediaType,
        file,
      }));

      await uploadMultimodalTask({
        projectId,
        title: title.trim() || slots[0].file.name,
        text,
        slots,
        onSlotProgress: (mediaType, percent) => {
          setProgress((prev) => ({ ...prev, [mediaType]: percent }));
        },
      });

      onSuccess();
    } catch (err: any) {
      setError(formatDriveAuthError(err?.message || "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
        <Layers className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-900">
          <p className="font-medium">Multimodal task</p>
          <p className="text-indigo-700 text-xs mt-0.5">
            Creates <strong>one task</strong> with up to one image, one video, and one audio (plus optional text).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mm-title">Title</Label>
        <Input
          id="mm-title"
          placeholder="Task title (optional — defaults to first filename)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={uploading}
        />
      </div>

      <div className="grid gap-3">
        {SLOT_META.map(({ type, label, accept, hint, icon: Icon }) => {
          const file = files[type];
          const pct = progress[type];
          return (
            <Card key={type} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-gray-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    {file ? (
                      <p className="text-xs text-gray-500 truncate">{file.name}</p>
                    ) : (
                      <p className="text-xs text-gray-400">{hint}</p>
                    )}
                    {typeof pct === "number" && uploading && (
                      <p className="text-xs text-indigo-600 mt-0.5">Uploading… {pct}%</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {file && !uploading && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleClearSlot(type)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer ${
                    uploading ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"
                  }`}>
                    <Upload className="h-3.5 w-3.5" />
                    {file ? "Replace" : "Choose"}
                    <input
                      type="file"
                      accept={accept}
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        handlePick(type, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mm-text">Optional text</Label>
        <textarea
          id="mm-text"
          rows={3}
          placeholder="Accompanying text / prompt for coders…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={uploading}
          className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
        />
      </div>

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
        <Button type="button" onClick={handleUpload} disabled={uploading || !selectedCount}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Layers className="h-4 w-4 mr-2" />
              Create Multimodal Task ({selectedCount})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
