import type { TimelineEvent } from '../types'

export function ProjectRenderer({ event }: { event: TimelineEvent }) {
  const name = String(event.payload.projectName || 'a project')
  const memo = String(event.payload.memo || '').trim()

  return (
    <div>
      <p className="text-sm text-slate-800">
        Created project <span className="font-medium text-slate-900">{name}</span>
      </p>
      {memo ? (
        <p className="mt-1.5 border-l-2 border-emerald-200 pl-3 text-sm italic text-slate-600">
          “{memo}”
        </p>
      ) : null}
    </div>
  )
}
