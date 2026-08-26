import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserPlus, Loader2, CheckSquare, Square, AlertCircle, Send, ChevronDown } from 'lucide-react'
import {
  TaskTypeFilter,
  taskTypeFilterParam,
  type TaskTypeFilterValue,
} from '@/components/tasks/TaskTypeFilter'

interface Coder {
  id: string
  name: string
  email: string
  avatar_url?: string
  assigned_tasks?: number
}

interface Task {
  id: string
  title: string
  status: string
  created_at?: string
  task_type?: string
}

const TASKS_PAGE_SIZE = 200

function formatTaskType(taskType?: string): string {
  if (!taskType) return ''
  if (taskType === 'multimodal') return 'Multimodal'
  if (taskType === 'pdf_document_coding') return 'PDF'
  return taskType.replace(/_/g, ' ')
}

export function ManagerAssignment() {
  const { user } = useAuth()
  const [coders, setCoders] = useState<Coder[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskPage, setTaskPage] = useState(1)
  const [taskTotal, setTaskTotal] = useState(0)
  const [taskPages, setTaskPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilterValue>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [selectedCoder, setSelectedCoder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const codersLoadedForProjectRef = useRef<string | null>(null)

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  const hasActiveFilter = typeFilter !== null || !!dateFrom || !!dateTo

  const buildTasksQuery = (page: number, token: string) => {
    const params = new URLSearchParams({
      token,
      page: String(page),
      limit: String(TASKS_PAGE_SIZE),
      status: 'open',
    })
    const typeParam = taskTypeFilterParam(typeFilter)
    if (typeParam) params.set('task_type', typeParam)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    return params
  }

  useLayoutEffect(() => {
    if (user?.project_id) {
      setTaskPage(1)
      setTypeFilter(null)
      setDateFrom('')
      setDateTo('')
      setSelectedTasks(new Set())
    }
  }, [user?.project_id])

  const parseTasksPayload = (tasksData: any) => {
    let tasksList: any[] = []
    let total = 0
    let pages = 1

    if (Array.isArray(tasksData)) {
      tasksList = tasksData
      total = tasksData.length
      pages = 1
    } else if (tasksData.items && Array.isArray(tasksData.items)) {
      tasksList = tasksData.items
      total = typeof tasksData.total === 'number' ? tasksData.total : tasksList.length
      pages = typeof tasksData.pages === 'number' ? tasksData.pages : Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE))
    } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
      tasksList = tasksData.tasks
      total = tasksList.length
    } else if (tasksData.data && Array.isArray(tasksData.data)) {
      tasksList = tasksData.data
      total = tasksList.length
    }

    const transformedTasks: Task[] = tasksList
      .filter((task: any) => task.status === 'open' || task.status === 'pending')
      .map((task: any) => ({
        id: task.id || task._id || task.task_id || '',
        title: task.title || task.name || 'Untitled Task',
        status: task.status || 'open',
        created_at: task.created_at || task.createdAt || '',
        task_type: task.task_type || task.taskType || '',
      }))

    return { transformedTasks, total, pages }
  }

  const fetchTasksPage = async (projectId: string, page: number, token: string) => {
    // Empty Set = no types selected → show zero results (do not treat as All)
    if (typeFilter !== null && typeFilter.size === 0) {
      setTasks([])
      setTaskTotal(0)
      setTaskPages(1)
      return
    }
    const params = buildTasksQuery(page, token)
    const tasksResponse = await fetch(
      `${apiBaseUrl}/api/projects/${projectId}/tasks?${params.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    if (!tasksResponse.ok) {
      throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`)
    }
    const tasksData = await tasksResponse.json()
    const { transformedTasks, total, pages } = parseTasksPayload(tasksData)
    setTasks(transformedTasks)
    setTaskTotal(total)
    setTaskPages(Math.max(1, pages))
    console.log('✅ Tasks loaded:', transformedTasks.length, 'page', page, 'total', total)
  }

  const fetchCoders = async () => {
    if (!user?.project_id) return
    const token = getToken()
    if (!token) throw new Error('No authentication token')

    const codersResponse = await fetch(
      `${apiBaseUrl}/api/users/?role=coder&project_id=${user.project_id}&token=${encodeURIComponent(token)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    if (!codersResponse.ok) {
      throw new Error(`Failed to fetch coders: ${codersResponse.status}`)
    }
    const codersData = await codersResponse.json()
    let codersList: any[] = []
    if (Array.isArray(codersData)) {
      codersList = codersData
    } else if (codersData.users && Array.isArray(codersData.users)) {
      codersList = codersData.users
    } else if (codersData.data && Array.isArray(codersData.data)) {
      codersList = codersData.data
    }

    const transformedCoders: Coder[] = codersList.map((coder: any) => {
      const roles: string[] = coder.roles || (coder.role ? [coder.role] : [])
      const isAlsoManager = roles.includes('manager')
      const baseName = coder.name || coder.username || 'Unknown'
      return {
        id: coder.id || coder._id || '',
        name: isAlsoManager ? `${baseName} (Manager + Coder)` : baseName,
        email: coder.email || '',
        avatar_url: coder.avatar_url || coder.avatarUrl || coder.avatar || '',
        assigned_tasks: coder.assigned_tasks || 0,
      }
    })

    // Safety: ensure current user appears if they have coder membership but list lagged
    if (user?.id) {
      const alreadyInList = transformedCoders.some((c) => c.id === user.id)
      if (!alreadyInList) {
        transformedCoders.unshift({
          id: user.id,
          name: `${(user as any).username || (user as any).name || 'Me'} (Me)`,
          email: user.email || '',
          avatar_url: user.avatar || '',
          assigned_tasks: 0,
        })
      }
    }
    setCoders(transformedCoders)
  }

  useEffect(() => {
    if (!user?.project_id) {
      setLoading(false)
      codersLoadedForProjectRef.current = null
      return
    }

    const token = getToken()
    if (!token) {
      setLoading(false)
      setMessage({ type: 'error', text: 'Not signed in' })
      return
    }

    const needCoders = codersLoadedForProjectRef.current !== user.project_id

    let cancelled = false
    ;(async () => {
      try {
        if (needCoders) {
          setLoading(true)
          await fetchCoders()
          if (cancelled) return
          codersLoadedForProjectRef.current = user.project_id!
        } else {
          setTasksLoading(true)
        }
        await fetchTasksPage(user.project_id!, taskPage, token)
      } catch (error) {
        console.error('❌ Failed to fetch data:', error)
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Failed to load coders or tasks' })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setTasksLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.project_id, taskPage, typeFilter, dateFrom, dateTo])

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks)
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId)
    } else {
      newSelection.add(taskId)
    }
    setSelectedTasks(newSelection)
  }

  const pageIds = tasks.map((t) => t.id)
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedTasks.has(id))

  const selectAllOnPage = () => {
    if (pageIds.length === 0) return
    const next = new Set(selectedTasks)
    if (allOnPageSelected) {
      pageIds.forEach((id) => next.delete(id))
    } else {
      pageIds.forEach((id) => next.add(id))
    }
    setSelectedTasks(next)
  }

  // 按比例选择任务（从所有可用任务中）
  const selectByRatio = async (ratio: number) => {
    if (taskTotal === 0) return
    
    try {
      setTasksLoading(true)
      const token = getToken()
      if (!token || !user?.project_id) return
      
      // 计算需要选择的任务数
      const targetCount = Math.ceil(taskTotal * ratio)
      
      // 获取所有页的任务
      const allTasks: Task[] = []
      for (let page = 1; page <= taskPages; page++) {
        const params = buildTasksQuery(page, token)
        const response = await fetch(
          `${apiBaseUrl}/api/projects/${user.project_id}/tasks?${params.toString()}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        )
        if (!response.ok) continue
        
        const data = await response.json()
        const { transformedTasks } = parseTasksPayload(data)
        allTasks.push(...transformedTasks)
      }
      
      // 随机选择指定数量的任务
      const shuffled = [...allTasks].sort(() => Math.random() - 0.5)
      const selected = new Set<string>()
      shuffled.slice(0, targetCount).forEach((task) => selected.add(task.id))
      
      setSelectedTasks(selected)
      setMessage({
        type: 'success',
        text: `Selected ${selected.size} task(s) (${(ratio * 100).toFixed(0)}% of ${taskTotal} total available tasks)`,
      })
    } catch (error) {
      console.error('Batch select error:', error)
      setMessage({
        type: 'error',
        text: 'Failed to batch select tasks',
      })
    } finally {
      setTasksLoading(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedCoder) {
      setMessage({ type: 'error', text: 'Please select a coder' })
      return
    }

    if (selectedTasks.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one task' })
      return
    }

    if (!user?.project_id) {
      setMessage({ type: 'error', text: 'No project found' })
      return
    }

    try {
      setAssigning(true)
      setMessage(null)
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('📤 Assigning tasks...')
      console.log('  Coder:', selectedCoder)
      console.log('  Tasks:', Array.from(selectedTasks))

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/assignments?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coder_user_id: selectedCoder,
            task_ids: Array.from(selectedTasks),
            state: 'assigned',
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || `Failed to assign tasks: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Assignment successful:', result)

      const taskCount = selectedTasks.size

      setMessage({
        type: 'success',
        text: `Successfully assigned ${taskCount} task(s) to coder`,
      })

      // Clear selections
      setSelectedTasks(new Set())
      setSelectedCoder(null)

      // Refresh coders (counts) and current task page
      setTimeout(async () => {
        try {
          const t = getToken()
          if (!t || !user?.project_id) return
          await fetchCoders()
          await fetchTasksPage(user.project_id, taskPage, t)
        } catch (e) {
          console.error(e)
        }
      }, 1000)
    } catch (error) {
      console.error('❌ Assignment failed:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to assign tasks',
      })
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.project_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No project found. Please create a project first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Task Assignment</h1>
        <p className="mt-1 text-sm text-gray-500">Assign tasks to coders for annotation</p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Assignment Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Summary</CardTitle>
          <CardDescription>
            {selectedTasks.size} task(s) selected •{' '}
            {selectedCoder ? '1 coder selected' : 'No coder selected'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleAssign}
            disabled={assigning || selectedTasks.size === 0 || !selectedCoder}
            className="w-full flex items-center justify-center gap-2"
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Assign {selectedTasks.size > 0 && `${selectedTasks.size} Task(s)`} to Coder
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Tasks List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Tasks</CardTitle>
                <CardDescription>
                  {taskTotal} open total • {tasks.length} on this page • page {taskPage} of {taskPages} •{' '}
                  {selectedTasks.size} selected
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* 批量选择下拉菜单 - 基于所有任务 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={taskTotal === 0 || tasksLoading}
                      className="flex items-center gap-2"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Batch Select (All)
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[100] w-56 bg-white shadow-lg">
                    <DropdownMenuItem onClick={() => selectByRatio(0.25)}>
                      Select 25% ({Math.ceil(taskTotal * 0.25)} of {taskTotal} tasks)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectByRatio(0.5)}>
                      Select 50% ({Math.ceil(taskTotal * 0.5)} of {taskTotal} tasks)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectByRatio(0.75)}>
                      Select 75% ({Math.ceil(taskTotal * 0.75)} of {taskTotal} tasks)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => selectByRatio(1)}>
                      Select 100% (all {taskTotal} tasks)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSelectedTasks(new Set())}
                      className="text-red-600"
                    >
                      Clear Selection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 当前页选择按钮 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllOnPage}
                  disabled={tasks.length === 0}
                  className="flex items-center gap-2"
                >
                  {allOnPageSelected ? (
                    <>
                      <Square className="h-4 w-4" />
                      Deselect page
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Select page
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end mb-4">
              <TaskTypeFilter
                selected={typeFilter}
                onChange={(next) => {
                  setTypeFilter(next)
                  setTaskPage(1)
                  setSelectedTasks(new Set())
                }}
              />

              <div className="flex flex-col gap-0.5">
                <label className="text-xs text-gray-400">Created from</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setTaskPage(1)
                    setSelectedTasks(new Set())
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
                    setTaskPage(1)
                    setSelectedTasks(new Set())
                  }}
                  className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter(null)
                    setDateFrom('')
                    setDateTo('')
                    setTaskPage(1)
                    setSelectedTasks(new Set())
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline self-end mb-1"
                >
                  Clear filters
                </button>
              )}
            </div>

            {tasksLoading && tasks.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {hasActiveFilter ? 'No open tasks match these filters' : 'No unassigned tasks available'}
                </p>
              </div>
            ) : (
              <div className="relative space-y-2 max-h-[600px] overflow-y-auto">
                {tasksLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskSelection(task.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTasks.has(task.id)
                        ? 'bg-primary/5 border-primary'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="pt-0.5">
                      {selectedTasks.has(task.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
                        {task.task_type && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {formatTaskType(task.task_type)}
                          </Badge>
                        )}
                        {task.created_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {taskPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t">
                <p className="text-sm text-gray-500">
                  {TASKS_PAGE_SIZE} per page · {taskTotal} open tasks total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={taskPage <= 1 || tasksLoading}
                    onClick={() => setTaskPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600 tabular-nums">
                    {taskPage} / {taskPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={taskPage >= taskPages || tasksLoading}
                    onClick={() => setTaskPage((p) => Math.min(taskPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Coders List */}
        <Card>
          <CardHeader>
            <CardTitle>Select Coder</CardTitle>
            <CardDescription>
              {coders.length} coder(s) available • {selectedCoder ? '1 selected' : 'None selected'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coders.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No coders found for this project</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {coders.map((coder) => (
                  <div
                    key={coder.id}
                    onClick={() => setSelectedCoder(coder.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedCoder === coder.id
                        ? 'bg-primary/5 border-primary'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {coder.avatar_url ? (
                        <img
                          src={coder.avatar_url}
                          alt={coder.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {coder.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{coder.name}</p>
                      <p className="text-xs text-gray-500 truncate">{coder.email}</p>
                    </div>

                    {/* Task Count */}
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {coder.assigned_tasks || 0} tasks
                      </Badge>
                    </div>

                    {/* Selection Indicator */}
                    {selectedCoder === coder.id && (
                      <CheckSquare className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

