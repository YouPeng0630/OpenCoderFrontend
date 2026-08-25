/**
 * TranscriptViewer
 *
 * Two coding modes:
 *   Segment – click, shift-click, or hold & drag to select a range of segments
 *   Word    – horizontal timeline; hold left-button and drag to rubber-band
 *             select words, then apply labels
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, ChevronDown, ChevronUp, X, Plus, Tag, ZoomIn, ZoomOut } from "lucide-react";
import {
  Transcript,
  TranscriptWord,
  TranscriptCoding,
  LabelOption,
  SegmentRangeTarget,
  WordRangeTarget,
  getActiveTranscript,
  getTranscriptCodings,
  saveTranscriptCoding,
  deleteTranscriptCoding,
  generateTranscriptSummary,
  formatTime,
} from "@/lib/transcription";

// ── Shared types ──────────────────────────────────────────────────────────────

interface TagOption {
  option_id?: string;
  value?: string;
  label: string;
  order?: number;
  active?: boolean;
}

interface TagGroup {
  _id?: string;
  group_id: string;
  name: string;
  type: "single" | "multi";
  required: boolean;
  options: TagOption[];
  active?: boolean;
}

function getOptionId(opt: TagOption): string {
  return opt.option_id || opt.value || opt.label;
}

const CODING_COLORS = [
  "bg-yellow-200 border-yellow-400",
  "bg-blue-200 border-blue-400",
  "bg-green-200 border-green-400",
  "bg-purple-200 border-purple-400",
  "bg-pink-200 border-pink-400",
  "bg-orange-200 border-orange-400",
];
function codingColor(i: number) { return CODING_COLORS[i % CODING_COLORS.length]; }

// ── Word Timeline ─────────────────────────────────────────────────────────────
// Multi-row timeline: each row = N seconds. Words positioned absolutely
// within each row. Drag-select uses time range (works across row breaks).

interface WordTimelineProps {
  transcript: Transcript;
  codings: TranscriptCoding[];
  onSelect: (sel: {
    startWordIndex: number; endWordIndex: number;
    start: number; end: number; textSnapshot: string;
  }) => void;
}

const RULER_H  = 20;   // px  – time tick row
const SEG_H    = 14;   // px  – segment colour band
const WORD_H   = 36;   // px  – word chip row
const ROW_H    = RULER_H + SEG_H + WORD_H + 6;  // total row height
const MIN_WORD_W = 44; // px  – never narrower than this

const ROW_OPTIONS = [5, 10];

function WordTimeline({ transcript, codings, onSelect }: WordTimelineProps) {
  const [rowSec, setRowSec] = useState(10);          // seconds per row

  const containerRef = useRef<HTMLDivElement>(null);
  const [rowPx, setRowPx] = useState(700);           // row width in px (auto)

  // Measure container width → derive row pixel width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRowPx(e.contentRect.width - 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxPerSec = rowPx / rowSec;

  const duration = transcript.duration_seconds
    ?? (transcript.segments[transcript.segments.length - 1]?.end ?? 1);
  const numRows  = Math.ceil(duration / rowSec);

  // Drag-select by TIME (cross-row safe)
  const isDragging    = useRef(false);
  const dragStartTime = useRef<number | null>(null);
  const [dragEndTime, setDragEndTime] = useState<number | null>(null);

  useEffect(() => {
    function onUp() {
      if (!isDragging.current || dragStartTime.current === null || dragEndTime === null) {
        isDragging.current = false; dragStartTime.current = null; return;
      }
      isDragging.current = false;
      const t0 = Math.min(dragStartTime.current, dragEndTime);
      const t1 = Math.max(dragStartTime.current, dragEndTime);
      dragStartTime.current = null;

      const sel = transcript.words.filter((w) => {
        const mid = (w.start + w.end) / 2;
        return mid >= t0 && mid <= t1;
      });
      setDragEndTime(null);
      if (!sel.length) return;
      const idxs = sel.map((w) => w.index);
      onSelect({
        startWordIndex: Math.min(...idxs),
        endWordIndex:   Math.max(...idxs),
        start: sel[0].start,
        end:   sel[sel.length - 1].end,
        textSnapshot: sel.map((w) => w.text).join(" ").trim(),
      });
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [dragEndTime, transcript.words, onSelect]);

  function wordInDrag(w: TranscriptWord) {
    if (dragStartTime.current === null || dragEndTime === null) return false;
    const t0 = Math.min(dragStartTime.current, dragEndTime);
    const t1 = Math.max(dragStartTime.current, dragEndTime);
    const mid = (w.start + w.end) / 2;
    return mid >= t0 && mid <= t1;
  }

  function wordCodingColor(wIdx: number): string | null {
    const ci = codings.findIndex((c) => {
      if (c.target.type !== "word_range") return false;
      const t = c.target as any;
      return wIdx >= t.start_word_index && wIdx <= t.end_word_index;
    });
    return ci >= 0 ? codingColor(ci) : null;
  }

  // Ruler ticks (every 1 or 2 seconds depending on density)
  function rowTicks(rowStart: number, rowEnd: number): number[] {
    const step = pxPerSec < 50 ? 5 : pxPerSec < 100 ? 2 : 1;
    const ticks: number[] = [];
    const first = Math.ceil(rowStart / step) * step;
    for (let t = first; t < rowEnd; t += step) ticks.push(t);
    return ticks;
  }

  return (
    <div className="flex flex-col gap-1 p-2 pb-1">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">Seconds / row:</span>
        {ROW_OPTIONS.map((s) => (
          <button
            key={s}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setRowSec(s)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              rowSec === s
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-300 hover:border-primary"
            }`}
          >{s}s</button>
        ))}
        <span className="text-xs text-gray-300 mx-1">|</span>
        <span className="text-xs text-gray-400">Hold & drag to select</span>
      </div>

      {/* Timeline rows */}
      <div ref={containerRef} className="w-full space-y-px">
        {Array.from({ length: numRows }, (_, ri) => {
          const rowStart = ri * rowSec;
          const rowEnd   = Math.min(rowStart + rowSec, duration);
          const ticks    = rowTicks(rowStart, rowEnd);

          // Segments overlapping this row
          const rowSegs = transcript.segments.filter(
            (s) => s.start < rowEnd && s.end > rowStart
          );
          // Words in this row
          const rowWords = transcript.words.filter(
            (w) => w.start >= rowStart && w.start < rowEnd
          );

          return (
            <div
              key={ri}
              className="relative border border-gray-100 rounded overflow-hidden"
              style={{ height: ROW_H, width: "100%" }}
            >
              {/* ── Ruler ── */}
              <div
                className="absolute top-0 left-0 right-0 bg-gray-50 border-b border-gray-100"
                style={{ height: RULER_H }}
              >
                {/* Row start label */}
                <span
                  className="absolute left-0.5 text-[10px] font-mono text-blue-600 leading-none"
                  style={{ top: 4 }}
                >{formatTime(rowStart)}</span>

                {ticks.map((t) => (
                  <div
                    key={t}
                    className="absolute flex flex-col items-start"
                    style={{ left: (t - rowStart) * pxPerSec }}
                  >
                    <div className="w-px bg-gray-300" style={{ height: 5, marginTop: 6 }} />
                    {t > rowStart + 0.5 && (
                      <span className="text-[9px] text-gray-400 ml-0.5 leading-none">
                        {formatTime(t)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Segment colour bands ── */}
              {rowSegs.map((seg, si) => {
                const bStart = Math.max(seg.start, rowStart);
                const bEnd   = Math.min(seg.end,   rowEnd);
                const left   = (bStart - rowStart) * pxPerSec;
                const width  = (bEnd   - bStart)  * pxPerSec;
                return (
                  <div
                    key={seg.index}
                    className={`absolute text-[9px] truncate px-1 border-r border-white/60 ${
                      si % 2 === 0 ? "bg-blue-50 text-blue-700" : "bg-indigo-50 text-indigo-700"
                    }`}
                    style={{
                      top: RULER_H, left, width: Math.max(1, width),
                      height: SEG_H, lineHeight: `${SEG_H}px`,
                    }}
                    title={seg.text}
                  >{seg.text}</div>
                );
              })}


              {/* ── Word chips ── */}
              {rowWords.map((w) => {
                const left  = (w.start - rowStart) * pxPerSec;
                const width = Math.max(MIN_WORD_W, (w.end - w.start) * pxPerSec - 2);
                const inDrag = wordInDrag(w);
                const codCol = wordCodingColor(w.index);
                return (
                  <div
                    key={w.index}
                    title={`${w.text}  ${formatTime(w.start)}–${formatTime(w.end)}`}
                    style={{
                      position: "absolute",
                      top:    RULER_H + SEG_H + 3,
                      left:   left + 1,
                      width:  width,
                      height: WORD_H - 6,
                    }}
                    className={`
                      flex items-center justify-center rounded border text-xs
                      font-medium overflow-hidden cursor-crosshair transition-colors duration-75
                      ${inDrag
                        ? "bg-blue-500 border-blue-600 text-white shadow z-10"
                        : codCol
                        ? `${codCol} text-gray-800`
                        : "bg-white border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
                      }
                    `}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      isDragging.current = true;
                      dragStartTime.current = (w.start + w.end) / 2;
                      setDragEndTime((w.start + w.end) / 2);
                    }}
                    onMouseEnter={() => {
                      if (isDragging.current)
                        setDragEndTime((w.start + w.end) / 2);
                    }}
                  >
                    <span className="truncate px-1">{w.text}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main TranscriptViewer ─────────────────────────────────────────────────────

type CodingMode = "segment" | "word";

interface Selection {
  mode: CodingMode;
  startSeg?: number; endSeg?: number;
  startWord?: number; endWord?: number;
  startTime: number; endTime: number;
  textSnapshot: string;
}

interface TranscriptViewerProps {
  projectId: string;
  taskId: string;
  tagGroups: TagGroup[];
  userId: string;
  /** Notifies parent when a coding selection text changes (for AI suggest). */
  onTextSelect?: (text: string | null) => void;
}

export function TranscriptViewer({
  projectId,
  taskId,
  tagGroups,
  userId,
  onTextSelect,
}: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [codings, setCodings] = useState<TranscriptCoding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<CodingMode>("segment");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [savingCoding, setSavingCoding] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<LabelOption[]>([]);
  const [codingNotes, setCodingNotes] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Segment drag-select (same idea as word rubber-band)
  const isSegDragging = useRef(false);
  const dragStartSeg = useRef<number | null>(null);
  const [dragHoverSeg, setDragHoverSeg] = useState<number | null>(null);
  const skipNextSegClick = useRef(false);

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [t, c] = await Promise.all([
        getActiveTranscript(projectId, taskId),
        getTranscriptCodings(projectId, taskId, true),
      ]);
      setTranscript(t);
      setCodings(c.codings);
    } catch (e: any) {
      setError(e.message || "Failed to load transcript");
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    onTextSelect?.(selection?.textSnapshot?.trim() || null);
  }, [selection, onTextSelect]);

  // Finalize segment drag on mouseup anywhere
  useEffect(() => {
    function onUp() {
      if (!isSegDragging.current || dragStartSeg.current === null || dragHoverSeg === null) {
        isSegDragging.current = false;
        dragStartSeg.current = null;
        return;
      }
      const a = Math.min(dragStartSeg.current, dragHoverSeg);
      const b = Math.max(dragStartSeg.current, dragHoverSeg);
      isSegDragging.current = false;
      dragStartSeg.current = null;
      setDragHoverSeg(null);
      // Multi-segment drag: suppress the trailing click that would collapse to one
      if (a !== b) skipNextSegClick.current = true;
      buildSegSel(a, b);
      setSelectedLabels([]);
      setCodingNotes("");
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [dragHoverSeg, transcript]);

  // ── Segment selection ────────────────────────────────────────────────────

  function handleSegmentClick(idx: number, e: React.MouseEvent) {
    if (mode !== "segment") return;
    if (skipNextSegClick.current) {
      skipNextSegClick.current = false;
      return;
    }
    if (e.shiftKey && selection?.mode === "segment" && selection.startSeg !== undefined) {
      buildSegSel(Math.min(selection.startSeg, idx), Math.max(selection.startSeg, idx));
    } else {
      buildSegSel(idx, idx);
    }
    setSelectedLabels([]); setCodingNotes("");
  }

  function handleSegMouseDown(idx: number, e: React.MouseEvent) {
    if (mode !== "segment" || e.button !== 0 || e.shiftKey) return;
    e.preventDefault(); // avoid native text selection while dragging
    isSegDragging.current = true;
    dragStartSeg.current = idx;
    setDragHoverSeg(idx);
  }

  function handleSegMouseEnter(idx: number) {
    if (!isSegDragging.current || dragStartSeg.current === null) return;
    setDragHoverSeg(idx);
  }

  function buildSegSel(a: number, b: number) {
    if (!transcript) return;
    const segs = transcript.segments.slice(a, b + 1);
    setSelection({
      mode: "segment", startSeg: a, endSeg: b,
      startTime: segs[0]?.start ?? 0,
      endTime:   segs[segs.length - 1]?.end ?? 0,
      textSnapshot: segs.map((s) => s.text).join(" ").trim(),
    });
  }

  // ── Word timeline callback ────────────────────────────────────────────────

  function handleWordSelect(sel: {
    startWordIndex: number; endWordIndex: number;
    start: number; end: number; textSnapshot: string;
  }) {
    setSelection({
      mode: "word",
      startWord: sel.startWordIndex, endWord: sel.endWordIndex,
      startTime: sel.start, endTime: sel.end,
      textSnapshot: sel.textSnapshot,
    });
    setSelectedLabels([]); setCodingNotes("");
  }

  // ── Label toggle ─────────────────────────────────────────────────────────

  function toggleOption(groupId: string, optionId: string, type: "single" | "multi") {
    setSelectedLabels((prev) => {
      const existing = prev.find((l) => l.group_id === groupId);
      if (type === "single") {
        if (existing?.option_ids[0] === optionId) return prev.filter((l) => l.group_id !== groupId);
        return [...prev.filter((l) => l.group_id !== groupId), { group_id: groupId, option_ids: [optionId] }];
      }
      if (!existing) return [...prev, { group_id: groupId, option_ids: [optionId] }];
      const ids = existing.option_ids.includes(optionId)
        ? existing.option_ids.filter((id) => id !== optionId)
        : [...existing.option_ids, optionId];
      if (ids.length === 0) return prev.filter((l) => l.group_id !== groupId);
      return prev.map((l) => l.group_id === groupId ? { ...l, option_ids: ids } : l);
    });
  }

  // ── Save coding ──────────────────────────────────────────────────────────

  async function handleSaveCoding() {
    if (!selection || !transcript) return;
    setSavingCoding(true);
    try {
      const target: SegmentRangeTarget | WordRangeTarget =
        selection.mode === "segment"
          ? {
              type: "segment_range",
              transcript_id: transcript.id, transcript_version: transcript.version,
              start_segment_index: selection.startSeg!, end_segment_index: selection.endSeg!,
              start: selection.startTime, end: selection.endTime,
              text_snapshot: selection.textSnapshot,
            }
          : {
              type: "word_range",
              transcript_id: transcript.id, transcript_version: transcript.version,
              start_word_index: selection.startWord!, end_word_index: selection.endWord!,
              start: selection.startTime, end: selection.endTime,
              text_snapshot: selection.textSnapshot,
            };

      await saveTranscriptCoding(projectId, taskId, {
        labels: selectedLabels, notes: codingNotes || undefined, target,
      });
      const c = await getTranscriptCodings(projectId, taskId, true);
      setCodings(c.codings);
      setSelection(null); setSelectedLabels([]); setCodingNotes("");
    } catch (e: any) {
      alert(`Failed to save coding: ${e.message}`);
    } finally {
      setSavingCoding(false);
    }
  }

  async function handleDeleteCoding(id: string) {
    try {
      await deleteTranscriptCoding(projectId, taskId, id);
      setCodings((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  // ── Segment highlight helpers ────────────────────────────────────────────

  function getSegCodings(segIdx: number) {
    return codings.filter((c) => {
      if (c.target.type !== "segment_range") return false;
      const t = c.target as any;
      return segIdx >= t.start_segment_index && segIdx <= t.end_segment_index;
    });
  }

  function isSegSelected(segIdx: number) {
    if (dragStartSeg.current !== null && dragHoverSeg !== null) {
      const a = Math.min(dragStartSeg.current, dragHoverSeg);
      const b = Math.max(dragStartSeg.current, dragHoverSeg);
      return segIdx >= a && segIdx <= b;
    }
    if (!selection || selection.mode !== "segment") return false;
    return segIdx >= (selection.startSeg ?? 0) && segIdx <= (selection.endSeg ?? 0);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mt-4 p-4 border border-gray-200 rounded-lg flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading transcript…
      </div>
    );
  }
  if (error) {
    if (error.includes("404") || error.includes("No transcript")) return null;
    return (
      <div className="mt-4 p-3 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
        <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
      </div>
    );
  }
  if (!transcript) return null;

  const hasWords = transcript.words.length > 0;

  async function handleGenerateSummary() {
    if (!transcript) return;
    setGeneratingSummary(true);
    setSummaryError(null);
    try {
      const result = await generateTranscriptSummary(projectId, taskId);
      setTranscript({ ...transcript, summary: result.summary, summary_model: result.summary_model });
    } catch (e: any) {
      setSummaryError(e.message || "Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  }

  // ── Coding panel (shared for both modes) ──────────────────────────────────
  const CodingPanel = (
    <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col">
      {selection && (
        <div className="p-3 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-blue-800">
              {selection.mode === "segment" ? "Segments" : "Words"}{" "}
              {formatTime(selection.startTime)}–{formatTime(selection.endTime)}
            </span>
            <button onClick={() => setSelection(null)}>
              <X className="h-3 w-3 text-blue-600" />
            </button>
          </div>
          <p className="text-xs text-blue-700 italic line-clamp-2 mb-2">
            "{selection.textSnapshot}"
          </p>

          {/* Label groups */}
          <div className="space-y-2">
            {tagGroups.filter((g) => g.active !== false).map((group) => {
              const sel = selectedLabels.find((l) => l.group_id === group.group_id);
              return (
                <div key={group.group_id}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{group.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.options.filter((o) => o.active !== false).map((opt) => {
                      const optId = getOptionId(opt);
                      const active = sel?.option_ids.includes(optId);
                      return (
                        <button
                          key={optId}
                          onClick={() => toggleOption(group.group_id, optId, group.type)}
                          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                            active
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-600 border-gray-300 hover:border-primary"
                          }`}
                        >{opt.label}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <textarea
            value={codingNotes}
            onChange={(e) => setCodingNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="mt-2 w-full text-xs border border-gray-300 rounded p-1.5 resize-none focus:outline-none focus:border-primary"
            rows={2}
          />
          <Button
            size="sm" className="w-full mt-2 text-xs h-7"
            onClick={handleSaveCoding}
            disabled={savingCoding || selectedLabels.length === 0}
          >
            {savingCoding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
            Save Coding
          </Button>
        </div>
      )}

      {/* Existing codings */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-xs font-medium text-gray-500 mb-1.5 px-1">
          My Codings ({codings.length})
        </p>
        {codings.length === 0 ? (
          <p className="text-xs text-gray-400 px-1">
            {mode === "segment"
              ? "Click or drag segments to start."
              : "Drag on the timeline to select words."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {codings.map((coding, ci) => {
              const t = coding.target;
              const allLabels = coding.labels.flatMap((l) => l.option_ids);
              return (
                <div key={coding.id} className={`p-2 rounded border text-xs ${codingColor(ci)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-gray-600 text-[10px]">
                        {formatTime(t.start)}–{formatTime(t.end)}
                        <span className="ml-1 text-gray-400">
                          ({t.type === "word_range" ? "words" : "segments"})
                        </span>
                      </p>
                      <p className="text-gray-700 italic line-clamp-1 mt-0.5">
                        "{t.text_snapshot}"
                      </p>
                      {allLabels.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {allLabels.map((id) => (
                            <Badge key={id} variant="secondary" className="text-[10px] px-1 py-0">{id}</Badge>
                          ))}
                        </div>
                      )}
                      {coding.notes && (
                        <p className="text-gray-600 mt-0.5 line-clamp-1">{coding.notes}</p>
                      )}
                    </div>
                    <button onClick={() => handleDeleteCoding(coding.id)} className="ml-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Transcript</span>
          <span className="text-xs text-gray-400">
            {transcript.segments.length} segments
            {transcript.duration_seconds ? ` · ${formatTime(transcript.duration_seconds)}` : ""}
            {transcript.language ? ` · ${transcript.language}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <div
              className="flex rounded border border-gray-300 overflow-hidden text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setMode("segment"); setSelection(null); }}
                className={`px-2 py-0.5 ${mode === "segment" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
              >Segment</button>
              {hasWords && (
                <button
                  onClick={() => { setMode("word"); setSelection(null); }}
                  className={`px-2 py-0.5 ${mode === "word" ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
                >Word</button>
              )}
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* ── AI Summary ── */}
      {expanded && (
        transcript.summary ? (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-amber-700 shrink-0 mt-0.5">
                AI Summary
              </span>
              <p className="text-xs text-amber-900 leading-relaxed whitespace-pre-wrap">
                {transcript.summary}
              </p>
            </div>
            {transcript.summary_model && (
              <p className="text-[10px] text-amber-500 mt-1 text-right">
                {transcript.summary_model}
              </p>
            )}
          </div>
        ) : (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <span className="text-xs text-amber-600">No AI summary yet.</span>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="flex items-center gap-1 text-xs text-amber-700 font-medium hover:underline disabled:opacity-50"
            >
              {generatingSummary ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
              ) : (
                "Generate Summary"
              )}
            </button>
            {summaryError && (
              <span className="text-xs text-red-500">{summaryError}</span>
            )}
          </div>
        )
      )}

      {expanded && (
        <>
          {mode === "word" && hasWords ? (
            /* ── Word Timeline mode ─────────────────────────── */
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 min-w-0">
                <WordTimeline
                  transcript={transcript}
                  codings={codings}
                  onSelect={handleWordSelect}
                />
              </div>
              {CodingPanel}
            </div>
          ) : (
            /* ── Segment mode ────────────────────────────────── */
            <div className="flex flex-col md:flex-row">
              <div
                className={`flex-1 overflow-y-auto max-h-96 p-2 space-y-0.5 ${
                  dragHoverSeg !== null ? "select-none" : ""
                }`}
              >
                <p className="text-xs text-gray-400 px-1 mb-1">
                  Click, Shift+click, or hold & drag to select multiple
                </p>
                {transcript.segments.map((seg) => {
                  const segCodings = getSegCodings(seg.index);
                  const selected   = isSegSelected(seg.index);
                  const highlighted = segCodings.length > 0;
                  const colorClass  = highlighted ? codingColor(codings.indexOf(segCodings[0])) : "";
                  return (
                    <div
                      key={seg.index}
                      onMouseDown={(e) => handleSegMouseDown(seg.index, e)}
                      onMouseEnter={() => handleSegMouseEnter(seg.index)}
                      onClick={(e) => handleSegmentClick(seg.index, e)}
                      className={`flex gap-2 p-1.5 rounded cursor-pointer transition-colors border ${
                        selected
                          ? "border-primary bg-primary/10"
                          : highlighted
                          ? `border ${colorClass}`
                          : "border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xs text-gray-400 font-mono w-10 flex-shrink-0 pt-0.5">
                        {formatTime(seg.start)}
                      </span>
                      <p className="text-sm text-gray-800 leading-relaxed">{seg.text}</p>
                    </div>
                  );
                })}
              </div>
              {CodingPanel}
            </div>
          )}
        </>
      )}
    </div>
  );
}
