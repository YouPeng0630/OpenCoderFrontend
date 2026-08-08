/**
 * TranscriptControl – Manager-only panel shown on audio/video task cards.
 *
 * Shows:
 *  - Current transcription status badge
 *  - Generate / Retry / Regenerate button (depending on status)
 *  - Auto-polls while status is queued/processing
 */

import { useState, useEffect, useRef } from "react";
import { Loader2, FileText, RefreshCw, AlertCircle, CheckCircle2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  triggerTranscription,
  retryTranscription,
  regenerateTranscription,
  getTranscriptionStatus,
  TranscriptionStatusResponse,
} from "@/lib/transcription";

interface TranscriptControlProps {
  projectId: string;
  taskId: string;
  /** Initial status read from the task document (may be undefined = "none") */
  initialStatus?: string;
}

const POLL_INTERVAL_MS = 6000;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "queued":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Queued
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Transcribing…
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 text-xs gap-1">
          <CheckCircle2 className="h-3 w-3" /> Transcript ready
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300 text-xs gap-1">
          <AlertCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300 text-xs gap-1">
          <Mic className="h-3 w-3" /> No transcript
        </Badge>
      );
  }
}

export function TranscriptControl({
  projectId,
  taskId,
  initialStatus,
}: TranscriptControlProps) {
  const [status, setStatus] = useState<string>(initialStatus || "none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-poll when in progress ──────────────────────────────────────────

  const stopPoll = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  const schedulePoll = () => {
    stopPoll();
    pollRef.current = setTimeout(async () => {
      try {
        const s = await getTranscriptionStatus(projectId, taskId);
        setStatus(s.transcription_status);
        if (s.transcription_status === "queued" || s.transcription_status === "processing") {
          schedulePoll();
        }
      } catch {
        // Silently ignore polling errors
      }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    if (status === "queued" || status === "processing") {
      schedulePoll();
    }
    return () => stopPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    return () => stopPoll();
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      await triggerTranscription(projectId, taskId);
      setStatus("queued");
      schedulePoll();
    } catch (e: any) {
      setError(e.message || "Failed to start transcription");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      await retryTranscription(projectId, taskId);
      setStatus("queued");
      schedulePoll();
    } catch (e: any) {
      setError(e.message || "Failed to retry transcription");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    setLoading(true);
    setError(null);
    try {
      await regenerateTranscription(projectId, taskId);
      setStatus("queued");
      schedulePoll();
    } catch (e: any) {
      setError(e.message || "Failed to regenerate transcription");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <StatusBadge status={status} />

      {status === "none" && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs gap-1"
          disabled={loading}
          onClick={handleGenerate}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
          Generate Transcript
        </Button>
      )}

      {status === "failed" && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
          disabled={loading}
          onClick={handleRetry}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Retry
        </Button>
      )}

      {status === "completed" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs gap-1 text-gray-500"
          disabled={loading}
          onClick={handleRegenerate}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Regenerate
        </Button>
      )}

      {error && (
        <span className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </div>
  );
}
