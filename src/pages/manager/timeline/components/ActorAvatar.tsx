import * as Avatar from '@radix-ui/react-avatar'
import { Bot } from 'lucide-react'
import type { TimelineActor } from '../types'

export function ActorAvatar({ actor, size = 'md' }: { actor: TimelineActor; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  if (actor.role === 'system' || actor.id === 'system') {
    return (
      <span
        className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full bg-slate-800 text-white`}
        aria-label="System"
      >
        <Bot className={iconSize} strokeWidth={2.25} />
      </span>
    )
  }

  const initials = actor.name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Avatar.Root className={`inline-flex ${dim} shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-slate-200`}>
      {actor.avatarUrl ? (
        <Avatar.Image src={actor.avatarUrl} alt={actor.name} className="h-full w-full object-cover" />
      ) : null}
      <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-slate-700 font-medium text-white">
        {initials}
      </Avatar.Fallback>
    </Avatar.Root>
  )
}
