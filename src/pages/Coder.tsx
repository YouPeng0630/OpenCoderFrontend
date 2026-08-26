import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/storage';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Check, Circle } from 'lucide-react';
import { 
  Save, 
  AlertCircle,
  Loader2,
  CheckCircle,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  FileText,
  Tags,
} from 'lucide-react';
import { MessageManagerDialog } from '@/components/notifications/MessageManagerDialog';
import { ChatButton } from '@/components/chat/ChatButton';
import { TaskTypeSelector, getTaskTypeConfig } from '@/components/tasks/TaskTypeSelector';
import { BibliographicTaskDisplay } from '@/components/tasks/BibliographicTaskDisplay';
import { TranscriptViewer } from '@/components/transcription/TranscriptViewer';
import { getAnnotationSuggestion } from '@/services/llm';
import { getActiveTranscript } from '@/lib/transcription';

interface Task {
  id: string;
  title: string;
  task_type?: 'text' | 'url' | 'image' | 'video' | 'audio' | 'bibliographic' | 'pdf_document_coding' | 'multimodal';
  payload: {
    text?: string;
    image?: {
      drive_file_id?: string;
      drive_file_url: string;
      drive_cdn_url?: string;  // Google CDN URL (备选，更快)
      drive_download_url?: string;  // Download URL (备用)
      drive_view_url?: string;
      drive_thumbnail_url?: string;
      original_filename: string;
      file_size: number;
      mime_type: string;
    };
    video?: {
      drive_file_id?: string;
      drive_file_url: string;
      drive_cdn_url?: string;
      drive_download_url?: string;
      drive_view_url?: string;
      drive_thumbnail_url?: string;
      original_filename: string;
      file_size: number;
      mime_type: string;
    };
    audio?: {
      drive_file_id?: string;
      drive_file_url: string;
      drive_cdn_url?: string;
      drive_download_url?: string;
      drive_view_url?: string;
      drive_thumbnail_url?: string;
      original_filename: string;
      file_size: number;
      mime_type: string;
    };
    meta?: {
      bibliographic?: {
        title?: string;
        authors?: string[];
        publicationDate?: string;
        year?: string;
        journal?: string;
        volume?: string;
        issue?: string;
        pages?: string;
        doi?: string;
        pmid?: string;
        abstract?: string;
        keywords?: string[];
        meshTerms?: string[];
        publicationType?: string;
        language?: string;
        source?: string;
        url?: string;
        affiliations?: string;
      };
      [key: string]: any;
    };
    metadata?: {
      bibliographic?: any;  // Legacy support
    };
    [key: string]: any;
  };
  status: string;
  tags: { [key: string]: any };
  created_at: string;
}

interface TagOption {
  value?: string;
  option_id?: string;
  label: string;
  color?: string;
  description?: string;
  active?: boolean;
}

interface TagGroup {
  _id: string;
  group_id: string;
  name: string;
  description?: string;
  type: 'single' | 'multi';
  required: boolean;
  order?: number;
  active?: boolean;
  options: TagOption[];
  constraints?: {
    min_selections?: number;
    max_selections?: number;
  };
}

interface CoderProps {
  noLayout?: boolean;  // Optional prop to skip PageLayout wrapper
}

/** Google Drive file id for /preview embed (same file as drive_file_url / drive_view_url). */
function getDriveFileIdForEmbed(image: NonNullable<Task['payload']['image']>): string | null {
  if (image.drive_file_id?.trim()) return image.drive_file_id.trim();
  const view = image.drive_view_url;
  const fromView = view?.match(/\/file\/d\/([^/]+)/)?.[1];
  if (fromView) return fromView;
  const u = image.drive_file_url;
  const fromQuery = u?.match(/[?&]id=([^&]+)/)?.[1];
  if (fromQuery) return decodeURIComponent(fromQuery);
  return null;
}

/** True when payload carries image fields (covers next_task missing task_type after submit-and-next). */
function getPayloadImage(task: Task | null): NonNullable<Task['payload']['image']> | null {
  const img = task?.payload?.image;
  if (!img || typeof img !== 'object') return null;
  const anyImg = img as Record<string, unknown>;
  if (
    (typeof anyImg.drive_file_url === 'string' && anyImg.drive_file_url.trim()) ||
    (typeof anyImg.drive_file_id === 'string' && anyImg.drive_file_id.trim()) ||
    (typeof anyImg.drive_view_url === 'string' && anyImg.drive_view_url.trim()) ||
    (typeof anyImg.drive_cdn_url === 'string' && anyImg.drive_cdn_url.trim())
  ) {
    return img as NonNullable<Task['payload']['image']>;
  }
  return null;
}

/** True when payload carries video fields */
function getPayloadVideo(task: Task | null): NonNullable<Task['payload']['video']> | null {
  const vid = task?.payload?.video;
  if (!vid || typeof vid !== 'object') return null;
  const anyVid = vid as Record<string, unknown>;
  if (
    (typeof anyVid.drive_file_url === 'string' && anyVid.drive_file_url.trim()) ||
    (typeof anyVid.drive_file_id === 'string' && anyVid.drive_file_id.trim()) ||
    (typeof anyVid.drive_view_url === 'string' && anyVid.drive_view_url.trim()) ||
    (typeof anyVid.drive_download_url === 'string' && anyVid.drive_download_url.trim())
  ) {
    return vid as NonNullable<Task['payload']['video']>;
  }
  return null;
}

/** True when payload carries audio fields */
function getPayloadPdf(task: Task | null): {
  drive_file_id?: string;
  drive_file_url?: string;
  drive_view_url?: string;
  original_filename?: string;
  file_size?: number;
  mime_type?: string;
} | null {
  if (!task?.payload) return null;
  const pdf = (task.payload as any).pdf;
  if (!pdf || typeof pdf !== 'object') return null;
  return pdf;
}

function getPayloadAudio(task: Task | null): NonNullable<Task['payload']['audio']> | null {
  const aud = task?.payload?.audio;
  if (!aud || typeof aud !== 'object') return null;
  const anyAud = aud as Record<string, unknown>;
  if (
    (typeof anyAud.drive_file_url === 'string' && anyAud.drive_file_url.trim()) ||
    (typeof anyAud.drive_file_id === 'string' && anyAud.drive_file_id.trim()) ||
    (typeof anyAud.drive_view_url === 'string' && anyAud.drive_view_url.trim()) ||
    (typeof anyAud.drive_download_url === 'string' && anyAud.drive_download_url.trim())
  ) {
    return aud as NonNullable<Task['payload']['audio']>;
  }
  return null;
}

/**
 * Drive preview iframes reload whenever React recreates the <iframe> DOM node.
 * Mount imperatively and only replace when driveFileId changes.
 */
const DriveMediaEmbed = React.memo(function DriveMediaEmbed({
  driveFileId,
  title,
  height,
  className,
}: {
  driveFileId: string
  title: string
  height: string
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.replaceChildren()
    const iframe = document.createElement('iframe')
    iframe.src = `https://drive.google.com/file/d/${driveFileId}/preview`
    iframe.allow = 'autoplay; fullscreen'
    iframe.title = title
    if (className) iframe.className = className
    iframe.style.height = height
    iframe.style.border = 'none'
    iframe.style.width = '100%'
    host.appendChild(iframe)
  }, [driveFileId, title, height, className])

  return <div ref={hostRef} className={className} style={{ height }} />
})

