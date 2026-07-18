import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getToken } from '@/lib/storage'

interface PDFTaskUploadProps {
  projectId: string
  onComplete?: (taskId: string, documentId: string, readableTaskId: string) => void
  onError?: (error: string) => void
}

export function PDFTaskUpload({ projectId, onComplete, onError }: PDFTaskUploadProps) {
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate PDF
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file')
      setFile(null)
      return
    }

    if (selectedFile.type !== 'application/pdf') {
      setError('Invalid file type. Please select a PDF file.')
      setFile(null)
      return
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError('PDF file size exceeds 50MB limit')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError('')

    // Auto-fill title if empty
    if (!title) {
      const fileName = selectedFile.name.replace('.pdf', '')
      setTitle(fileName)
    }
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please provide a title and select a PDF file')
      return
    }

    setUploading(true)
    setProgress(0)
    setError('')

    try {
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('tags', JSON.stringify([]))
      formData.append('pdf', file)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/pdf-coding/upload?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Upload failed' }))
        throw new Error(errorData.detail || `Upload failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setSuccess(true)
        
        // Call completion callback
        if (onComplete) {
          onComplete(result.task_id, result.document_id, result.readable_task_id)
        }

        // Reset form after success
        setTimeout(() => {
          setTitle('')
          setFile(null)
          setProgress(0)
          setSuccess(false)
        }, 2000)
      } else {
        throw new Error(result.message || 'Upload failed')
      }
    } catch (err: any) {
      console.error('PDF upload error:', err)
      const errorMessage = err.message || 'Failed to upload PDF'
      setError(errorMessage)
      
      if (onError) {
        onError(errorMessage)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="pdf-title">Task Title *</Label>
        <Input
          id="pdf-title"
          placeholder="Enter task title (e.g., Literature Review - Study 001)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={uploading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pdf-file">Select PDF File *</Label>
        <div className="flex items-center gap-2">
          <Input
            id="pdf-file"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="flex-1"
          />
          {file && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Maximum file size: 50MB. Only PDF files are supported.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            PDF Document Coding task created successfully!
          </AlertDescription>
        </Alert>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-center text-gray-600">Uploading... {progress}%</p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          onClick={handleUpload}
          disabled={!file || !title.trim() || uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload PDF
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          About PDF Document Coding
        </h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Code the entire PDF document with Document-level Coding</li>
          <li>Select and code specific text passages with Passage-level Coding</li>
          <li>One passage can have multiple codes</li>
          <li>All highlights and annotations are saved automatically</li>
        </ul>
      </div>
    </div>
  )
}
