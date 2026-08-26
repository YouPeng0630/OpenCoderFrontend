import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Activity,
  AlertCircle,
  Beaker,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { EXAMPLE_TIMELINE_EVENTS } from './timeline/exampleData'
import { mergeTimelineEvents } from './timeline/mergeEvents'
import { TimelineEventRenderer } from './timeline/renderers'
import { useTimelineFilters, TimelineSidebarFilters } from './timeline/TimelineFilterContext'
import type { DayRange, TimelineActor, TimelineEvent } from './timeline/types'

function mapApiEvents(raw: any[]): TimelineEvent[] {
  return (raw || []).map((e: any) => ({
    id: e.id,
    type: e.type as TimelineEvent['type'],
    renderer: e.renderer as TimelineEvent['renderer'],
    createdAt: e.createdAt,
    actor: e.actor,
    summary: e.summary,
    payload: e.payload || {},
  }))
}

/**
 * Manager Project Logbook — live paginated event feed (what happened on the project).
 * Distinct from future Epistemology / research-decision history (why a coding choice was made).
 * Filters live in a dedicated second sidebar (desktop) / panel above feed (mobile).
 */
export function ManagerActivityLogs() {
  const { user } = useAuth()
  const {
    selectedTypes,
    selectedActors,
    hasActiveFilter,
    clearFilters,
    setAvailableActors,
  } = useTimelineFilters()

  const [range, setRange] = useState<DayRange>(30)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExample, setShowExample] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [rawScanned, setRawScanned] = useState(0)

  const apiBase = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  const exampleEvents = useMemo(() => {
    const cutoff = Date.now() - range * 24 * 60 * 60 * 1000
    let list = EXAMPLE_TIMELINE_EVENTS.filter((e) => +new Date(e.createdAt) >= cutoff)
    if (user?.id) {
      list = list.map((e) => {
        if (e.actor.id !== 'u_alice') return e
        return {
          ...e,
          actor: {
            ...e.actor,
            id: user.id,
            name: user.username || e.actor.name,
            email: user.email || e.actor.email,
            avatarUrl: user.avatar || user.avatar_url || e.actor.avatarUrl,
            role: user.role || e.actor.role,
          },
        }
      })
    }
    return list
  }, [range, user])

  const sourceEvents = showExample ? exampleEvents : events

  useEffect(() => {
    // People only — event types are a fixed catalog in the filter sidebar
    const map = new Map<string, TimelineActor>()
    for (const e of sourceEvents) {
      if (!e.actor?.id || map.has(e.actor.id)) continue
      map.set(e.actor.id, e.actor)
    }
    const actors = Array.from(map.values()).sort((a, b) => {
      if (a.id === 'system') return -1
      if (b.id === 'system') return 1
      return (a.name || '').localeCompare(b.name || '')
    })
    setAvailableActors(actors)
  }, [sourceEvents, setAvailableActors])

  const displayEvents = useMemo(() => {
    return sourceEvents.filter((e) => {
      if (selectedTypes !== null && !selectedTypes.has(e.type)) return false
      if (selectedActors !== null && !selectedActors.has(e.actor?.id)) return false
      return true
    })
  }, [sourceEvents, selectedTypes, selectedActors])

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!user?.project_id) {
        setEvents([])
        setError('No active project')
        setHasMore(false)
        setNextCursor(null)
        return
      }

      const token = getToken()
      let url =
        `${apiBase}/api/projects/${user.project_id}/timeline` +
        `?token=${encodeURIComponent(token || '')}&days=${range}&limit=5000`
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.detail === 'string' ? err.detail : `HTTP ${res.status}`
        )
      }
      const data = await res.json()
      const page = mapApiEvents(data.events || [])

      setEvents((prev) => (append ? mergeTimelineEvents(prev, page) : page))
      setHasMore(Boolean(data.has_more))
      setNextCursor(data.next_cursor || null)
      setRawScanned((n) => (append ? n + (data.raw_scanned || 0) : data.raw_scanned || 0))
      setError(null)
    },
    [apiBase, user?.project_id, range]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setShowExample(false)
    setError(null)
    try {
      await fetchPage(null, false)
    } catch (e: any) {
      setEvents([])
      setHasMore(false)
      setNextCursor(null)
      setError(e?.message || 'Failed to load logbook')
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      await fetchPage(nextCursor, true)
    } catch (e: any) {
      setError(e?.message || 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, nextCursor, loadingMore])

  useEffect(() => {
    load()
  }, [load])

  const byDay = useMemo(() => {
    const groups: { key: string; label: string; items: TimelineEvent[] }[] = []
    const map = new Map<string, TimelineEvent[]>()

    for (const e of displayEvents) {
      const d = new Date(e.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map.has(key)) {
        map.set(key, [])
        groups.push({
          key,
          label: d.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          items: map.get(key)!,
        })
      }
      map.get(key)!.push(e)
    }
    return groups
  }, [displayEvents])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Mobile: filter panel (desktop uses the dedicated second sidebar) */}
      <div className="md:hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <TimelineSidebarFilters />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Activity className="h-6 w-6" />
            Project Logbook
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A chronological event log of what happened on this project (tasks, people, codebook,
            coding, settings). Not a research epistemology journal — that would capture{' '}
            <em>why</em> coding or codebook decisions were made.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {([7, 30] as DayRange[]).map((d) => (
              <Button
                key={d}
                type="button"
                variant={range === d ? 'default' : 'ghost'}
                size="sm"
                className={`h-8 px-3 text-xs ${range === d ? '' : 'text-slate-600'}`}
                onClick={() => setRange(d)}
              >
                {d} days
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-8" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && !showExample && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p>{error}</p>
          </div>
        </div>
      )}

      {showExample && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Beaker className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Previewing example data (not from this project).</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 shrink-0" onClick={() => setShowExample(false)}>
            Back to live
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-16">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : sourceEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">No logbook events yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create a project, upload tasks, assign work, or approve applicants — those actions will show up here.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowExample(true)}>
              Preview sample UI
            </Button>
          </div>
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">No events match these filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Adjust Event type / People in the filter sidebar, or clear filters.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
            {!showExample && hasMore && (
              <Button variant="ghost" size="sm" onClick={() => loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more events'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6">
          <p className="mb-5 text-xs text-slate-400">
            {displayEvents.length} event{displayEvents.length === 1 ? '' : 's'}
            {hasActiveFilter ? ` of ${sourceEvents.length}` : ''} · last {range} days
            {showExample ? ' · example' : ` · live · ${rawScanned} logs scanned`}
            {hasActiveFilter ? ' · filtered' : ''}
          </p>

          <div className="space-y-10">
            {byDay.map((group) => (
              <section key={group.key}>
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="shrink-0 text-sm font-semibold tracking-wide text-slate-800">
                    {group.label}
                  </h2>
                  <div className="h-px flex-1 bg-slate-200" aria-hidden />
                </div>
                <ul>
                  {group.items.map((event, idx) => (
                    <TimelineEventRenderer
                      key={event.id}
                      event={event}
                      isLast={idx === group.items.length - 1}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {!showExample && hasMore && (
            <div className="mt-6 flex justify-center border-t border-slate-100 pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
