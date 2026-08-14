import type { ReactNode } from 'react'
import type { TimelineActor } from '../types'
import { ActorAvatar } from './ActorAvatar'
import { Mail } from 'lucide-react'

function roleLabel(role?: string): 'Manager' | 'Coder' | 'System' | string {
  if (!role) return 'Member'
  if (role === 'project-manager' || role === 'manager') return 'Manager'
  if (role === 'coder') return 'Coder'
  if (role === 'system') return 'System'
  return role
}

export function RoleBadge({ role, size = 'md' }: { role?: string; size?: 'sm' | 'md' }) {
  const label = roleLabel(role)
  const isManager = label === 'Manager'
  const isCoder = label === 'Coder'
  const isSystem = label === 'System'

  const base =
    size === 'sm'
      ? 'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium'
      : 'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium'

  if (isManager) {
    return (
      <span className={`${base} bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/80`}>
        Manager
      </span>
    )
  }

  if (isCoder) {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80`}>
        Coder
      </span>
    )
  }

  if (isSystem) {
    return (
      <span className={`${base} bg-slate-800 text-white ring-1 ring-slate-700`}>
        System
      </span>
    )
  }

  return (
    <span className={`${base} bg-slate-100 text-slate-600 ring-1 ring-slate-200`}>
      {label}
    </span>
  )
}

/** Shown after Manager/Coder when the actor is the signed-in user. */
export function MeBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const base =
    size === 'sm'
      ? 'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold lowercase tracking-wide'
      : 'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold lowercase tracking-wide'

  return (
    <span className={`${base} bg-slate-900 text-white ring-1 ring-slate-900`}>
      me
    </span>
  )
}

function ActorCardPanel({ actor, isMe }: { actor: TimelineActor; isMe?: boolean }) {
  return (
    <div className="w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60">
      <div className="flex items-start gap-3">
        <ActorAvatar actor={actor} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{actor.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <RoleBadge role={actor.role} size="sm" />
            {isMe && <MeBadge size="sm" />}
          </div>
        </div>
      </div>
      {actor.email && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{actor.email}</span>
        </div>
      )}
      {actor.id && (
        <p className="mt-2 truncate px-0.5 font-mono text-[10px] text-slate-400">
          id · {actor.id}
        </p>
      )}
    </div>
  )
}

/**
 * Shared hover region: popup always anchors to the top-left of this wrapper
 * (typically the avatar), whether you hover the avatar or the name.
 */
export function ActorHoverRegion({
  actor,
  isMe,
  children,
  className = '',
  /** Match avatar size so the popup sits just under the avatar */
  avatarSize = 'md',
}: {
  actor: TimelineActor
  isMe?: boolean
  children: ReactNode
  className?: string
  avatarSize?: 'sm' | 'md'
}) {
  const top = avatarSize === 'sm' ? 'top-7' : 'top-9'

  return (
    <div className={`relative group/actor ${className}`}>
      {children}
      <div
        className={`pointer-events-none absolute left-0 ${top} z-30 pt-2 opacity-0 translate-y-1 transition-all duration-150 group-hover/actor:pointer-events-auto group-hover/actor:opacity-100 group-hover/actor:translate-y-0`}
        role="tooltip"
      >
        <ActorCardPanel actor={actor} isMe={isMe} />
      </div>
    </div>
  )
}

export function ActorNameText({ actor }: { actor: TimelineActor }) {
  return (
    <span className="rounded-sm text-sm font-semibold text-slate-900 underline-offset-2 group-hover/actor:underline group-hover/actor:text-slate-700">
      {actor.name}
    </span>
  )
}
