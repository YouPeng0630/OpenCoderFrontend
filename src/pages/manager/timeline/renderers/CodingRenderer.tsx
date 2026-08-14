import type { CodingTaskDetail, TimelineEvent } from '../types'
import { ExpandableDetails } from './ExpandableDetails'

export function CodingRenderer({ event }: { event: TimelineEvent }) {
  const tasks = (event.payload.tasks as CodingTaskDetail[]) || []
  const count = Number(event.payload.completedCount || tasks.length || 0)

  return (
    <div>
      <p className="text-sm text-slate-800">
        Completed{' '}
        <span className="font-semibold text-emerald-800">{count}</span> coding task
        {count === 1 ? '' : 's'}
      </p>
      {tasks.length > 0 && (
        <ExpandableDetails summary={`Show ${tasks.length} completed task${tasks.length === 1 ? '' : 's'}`}>
          <ul className="divide-y divide-slate-100">
            {tasks.map((t) => (
              <li key={t.taskId} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                  {t.taskType && (
                    <p className="mt-0.5 text-[11px] capitalize text-slate-400">
                      {t.taskType}
                    </p>
                  )}
                </div>
                <time
                  className="shrink-0 text-xs text-slate-400"
                  dateTime={t.completedAt}
                  title={new Date(t.completedAt).toLocaleString()}
                >
                  {new Date(t.completedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ul>
        </ExpandableDetails>
      )}
    </div>
  )
}
