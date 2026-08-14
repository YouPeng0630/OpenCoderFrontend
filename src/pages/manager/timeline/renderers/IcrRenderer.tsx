import type { TimelineActor, TimelineEvent } from '../types'

export function IcrRenderer({ event }: { event: TimelineEvent }) {
  const taskTitle = String(event.payload.taskTitle || 'a task')
  const resolution = event.payload.resolution as string | undefined
  const coders = (event.payload.coders as TimelineActor[]) || []

  return (
    <div>
      <p className="text-sm text-slate-800">
        Resolved ICR on <span className="font-medium text-slate-900">{taskTitle}</span>
      </p>
      {coders.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          between {coders.map((c) => c.name).join(' & ')}
        </p>
      )}
      {resolution && (
        <p className="mt-2 rounded-md border border-rose-100 bg-rose-50/50 px-2.5 py-1.5 text-sm text-slate-700">
          {resolution}
        </p>
      )}
    </div>
  )
}
