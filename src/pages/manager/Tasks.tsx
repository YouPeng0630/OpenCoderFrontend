import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Plus, AlertCircle, Edit, Trash2, Upload, FileSpreadsheet, FolderOpen, Loader2, CheckCircle2, Image as ImageIcon, Video, Music, FileText, Search, ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getToken } from '@/lib/storage'
import { useAuth } from '@/contexts/AuthContext'
import { ImageTaskUpload } from '@/components/tasks/ImageTaskUpload'
import { VideoTaskUpload } from '@/components/tasks/VideoTaskUpload'
import { AudioTaskUpload } from '@/components/tasks/AudioTaskUpload'
import { PDFTaskUpload } from '@/components/tasks/PDFTaskUpload'
import { MultimodalTaskUpload } from '@/components/tasks/MultimodalTaskUpload'
import { parseBibliographyFile, BibliographicEntry, bibliographyToTaskPayload } from '@/lib/bibliography-parser'
import { TranscriptControl } from '@/components/transcription/TranscriptControl'
import { TaskMediaPreview } from '@/components/tasks/TaskMediaPreview'
import { TaskTypeFilter, taskTypeFilterParam } from '@/components/tasks/TaskTypeFilter'

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assignee?: string
  dueDate?: string
  createdAt: string
  task_type?: string
  transcription_status?: string
  payload?: {
    text?: string | null
    image?: any
    video?: any
    audio?: any
    pdf?: any
  }
}

type UploadMode = 'csv' | 'folder' | 'image' | 'video' | 'audio' | 'bibliography' | 'pdf' | 'multimodal'
type UploadStep = 'select' | 'column-select' | 'uploading' | 'complete'

function mapBackendStatus(status: string): Task['status'] {
  switch (status) {
    case 'open':
      return 'pending'
    case 'assigned':
    case 'in_progress':
      return 'in-progress'
    case 'done':
    case 'completed':
      return 'completed'
    default:
      return 'pending'
  }
}

function toBackendStatus(filter: 'all' | 'pending' | 'in-progress' | 'completed'): string | null {
  switch (filter) {
    case 'pending':
      return 'open'
    case 'in-progress':
      return 'in_progress'
    case 'completed':
      return 'done'
    default:
      return null
  }
}

