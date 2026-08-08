/**
 * Transcription API client + TypeScript types.
 * Used by both Manager (controls) and Coder (viewer + coding).
 */

import { getToken } from "@/lib/storage";

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || "http://localhost:8000";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  index: number;
  start: number;
  end: number;
  text: string;
  start_word_index?: number;
  end_word_index?: number;
}

export interface TranscriptWord {
  index: number;
  segment_index?: number;
  start: number;
  end: number;
  text: string;
}

export interface Transcript {
  id: string;
  task_id: string;
  version: number;
  provider: string;
  model: string;
  language?: string;
  duration_seconds?: number;
  text: string;
  segments: TranscriptSegment[];
  words: TranscriptWord[];
  summary?: string;
  summary_model?: string;
  created_at: string;
  is_active?: boolean;
}

export interface TranscriptionStatusResponse {
  transcription_status: "none" | "queued" | "processing" | "completed" | "failed";
  active_transcript_id: string | null;
  active_transcript_version: number | null;
  latest_job: {
    id: string;
    status: string;
    attempt_count: number;
    error_message: string | null;
    created_at: string;
  } | null;
}

export interface LabelOption {
  group_id: string;
  option_ids: string[];
}

export interface SegmentRangeTarget {
  type: "segment_range";
  transcript_id: string;
  transcript_version: number;
  start_segment_index: number;
  end_segment_index: number;
  start: number;
  end: number;
  text_snapshot: string;
}

export interface WordRangeTarget {
  type: "word_range";
  transcript_id: string;
  transcript_version: number;
  start_word_index: number;
  end_word_index: number;
  start: number;
  end: number;
  text_snapshot: string;
}

export interface TranscriptCoding {
  id: string;
  task_id: string;
  coder_user_id: string;
  labels: LabelOption[];
  notes?: string;
  target: SegmentRangeTarget | WordRangeTarget;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tok(): string {
  const t = getToken();
  if (!t) throw new Error("Not authenticated");
  return t;
}

function base(projectId: string, taskId: string): string {
  return `${API_BASE}/api/projects/${projectId}/tasks/${taskId}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)) || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ── Transcription control (Manager) ──────────────────────────────────────────

export async function triggerTranscription(projectId: string, taskId: string) {
  const res = await fetch(
    `${base(projectId, taskId)}/transcription?token=${encodeURIComponent(tok())}`,
    { method: "POST" }
  );
  return handleResponse<{ success: boolean; queued: boolean; job_id: string; message: string }>(res);
}

export async function getTranscriptionStatus(
  projectId: string,
  taskId: string
): Promise<TranscriptionStatusResponse> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcription/status?token=${encodeURIComponent(tok())}`
  );
  return handleResponse<TranscriptionStatusResponse>(res);
}

export async function retryTranscription(projectId: string, taskId: string) {
  const res = await fetch(
    `${base(projectId, taskId)}/transcription/retry?token=${encodeURIComponent(tok())}`,
    { method: "POST" }
  );
  return handleResponse<{ success: boolean; message: string }>(res);
}

export async function regenerateTranscription(projectId: string, taskId: string) {
  const res = await fetch(
    `${base(projectId, taskId)}/transcription/regenerate?token=${encodeURIComponent(tok())}`,
    { method: "POST" }
  );
  return handleResponse<{ success: boolean; job_id: string; message: string }>(res);
}

// ── Transcript fetch (Coder + Manager) ───────────────────────────────────────

export async function getActiveTranscript(
  projectId: string,
  taskId: string
): Promise<Transcript> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcript?token=${encodeURIComponent(tok())}`
  );
  return handleResponse<Transcript>(res);
}

export async function generateTranscriptSummary(
  projectId: string,
  taskId: string
): Promise<{ success: boolean; summary: string; summary_model: string }> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcript/summary?token=${encodeURIComponent(tok())}`,
    { method: "POST" }
  );
  return handleResponse<{ success: boolean; summary: string; summary_model: string }>(res);
}

export async function listTranscripts(
  projectId: string,
  taskId: string
): Promise<{ transcripts: Transcript[] }> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcripts?token=${encodeURIComponent(tok())}`
  );
  return handleResponse<{ transcripts: Transcript[] }>(res);
}

// ── Transcript codings ────────────────────────────────────────────────────────

export async function saveTranscriptCoding(
  projectId: string,
  taskId: string,
  payload: {
    labels: LabelOption[];
    notes?: string;
    target: SegmentRangeTarget | WordRangeTarget;
  }
): Promise<{ success: boolean; coding_id: string }> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcript-codings?token=${encodeURIComponent(tok())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, ...payload }),
    }
  );
  return handleResponse<{ success: boolean; coding_id: string }>(res);
}

export async function getTranscriptCodings(
  projectId: string,
  taskId: string,
  coderOnly = false
): Promise<{ codings: TranscriptCoding[] }> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcript-codings?token=${encodeURIComponent(tok())}&coder_only=${coderOnly}`
  );
  return handleResponse<{ codings: TranscriptCoding[] }>(res);
}

export async function deleteTranscriptCoding(
  projectId: string,
  taskId: string,
  codingId: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${base(projectId, taskId)}/transcript-codings/${codingId}?token=${encodeURIComponent(tok())}`,
    { method: "DELETE" }
  );
  return handleResponse<{ success: boolean }>(res);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
