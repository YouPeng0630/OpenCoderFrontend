import type { TimelineEvent } from './types'

/** Merge a newly fetched page into existing events (dedupe + merge aggregates). */
export function mergeTimelineEvents(
  existing: TimelineEvent[],
  incoming: TimelineEvent[]
): TimelineEvent[] {
  const map = new Map<string, TimelineEvent>()
  for (const e of existing) map.set(e.id, e)

  for (const e of incoming) {
    const prev = map.get(e.id)
    if (!prev) {
      map.set(e.id, e)
      continue
    }
    if (
      e.type === 'coding.activity' ||
      e.type === 'file.uploaded' ||
      e.type === 'file.deleted'
    ) {
      map.set(e.id, mergeAggregated(prev, e))
    }
    // same id non-aggregate: keep existing (already shown)
  }

  return Array.from(map.values()).sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  )
}

function mergeAggregated(a: TimelineEvent, b: TimelineEvent): TimelineEvent {
  if (a.type === 'coding.activity') {
    const tasksA = (a.payload.tasks as unknown[]) || []
    const tasksB = (b.payload.tasks as unknown[]) || []
    const seen = new Set<string>()
    const tasks: unknown[] = []
    for (const t of [...tasksA, ...tasksB]) {
      const key = JSON.stringify(t)
      if (seen.has(key)) continue
      seen.add(key)
      tasks.push(t)
    }
    const newer = +new Date(a.createdAt) >= +new Date(b.createdAt) ? a : b
    return {
      ...newer,
      summary: `Completed ${tasks.length} coding task${tasks.length === 1 ? '' : 's'}`,
      payload: { ...newer.payload, completedCount: tasks.length, tasks },
    }
  }

  const filesA = (a.payload.files as unknown[]) || []
  const filesB = (b.payload.files as unknown[]) || []
  const seen = new Set<string>()
  const files: unknown[] = []
  for (const f of [...filesA, ...filesB]) {
    const key = JSON.stringify(f)
    if (seen.has(key)) continue
    seen.add(key)
    files.push(f)
  }
  const newer = +new Date(a.createdAt) >= +new Date(b.createdAt) ? a : b
  const verb = a.type === 'file.deleted' ? 'Deleted' : 'Uploaded'
  return {
    ...newer,
    summary: `${verb} ${files.length} task${files.length === 1 ? '' : 's'}`,
    payload: { ...newer.payload, count: files.length, files },
  }
}