const MemoTranscriptViewer = React.memo(TranscriptViewer)

/** Audio/video coding granularity chosen by the coder */
export type AvCodingGranularity = 'media' | 'segment'

/** Left-column media + transcript; skipped when only notes/tags state changes. */
const CoderTaskMediaPanel = React.memo(function CoderTaskMediaPanel({
  task,
  projectId,
  userId,
  tagGroups,
  onOpenPdfCoding,
  onTextSelect,
  segmentCodingEnabled = true,
}: {
  task: Task
  projectId: string
  userId: string
  tagGroups: any[]
  onOpenPdfCoding: (taskId: string) => void
  onTextSelect?: (text: string | null) => void
  /** When false (media-level mode), transcript is read-only. */
  segmentCodingEnabled?: boolean
}) {
  const imgPayload = getPayloadImage(task)
  const videoPayload = getPayloadVideo(task)
  const audioPayload = getPayloadAudio(task)
  const pdfPayload = getPayloadPdf(task)
  const textContent = task.payload?.text
  const hasMedia = !!(imgPayload || videoPayload || audioPayload || pdfPayload)
  const showTranscript = !!(videoPayload || audioPayload)
  const isMulti = task.task_type === 'multimodal'

  return (
    <div className="space-y-5">
      {imgPayload && (() => {
        const fileId = getDriveFileIdForEmbed(imgPayload)
        const driveHref =
          imgPayload.drive_view_url ||
          imgPayload.drive_file_url ||
          (fileId ? `https://drive.google.com/file/d/${fileId}/view` : '')
        const srcCandidates = getImageSrcCandidates(imgPayload)
        const primarySrc = srcCandidates[0] ?? null
        return (
          <div className="space-y-3">
            {isMulti && (
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Image</p>
            )}
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
              {!primarySrc ? (
                <p className="text-sm text-gray-500 p-6 text-center">
                  No image URL in task payload.
                  {driveHref ? (
                    <>
                      {' '}
                      <a href={driveHref} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        Open in Google Drive
                      </a>
                    </>
                  ) : null}
                </p>
              ) : (
                <img
                  src={primarySrc}
                  alt={task.title}
                  className="w-full max-h-[min(70vh,640px)] object-contain bg-white"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  data-candidate-idx="0"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement
                    let idx = parseInt(el.getAttribute('data-candidate-idx') || '0', 10)
                    idx += 1
                    if (idx < srcCandidates.length) {
                      el.setAttribute('data-candidate-idx', String(idx))
                      el.src = srcCandidates[idx]
                      return
                    }
                    el.src =
                      'data:image/svg+xml,' +
                      encodeURIComponent(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#eee" width="200" height="200"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="14" font-family="Arial">Image load error</text></svg>'
                      )
                  }}
                />
              )}
            </div>
            <div className="text-xs text-gray-500 space-y-1 px-1">
              {imgPayload.original_filename ? <p>📁 {imgPayload.original_filename}</p> : null}
              {typeof imgPayload.file_size === 'number' ? (
                <p>📊 {(imgPayload.file_size / 1024).toFixed(1)} KB</p>
              ) : null}
              {driveHref ? (
                <p>
                  🔗{' '}
                  <a href={driveHref} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    View in Google Drive
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        )
      })()}

      {videoPayload && (
        <div className="space-y-3">
          {isMulti && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Video</p>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
            {!videoPayload.drive_file_id ? (
              <p className="text-sm text-gray-500 p-6 text-center">
                No video available.
                {(videoPayload.drive_view_url || videoPayload.drive_file_url) ? (
                  <>
                    {' '}
                    <a
                      href={videoPayload.drive_view_url || videoPayload.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Open in Google Drive
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <DriveMediaEmbed
                driveFileId={videoPayload.drive_file_id}
                title="Video Player"
                height="min(70vh, 640px)"
                className="w-full bg-black"
              />
            )}
          </div>
          <div className="text-xs text-gray-500 space-y-1 px-1">
            {videoPayload.original_filename ? <p>📁 {videoPayload.original_filename}</p> : null}
            {typeof videoPayload.file_size === 'number' ? (
              <p>📊 {(videoPayload.file_size / 1024 / 1024).toFixed(1)} MB</p>
            ) : null}
            {(videoPayload.drive_view_url || videoPayload.drive_file_url) ? (
              <p>
                🔗{' '}
                <a
                  href={videoPayload.drive_view_url || videoPayload.drive_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View in Google Drive
                </a>
              </p>
            ) : null}
          </div>
        </div>
      )}

      {audioPayload && (
        <div className="space-y-3">
          {isMulti && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Audio</p>
          )}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-gray-200 rounded-lg overflow-hidden">
            {!audioPayload.drive_file_id ? (
              <p className="text-sm text-gray-500 p-6 text-center">
                No audio available.
                {(audioPayload.drive_view_url || audioPayload.drive_file_url) ? (
                  <>
                    {' '}
                    <a
                      href={audioPayload.drive_view_url || audioPayload.drive_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Open in Google Drive
                    </a>
                  </>
                ) : null}
              </p>
            ) : (
              <div className="w-full flex items-center justify-center p-4">
                <DriveMediaEmbed
                  driveFileId={audioPayload.drive_file_id}
                  title="Audio Player"
                  height="200px"
                  className="w-full max-w-2xl"
                />
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500 space-y-1 px-1">
            {audioPayload.original_filename ? <p>📁 {audioPayload.original_filename}</p> : null}
            {typeof audioPayload.file_size === 'number' ? (
              <p>📊 {(audioPayload.file_size / 1024).toFixed(1)} KB</p>
            ) : null}
            {(audioPayload.drive_view_url || audioPayload.drive_file_url) ? (
              <p>
                🔗{' '}
                <a
                  href={audioPayload.drive_view_url || audioPayload.drive_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View in Google Drive
                </a>
              </p>
            ) : null}
          </div>
        </div>
      )}

      {pdfPayload && (
        <div className="space-y-3">
          {isMulti && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PDF</p>
          )}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {pdfPayload.original_filename || 'PDF document'}
              </p>
              {typeof pdfPayload.file_size === 'number' ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {(pdfPayload.file_size / 1024 / 1024).toFixed(1)} MB
                </p>
              ) : null}
              {(pdfPayload.drive_view_url ||
                pdfPayload.drive_file_url ||
                pdfPayload.drive_file_id) ? (
                <a
                  href={
                    pdfPayload.drive_view_url ||
                    pdfPayload.drive_file_url ||
                    `https://drive.google.com/file/d/${pdfPayload.drive_file_id}/view`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Open in Google Drive
                </a>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenPdfCoding(task.id)}
              className="shrink-0"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Open PDF Coding
            </Button>
          </div>
        </div>
      )}

      {textContent ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          {isMulti && hasMedia && (
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Text</p>
          )}
          <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed">{textContent}</p>
        </div>
      ) : null}

      {!hasMedia && !textContent && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">No media or text on this task.</p>
        </div>
      )}

      {showTranscript && projectId && task.id && (
        <MemoTranscriptViewer
          projectId={projectId}
          taskId={task.id}
          tagGroups={tagGroups}
          userId={userId}
          onTextSelect={onTextSelect}
          enableCoding={segmentCodingEnabled}
        />
      )}
    </div>
  )
}, (prev, next) => {
  if (prev.task.id !== next.task.id) return false
  if (prev.projectId !== next.projectId || prev.userId !== next.userId) return false
  if (prev.tagGroups !== next.tagGroups) return false
  if (prev.onTextSelect !== next.onTextSelect) return false
  if (prev.segmentCodingEnabled !== next.segmentCodingEnabled) return false
  const a = prev.task.payload || {}
  const b = next.task.payload || {}
  return (
    a.video?.drive_file_id === b.video?.drive_file_id &&
    a.audio?.drive_file_id === b.audio?.drive_file_id &&
    a.image?.drive_file_id === b.image?.drive_file_id &&
    a.pdf?.drive_file_id === b.pdf?.drive_file_id &&
    a.text === b.text &&
    prev.task.task_type === next.task.task_type
  )
})

/**
 * Check if task is bibliographic
 * Supports: task_type, payload.meta.bibliographic, or legacy payload.metadata.bibliographic
 */
function isBibliographicTask(task: Task | null): boolean {
  if (!task) return false;
  
  // Primary: check task_type
  if (task.task_type === 'bibliographic') return true;
  
  // Secondary: check for bibliographic metadata (new structure)
  if (task.payload?.meta?.bibliographic) return true;
  
  // Legacy: check old metadata structure
  if (task.payload?.metadata?.bibliographic) return true;
  
  return false;
}

/**
 * Extract bibliographic metadata from task
 * Tries payload.meta.bibliographic first, then falls back to payload.metadata.bibliographic
 */
function getBibliographicMetadata(task: Task | null): any | null {
  if (!task) return null;
  
  // Try new structure first
  if (task.payload?.meta?.bibliographic) {
    return task.payload.meta.bibliographic;
  }
  
  // Fall back to legacy structure
  if (task.payload?.metadata?.bibliographic) {
    return task.payload.metadata.bibliographic;
  }
  
  return null;
}

/** Best-effort text for AI coding suggestions (selected / task content). */
function getTaskContentForAI(task: Task | null): string {
  if (!task) return '';
  const parts: string[] = [];
  const text = (task.payload?.text || '').trim();
  if (text) parts.push(text);

  const bib = getBibliographicMetadata(task);
  if (bib && typeof bib === 'object') {
    const title = String(bib.title || bib.Title || '').trim();
    const abstract = String(bib.abstract || bib.Abstract || '').trim();
    const authors = Array.isArray(bib.authors)
      ? bib.authors.join(', ')
      : String(bib.author || bib.Author || '');
    if (title) parts.push(`Title: ${title}`);
    if (authors) parts.push(`Authors: ${authors}`);
    if (abstract && abstract !== text) parts.push(`Abstract: ${abstract}`);
  }

  const img = getPayloadImage(task);
  if (img?.original_filename) parts.push(`Image file: ${img.original_filename}`);
  const vid = getPayloadVideo(task);
  if (vid && (vid as any).original_filename) {
    parts.push(`Video file: ${(vid as any).original_filename}`);
  }
  const aud = getPayloadAudio(task);
  if (aud && (aud as any).original_filename) {
    parts.push(`Audio file: ${(aud as any).original_filename}`);
  }
  const pdf = getPayloadPdf(task);
  if (pdf?.original_filename) parts.push(`PDF file: ${pdf.original_filename}`);

  if (task.title?.trim()) {
    const t = task.title.trim();
    if (!parts.some((p) => p.includes(t))) parts.unshift(`Task: ${t}`);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out.join('\n\n').trim();
}

/**
 * URLs to try for <img src>. Order matters:
 * - uc?export=view often returns HTML (virus scan / consent), so it fails as image — put it late.
 * - lh3 + Drive thumbnail API usually return real image bytes for link-shared files.
 */
function getImageSrcCandidates(image: NonNullable<Task['payload']['image']>): string[] {
  const id = getDriveFileIdForEmbed(image);
  const out: string[] = [];
  const add = (u?: string | null) => {
    const t = typeof u === 'string' ? u.trim() : '';
    if (t && !out.includes(t)) out.push(t);
  };

  add(image.drive_cdn_url);
  if (id) add(`https://lh3.googleusercontent.com/d/${id}`);
  add(image.drive_thumbnail_url);
  add(image.drive_file_url);
  if (id) {
    add(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000`);
    add(`https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`);
    add(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`);
  }
  return out;
}

function mapApiTaskToTask(task: Record<string, any>): Task {
  const payload = task.payload || { text: '' };
  const inferredImage =
    payload.image && typeof payload.image === 'object' && Object.keys(payload.image).length > 0;
  const taskType =
    task.task_type ||
    task.taskType ||
    (inferredImage ? 'image' : 'text');
  return {
    id: task._id || task.id,
    title: task.title || 'Untitled Task',
    task_type: taskType as Task['task_type'],
    payload,
    status: task.status || 'in_progress',
    tags: task.tags || {},
    created_at: task.created_at || task.createdAt || new Date().toISOString(),
  };
}

export const Coder: React.FC<CoderProps> = ({ noLayout = false }) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [selectedTags, setSelectedTags] = useState<{ [groupId: string]: string[] }>({});
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notes tab
  const [rightTab, setRightTab] = useState<'coding' | 'notes'>('coding');
  const [memoContent, setMemoContent] = useState('');
  const [memoSaved, setMemoSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const memoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingAISuggestion, setLoadingAISuggestion] = useState(false);
  /** Text selected in transcript / content panel for AI suggest */
  const [aiSelectedText, setAiSelectedText] = useState<string | null>(null);
  const [projectMemo, setProjectMemo] = useState('');
  /** When false, hide Get AI Suggestion (project Settings). Default true until loaded. */
  const [aiFeaturesEnabled, setAiFeaturesEnabled] = useState(true);
  const [aiSuggestion, setAiSuggestion] = useState<{
    confidence: number;
    reasoning: string;
  } | null>(null);
  /** Audio/video: whole-media tags vs per-transcript-segment tags */
  const [avCodingGranularity, setAvCodingGranularity] = useState<AvCodingGranularity>('media');

  // 任务类型选择相关状态
  const [showTaskTypeSelector, setShowTaskTypeSelector] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<string | null>(null);
  const [taskTypeStats, setTaskTypeStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Check user application status across all projects
  const checkApplicationStatus = useCallback(async (): Promise<'approved' | 'pending' | 'none'> => {
    try {
      const token = localStorage.getItem('auth_state');
      if (!token) return 'none';
      
      const authState = JSON.parse(token);
      
      console.log('🔍 Checking application status across all projects...');
      
      // Fetch all projects
      const projectsResponse = await fetch(
        `${apiBaseUrl}/api/projects?token=${encodeURIComponent(authState.token)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (!projectsResponse.ok) {
        console.log('  ❌ Failed to fetch projects:', projectsResponse.status);
        return 'none';
      }
      
      const projectsData = await projectsResponse.json();
      const projects = projectsData.items || projectsData.projects || projectsData.data || projectsData || [];
      
      console.log(`  📋 Found ${projects.length} projects, checking applications...`);
      
      // Check each project for user's applications
      for (const project of projects) {
        const projectId = project.id || project._id;
        if (!projectId) continue;
        
        try {
          const appsResponse = await fetch(
            `${apiBaseUrl}/api/projects/${projectId}/applications?token=${encodeURIComponent(authState.token)}&limit=100`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );
          
          if (appsResponse.ok) {
            const appsData = await appsResponse.json();
            console.log(`  📦 Raw API response for project ${projectId}:`, appsData);
            console.log(`  📦 Response keys:`, Object.keys(appsData));
            
            const applicationsList = appsData.items || appsData.applications || appsData.data || [];
            console.log(`  📋 Parsed applications list:`, applicationsList);
            console.log(`  📋 Applications count:`, applicationsList.length);
            
            // Log first application structure for debugging
            if (applicationsList.length > 0) {
              console.log(`  📋 First application structure:`, applicationsList[0]);
              console.log(`  📋 Available fields:`, Object.keys(applicationsList[0]));
            }
            
            // Find user's application by user_id (most reliable since email may not be returned)
            console.log(`  🔍 Looking for applications matching user ID: ${user?.id}`);
            console.log(`  🔍 Looking for applications matching user email: ${user?.email}`);
            const userApplications = applicationsList.filter((app: any) => {
              const appUserId = app.applicant_user_id || app.applicantUserId || app.user_id || app.userId;
              const appEmail = app.applicant_email || app.applicantEmail || app.email;
              
              console.log(`    - Checking app:`, {
                appUserId,
                appEmail,
                userIdMatch: appUserId === user?.id,
                emailMatch: appEmail === user?.email,
                willMatch: appUserId === user?.id || appEmail === user?.email
              });
              
              return appUserId === user?.id || appEmail === user?.email;
            });
            
            if (userApplications.length > 0) {
              const latestApp = userApplications[0];
              const status = latestApp.status;
              
              console.log(`  ✅ Found application in project ${projectId}:`, status);
              
              // Save to localStorage for ApplicationPending page
              const appId = latestApp._id || latestApp.id;
              if (appId) localStorage.setItem('application_id', appId);
              if (projectId) localStorage.setItem('applied_project_id', projectId);
              
              // Return status
              if (status === 'approved') {
                console.log('  ✨ Application approved! Updating user data...');
                
                // Update user's project_id in localStorage
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('  📋 Current user before update:', currentUser);
                console.log('  📋 Current user project_id before:', currentUser.project_id);
                
                currentUser.project_id = projectId;
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Verify the update
                const verifyUser = JSON.parse(localStorage.getItem('user') || '{}');
                console.log('  📋 Current user after update:', currentUser);
                console.log('  📋 Verified user from localStorage:', verifyUser);
                console.log('  📋 Verified project_id:', verifyUser.project_id);
                console.log('  💾 Saved to localStorage successfully!');
                
                return 'approved';
              } else if (status === 'pending') {
                return 'pending';
              }
            }
          }
        } catch (error) {
          console.log(`  ⚠️ Error checking project ${projectId}:`, error);
          continue;
        }
      }
      
      console.log('  ❌ No application found');
      return 'none';
      
    } catch (error) {
      console.error('  ❌ Error checking applications:', error);
      return 'none';
    }
  }, [user, apiBaseUrl]);

  // 获取任务类型统计
  const fetchTaskTypeStats = useCallback(async () => {
    if (!user?.project_id) {
      return;
    }

    try {
      setLoadingStats(true);
      const token = getToken();
      if (!token) return;

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks/stats/by-type?token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch task stats');
      }

      const data = await response.json();
      console.log('📊 Task type stats:', data);

      // 定义所有可能的任务类型
      const allTaskTypes = ['text', 'image', 'video', 'audio', 'url', 'bibliographic', 'pdf_document_coding', 'multimodal'];

      // 转换为 TaskTypeStats 格式，确保所有类型都显示
      const stats = allTaskTypes.map((type) => {
        const count = data.stats[type] || 0; // 如果没有该类型，显示 0
        const config = getTaskTypeConfig(type);
        return {
          type,
          count,
          ...config,
        };
      });

      // 按数量排序（有任务的排在前面）
      stats.sort((a, b) => b.count - a.count);

      console.log('✅ Converted task type stats:', stats);
      setTaskTypeStats(stats);
    } catch (error) {
      console.error('❌ Failed to fetch task type stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.project_id, apiBaseUrl]);

  // 处理任务类型选择
  const handleSelectTaskType = (type: string | null) => {
    console.log('🎯 Selected task type:', type);
    setSelectedTaskType(type);
    setShowTaskTypeSelector(false);
    // 重新加载任务，直接传入选中的类型而不是等待 state 更新
    fetchTaskAndTags(type);
  };

  // 返回任务类型选择器
  const handleBackToTypeSelector = () => {
    setShowTaskTypeSelector(true);
    setCurrentTask(null);
    fetchTaskTypeStats();
  };

  // Wrap fetchTaskAndTags in useCallback to prevent re-creation
  const fetchTaskAndTags = useCallback(async (taskType?: string | null) => {
    if (!user?.project_id) {
      console.log('⚠️ No project_id, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        console.error('❌ No authentication token');
        throw new Error('No authentication token');
      }

      console.log('📡 Fetching next task for project:', user.project_id);

      // 使用传入的 taskType 参数，如果没有则使用 state 中的 selectedTaskType
      const typeToUse = taskType !== undefined ? taskType : selectedTaskType;
      
      // 构建 API URL，如果选择了任务类型则添加参数
      let url = `${apiBaseUrl}/api/projects/${user.project_id}/my-next-task?token=${encodeURIComponent(token)}`;
      if (typeToUse) {
        url += `&task_type=${encodeURIComponent(typeToUse)}`;
        console.log('🎯 Filtering by task type:', typeToUse);
      }

      // Use the new /my-next-task endpoint
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 404) {
        // No more tasks
        console.log('🎉 No more tasks available');
        setCurrentTask(null);
        setTagGroups([]);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch next task: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Received task data:', data);

      // Transform task
      const task = data.task;
      if (task) {
        const transformedTask = mapApiTaskToTask(task);
        
        // Check if it's a PDF document coding task - redirect to dedicated workspace
        if (transformedTask.task_type === 'pdf_document_coding') {
          console.log('📄 PDF Document Coding task detected, redirecting to PDF workspace');
          navigate(`/pdf-coding/${transformedTask.id}`);
          return;
        }
        
        setCurrentTask(transformedTask);
        setSelectedTags({});  // Reset tags for new task
        setMemoContent('');
        setAiSelectedText(null);
        setAiSuggestion(null);
        setAvCodingGranularity('media');
        if (user?.project_id) loadMemo(transformedTask.id, user.project_id);
        console.log('✅ Current task loaded:', transformedTask.id, 'type:', transformedTask.task_type);
      } else {
        console.log('⚠️ No task in response');
        setCurrentTask(null);
      }

      // Set tag groups (already included in response)
      const groups = data.tag_groups || [];
      setTagGroups(groups);
      console.log('✅ Tag groups loaded:', groups.length);
      
      console.log('✅ Data loading complete:', {
        hasTask: !!task,
        hasTagGroups: groups.length > 0,
        projectId: user.project_id
      });
      
      // Debug: Log tag groups structure
      console.log('📋 Tag groups structure:', groups);
      if (groups.length > 0) {
        console.log('📋 First group options:', groups[0].options);
        console.log('📋 First option keys:', groups[0].options?.[0] ? Object.keys(groups[0].options[0]) : 'N/A');
      }

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load data',
      });
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  }, [user?.project_id, apiBaseUrl, selectedTaskType]);

  // Check if user has a project or application - run only once on mount or when project_id changes
  useEffect(() => {
    console.log('🔄 useEffect triggered, user state:', {
      hasUser: !!user,
      project_id: user?.project_id,
      email: user?.email
    });

    const checkUserStatus = async () => {
      if (!user?.project_id) {
        console.log('⚠️ Coder has no project, checking application status...');
        
        // Check application status across all projects
        const status = await checkApplicationStatus();
        
        if (status === 'approved') {
          console.log('✨ Application approved! Refreshing user context...');
          // Refresh user from localStorage (project_id was updated by checkApplicationStatus)
          refreshUser();
          // The useEffect will re-run with new project_id and load the annotation interface
        } else if (status === 'pending') {
          console.log('⏳ Application pending, redirecting to pending page...');
          navigate('/coder/pending', { replace: true });
        } else {
          console.log('📝 No application found, redirecting to apply page...');
          navigate('/coder/apply', { replace: true });
        }
        setLoading(false);
        return;
      }

      // 用户有项目，首先显示任务类型选择器
      console.log('✅ User has project, showing task type selector');
      setShowTaskTypeSelector(true);
      await fetchTaskTypeStats();
      setLoading(false);
      console.log('📋 After fetchTaskTypeStats, showTaskTypeSelector:', true, 'loading:', false);
    };
    
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.project_id]); // Only re-run when project_id changes

  // Whether managers enabled AI for this project (hide Get AI Suggestion when off)
  useEffect(() => {
    if (!user?.project_id) {
      setAiFeaturesEnabled(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(
          `${apiBaseUrl}/api/projects/${user.project_id}/ai-status?token=${encodeURIComponent(token || '')}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          const on = data.llm_enabled !== false;
          setAiFeaturesEnabled(on);
          if (!on) setAiSuggestion(null);
        }
      } catch {
        /* keep default enabled if status endpoint unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.project_id, apiBaseUrl]);

  const handleTagChange = (groupId: string, optionValue: string, groupType: 'single' | 'multi') => {
    console.log('🏷️ Tag changed:', { groupId, optionValue, groupType });
    
    setSelectedTags((prev) => {
      const newTags = { ...prev };
      
      if (groupType === 'single') {
        // Single selection: replace with new value
        newTags[groupId] = [optionValue];
      } else {
        // Multiple selection: toggle
        const current = newTags[groupId] || [];
        if (current.includes(optionValue)) {
          newTags[groupId] = current.filter((id) => id !== optionValue);
        } else {
          newTags[groupId] = [...current, optionValue];
        }
      }
      
      console.log('🏷️ Updated tags:', newTags);
      return newTags;
    });
  };

  const hasVideoMedia = !!(currentTask && getPayloadVideo(currentTask));
  const hasAudioMedia = !!(currentTask && getPayloadAudio(currentTask));
  const isAvMediaTask = hasVideoMedia || hasAudioMedia;
  const avMediaLevelLabel =
    hasVideoMedia && hasAudioMedia
      ? 'Media-level'
      : hasVideoMedia
        ? 'Video-level'
        : 'Audio-level';
  const segmentCodingEnabled = !isAvMediaTask || avCodingGranularity === 'segment';

  const validateAnnotation = (): string | null => {
    // Segment-level A/V coding: tags live on transcript ranges, not whole-task form
    if (isAvMediaTask && avCodingGranularity === 'segment') {
      return null;
    }
    // Check required tag groups
    for (const group of tagGroups) {
      if (group.required) {
        const selected = selectedTags[group._id] || [];
        if (selected.length === 0) {
          return `Please select at least one option for "${group.name}" (required)`;
        }
      }
    }
    return null;
  };

  const handleGetAISuggestion = async () => {
    if (!aiFeaturesEnabled) {
      setMessage({ type: 'error', text: 'AI features are disabled for this project.' });
      return;
    }
    if (!currentTask || !user?.project_id) {
      setMessage({ type: 'error', text: 'No task available' });
      return;
    }

    if (tagGroups.length === 0) {
      setMessage({ type: 'error', text: 'No tag groups configured for this project.' });
      return;
    }

    // Prefer: (1) transcript/content selection (2) DOM selection (3) full task text / transcript
    let content = (aiSelectedText || '').trim();
    let contentSource = content ? 'selection' : '';

    if (!content) {
      const domSel = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
      if (domSel && domSel.length > 0) {
        content = domSel;
        contentSource = 'selection';
      }
    }

    if (!content) {
      // Try active transcript text for audio/video
      try {
        const tr = await getActiveTranscript(user.project_id, currentTask.id);
        const summary = (tr.summary || '').trim();
        const full =
          (tr.text || '').trim() ||
          (tr.segments || []).map((s) => s.text).join(' ').trim();
        if (summary) {
          content = summary;
          contentSource = 'transcript summary';
        } else if (full) {
          content = full.slice(0, 12000);
          contentSource = 'transcript';
        }
      } catch {
        /* no transcript */
      }
    }

    if (!content) {
      content = getTaskContentForAI(currentTask);
      contentSource = 'task content';
    }

    if (!content) {
      setMessage({
        type: 'error',
        text: 'No text to send. Select transcript segments/words or text in the task, then try again.',
      });
      return;
    }

    try {
      setLoadingAISuggestion(true);
      setMessage(null);
      setAiSuggestion(null);

      const token = getToken();
      if (!token) throw new Error('No authentication token');

      // Load project memo if we don't have it yet
      let memo = projectMemo;
      if (!memo && user.project_id) {
        try {
          const res = await fetch(
            `${apiBaseUrl}/api/projects/${user.project_id}?token=${encodeURIComponent(token)}`
          );
          if (res.ok) {
            const proj = await res.json();
            memo = String(proj.memo || proj.description || '').trim();
            if (memo) setProjectMemo(memo);
          }
        } catch {
          /* optional */
        }
      }

      // Full codebook: every group + tags + descriptions
      const tagGroupsForAI = tagGroups
        .filter((g) => g.active !== false)
        .map((group) => ({
          group_id: group.group_id || group._id,
          group_name: group.name,
          description: group.description || '',
          type: group.type,
          options: (group.options || [])
            .filter((o) => (o as any).active !== false)
            .map((opt) => ({
              value: (opt as any).option_id || opt.value || opt.label,
              label: opt.label,
              description: opt.description || '',
            })),
        }));

      console.log('🤖 AI suggest', {
        source: contentSource,
        contentLen: content.length,
        groups: tagGroupsForAI.length,
        hasMemo: !!memo,
      });

      const result = await getAnnotationSuggestion(content, tagGroupsForAI, token, {
        projectId: user.project_id,
        projectMemo: memo || undefined,
        // Model comes from project Settings (annotation_model); omit client hardcode
      });

      if (!result?.success || !result.annotation) {
        throw new Error('AI returned an empty response');
      }

      const suggestions: { [groupId: string]: string[] } = {};
      let appliedCount = 0;

      for (const label of result.annotation.labels || []) {
        const tagGroup = tagGroups.find(
          (g) =>
            g.group_id === label.group_id ||
            g._id === label.group_id ||
            g.name === label.group_name
        );
        if (!tagGroup || !Array.isArray(label.selected) || label.selected.length === 0) continue;

        // Map returned values onto option_id/value used by the UI
        const mapped: string[] = [];
        for (const sel of label.selected) {
          const key = String(sel).trim().toLowerCase();
          const opt = tagGroup.options.find((o) => {
            const id = String((o as any).option_id || o.value || o.label || '').toLowerCase();
            const lab = String(o.label || '').toLowerCase();
            return id === key || lab === key;
          });
          if (opt) {
            mapped.push((opt as any).option_id || opt.value || opt.label);
          }
        }
        if (mapped.length === 0) continue;
        suggestions[tagGroup._id] = mapped;
        appliedCount += mapped.length;
      }

      setSelectedTags((prev) => ({ ...prev, ...suggestions }));
      setAiSuggestion({
        confidence: result.annotation.overall_confidence ?? 0,
        reasoning: result.annotation.reasoning || '',
      });

      if (appliedCount === 0) {
        setMessage({
          type: 'error',
          text:
            result.annotation.reasoning ||
            'AI responded but no matching tags were applied. Check codebook option values.',
        });
      } else {
        setMessage({
          type: 'success',
          text: `AI applied ${appliedCount} tag(s) from ${contentSource} (confidence: ${((result.annotation.overall_confidence || 0) * 100).toFixed(0)}%)`,
        });
      }
    } catch (error) {
      console.error('❌ Failed to get AI suggestion:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to get AI suggestion',
      });
    } finally {
      setLoadingAISuggestion(false);
    }
  };

  const handleAiTextSelect = useCallback((text: string | null) => {
    setAiSelectedText(text);
  }, []);

  // ── Notes (reflexive memos) ──────────────────────────────────────────────

  const loadMemo = useCallback(async (taskId: string, projectId: string) => {
    try {
      const token = getToken();
      const res = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/tasks/${taskId}/note?token=${encodeURIComponent(token || '')}`
      );
      if (res.ok) {
        const data = await res.json();
        setMemoContent(data.content || '');
      }
    } catch { /* silent */ }
  }, [apiBaseUrl]);

  const saveMemo = useCallback(async (taskId: string, projectId: string, content: string) => {
    setMemoSaved('saving');
    try {
      const token = getToken();
      await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/tasks/${taskId}/note?token=${encodeURIComponent(token || '')}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );
      setMemoSaved('saved');
      setTimeout(() => setMemoSaved('idle'), 2000);
    } catch { setMemoSaved('idle'); }
  }, [apiBaseUrl]);

  function handleMemoChange(val: string) {
    setMemoContent(val);
    setMemoSaved('idle');
    if (memoDebounce.current) clearTimeout(memoDebounce.current);
    if (currentTask && user?.project_id) {
      memoDebounce.current = setTimeout(() => {
        saveMemo(currentTask.id, user.project_id!, val);
      }, 1000);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!currentTask || !user?.project_id) {
      alert('No task to save');
      return;
    }

    // Flush any pending memo save before submitting
    if (memoDebounce.current) {
      clearTimeout(memoDebounce.current);
      memoDebounce.current = null;
    }
    if (memoContent.trim()) {
      await saveMemo(currentTask.id, user.project_id, memoContent);
    }

    // Validate
    const validationError = validateAnnotation();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const token = getToken();
      if (!token) throw new Error('No authentication token');

      console.log('💾 Submitting annotation and fetching next task...');
      console.log('📋 Current selectedTags:', selectedTags);
      
      // Convert selectedTags object to labels array format with tag names
      // Instead of saving option_ids, we save the actual option labels for better readability
      const labelsArray = Object.entries(selectedTags).map(([tag_group_id, option_values]) => {
        // Find the tag group by _id
        const tagGroup = tagGroups.find(g => g._id === tag_group_id);
        
        if (!tagGroup) {
          console.warn(`⚠️ Tag group ${tag_group_id} not found`);
          return {
            group_id: tag_group_id, // Fallback to the _id if not found
            option_ids: Array.isArray(option_values) ? option_values : [option_values]
          };
        }
        
        // Convert option values (IDs) to option labels
        const optionIds = Array.isArray(option_values) ? option_values : [option_values];
        const optionLabels = optionIds.map(optionValue => {
          const option = tagGroup.options.find(opt => {
            const optVal = (opt as any).option_id || opt.value || opt.label;
            return optVal === optionValue;
          });
          
          if (!option) {
            console.warn(`⚠️ Option ${optionValue} not found in group ${tag_group_id}`);
            return optionValue; // Fallback to the value itself
          }
          
          // Return the label (human-readable name) instead of the ID
          return option.label;
        });
        
        return {
          group_id: tagGroup.group_id, // Use the group_id field for backend API
          option_ids: optionLabels  // Now contains labels like "Positive", "School" instead of IDs
        };
      });
      
      console.log('📋 Converted to labels array (with names):', labelsArray);
      console.log('📋 Full request body:', {
        task_id: currentTask.id,
        labels: labelsArray,
        notes: note.trim() || undefined,
      });

      // Use the new /submit-and-next endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/submit-and-next?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: currentTask.id,
            labels: labelsArray,
            notes: note.trim() || undefined,
          }),
        }
      );

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { detail: errorText };
        }
        
        throw new Error(errorData?.detail || errorData?.message || `Failed to save: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Annotation submitted:', result);
      console.log('✅ Response structure:', {
        has_more: result.has_more,
        hasNextTask: !!result.next_task,
        submittedId: result.submitted?.annotation_id
      });
      
      // Verify that the backend updated the task status
      console.log('🔍 Verifying task status update (backend should have done this)...');
      if (result.submitted?.task_id) {
        console.log(`   Previous task ${result.submitted.task_id} should now be marked as "completed" by backend`);
      }

      setMessage({
        type: 'success',
        text: 'Annotation saved successfully!',
      });

      // Check if there are more tasks
      if (result.has_more && result.next_task) {
        console.log('📝 Loading next task...');
        
        // Load next task from response
        setTimeout(() => {
          const nextTask = result.next_task.task;
          if (nextTask) {
            const transformedTask = mapApiTaskToTask(nextTask);
            setCurrentTask(transformedTask);
            setTagGroups(result.next_task.tag_groups || []);
            setSelectedTags({});
            setNote('');
            setMemoContent('');
            setRightTab('coding');
            setAvCodingGranularity('media');
            setAiSelectedText(null);
            setAiSuggestion(null);
            if (user?.project_id) loadMemo(transformedTask.id, user.project_id);
            setMessage(null);
          }
        }, 1500);
      } else {
        console.log('🎉 All tasks completed!');
        setTimeout(() => {
          setCurrentTask(null);
          setTagGroups([]);
          setSelectedTags({});
          setNote('');
          setMessage({
            type: 'success',
            text: '🎉 All tasks completed!',
          });
        }, 1500);
      }

    } catch (error) {
      console.error('❌ Failed to save annotation:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save annotation',
      });
    } finally {
      setSaving(false);
    }
  };

  // Never define a component inside Coder — a new type each render remounts
  // the whole tree (Drive iframe + transcript reload on every keystroke).
  const wrap = (node: ReactNode) =>
    noLayout ? <>{node}</> : <PageLayout>{node}</PageLayout>;

  if (loading) {
    return wrap(
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading annotation interface...</p>
        </div>
      </div>
    );
  }

  // 显示任务类型选择器
  if (showTaskTypeSelector) {
    console.log('🎨 Rendering TaskTypeSelector with stats:', taskTypeStats);
    return wrap(
      <div className="max-w-6xl mx-auto space-y-6 py-8">
        <TaskTypeSelector
          stats={taskTypeStats}
          onSelectType={handleSelectTaskType}
          loading={loadingStats}
        />
      </div>
    );
  }

  // 没有任务时的显示
  if (!loading && !currentTask) {
    console.log('🎨 Rendering "All Tasks Completed" screen');
    return wrap(
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">All Tasks Completed!</h2>
          <p className="text-gray-600 mb-6">
            {selectedTaskType 
              ? `You've finished all ${selectedTaskType} tasks.`
              : "Great work! You've completed all your assigned tasks."}
          </p>
          {selectedTaskType && (
            <Button onClick={handleBackToTypeSelector} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Task Types
            </Button>
          )}
        </div>
        <MessageManagerDialog />
      </div>
    );
  }

  return wrap(
    <>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header with Message Button and Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedTaskType && (
              <Button
                onClick={handleBackToTypeSelector}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Task Annotation
                {selectedTaskType && (
                  <span className="ml-2 text-lg font-normal text-gray-500">
                    ({getTaskTypeConfig(selectedTaskType).label})
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Complete your assigned tasks</p>
            </div>
          </div>
          <MessageManagerDialog />
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Task Display - Two Column Layout for Bibliographic Tasks */}
        {isBibliographicTask(currentTask) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Bibliographic Content */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      Current Task
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-normal text-gray-500">#{currentTask.id.slice(-6)}</span>
                    </CardTitle>
                    <Badge variant="secondary">Assigned</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const bibMetadata = getBibliographicMetadata(currentTask);
                    
                    if (!bibMetadata) {
                      return (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-500">
                            Bibliographic metadata not available
                          </p>
                          {currentTask.payload.text && (
                            <p className="text-base text-gray-900 whitespace-pre-wrap leading-relaxed mt-4">
                              {currentTask.payload.text}
                            </p>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <BibliographicTaskDisplay
                        metadata={bibMetadata}
                        abstract={currentTask.payload.text}
                      />
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Annotation Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Annotation Tags</CardTitle>
                      <CardDescription>
                        Select appropriate tags for this task. Fields marked with * are required.
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {aiFeaturesEnabled && (
                        <>
                          <Button
                            variant="outline"
                            onClick={handleGetAISuggestion}
                            disabled={loadingAISuggestion}
                            className="flex items-center gap-2"
                          >
                          {loadingAISuggestion ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Get AI Suggestion
                            </>
                          )}
                          </Button>
                          <p className="text-[11px] text-gray-400 max-w-[220px] text-right">
                            {aiSelectedText?.trim()
                              ? `Using selection (${aiSelectedText.trim().length} chars)`
                              : 'Select transcript/text first, or uses full task text'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* AI Suggestion Display */}
                  {aiFeaturesEnabled && aiSuggestion && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-blue-900">AI Suggestion</span>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Confidence: {(aiSuggestion.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-700 leading-relaxed">
                            {aiSuggestion.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {tagGroups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No tag groups configured for this project.</p>
                    </div>
                  ) : (
                    tagGroups.map((group) => (
                      <div key={group._id} className="space-y-3">
                        <Label className="text-base font-semibold text-gray-900">
                          {group.name}
                          {group.required && <span className="text-red-500 ml-1">*</span>}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            ({group.type === 'single' ? 'Single choice' : 'Multiple choice'})
                          </span>
                        </Label>
                        {group.description && (
                          <p className="text-sm text-gray-500 -mt-2">{group.description}</p>
                        )}

                        {group.type === 'single' ? (
                          <RadioGroupPrimitive.Root
                            value={selectedTags[group._id]?.[0] || ''}
                            onValueChange={(value) => handleTagChange(group._id, value, 'single')}
                            className="space-y-2"
                          >
                            {group.options.map((option) => {
                                const optionValue = (option as any).option_id || option.value || option.label;
                                const isSelected = selectedTags[group._id]?.includes(optionValue);

                                return (
                                  <div
                                    key={optionValue}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                                      isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <RadioGroupPrimitive.Item
                                      value={optionValue}
                                      className="h-5 w-5 rounded-full border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    >
                                      <RadioGroupPrimitive.Indicator>
                                        <Circle className="h-2.5 w-2.5 fill-white" />
                                      </RadioGroupPrimitive.Indicator>
                                    </RadioGroupPrimitive.Item>
                                    <Label className="flex-1 cursor-pointer text-sm text-gray-900">
                                      {option.label}
                                    </Label>
                                  </div>
                                );
                              })}
                          </RadioGroupPrimitive.Root>
                        ) : (
                          <div className="space-y-2">
                            {group.options.map((option) => {
                                const optionValue = (option as any).option_id || option.value || option.label;
                                const isChecked = selectedTags[group._id]?.includes(optionValue) ?? false;

                                return (
                                  <div
                                    key={optionValue}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                                      isChecked
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <CheckboxPrimitive.Root
                                      checked={isChecked}
                                      onCheckedChange={() =>
                                        handleTagChange(group._id, optionValue, 'multi')
                                      }
                                      className="h-5 w-5 rounded border-2 border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    >
                                      <CheckboxPrimitive.Indicator>
                                        <Check className="h-4 w-4 text-white" />
                                      </CheckboxPrimitive.Indicator>
                                    </CheckboxPrimitive.Root>
                                    <Label className="flex-1 cursor-pointer text-sm text-gray-900">
                                      {option.label}
                                    </Label>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Notes section */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label htmlFor="notes" className="text-base font-semibold text-gray-900">
                      Additional Notes (Optional)
                    </Label>
                    <textarea
                      id="notes"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add any observations, concerns, or comments about this task..."
                      className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                    <p className="text-xs text-gray-500">{note.length} characters</p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Submit Annotation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <>
        {/* Original Single Column Layout for Non-Bibliographic Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Current Task
                <ChevronRight className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-normal text-gray-500">#{currentTask.id.slice(-6)}</span>
              </CardTitle>
              <Badge variant="secondary">Assigned</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAvMediaTask && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Coding granularity</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setAvCodingGranularity('media')}
                    className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      avCodingGranularity === 'media'
                        ? 'border-primary bg-white text-gray-900 shadow-sm ring-1 ring-primary'
                        : 'border-gray-200 bg-white/60 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{avMediaLevelLabel}</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">
                      Tag the entire {hasVideoMedia && !hasAudioMedia ? 'video' : hasAudioMedia && !hasVideoMedia ? 'audio' : 'media'} clip
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvCodingGranularity('segment')}
                    className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      avCodingGranularity === 'segment'
                        ? 'border-primary bg-white text-gray-900 shadow-sm ring-1 ring-primary'
                        : 'border-gray-200 bg-white/60 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">Segment-level</span>
                    <span className="mt-0.5 block text-[11px] text-gray-500">
                      Select time ranges in the transcript and tag each separately
                    </span>
                  </button>
                </div>
              </div>
            )}
            <CoderTaskMediaPanel
              task={currentTask}
              projectId={user?.project_id || ''}
              userId={user?.id || ''}
              tagGroups={tagGroups}
              onOpenPdfCoding={(taskId) => navigate(`/pdf-coding/${taskId}`)}
              onTextSelect={handleAiTextSelect}
              segmentCodingEnabled={segmentCodingEnabled}
            />
          </CardContent>
        </Card>

        {/* Annotation Form */}
        <Card>
          <CardHeader className="pb-3">
            {/* Coding / Notes tab switcher */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3 w-fit">
              <button
                onClick={() => setRightTab('coding')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  rightTab === 'coding'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Tags className="h-3.5 w-3.5" />
                Coding
              </button>
              <button
                onClick={() => setRightTab('notes')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  rightTab === 'notes'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Notes
                {memoContent.trim().length > 0 && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                )}
              </button>
            </div>

            {rightTab === 'coding' && (
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {isAvMediaTask && avCodingGranularity === 'segment'
                    ? 'Segment coding'
                    : 'Annotation Tags'}
                </CardTitle>
                <CardDescription>
                  {isAvMediaTask && avCodingGranularity === 'segment'
                    ? 'Apply tags to selected transcript segments on the left. Then mark the task complete when finished.'
                    : 'Select appropriate tags for this task. Fields marked with * are required.'}
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                {aiFeaturesEnabled && !(isAvMediaTask && avCodingGranularity === 'segment') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleGetAISuggestion}
                      disabled={loadingAISuggestion}
                      className="flex items-center gap-2"
                    >
                    {loadingAISuggestion ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Get AI Suggestion
                      </>
                    )}
                    </Button>
                    <p className="text-[11px] text-gray-400 max-w-[220px] text-right">
                      {aiSelectedText?.trim()
                        ? `Using selection (${aiSelectedText.trim().length} chars)`
                        : 'Select transcript/text first, or uses full task text'}
                    </p>
                  </>
                )}
              </div>
            </div>
            )}
          </CardHeader>
          {/* Notes Tab Content */}
          {rightTab === 'notes' && (
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Write your analytical thoughts, interpretive stance, or questions about this task.
                These notes are private to you and auto-saved.
              </p>
              <textarea
                value={memoContent}
                onChange={(e) => handleMemoChange(e.target.value)}
                placeholder="Why did you code it this way? What assumptions are you making? Any doubts or patterns you notice?..."
                rows={10}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-y"
              />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{memoContent.length} characters</span>
                <span className={
                  memoSaved === 'saving' ? 'text-gray-400' :
                  memoSaved === 'saved'  ? 'text-green-500' : ''
                }>
                  {memoSaved === 'saving' ? 'Saving…' : memoSaved === 'saved' ? '✓ Saved' : ''}
                </span>
              </div>
            </CardContent>
          )}

          {/* Coding Tab Content */}
          {rightTab === 'coding' && <CardContent className="space-y-6">
            {/* AI Suggestion Display */}
            {aiFeaturesEnabled && aiSuggestion && avCodingGranularity !== 'segment' && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-blue-900">AI Suggestion</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Confidence: {(aiSuggestion.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      {aiSuggestion.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isAvMediaTask && avCodingGranularity === 'segment' ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 space-y-2">
                <p className="font-medium">Segment-level tagging</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs leading-relaxed">
                  <li>Select one or more transcript segments (click, Shift+click, or drag).</li>
                  <li>Apply codebook tags for that time range in the transcript panel.</li>
                  <li>Repeat for other segments — each range keeps its own tags.</li>
                  <li>When finished, mark the task complete below.</li>
                </ol>
                <p className="text-[11px] text-blue-700/80">
                  Needs an available transcript under the media player. If none appears, ask a manager to run transcription first.
                </p>
              </div>
            ) : tagGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No tag groups configured for this project.</p>
              </div>
            ) : (
              tagGroups.map((group) => (
                <div key={group._id} className="space-y-3">
                  <Label className="text-base font-semibold text-gray-900">
                    {group.name}
                    {group.required && <span className="text-red-500 ml-1">*</span>}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({group.type === 'single' ? 'Single choice' : 'Multiple choice'})
                    </span>
                  </Label>
                  {group.description && (
                    <p className="text-sm text-gray-500 -mt-2">{group.description}</p>
                  )}

                  {group.type === 'single' ? (
                    // Radio buttons for single selection
                    <RadioGroupPrimitive.Root
                      value={selectedTags[group._id]?.[0] || ''}
                      onValueChange={(value: string) => {
                        console.log('📻 Radio change event:', { group_id: group._id, value });
                        handleTagChange(group._id, value, 'single');
                      }}
                      className="space-y-2"
                    >
                      {group.options.map((option) => {
                        const optionValue = (option as any).option_id || option.value || option.label;
                        return (
                        <div key={optionValue} className="flex items-center space-x-3">
                          <RadioGroupPrimitive.Item
                            value={optionValue}
                            id={`radio-${group._id}-${optionValue}`}
                            className="aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
                              <Circle className="h-2.5 w-2.5 fill-current text-current" />
                            </RadioGroupPrimitive.Indicator>
                          </RadioGroupPrimitive.Item>
                          <label
                            htmlFor={`radio-${group._id}-${optionValue}`}
                            className="text-sm text-gray-700 cursor-pointer font-normal flex-1"
                          >
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-gray-400 ml-2">- {option.description}</span>
                            )}
                          </label>
                        </div>
                      )})}
                    </RadioGroupPrimitive.Root>
                  ) : (
                    // Checkboxes for multiple selection
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const optionValue = (option as any).option_id || option.value || option.label;
                        return (
                        <div key={optionValue} className="flex items-center space-x-3">
                          <CheckboxPrimitive.Root
                            checked={(selectedTags[group._id] || []).includes(optionValue)}
                            onCheckedChange={() => handleTagChange(group._id, optionValue, 'multi')}
                            id={`check-${group._id}-${optionValue}`}
                            className="h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          >
                            <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
                              <Check className="h-4 w-4" />
                            </CheckboxPrimitive.Indicator>
                          </CheckboxPrimitive.Root>
                          <label
                            htmlFor={`check-${group._id}-${optionValue}`}
                            className="text-sm text-gray-700 cursor-pointer font-normal flex-1"
                          >
                            <span>{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-gray-400 ml-2">- {option.description}</span>
                            )}
                          </label>
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Note Section */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="note" className="text-base font-semibold text-gray-900">
                Additional Notes (Optional)
              </Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any observations, concerns, or comments about this task..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
              />
              <p className="text-xs text-gray-500">{note.length} characters</p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isAvMediaTask && avCodingGranularity === 'segment'
                      ? 'Mark Task Complete'
                      : 'Save Annotation'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>}
        </Card>
          </>
        )}
      </div>

      {/* 浮动聊天按钮 */}
      {user?.id && user?.project_id && (
        <ChatButton projectId={user.project_id} userId={user.id} />
      )}
    </>
  );
};
