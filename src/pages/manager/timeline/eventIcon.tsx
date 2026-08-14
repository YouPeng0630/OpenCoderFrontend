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
} from 'lucide-react'
import type { TimelineEventType } from './types'

/**
 * Icon must match the *event action*, not a loose renderer category.
 * One type → one icon + short accessible label.
 */
export const EVENT_ICON: Record<
  TimelineEventType,
  { icon: LucideIcon; label: string; className: string }
> = {
  // Hover labels match body: sentence-case verb (Created / Updated / …).
  'project.created': {
    icon: FolderPlus,
    label: 'Created project',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'member.applied': {
    icon: UserPlus,
    label: 'Applied to join',
    className: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  'member.approved': {
    icon: UserCheck,
    label: 'Approved application',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'member.rejected': {
    icon: UserX,
    label: 'Rejected application',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'member.assigned': {
    icon: ListTodo,
    label: 'Assigned tasks',
    className: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  },
  'file.uploaded': {
    icon: FileUp,
    label: 'Uploaded tasks',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  'file.deleted': {
    icon: Trash2,
    label: 'Deleted tasks',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'tag.group_created': {
    icon: Tags,
    label: 'Created tag group',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'tag.group_updated': {
    icon: PencilLine,
    label: 'Updated tag group',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  'tag.group_deleted': {
    icon: Tag,
    label: 'Deleted tag group',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'coding.activity': {
    icon: CheckCircle2,
    label: 'Completed coding tasks',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  'icr.resolved': {
    icon: Scale,
    label: 'Resolved ICR',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'export.completed': {
    icon: Download,
    label: 'Exported project data',
    className: 'bg-teal-50 text-teal-700 ring-teal-200',
  },
  'transcription.completed': {
    icon: FileAudio,
    label: 'Completed transcription',
    className: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  'transcription.summarized': {
    icon: Sparkles,
    label: 'Generated summary',
    className: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
}

/** Stable order for filter checkboxes */
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
