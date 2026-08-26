/** Project Logbook — event model (what happened on the project). */

export type TimelineRendererKind =
  | 'project'
  | 'member'
  | 'file'
  | 'tag'
  | 'coding'
  | 'icr'
  | 'export'
  | 'transcription'
  | 'memo'
  | 'settings'
  | 'ai'
  | 'discussion'

/**
 * Fixed logbook event catalog (filter sidebar uses this list — not derived from API).
 * Some types may have no events yet; they still appear as filter options.
 */
export type TimelineEventType =
  | 'project.created'
  | 'member.applied'
  | 'member.approved'
  | 'member.rejected'
  | 'member.assigned'
  | 'file.uploaded'
  | 'file.deleted'
  | 'tag.group_created'
  | 'tag.group_deleted'
  | 'tag.group_updated'
  | 'coding.activity'
  | 'icr.resolved'
  | 'export.completed'
  | 'transcription.completed'
  | 'transcription.summarized'
  | 'memo.added'
  | 'settings.updated'
  | 'ai.report_generated'
  | 'discussion.recorded'

export interface TimelineActor {
  id: string
  name: string
  email?: string
  avatarUrl?: string
  role?: 'project-manager' | 'coder' | string
}

export interface CodingTaskDetail {
  taskId: string
  title: string
  taskType?: string
  completedAt: string
}

export interface TagOption {
  id: string
  label: string
  description?: string
}

export interface TagGroupSnapshot {
  id: string
  name: string
  description?: string
  options: TagOption[]
}

/** Diff payload for tag group create / update / delete. */
export interface TagChangePayload {
  groupId: string
  groupName: string
  /** Full group after create, or before delete */
  group?: TagGroupSnapshot
  /** For updates: before / after snapshots */
  before?: TagGroupSnapshot
  after?: TagGroupSnapshot
  addedOptions?: TagOption[]
  removedOptions?: TagOption[]
  renamedOptions?: Array<{ from: string; to: string }>
  nameChanged?: { from: string; to: string }
  descriptionChanged?: { from: string; to: string }
  optionDescriptionChanged?: Array<{
    id?: string
    label: string
    from: string
    to: string
  }>
  /** Manager note explaining this codebook change */
  changeNote?: string
}

export interface FileUploadItem {
  taskId: string
  title: string
  mediaType?: 'image' | 'video' | 'audio' | 'pdf' | 'text' | string
}

export interface TimelineEvent {
  id: string
  type: TimelineEventType
  renderer: TimelineRendererKind
  createdAt: string
  actor: TimelineActor
  /** One-line headline; renderers may ignore and compose their own */
  summary: string
  /** Type-specific payload */
  payload: Record<string, unknown>
}

export type DayRange = 7 | 30
