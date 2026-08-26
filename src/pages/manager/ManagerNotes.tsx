import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  FileText,
  Search,
  StickyNote,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  TaskTypeFilter,
  taskTypeFilterParam,
  type TaskTypeFilterValue,
} from '@/components/tasks/TaskTypeFilter'

interface NoteRecord {
  note_id: string
  task_id: string
  task_title: string
  task_type: string
  content: string
  updated_at: string | null
  coder_user_id?: string | null
  coder_name?: string
  coder_email?: string
}

const TASK_TYPE_COLORS: Record<string, string> = {
  video: 'bg-blue-100 text-blue-700',
  audio: 'bg-purple-100 text-purple-700',
  image: 'bg-green-100 text-green-700',
  text: 'bg-gray-100 text-gray-700',
  bibliographic: 'bg-orange-100 text-orange-700',
  pdf_document_coding: 'bg-red-100 text-red-700',
  multimodal: 'bg-indigo-100 text-indigo-700',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Manager view: all coder reflexive memos in the project.
 */
export function ManagerNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilterValue>(null)
  const [coderFilter, setCoderFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalNotes, setTotalNotes] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  /** Coders seen in the latest unfiltered-by-coder response options */
  const [coderOptions, setCoderOptions] = useState<
    { id: string; name: string }[]
  >([])

  const apiBase = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!user?.project_id) return
    const loadCoders = async () => {
      try {
        const token = getToken()
        const res = await fetch(
          `${apiBase}/api/users/?role=coder&project_id=${user.project_id}&token=${encodeURIComponent(token || '')}`
        )
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.users || data.items || []
        setCoderOptions(
          list
            .map((c: any) => ({
              id: String(c.id || c._id || ''),
              name: c.name || c.username || c.email || 'Coder',
            }))
            .filter((c: { id: string }) => c.id)
            .sort((a: { name: string }, b: { name: string }) =>
              a.name.localeCompare(b.name)
            )
        )
      } catch {
        /* optional */
      }
    }
    loadCoders()
  }, [user?.project_id, apiBase])

  useEffect(() => {
    if (!user?.project_id) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = getToken()
        const params = new URLSearchParams({
          token: token || '',
          page: String(currentPage),
          limit: String(pageSize),
          sort: sortOrder,
        })
        if (typeFilter !== null && typeFilter.size === 0) {
          setNotes([])
          setTotalNotes(0)
          setTotalPages(1)
          setLoading(false)
          return
        }
        const typeParam = taskTypeFilterParam(typeFilter)
        if (typeParam) params.set('task_type', typeParam)
        if (coderFilter !== 'all') params.set('coder_id', coderFilter)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        if (debouncedQuery) params.set('search', debouncedQuery)

        const res = await fetch(
          `${apiBase}/api/projects/${user.project_id}/notes?${params.toString()}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const list: NoteRecord[] = data.notes || []
        setNotes(list)
        setTotalNotes(typeof data.total === 'number' ? data.total : list.length)
        setTotalPages(typeof data.pages === 'number' ? Math.max(1, data.pages) : 1)
      } catch (e: any) {
        setError(e.message || 'Failed to load notes')
        setNotes([])
        setTotalNotes(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [
    user?.project_id,
    apiBase,
    typeFilter,
    coderFilter,
    dateFrom,
    dateTo,
    debouncedQuery,
    sortOrder,
    currentPage,
    pageSize,
  ])

  const hasActiveFilter =
    !!query || typeFilter !== null || coderFilter !== 'all' || !!dateFrom || !!dateTo

  const clearFilters = () => {
    setQuery('')
    setTypeFilter(null)
    setCoderFilter('all')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Coder Memos</h1>
        <p className="mt-1 text-sm text-gray-500">
          All reflexive memos written by coders while working on tasks in this project.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search title, content, or coder…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <TaskTypeFilter
          selected={typeFilter}
          onChange={(next) => {
            setTypeFilter(next)
            setCurrentPage(1)
          }}
        />

        <select
          value={coderFilter}
          onChange={(e) => {
            setCoderFilter(e.target.value)
            setCurrentPage(1)
          }}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All coders</option>
          {coderOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))
            setCurrentPage(1)
          }}
          className="flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
        </button>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading && notes.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-500">{error}</CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <StickyNote className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">
              {hasActiveFilter
                ? 'No memos match your filters.'
                : 'No coder memos yet. They appear when coders write Notes while coding.'}
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            {totalNotes} memo{totalNotes !== 1 ? 's' : ''}
            {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
          </p>
          {notes.map((n) => (
            <Card key={n.note_id} className="transition-colors hover:border-amber-300">
              <CardHeader className="px-5 pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <CardTitle className="truncate text-sm font-semibold text-gray-800">
                      {n.task_title}
                    </CardTitle>
                    {n.task_type && (
                      <Badge
                        className={`shrink-0 text-xs capitalize ${
                          TASK_TYPE_COLORS[n.task_type] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {n.task_type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {n.coder_name && (
                      <Badge variant="outline" className="shrink-0 text-xs font-normal">
                        {n.coder_name}
                      </Badge>
                    )}
                  </div>
                  {n.updated_at && (
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(n.updated_at)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {n.content}
                </p>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
