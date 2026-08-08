/**
 * Client-side Google Drive resumable upload helper.
 * File bytes go browser → Google; backend only init + finalize metadata.
 */

import { getToken } from "@/lib/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type MediaType = "image" | "video" | "audio";

export interface MediaUploadItemResult {
  file: File;
  success: boolean;
  taskId?: string;
  error?: string;
}

export interface UploadMediaBatchOptions {
  projectId: string;
  mediaType: MediaType;
  files: File[];
  /** Optional shared title prefix; single-file uses title or filename */
  title?: string;
  concurrency?: number;
  onFileProgress?: (file: File, percent: number) => void;
  onFileComplete?: (result: MediaUploadItemResult) => void;
}

function apiErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === "object" && d && "msg" in d ? String((d as any).msg) : String(d))).join("; ");
  }
  return fallback;
}

async function initMediaUpload(
  projectId: string,
  token: string,
  file: File,
  mediaType: MediaType
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/tasks/init-media-upload?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        media_type: mediaType,
        origin: window.location.origin,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to init upload" }));
    throw new Error(apiErrorMessage(errorData.detail, "Failed to init upload"));
  }

  const data = await response.json();
  if (!data.upload_url) {
    throw new Error("Server did not return upload_url");
  }
  return data.upload_url as string;
}

function putFileToDrive(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ id: string; size?: string; mimeType?: string; name?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          if (!body.id) {
            reject(new Error("Drive upload succeeded but file id missing"));
            return;
          }
          resolve(body);
        } catch {
          reject(new Error("Invalid response from Google Drive upload"));
        }
      } else {
        reject(new Error(`Drive upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading to Google Drive"));
    xhr.send(file);
  });
}

async function finalizeMediaUpload(
  projectId: string,
  token: string,
  mediaType: MediaType,
  file: File,
  driveFileId: string,
  title: string
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/tasks/finalize-media-upload?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drive_file_id: driveFileId,
        title,
        media_type: mediaType,
        tags: [],
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to finalize upload" }));
    throw new Error(apiErrorMessage(errorData.detail, "Failed to finalize upload"));
  }

  const data = await response.json();
  return data.task_id as string;
}

async function uploadOneMediaFile(
  projectId: string,
  token: string,
  mediaType: MediaType,
  file: File,
  title: string,
  onProgress?: (percent: number) => void
): Promise<MediaUploadItemResult> {
  try {
    const uploadUrl = await initMediaUpload(projectId, token, file, mediaType);
    const driveFile = await putFileToDrive(uploadUrl, file, onProgress);
    const taskId = await finalizeMediaUpload(
      projectId,
      token,
      mediaType,
      file,
      driveFile.id,
      title
    );
    return { file, success: true, taskId };
  } catch (err: any) {
    return {
      file,
      success: false,
      error: err?.message || "Upload failed",
    };
  }
}

/** Run async tasks with a fixed concurrency pool. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  }

  const poolSize = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: poolSize }, () => run()));
  return results;
}

/**
 * Upload many media files via resumable Drive sessions (bytes bypass backend).
 */
export async function uploadMediaBatch(
  options: UploadMediaBatchOptions
): Promise<MediaUploadItemResult[]> {
  const {
    projectId,
    mediaType,
    files,
    title,
    concurrency = 3,
    onFileProgress,
    onFileComplete,
  } = options;

  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated. Please login again.");
  }

  if (!files.length) {
    throw new Error("No files selected");
  }

  return mapPool(files, concurrency, async (file, index) => {
    const fileTitle =
      files.length === 1 && title?.trim()
        ? title.trim()
        : title?.trim()
          ? `${title.trim()} (${index + 1})`
          : file.name;

    const result = await uploadOneMediaFile(
      projectId,
      token,
      mediaType,
      file,
      fileTitle,
      (percent) => onFileProgress?.(file, percent)
    );
    onFileComplete?.(result);
    return result;
  });
}

export function formatDriveAuthError(message: string): string {
  if (message.includes("credentials") || message.includes("Drive access") || message.includes("Drive not authorized")) {
    return `🔐 Google Drive Authorization Required\n\n${message}\n\n📝 Steps to fix:\n1. Click your profile icon (top right)\n2. Select "Sign out"\n3. Visit: https://myaccount.google.com/permissions\n4. Remove "OpenCoder" access\n5. Login again with Google\n6. Grant Google Drive permission`;
  }
  return message;
}

export interface MultimodalFileSlot {
  mediaType: MediaType;
  file: File;
}

export interface UploadMultimodalOptions {
  projectId: string;
  title: string;
  slots: MultimodalFileSlot[];
  text?: string;
  onSlotProgress?: (mediaType: MediaType, percent: number) => void;
}

/**
 * Upload multiple media files (one of each type) into a single multimodal task.
 * Each file: init → Drive PUT → then one finalize-multimodal call.
 */
export async function uploadMultimodalTask(
  options: UploadMultimodalOptions
): Promise<{ taskId: string; modalities: string[] }> {
  const { projectId, title, slots, text, onSlotProgress } = options;
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Please login again.");
  if (!slots.length) throw new Error("Select at least one media file");

  const types = slots.map((s) => s.mediaType);
  if (new Set(types).size !== types.length) {
    throw new Error("Multimodal allows at most one file per media type");
  }

  const items: Array<{
    drive_file_id: string;
    media_type: MediaType;
    original_filename: string;
    file_size: number;
    mime_type: string;
  }> = [];

  for (const slot of slots) {
    const uploadUrl = await initMediaUpload(projectId, token, slot.file, slot.mediaType);
    const driveFile = await putFileToDrive(uploadUrl, slot.file, (pct) =>
      onSlotProgress?.(slot.mediaType, pct)
    );
    items.push({
      drive_file_id: driveFile.id,
      media_type: slot.mediaType,
      original_filename: slot.file.name,
      file_size: slot.file.size,
      mime_type: slot.file.type || "application/octet-stream",
    });
  }

  const response = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/tasks/finalize-multimodal-upload?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || slots[0].file.name,
        items,
        tags: [],
        text: text?.trim() || null,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to finalize multimodal upload" }));
    throw new Error(apiErrorMessage(errorData.detail, "Failed to finalize multimodal upload"));
  }

  const data = await response.json();
  return {
    taskId: data.task_id as string,
    modalities: (data.modalities || types) as string[],
  };
}
