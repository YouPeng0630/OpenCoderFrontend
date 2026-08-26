import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  Download,
  FileUp,
  FolderPlus,
  Scale,
  Tag,
  Tags,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  ListTodo,
  PencilLine,
  FileAudio,
  Sparkles,
  StickyNote,
  Settings,
  MessageSquare,
  BarChart3,
} from 'lucide-react'
import type { TimelineEventType } from './types'

/**
 * Fixed Project Logbook event catalog.
 * Filter sidebar always lists every entry below (not loaded from the API).
 */
export const EVENT_ICON: Record<
  TimelineEventType,
  { icon: LucideIcon; label: string; className: string }
> = {
  'project.created': {
    icon: FolderPlus,
    label: 'Project created',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'member.applied': {
    icon: UserPlus,
    label: 'Coder applied',
    className: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  'member.approved': {
    icon: UserCheck,
    label: 'Coder approved',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'member.rejected': {
    icon: UserX,
    label: 'Coder rejected',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'member.assigned': {
    icon: ListTodo,
    label: 'Coder assigned',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  'file.uploaded': {
    icon: FileUp,
    label: 'Task created / uploaded',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  'file.deleted': {
    icon: Trash2,
    label: 'Task deleted',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'tag.group_created': {
    icon: Tags,
    label: 'Codebook group created',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'tag.group_updated': {
    icon: PencilLine,
    label: 'Codebook changed',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  'tag.group_deleted': {
    icon: Tag,
    label: 'Codebook group deleted',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'coding.activity': {
    icon: CheckCircle2,
    label: 'Coding completed',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'icr.resolved': {
    icon: Scale,
    label: 'Consensus / ICR resolved',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'export.completed': {
    icon: Download,
    label: 'Export completed',
    className: 'bg-teal-50 text-teal-700 ring-teal-200',
  },
  'transcription.completed': {
    icon: FileAudio,
    label: 'Transcription completed',
    className: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  'transcription.summarized': {
    icon: Sparkles,
    label: 'Transcript summarized',
    className: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  'memo.added': {
    icon: StickyNote,
    label: 'Memo / note added',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  'settings.updated': {
    icon: Settings,
    label: 'Project settings changed',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
  'ai.report_generated': {
    icon: BarChart3,
    label: 'AI report generated',
    className: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  'discussion.recorded': {
    icon: MessageSquare,
    label: 'Discussion / decision recorded',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
}

/** Stable order for Logbook filter checkboxes (fixed catalog). */
export const ALL_TIMELINE_EVENT_TYPES = Object.keys(EVENT_ICON) as TimelineEventType[]

export function eventTypeLabel(type: TimelineEventType): string {
  return EVENT_ICON[type]?.label ?? type
}

export function EventTypeIcon({ type }: { type: TimelineEventType }) {
  const meta = EVENT_ICON[type]
  if (!meta) return null
  const Icon = meta.icon

  return (
    <span
      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${meta.className}`}
      title={meta.label}
      aria-label={meta.label}
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} />
    </span>
  )
}
