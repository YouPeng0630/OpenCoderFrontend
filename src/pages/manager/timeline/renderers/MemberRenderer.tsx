import type { TimelineActor, TimelineEvent } from '../types'
import { ExpandableDetails } from './ExpandableDetails'
import { ActorAvatar } from '../components/ActorAvatar'
import { ActorHoverRegion, ActorNameText } from '../components/ActorHoverCard'

function Person({ person }: { person: TimelineActor }) {
  return (
    <ActorHoverRegion
      actor={person}
      avatarSize="sm"
      className="inline-flex items-center gap-1.5 align-middle"
    >
      <ActorAvatar actor={person} size="sm" />
      <ActorNameText actor={person} />
    </ActorHoverRegion>
  )
}

export function MemberRenderer({ event }: { event: TimelineEvent }) {
  const applicant = event.payload.applicant as TimelineActor | undefined
  const assignee = event.payload.assignee as TimelineActor | undefined
  const taskTitles = (event.payload.taskTitles as string[]) || []
  const taskCount = Number(event.payload.taskCount || taskTitles.length || 0)
  const message = event.payload.message as string | undefined
  const reason = event.payload.reason as string | undefined

  if (event.type === 'member.applied') {
    return (
      <div>
        <p className="text-sm text-slate-800">Applied to join this project</p>
        {message && (
          <p className="mt-1.5 text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">
            “{message}”
          </p>
        )}
      </div>
    )
  }

  if (event.type === 'member.approved' && applicant) {
    return (
      <p className="text-sm text-slate-800">
        Approved <Person person={applicant} /> as coder
      </p>
    )
  }

  if (event.type === 'member.rejected' && applicant) {
    return (
      <div>
        <p className="text-sm text-slate-800">
          Rejected application from <Person person={applicant} />
        </p>
        {reason && (
          <p className="mt-1 text-xs text-slate-500">reason: {reason}</p>
        )}
      </div>
    )
  }

  if (event.type === 'member.assigned' && assignee) {
    return (
      <div>
        <p className="text-sm text-slate-800">
          Assigned <span className="font-semibold text-slate-900">{taskCount}</span> task
          {taskCount === 1 ? '' : 's'} to <Person person={assignee} />
        </p>
        {taskTitles.length > 0 && (
          <ExpandableDetails summary={`View ${taskTitles.length} assigned tasks`}>
            <ul className="space-y-1.5">
              {taskTitles.map((title, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-slate-300">•</span>
                  <span>{title}</span>
                </li>
              ))}
            </ul>
          </ExpandableDetails>
        )}
      </div>
    )
  }

  return <p className="text-sm text-slate-800">{event.summary}</p>
}
