import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Plus, AlertCircle, Edit, Trash2, Upload, FileSpreadsheet, FolderOpen, Loader2, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { getToken } from '@/lib/storage'
import { useAuth } from '@/contexts/AuthContext'
import { ImageTaskUpload } from '@/components/tasks/ImageTaskUpload'

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  assignee?: string
  dueDate?: string
  createdAt: string
}

type UploadMode = 'csv' | 'folder' | 'image'
type UploadStep = 'select' | 'column-select' | 'uploading' | 'complete'

export function ManagerTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')
  
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
  
  // Folder upload states
  const [txtFiles, setTxtFiles] = useState<File[]>([])
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null)

  // Fetch tasks from API
  const fetchTasks = async () => {
    if (!user?.project_id) {
      console.log('No project_id, skipping task fetch')
      setLoading(false)
      return
    }

    try {
      const token = getToken()
      if (!token) {
        console.error('No token found')
        setLoading(false)
        return
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
      
      console.log('Fetching tasks for project:', user.project_id)
      
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks?token=${encodeURIComponent(token)}&page=1&limit=100`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      console.log('📦 Tasks API response:', result)
      console.log('📦 Response type:', typeof result)
      console.log('📦 Response keys:', Object.keys(result))
      console.log('📦 Is array?', Array.isArray(result))

      // Parse response - support multiple formats
      let tasksData: any[] = []
      
      // Try different possible formats
      if (Array.isArray(result)) {
        // Format 1: Direct array
        tasksData = result
        console.log('✅ Format: Direct array')
      } else if (result.tasks && Array.isArray(result.tasks)) {
        // Format 2: { tasks: [...] }
        tasksData = result.tasks
        console.log('✅ Format: { tasks: [...] }')
      } else if (result.data && Array.isArray(result.data)) {
        // Format 3: { data: [...] }
        tasksData = result.data
        console.log('✅ Format: { data: [...] }')
      } else if (result.items && Array.isArray(result.items)) {
        // Format 4: { items: [...] }
        tasksData = result.items
        console.log('✅ Format: { items: [...] }')
      } else {
        // Check if result itself has task-like properties
        console.error('❌ Unknown format. Full response:', JSON.stringify(result, null, 2))
        setTasks([])
        return
      }
      
      if (tasksData.length === 0) {
        console.log('ℹ️ No tasks found in response')
        setTasks([])
        return
      }

      // Transform backend tasks to frontend format
      const transformedTasks: Task[] = tasksData.map((task: any) => ({
        id: task.id || task._id || task.task_id,
        title: task.title || task.payload?.text?.substring(0, 100) || 'Untitled',
        description: task.payload?.text || '',
        status: mapBackendStatus(task.status),
        priority: 'medium', // Default priority
        assignee: task.assigned_to?.username || undefined,
        dueDate: task.due_date || undefined,
        createdAt: task.created_at || new Date().toISOString(),
      }))
      
      setTasks(transformedTasks)
      console.log(`✅ Loaded ${transformedTasks.length} tasks`)
      console.log('📋 First task sample:', transformedTasks[0])
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  // Map backend status to frontend status
  const mapBackendStatus = (status: string): Task['status'] => {
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

  useEffect(() => {
    fetchTasks()
  }, [user?.project_id])

  const handleCreateTask = () => {
    setUploadDialogOpen(true)
    setUploadStep('select')
    setUploadMode('csv')
    setCsvFile(null)
    setTxtFiles([])
    setUploadProgress(0)
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

    const taskTexts = csvData.slice(1) // Skip header
      .map(row => row[columnIndex])
      .filter(text => text && text.trim())

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

      // Build tasks array according to API format
      const tasks = taskTexts.map((text, index) => ({
        title: text.substring(0, 100), // First 100 chars as title
        payload: {
          text: text,
          meta: {
            source: uploadMode === 'csv' ? 'csv_upload' : 'txt_upload',
            upload_date: new Date().toISOString(),
            index: index + 1
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
      
      // Note: No token needed for delete endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/tasks/${taskId}`,
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
      
      // Remove task from local state
      setTasks(tasks.filter(task => task.id !== taskId))
      
      // Or refresh the entire list
      // fetchTasks()
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('Failed to delete task: ' + error)
    }
  }

  const filteredTasks = tasks.filter(
    (task) => filter === 'all' || task.status === filter
  )

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

  if (loading) {
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
            onClick={() => setFilter(status)}
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

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">No {filter !== 'all' ? filter : ''} tasks</p>
            <p className="text-xs text-gray-400 mt-1">
              Create your first task to get started
            </p>
            <Button onClick={handleCreateTask} className="mt-4" variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status}
                      </Badge>
                    </div>
                    <CardDescription>{task.description}</CardDescription>
                  </div>
                  <div className="flex gap-1">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Batch Upload Tasks</DialogTitle>
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
                  <div className="grid grid-cols-3 gap-4">
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

                {/* Action Buttons */}
                {uploadMode !== 'image' && (
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

            {/* Step 2: Column Selection (CSV only) */}
            {uploadStep === 'column-select' && (
              <>
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

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Preview:</strong> {csvData.length - 1} tasks will be created
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setUploadStep('select')}>
                    Back
                  </Button>
                  <Button onClick={handleUploadFromCsv} disabled={!selectedColumn}>
                    Upload Tasks
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Uploading */}
            {uploadStep === 'uploading' && (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Uploading Tasks...</h3>
                  <p className="text-sm text-gray-500">Please wait while we create your tasks</p>
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