export function ManagerTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Upload dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<UploadMode>('csv')
  const [uploadStep, setUploadStep] = useState<UploadStep>('select')
  const [, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // CSV upload states
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [csvData, setCsvData] = useState<string[][]>([])
  const [isDocumentLevel, setIsDocumentLevel] = useState(false) // Document-level upload mode
  
  // Folder upload states
  const [txtFiles, setTxtFiles] = useState<File[]>([])
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null)
  
  // Bibliography upload states
  const [bibliographyFile, setBibliographyFile] = useState<File | null>(null)
  const [bibliographyEntries, setBibliographyEntries] = useState<BibliographicEntry[]>([])
  const [selectedBibEntries, setSelectedBibEntries] = useState<Set<number>>(new Set())
  const [bibliographyError, setBibliographyError] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Fetch tasks from API (server-side filters + pagination)
  const fetchTasks = async () => {
    if (!user?.project_id) {
      console.log('No project_id, skipping task fetch')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const token = getToken()
      if (!token) {
        console.error('No token found')
        setLoading(false)
        return
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      const params = new URLSearchParams({
        token,
        page: String(currentPage),
        limit: String(pageSize),
      })
      const backendStatus = toBackendStatus(filter)
      if (backendStatus) params.set('status', backendStatus)
      const typeParam = taskTypeFilterParam(typeFilter)
      if (typeParam) params.set('task_type', typeParam)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (debouncedSearch) params.set('search', debouncedSearch)

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const tasksData: any[] = Array.isArray(result)
        ? result
        : (result.items || result.tasks || result.data || [])

      const transformedTasks: Task[] = tasksData.map((task: any) => ({
        id: task.id || task._id || task.task_id,
        title: task.title || task.payload?.text?.substring(0, 100) || 'Untitled',
        description: task.payload?.text || '',
        status: mapBackendStatus(task.status),
        priority: 'medium',
        assignee: task.assigned_to?.username || undefined,
        dueDate: task.due_date || undefined,
        createdAt: task.created_at || new Date().toISOString(),
        task_type: task.task_type,
        transcription_status: task.transcription_status,
        payload: task.payload || undefined,
      }))

      setTasks(transformedTasks)
      setTotalTasks(typeof result.total === 'number' ? result.total : transformedTasks.length)
      setTotalPages(typeof result.pages === 'number' ? Math.max(1, result.pages) : 1)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setTasks([])
      setTotalTasks(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [user?.project_id, filter, typeFilter, dateFrom, dateTo, debouncedSearch, currentPage, pageSize])

  const handleCreateTask = () => {
    setUploadDialogOpen(true)
    setUploadStep('select')
    setUploadMode('csv')
    setCsvFile(null)
    setTxtFiles([])
    setUploadProgress(0)
    setIsDocumentLevel(false) // Reset document-level mode
  }

  // Sentence segmentation function (supports English and Chinese)
  const segmentBySentence = (text: string): string[] => {
    if (!text || !text.trim()) return []
    
    // Split by English and Chinese sentence endings
    // Captures: . ! ? 。！？ followed by optional whitespace
    const segments = text
      .split(/([.!?。！？]+[\s\n]*)/)
      .reduce((acc: string[], part, i, arr) => {
        if (i % 2 === 0 && part.trim()) {
          // Combine text with its punctuation
          const sentence = (part + (arr[i + 1] || '')).trim()
          if (sentence) {
            acc.push(sentence)
          }
        }
        return acc
      }, [])
    
    return segments.filter(s => s.length > 0)
  }

  // Parse CSV file
  const handleCsvFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        alert('CSV file is empty')
        return
      }

      // Parse CSV (simple parsing, assumes comma-separated)
      const rows = lines.map(line => line.split(',').map(cell => cell.trim()))
      const headers = rows[0]
      
      setCsvColumns(headers)
      setCsvData(rows)
      setUploadStep('column-select')
    } catch (error) {
      console.error('Failed to parse CSV:', error)
      alert('Failed to parse CSV file')
    }
  }

  // Handle folder/multiple txt files
  const handleTxtFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const txtFiles = files.filter(f => f.name.endsWith('.txt'))
    
    if (txtFiles.length === 0) {
      alert('Please select at least one .txt file')
      return
    }
    
    setTxtFiles(txtFiles)
  }

  // Upload tasks from CSV
  const handleUploadFromCsv = async () => {
    if (!selectedColumn || csvData.length < 2) return

    const columnIndex = csvColumns.indexOf(selectedColumn)
    if (columnIndex === -1) return

    let taskTexts: string[] = []
    let totalDocuments = 0
    let totalSegments = 0

    if (isDocumentLevel) {
      // Document-level: Split each row into multiple sentences
      csvData.slice(1).forEach((row, rowIndex) => {
        const text = row[columnIndex]
        if (text && text.trim()) {
          const segments = segmentBySentence(text)
          taskTexts.push(...segments)
          totalDocuments++
          totalSegments += segments.length
        }
      })
      
      console.log(`📊 Document-level upload: ${totalDocuments} documents → ${totalSegments} sentences`)
    } else {
      // Sentence-level: Each row is one task (original behavior)
      taskTexts = csvData.slice(1)
        .map(row => row[columnIndex])
        .filter(text => text && text.trim())
    }

    await uploadTasks(taskTexts)
  }

  // Upload tasks from TXT files
  const handleUploadFromTxt = async () => {
    if (txtFiles.length === 0) return

    try {
      const taskTexts: string[] = []
      
      for (const file of txtFiles) {
        const text = await file.text()
        if (text.trim()) {
          taskTexts.push(text.trim())
        }
      }

      await uploadTasks(taskTexts)
    } catch (error) {
      console.error('Failed to read txt files:', error)
      alert('Failed to read text files')
    }
  }

  // Common upload function
  const uploadTasks = async (taskTexts: string[]) => {
    if (!user?.project_id) {
      console.error('No project_id found. User:', user)
      alert('No project found. Please create a project first.')
      return
    }

    setUploadStep('uploading')
    setUploading(true)
    setUploadProgress(0)

    try {
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      
      console.log('Uploading tasks to project:', user.project_id)
      console.log('Total tasks:', taskTexts.length)
      console.log('Upload mode:', isDocumentLevel ? 'Document-level' : 'Sentence-level')

      // Build tasks array according to API format
      const tasks = taskTexts.map((text, index) => ({
        title: text.substring(0, 100), // First 100 chars as title
        payload: {
          text: text,
          meta: {
            source: uploadMode === 'csv' ? 'csv_upload' : 'txt_upload',
            upload_date: new Date().toISOString(),
            index: index + 1,
            is_document_level: isDocumentLevel,
            segmentation_method: isDocumentLevel ? 'sentence' : null
          }
        },
        tags: [],
        status: 'open'
      }))

      // Use bulk upload endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks/bulk?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        }
      )

      setUploadProgress(50) // Halfway after sending request

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Upload failed:', errorData)
        throw new Error(errorData?.detail || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('Upload result:', result)

      setUploadProgress(100)

      // Parse result
      const successCount = result.created_count || result.created || taskTexts.length
      const failedCount = result.skipped_count || result.skipped || 0

      setUploadResult({ success: successCount, failed: failedCount })
      setUploadStep('complete')
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload tasks: ' + error)
      setUploadStep('select')
    } finally {
      setUploading(false)
    }
  }

  const handleEditTask = (taskId: string) => {
    // TODO: Open dialog to edit task
    console.log('Edit task:', taskId)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    if (!user?.project_id) {
      alert('No project found')
      return
    }

    try {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      
      console.log('🗑️ Deleting task:', taskId)
      
      const token = getToken()
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks/${taskId}?token=${encodeURIComponent(token || '')}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || errorData?.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Task deleted:', result.message || 'Task deleted successfully')
      await fetchTasks()
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('Failed to delete task: ' + error)
    }
  }
  
  // Handle bibliography file selection
  const handleBibliographyFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    setBibliographyFile(file)
    setBibliographyError('')
    
    try {
      const entries = await parseBibliographyFile(file)
      
      if (entries.length === 0) {
        setBibliographyError('No valid entries found in the file')
        return
      }
      
      setBibliographyEntries(entries)
      // Auto-select all entries
      setSelectedBibEntries(new Set(entries.map((_, i) => i)))
      // Move to column-select step (we'll use this for preview)
      setUploadStep('column-select')
    } catch (error) {
      console.error('Failed to parse bibliography file:', error)
      setBibliographyError('Failed to parse file: ' + (error as Error).message)
    }
  }
  
  // Toggle bibliography entry selection
  const toggleBibEntry = (index: number) => {
    const newSelected = new Set(selectedBibEntries)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedBibEntries(newSelected)
  }
  
  // Upload tasks from bibliography
  const handleUploadFromBibliography = async () => {
    if (!user?.project_id || selectedBibEntries.size === 0) {
      alert('No entries selected')
      return
    }
    
    setUploadStep('uploading')
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      const token = getToken()
      
      console.log('📚 Starting bibliography upload...')
      console.log('Project ID:', user.project_id)
      console.log('Selected entries:', selectedBibEntries.size)
      
      const selectedEntries = bibliographyEntries.filter((_, i) => selectedBibEntries.has(i))
      
      // 构建 tasks 数组，格式与 CSV/TXT 一致
      const tasks = selectedEntries.map((entry, index) => {
        const taskData = bibliographyToTaskPayload(entry)
        return {
          title: taskData.title,  // 使用文献标题作为任务标题
          task_type: taskData.task_type,  // 添加 task_type: 'bibliographic'
          payload: taskData.payload,
          tags: [],
          status: 'open'
        }
      })
      
      console.log(`Creating ${tasks.length} tasks in bulk...`)
      
      // 使用批量上传端点，与 CSV/TXT 一致
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks/bulk?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tasks }),
        }
      )
      
      setUploadProgress(50)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Bulk upload failed:', errorText)
        throw new Error(`Upload failed: ${errorText}`)
      }
      
      const result = await response.json()
      console.log('✅ Bulk upload complete:', result)
      
      const successCount = result.tasks?.length || tasks.length
      const failedCount = tasks.length - successCount
      
      setUploadProgress(100)
      setUploadResult({ success: successCount, failed: failedCount })
      setUploadStep('complete')
      
      // Refresh task list
      setTimeout(() => {
        fetchTasks()
      }, 500)
    } catch (error) {
      console.error('Failed to upload bibliography tasks:', error)
      alert('Failed to upload tasks: ' + error)
      setUploadStep('select')
      setUploadResult({ success: 0, failed: selectedBibEntries.size })
    } finally {
      setUploading(false)
    }
  }

  const safePage = Math.min(currentPage, totalPages)
  const hasActiveFilter = filter !== 'all' || typeFilter.size > 0 || !!dateFrom || !!dateTo || !!searchQuery

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && tasks.length === 0 && !hasActiveFilter) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and track annotation tasks for your team
          </p>
        </div>
        <Button onClick={handleCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'pending', 'in-progress', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setCurrentPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Extra filters: search, type, date, page size */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
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

        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">Created from</label>
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

        <select
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={5}>5 / page</option>
          <option value={10}>10 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => {
              setSearchQuery('')
              setTypeFilter(new Set())
              setDateFrom('')
              setDateTo('')
              setFilter('all')
              setCurrentPage(1)
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline self-end mb-1"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-400">
        {totalTasks} task{totalTasks !== 1 ? 's' : ''}
        {totalPages > 1 ? ` · page ${safePage} of ${totalPages}` : ''}
      </p>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">
              {hasActiveFilter ? 'No tasks match your filters' : 'No tasks'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {hasActiveFilter ? 'Try clearing filters' : 'Create your first task to get started'}
            </p>
            {!hasActiveFilter && (
              <Button onClick={handleCreateTask} className="mt-4" variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <TaskMediaPreview taskType={task.task_type} payload={task.payload} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-lg truncate">{task.title}</CardTitle>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                        {task.description ? (
                          <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                        ) : null}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTask(task.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {task.assignee && (
                    <span>Assignee: <strong>{task.assignee}</strong></span>
                  )}
                  {task.dueDate && (
                    <span>Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong></span>
                  )}
                  <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                  {task.task_type && (
                    <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {task.task_type === 'multimodal'
                        ? (
                            [
                              task.payload?.image && 'image',
                              task.payload?.video && 'video',
                              task.payload?.audio && 'audio',
                              task.payload?.pdf && 'pdf',
                              task.payload?.text && 'text',
                            ].filter(Boolean).join(' · ') || 'mixed'
                          )
                        : task.task_type.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                {(task.task_type === 'audio' || task.task_type === 'video' || task.task_type === 'multimodal') && user?.project_id && (
                  <TranscriptControl
                    projectId={user.project_id}
                    taskId={task.id}
                    initialStatus={task.transcription_status}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalTasks > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Page {safePage} of {totalPages} · {totalTasks} tasks
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const page = totalPages <= 7 ? i + 1
                : safePage <= 4 ? i + 1
                : safePage >= totalPages - 3 ? totalPages - 6 + i
                : safePage - 3 + i
              return (
                <Button
                  key={page}
                  variant={page === safePage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0 text-xs"
                >
                  {page}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl" aria-describedby="upload-dialog-description">
          <DialogHeader>
            <DialogTitle>Batch Upload Tasks</DialogTitle>
            <p id="upload-dialog-description" className="sr-only">
              Upload tasks from CSV, text files, or images
            </p>
          </DialogHeader>

          {/* Debug Info */}
          {!user?.project_id && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="text-yellow-800 font-medium">⚠️ Warning: No Project Found</p>
              <p className="text-yellow-700 mt-1">
                Please create a project first before uploading tasks.
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                User: {user?.username || 'N/A'} | Project ID: {user?.project_id || 'null'}
              </p>
            </div>
          )}
          {user?.project_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
              <p className="text-green-800">
                ✅ Project: <strong>{user.project_id}</strong>
              </p>
            </div>
          )}

          <div className="space-y-6 py-4">
            {/* Step 1: Select Mode */}
            {uploadStep === 'select' && (
              <>
                {/* Mode Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Select Upload Method</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* CSV Upload */}
                    <div
                      onClick={() => setUploadMode('csv')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'csv'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileSpreadsheet className="h-10 w-10 text-primary mb-3" />
                      <h3 className="font-semibold text-lg mb-2">CSV File</h3>
                      <p className="text-sm text-gray-500">
                        Upload a CSV file and select a column as task content
                      </p>
                    </div>

                    {/* Folder Upload */}
                    <div
                      onClick={() => setUploadMode('folder')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'folder'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FolderOpen className="h-10 w-10 text-primary mb-3" />
                      <h3 className="font-semibold text-lg mb-2">Text Files</h3>
                      <p className="text-sm text-gray-500">
                        Upload multiple .txt files as individual tasks
                      </p>
                    </div>

                    {/* Image Upload */}
                    <div
                      onClick={() => setUploadMode('image')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'image'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ImageIcon className="h-10 w-10 text-primary mb-3" />
                      <h3 className="font-semibold text-lg mb-2">Image</h3>
                      <p className="text-sm text-gray-500">
                        Upload images for annotation tasks
                      </p>
                    </div>

                    {/* Video Upload */}
                    <div
                      onClick={() => setUploadMode('video')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'video'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Video className="h-10 w-10 text-purple-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-2">Video</h3>
                      <p className="text-sm text-gray-500">
                        Upload videos for annotation tasks
                      </p>
                    </div>

                    {/* Audio Upload */}
                    <div
                      onClick={() => setUploadMode('audio')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'audio'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Music className="h-10 w-10 text-pink-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-2">Audio</h3>
                      <p className="text-sm text-gray-500">
                        Upload audio files for annotation tasks
                      </p>
                    </div>

                    {/* Multimodal Upload */}
                    <div
                      onClick={() => setUploadMode('multimodal')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'multimodal'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Layers className="h-10 w-10 text-indigo-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-2">Mixed files</h3>
                      <p className="text-sm text-gray-500">
                        Drop many files — each file becomes its own typed task
                      </p>
                    </div>
                    
                    {/* Bibliography Upload */}
                    <div
                      onClick={() => setUploadMode('bibliography')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'bibliography'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="h-10 w-10 text-primary mb-3" />
                      <h3 className="font-semibold text-lg mb-2">Bibliography</h3>
                      <p className="text-sm text-gray-500">
                        Import from .bib, .ris, or .csv metadata files
                      </p>
                    </div>
                    
                    {/* PDF Document Coding */}
                    <div
                      onClick={() => setUploadMode('pdf')}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        uploadMode === 'pdf'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="h-10 w-10 text-purple-600 mb-3" />
                      <h3 className="font-semibold text-lg mb-2">PDF Document Coding</h3>
                      <p className="text-sm text-gray-500">
                        Upload PDF for document-level and passage-level coding
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="space-y-3">
                  {uploadMode === 'image' ? (
                    // 图片上传模式
                    <ImageTaskUpload
                      projectId={user.project_id}
                      onSuccess={() => {
                        setUploadStep('complete');
                        setUploadResult({ success: 1, failed: 0 });
                        fetchTasks();
                      }}
                      onCancel={() => setUploadDialogOpen(false)}
                    />
                  ) : uploadMode === 'video' ? (
                    // 视频上传模式
                    <VideoTaskUpload
                      projectId={user.project_id}
                      onSuccess={() => {
                        setUploadStep('complete');
                        setUploadResult({ success: 1, failed: 0 });
                        fetchTasks();
                      }}
                      onCancel={() => setUploadDialogOpen(false)}
                    />
                  ) : uploadMode === 'audio' ? (
                    // 音频上传模式
                    <AudioTaskUpload
                      projectId={user.project_id}
                      onSuccess={() => {
                        setUploadStep('complete');
                        setUploadResult({ success: 1, failed: 0 });
                        fetchTasks();
                      }}
                      onCancel={() => setUploadDialogOpen(false)}
                    />
                  ) : uploadMode === 'multimodal' ? (
                    <MultimodalTaskUpload
                      projectId={user.project_id}
                      onSuccess={() => {
                        setUploadStep('complete');
                        setUploadResult({ success: 1, failed: 0 });
                        fetchTasks();
                      }}
                      onCancel={() => setUploadDialogOpen(false)}
                    />
                  ) : uploadMode === 'pdf' ? (
                    // PDF Document Coding 上传模式
                    <PDFTaskUpload
                      projectId={user.project_id}
                      onComplete={(taskId, documentId, readableTaskId) => {
                        setUploadStep('complete');
                        setUploadResult({ success: 1, failed: 0 });
                        fetchTasks();
                        // Optionally navigate to PDF Coding Workspace
                        // navigate(`/pdf-coding/${taskId}`);
                      }}
                      onError={(error) => {
                        alert(`Upload failed: ${error}`);
                      }}
                    />
                  ) : uploadMode === 'bibliography' ? (
                    <>
                      <Label htmlFor="bib-upload">Upload Bibliography File</Label>
                      <div className="flex items-center gap-3">
                        <input
                          id="bib-upload"
                          type="file"
                          accept=".bib,.ris,.csv"
                          onChange={handleBibliographyFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('bib-upload')?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {bibliographyFile ? bibliographyFile.name : 'Choose .bib, .ris, or .csv'}
                        </Button>
                      </div>
                      {bibliographyFile && !bibliographyError && (
                        <p className="text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          File loaded: {bibliographyEntries.length} entries found
                        </p>
                      )}
                      {bibliographyError && (
                        <p className="text-sm text-red-600 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {bibliographyError}
                        </p>
                      )}
                    </>
                  ) : uploadMode === 'csv' ? (
                    <>
                      <Label htmlFor="csv-upload">Upload CSV File</Label>
                      <div className="flex items-center gap-3">
                        <input
                          id="csv-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('csv-upload')?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {csvFile ? csvFile.name : 'Choose CSV File'}
                        </Button>
                      </div>
                      {csvFile && (
                        <p className="text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          File loaded successfully
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Label htmlFor="txt-upload">Upload Text Files</Label>
                      <div className="flex items-center gap-3">
                        <input
                          id="txt-upload"
                          type="file"
                          accept=".txt"
                          multiple
                          onChange={handleTxtFilesSelect}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('txt-upload')?.click()}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {txtFiles.length > 0
                            ? `${txtFiles.length} file(s) selected`
                            : 'Choose Text Files'}
                        </Button>
                      </div>
                      {txtFiles.length > 0 && (
                        <>
                          <p className="text-sm text-green-600 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {txtFiles.length} file(s) loaded successfully
                          </p>
                          <div className="max-h-32 overflow-y-auto border rounded p-2 text-sm">
                            {txtFiles.map((file, i) => (
                              <div key={i} className="text-gray-600">
                                {i + 1}. {file.name}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons — only for modes without their own upload UI */}
                {!['image', 'video', 'audio', 'pdf', 'multimodal'].includes(uploadMode) && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (uploadMode === 'csv' && csvFile) {
                          // Already parsed, will show column select
                        } else if (uploadMode === 'folder' && txtFiles.length > 0) {
                          handleUploadFromTxt()
                        }
                      }}
                      disabled={
                        (uploadMode === 'csv' && !csvFile) ||
                        (uploadMode === 'folder' && txtFiles.length === 0)
                      }
                    >
                      {uploadMode === 'folder' ? 'Upload Tasks' : 'Continue'}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Step 2: Column Selection (CSV) or Entry Preview (Bibliography) */}
            {uploadStep === 'column-select' && (
              <>
                {uploadMode === 'bibliography' ? (
                  /* Bibliography Entry Preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Select Entries to Import</Label>
                        <p className="text-sm text-gray-500 mt-1">
                          {selectedBibEntries.size} of {bibliographyEntries.length} entries selected
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBibEntries(new Set(bibliographyEntries.map((_, i) => i)))}
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBibEntries(new Set())}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {bibliographyEntries.map((entry, index) => (
                        <div
                          key={index}
                          onClick={() => toggleBibEntry(index)}
                          className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                            selectedBibEntries.has(index)
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedBibEntries.has(index)}
                              onChange={() => toggleBibEntry(index)}
                              className="mt-1 h-4 w-4"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">{entry.title}</div>
                              <div className="text-sm text-gray-700 mb-2">
                                {entry.authors.slice(0, 3).join(', ')}
                                {entry.authors.length > 3 && ` et al. (${entry.authors.length} authors)`}
                              </div>
                              <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                                {entry.journal && <span><strong>Journal:</strong> {entry.journal}</span>}
                                {entry.year && <span><strong>Year:</strong> {entry.year}</span>}
                                {entry.volume && <span><strong>Vol:</strong> {entry.volume}</span>}
                                {entry.issue && <span><strong>Issue:</strong> {entry.issue}</span>}
                                {entry.pages && <span><strong>Pages:</strong> {entry.pages}</span>}
                              </div>
                              {entry.doi && (
                                <div className="text-xs text-blue-600 mt-1">
                                  <a 
                                    href={`https://doi.org/${entry.doi.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    DOI: {entry.doi}
                                  </a>
                                </div>
                              )}
                              {entry.abstract && (
                                <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                                  {entry.abstract}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={() => setUploadStep('select')}>
                        Back
                      </Button>
                      <Button
                        onClick={handleUploadFromBibliography}
                        disabled={selectedBibEntries.size === 0}
                      >
                        Upload {selectedBibEntries.size} Tasks
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* CSV Column Selection */
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Select Column for Task Content</Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose which column contains the text you want to use as tasks
                      </p>
                    </div>

                  <div className="space-y-2">
                    {csvColumns.map((column, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedColumn(column)}
                        className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          selectedColumn === column
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{column}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          Sample: {csvData[1]?.[index] || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Upload Mode Selection */}
                  <div className="space-y-3 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <Label className="text-base font-medium">Upload Mode</Label>
                    
                    <div className="space-y-2">
                      <div
                        onClick={() => setIsDocumentLevel(false)}
                        className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                          !isDocumentLevel 
                            ? 'border-primary bg-white shadow-sm' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={!isDocumentLevel}
                            onChange={() => setIsDocumentLevel(false)}
                            className="mt-1 h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">Sentence-level</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Each row = 1 task (no segmentation needed)
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ✓ Best for: Data already split into sentences
                            </p>
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setIsDocumentLevel(true)}
                        className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                          isDocumentLevel 
                            ? 'border-primary bg-white shadow-sm' 
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={isDocumentLevel}
                            onChange={() => setIsDocumentLevel(true)}
                            className="mt-1 h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">Document-level</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Each row = 1 document → Auto-split into multiple sentence tasks
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              ✓ Best for: Paragraphs, long text that needs sentence segmentation
                            </p>
                            <p className="text-xs text-blue-600 font-medium mt-2">
                              Segmentation: By sentence endings (. ! ? 。！？)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Preview:</strong> {csvData.length - 1} row(s) →{' '}
                      {isDocumentLevel ? (
                        <span className="font-bold">
                          Multiple tasks (depends on sentence count)
                        </span>
                      ) : (
                        <span className="font-bold">{csvData.length - 1} task(s)</span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setUploadStep('select')}>
                      Back
                    </Button>
                    <Button onClick={handleUploadFromCsv} disabled={!selectedColumn}>
                      {isDocumentLevel ? 'Split & Upload Tasks' : 'Upload Tasks'}
                    </Button>
                  </div>
                </div>
                )}
              </>
            )}

            {/* Step 3: Uploading */}
            {uploadStep === 'uploading' && (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {isDocumentLevel ? 'Splitting & Uploading Tasks...' : 'Uploading Tasks...'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isDocumentLevel 
                      ? 'Segmenting documents into sentences and creating tasks'
                      : 'Please wait while we create your tasks'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Progress</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-3" />
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {uploadStep === 'complete' && uploadResult && (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload Complete!</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {uploadResult.success}
                    </div>
                    <div className="text-sm text-green-700 mt-1">Tasks Created</div>
                  </div>
                  {uploadResult.failed > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {uploadResult.failed}
                      </div>
                      <div className="text-sm text-red-700 mt-1">Failed</div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => {
                      setUploadDialogOpen(false)
                      // Refresh tasks list
                      console.log('🔄 Refreshing task list...')
                      fetchTasks()
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

