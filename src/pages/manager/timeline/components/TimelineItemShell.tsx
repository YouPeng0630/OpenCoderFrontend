import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ActorAvatar } from './ActorAvatar'
import { ActorHoverRegion, ActorNameText, MeBadge, RoleBadge } from './ActorHoverCard'
import { EventTypeIcon } from '../eventIcon'
import type { TimelineActor, TimelineEventType, TimelineRendererKind } from '../types'

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function isTimelineActorMe(
  actor: TimelineActor,
  user: { id?: string; email?: string } | null | undefined
): boolean {
  if (!user) return false
  if (actor.id && user.id && actor.id === user.id) return true
  if (actor.email && user.email && actor.email.toLowerCase() === user.email.toLowerCase()) {
    return true
  }
  return false
}

export function TimelineItemShell({
  actor,
  createdAt,
  eventType,
  renderer: _renderer,
  children,
  isLast,
}: {
  actor: TimelineActor
  createdAt: string
  eventType: TimelineEventType
  renderer: TimelineRendererKind
  children: ReactNode
  isLast?: boolean
}) {
  const { user } = useAuth()
  const isMe = isTimelineActorMe(actor, user)

  return (
    <li className="relative pb-9 last:pb-1">
      {!isLast && (
        <span
          className="absolute left-[17px] top-9 bottom-0 w-px bg-slate-200"
          aria-hidden
        />
      )}

      {/* Avatar + name share one hover region; popup always under the avatar */}
      <ActorHoverRegion actor={actor} isMe={isMe} className="flex gap-3">
        <div className="relative z-[1] shrink-0">
          <ActorAvatar actor={actor} />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <ActorNameText actor={actor} />
            <RoleBadge role={actor.role} />
            {isMe && <MeBadge />}
            <span className="text-xs text-slate-300">·</span>
            <time
              className="text-xs text-slate-400"
              dateTime={createdAt}
              title={new Date(createdAt).toLocaleString()}
            >
              {formatWhen(createdAt)}
            </time>
          </div>
        </div>
      </ActorHoverRegion>

      {/*
        Event icon sits mid-left of the *action body* (not under the avatar):
        [avatar] name…
                 [icon] action text / details
      */}
      <div className="mt-1.5 flex gap-2.5 pl-12">
        <EventTypeIcon type={eventType} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  )
}
