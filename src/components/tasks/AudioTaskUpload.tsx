/**
 * AudioTaskUpload Component
 * Multi-file resumable upload: browser → Google Drive, metadata → backend
 */

import { useState } from "react";
import { Upload, Music as AudioIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  uploadMediaBatch,
  formatDriveAuthError,
  type MediaUploadItemResult,
} from "@/lib/mediaUpload";

interface AudioTaskUploadProps {
  projectId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const MAX_SIZE = 50 * 1024 * 1024;

export function AudioTaskUpload({ projectId, onSuccess, onCancel }: AudioTaskUploadProps) {
  const [title, setTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");
    setFileErrors([]);

    const valid: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("audio/")) {
        errors.push(`${file.name}: not an audio file`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: exceeds 50MB`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length) setFileErrors(errors);
    if (!valid.length) {
      setError("Please select valid audio files (MP3, WAV, AAC, OGG, M4A up to 50MB)");
      return;
    }

    setSelectedFiles(valid);
    setPreviews(valid.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setPreviews((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setError("");
  };

  const handleClearAll = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviews([]);
    setError("");
    setFileErrors([]);
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      setError("Please select at least one audio file");
      return;
    }

    setUploading(true);
    setError("");
    setFileErrors([]);
    setProgressText(`0 / ${selectedFiles.length}`);

    let completed = 0;
    try {
      const results = await uploadMediaBatch({
        projectId,
        mediaType: "audio",
        files: selectedFiles,
        title: title.trim() || undefined,
        concurrency: 3,
        onFileComplete: () => {
          completed += 1;
          setProgressText(`${completed} / ${selectedFiles.length}`);
        },
      });

      const failed = results.filter((r: MediaUploadItemResult) => !r.success);
      const succeeded = results.filter((r) => r.success);

      if (succeeded.length) {
        handleClearAll();
        setTitle("");
        onSuccess();
      }

      if (failed.length) {
        setFileErrors(failed.map((r) => `${r.file.name}: ${r.error}`));
        setError(
          succeeded.length
            ? `${succeeded.length} uploaded, ${failed.length} failed`
            : formatDriveAuthError(failed[0]?.error || "Upload failed")
        );
      }
    } catch (err: any) {
      setError(formatDriveAuthError(err?.message || "Failed to upload audio tasks"));
    } finally {
      setUploading(false);
      setProgressText("");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AudioIcon className="h-5 w-5" />
          Upload Audio Tasks
        </h3>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="task-title">Task Title (Optional)</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave empty to use filenames"
            className="mt-1"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-1">
            For multiple files, title is used as a prefix when provided
          </p>
        </div>

        <div>
          <Label>Audio Files *</Label>
          <div className="mt-2">
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="audio-upload"
              disabled={uploading}
            />
            <label
              htmlFor="audio-upload"
              className={`flex items-center justify-center w-full h-36 border-2 border-dashed rounded-lg transition-colors ${
                uploading
                  ? "border-gray-200 cursor-not-allowed"
                  : "border-gray-300 cursor-pointer hover:border-primary hover:bg-gray-50"
              }`}
            >
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Click to select audio (multiple)
                </p>
                <p className="text-xs text-gray-500">MP3, WAV, AAC, OGG, M4A up to 50MB each</p>
              </div>
            </label>

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{selectedFiles.length} file(s) selected</p>
                  {!uploading && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="relative border rounded-lg overflow-hidden"
                    >
                      <div className="bg-gray-50 p-4 flex items-center justify-center">
                        <audio src={previews[index]} controls className="w-full max-w-md" />
                      </div>
                      {!uploading && (
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      <p className="text-xs text-gray-600 truncate px-2 py-1 border-t bg-gray-50">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">Upload issue</p>
            <div className="text-sm text-red-700 whitespace-pre-wrap">{error}</div>
            {fileErrors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 list-disc pl-4 space-y-1">
                {fileErrors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFiles.length || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading {progressText}…
              </>
            ) : (
              <>
                <AudioIcon className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length || ""} Audio Task
                {selectedFiles.length === 1 ? "" : "s"}
              </>
            )}
          </Button>

          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={uploading}>
              Cancel
            </Button>
          )}
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700">
            Files upload directly to Manager&apos;s Google Drive (resumable). The server only
            stores task metadata.
          </p>
        </div>
      </div>
    </Card>
  );
}
