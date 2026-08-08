import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Search, StickyNote, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface NoteRecord {
  note_id: string
  task_id: string
  task_title: string
  task_type: string
  content: string
  updated_at: string | null
}

const TASK_TYPES = [
  { value: 'all',                  label: 'All Types' },
  { value: 'video',                label: 'Video' },
  { value: 'audio',                label: 'Audio' },
  { value: 'image',                label: 'Image' },
  { value: 'text',                 label: 'Text' },
  { value: 'bibliographic',        label: 'Bibliographic' },
  { value: 'pdf_document_coding',  label: 'PDF' },
  { value: 'multimodal',           label: 'Multimodal' },
]

const TASK_TYPE_COLORS: Record<string, string> = {
  video:               'bg-blue-100 text-blue-700',
  audio:               'bg-purple-100 text-purple-700',
  image:               'bg-green-100 text-green-700',
  text:                'bg-gray-100 text-gray-700',
  bibliographic:       'bg-orange-100 text-orange-700',
  pdf_document_coding: 'bg-red-100 text-red-700',
  multimodal:          'bg-indigo-100 text-indigo-700',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function CoderNotes() {
  const { user } = useAuth()
  const [notes, setNotes]     = useState<NoteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [query,      setQuery]      = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')
  const [sortOrder,  setSortOrder]  = useState<'newest' | 'oldest'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalNotes, setTotalNotes] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

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
        if (typeFilter !== 'all') params.set('task_type', typeFilter)
        if (dateFrom) params.set('date_from', dateFrom)
        if (dateTo) params.set('date_to', dateTo)
        if (debouncedQuery) params.set('search', debouncedQuery)

        const res = await fetch(
          `${apiBase}/api/projects/${user.project_id}/notes?${params.toString()}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setNotes(data.notes || [])
        setTotalNotes(typeof data.total === 'number' ? data.total : (data.notes || []).length)
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
  }, [user?.project_id, apiBase, typeFilter, dateFrom, dateTo, debouncedQuery, sortOrder, currentPage, pageSize])

  const hasActiveFilter = query || typeFilter !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your reflexive memos across all coding tasks — private to you.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search title or content…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1) }}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {TASK_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1) }}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setCurrentPage(1) }}
            className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          onClick={() => { setSortOrder(s => s === 'newest' ? 'oldest' : 'newest'); setCurrentPage(1) }}
          className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
        </button>

        {hasActiveFilter && (
          <button
            onClick={() => { setQuery(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setCurrentPage(1) }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
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
          <CardContent className="py-12 text-center text-red-500 text-sm">{error}</CardContent>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <StickyNote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {hasActiveFilter
                ? 'No notes match your filters.'
                : 'No notes yet. Write your first memo while coding a task.'}
            </p>
            {hasActiveFilter && (
              <button
                onClick={() => { setQuery(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setCurrentPage(1) }}
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
            {totalNotes} note{totalNotes !== 1 ? 's' : ''}
            {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
          </p>
          {notes.map((n) => (
            <Card key={n.note_id} className="hover:border-amber-300 transition-colors">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <CardTitle className="text-sm font-semibold text-gray-800 truncate">
                      {n.task_title}
                    </CardTitle>
                    {n.task_type && (
                      <Badge
                        className={`text-xs capitalize shrink-0 ${TASK_TYPE_COLORS[n.task_type] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {n.task_type.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  {n.updated_at && (
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(n.updated_at)}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-6">
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
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
