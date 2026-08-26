import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'
import { ALL_TIMELINE_EVENT_TYPES, eventTypeLabel } from './eventIcon'
import type { TimelineActor, TimelineEventType } from './types'

function toggleInSet<T>(prev: Set<T>, value: T): Set<T> {
  const next = new Set(prev)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

/** Fixed catalog — never replaced by API responses. */
const FIXED_EVENT_TYPES: TimelineEventType[] = ALL_TIMELINE_EVENT_TYPES

interface TimelineFilterContextValue {
  /** Always the full fixed event-type catalog */
  availableTypes: TimelineEventType[]
  availableActors: TimelineActor[]
  /** null = all; Set = only these (empty = none) */
  selectedTypes: Set<TimelineEventType> | null
  selectedActors: Set<string> | null
  setSelectedTypes: (next: Set<TimelineEventType> | null) => void
  setSelectedActors: (next: Set<string> | null) => void
  clearFilters: () => void
  hasActiveFilter: boolean
  /** People options still come from loaded logbook events */
  setAvailableActors: (actors: TimelineActor[]) => void
}

const TimelineFilterContext = createContext<TimelineFilterContextValue | null>(null)

export function TimelineFilterProvider({ children }: { children: ReactNode }) {
  const [availableActors, setAvailableActors] = useState<TimelineActor[]>([])
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType> | null>(null)
  const [selectedActors, setSelectedActors] = useState<Set<string> | null>(null)

  const clearFilters = useCallback(() => {
    setSelectedTypes(null)
    setSelectedActors(null)
  }, [])

  const value = useMemo(
    () => ({
      availableTypes: FIXED_EVENT_TYPES,
      availableActors,
      selectedTypes,
      selectedActors,
      setSelectedTypes,
      setSelectedActors,
      clearFilters,
      hasActiveFilter: selectedTypes !== null || selectedActors !== null,
      setAvailableActors,
    }),
    [
      availableActors,
      selectedTypes,
      selectedActors,
      clearFilters,
    ]
  )

  return (
    <TimelineFilterContext.Provider value={value}>
      {children}
    </TimelineFilterContext.Provider>
  )
}

export function useTimelineFilters() {
  const ctx = useContext(TimelineFilterContext)
  if (!ctx) {
    throw new Error('useTimelineFilters must be used within TimelineFilterProvider')
  }
  return ctx
}

/**
 * Project Logbook filter sidebar (second rail next to main nav).
 * Event types are a fixed catalog; people come from loaded events.
 */
export function TimelineSidebarFilters() {
  const {
    availableTypes,
    availableActors,
    selectedTypes,
    selectedActors,
    setSelectedTypes,
    setSelectedActors,
    clearFilters,
    hasActiveFilter,
  } = useTimelineFilters()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800">
            Logbook filters
          </h2>
          <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
            Event log of what happened — not research rationale
          </p>
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex shrink-0 items-center gap-0.5 text-[11px] text-gray-500 hover:text-gray-800"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-medium text-slate-700">Event type</p>
            <div className="flex gap-1">
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-700"
                onClick={() => setSelectedTypes(null)}
              >
                All
              </button>
              <span className="text-xs text-slate-300">·</span>
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-700"
                onClick={() => setSelectedTypes(new Set())}
              >
                None
              </button>
            </div>
          </div>
          <ul className="max-h-[28rem] space-y-0.5 overflow-y-auto pr-1">
            {availableTypes.map((type) => {
              const checked = selectedTypes === null || selectedTypes.has(type)
              return (
                <li key={type}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-slate-50">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => {
                        if (selectedTypes === null) {
                          setSelectedTypes(
                            new Set(availableTypes.filter((t) => t !== type))
                          )
                          return
                        }
                        const next = toggleInSet(selectedTypes, type)
                        if (
                          next.size === availableTypes.length &&
                          availableTypes.every((t) => next.has(t))
                        ) {
                          setSelectedTypes(null)
                        } else {
                          setSelectedTypes(next)
                        }
                      }}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug text-slate-700">
                      {eventTypeLabel(type)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-medium text-slate-700">People</p>
            {availableActors.length > 0 && (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-700"
                  onClick={() => setSelectedActors(null)}
                >
                  All
                </button>
                <span className="text-xs text-slate-300">·</span>
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-700"
                  onClick={() => setSelectedActors(new Set())}
                >
                  None
                </button>
              </div>
            )}
          </div>
          {availableActors.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">Load logbook to see people.</p>
          ) : (
            <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
              {availableActors.map((actor) => {
                const checked =
                  selectedActors === null || selectedActors.has(actor.id)
                return (
                  <li key={actor.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-slate-50">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          if (selectedActors === null) {
                            setSelectedActors(
                              new Set(
                                availableActors
                                  .filter((a) => a.id !== actor.id)
                                  .map((a) => a.id)
                              )
                            )
                            return
                          }
                          const next = toggleInSet(selectedActors, actor.id)
                          if (
                            next.size === availableActors.length &&
                            availableActors.every((a) => next.has(a.id))
                          ) {
                            setSelectedActors(null)
                          } else {
                            setSelectedActors(next)
                          }
                        }}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug text-slate-700">
                          {actor.name}
                        </span>
                        {actor.role && (
                          <span className="block text-xs text-slate-400 capitalize">
                            {actor.role === 'project-manager'
                              ? 'Manager'
                              : actor.role === 'system'
                              ? 'System'
                              : actor.role}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
