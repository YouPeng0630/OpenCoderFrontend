import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Loader2, CheckSquare, Square, AlertCircle, Send } from 'lucide-react'

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
}

export function ManagerAssignment() {
  const { user } = useAuth()
  const [coders, setCoders] = useState<Coder[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [selectedCoder, setSelectedCoder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    if (user?.project_id) {
      fetchData()
    }
  }, [user?.project_id])

  const fetchData = async () => {
    if (!user?.project_id) {
      console.log('⚠️ No project ID found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('📡 Fetching coders and tasks...')

      // Fetch coders
      const codersResponse = await fetch(
        `${apiBaseUrl}/api/users/?role=coder&project_id=${user.project_id}&token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!codersResponse.ok) {
        throw new Error(`Failed to fetch coders: ${codersResponse.status}`)
      }

      const codersData = await codersResponse.json()
      console.log('👥 Coders data:', codersData)

      // Parse coders data
      let codersList: any[] = []
      if (Array.isArray(codersData)) {
        codersList = codersData
      } else if (codersData.users && Array.isArray(codersData.users)) {
        codersList = codersData.users
      } else if (codersData.data && Array.isArray(codersData.data)) {
        codersList = codersData.data
      }

      const transformedCoders: Coder[] = codersList.map((coder: any) => ({
        id: coder.id || coder._id || '',
        name: coder.name || coder.username || 'Unknown',
        email: coder.email || '',
        avatar_url: coder.avatar_url || coder.avatarUrl || coder.avatar || '',
        assigned_tasks: coder.assigned_tasks || 0,
      }))

      setCoders(transformedCoders)
      console.log('✅ Coders loaded:', transformedCoders.length)

      // Fetch tasks (pending/unassigned tasks)
      const tasksResponse = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks?token=${encodeURIComponent(token)}&page=1&limit=100&status=open`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!tasksResponse.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksResponse.status}`)
      }

      const tasksData = await tasksResponse.json()
      console.log('📋 Tasks data:', tasksData)

      // Parse tasks data
      let tasksList: any[] = []
      if (Array.isArray(tasksData)) {
        tasksList = tasksData
      } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
        tasksList = tasksData.tasks
      } else if (tasksData.data && Array.isArray(tasksData.data)) {
        tasksList = tasksData.data
      } else if (tasksData.items && Array.isArray(tasksData.items)) {
        tasksList = tasksData.items
      }

      const transformedTasks: Task[] = tasksList
        .filter((task: any) => task.status === 'open' || task.status === 'pending')
        .map((task: any) => ({
          id: task.id || task._id || task.task_id || '',
          title: task.title || task.name || 'Untitled Task',
          status: task.status || 'open',
          created_at: task.created_at || task.createdAt || '',
        }))

      setTasks(transformedTasks)
      console.log('✅ Tasks loaded:', transformedTasks.length)
    } catch (error) {
      console.error('❌ Failed to fetch data:', error)
      setMessage({ type: 'error', text: 'Failed to load coders or tasks' })
    } finally {
      setLoading(false)
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks)
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId)
    } else {
      newSelection.add(taskId)
    }
    setSelectedTasks(newSelection)
  }

  const selectAllTasks = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)))
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

      setMessage({
        type: 'success',
        text: `Successfully assigned ${selectedTasks.size} task(s) to coder`,
      })

      // Clear selections
      setSelectedTasks(new Set())
      setSelectedCoder(null)

      // Refresh data
      setTimeout(() => {
        fetchData()
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
                  {tasks.length} unassigned task(s) • {selectedTasks.size} selected
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTasks}
                className="flex items-center gap-2"
              >
                {selectedTasks.size === tasks.length ? (
                  <>
                    <Square className="h-4 w-4" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No unassigned tasks available</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
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

