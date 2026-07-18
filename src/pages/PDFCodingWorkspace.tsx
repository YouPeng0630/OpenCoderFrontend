import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText, Save,
  Trash2, Edit, CheckCircle, AlertCircle, Loader2, ArrowLeft, Plus
} from 'lucide-react'
import { getToken } from '@/lib/storage'
import { useAuth } from '@/contexts/AuthContext'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

interface TagOption {
  option_id: string
  label: string
  order: number
  active: boolean
}

interface TagGroup {
  _id: string
  group_id: string
  name: string
  description?: string
  type: 'single' | 'multi'
  required: boolean
  order: number
  active: boolean
  options: TagOption[]
}

interface PDFDocument {
  _id: string
  task_id: string
  file_name: string
  drive_file_id: string
  drive_file_url: string
  mime_type: string
  file_size: number
  page_count?: number
}

interface Task {
  _id: string
  title: string
  task_type: string
  status: string
  payload: {
    pdf?: {
      drive_file_url: string
      page_count?: number
      original_filename: string
    }
    meta?: {
      readable_task_id?: string
    }
  }
}

interface Rectangle {
  x_ratio: number
  y_ratio: number
  width_ratio: number
  height_ratio: number
  page_width: number
  page_height: number
}

interface PassageAnnotation {
  _id: string
  task_id: string
  document_id: string
  page_number: number
  selected_text: string
  rectangles: Rectangle[]
  code_ids: string[]
  note?: string
  coder_user_id: string
  created_at: string
  updated_at: string
}

interface DocumentCoding {
  _id: string
  task_id: string
  document_id: string
  code_ids: string[]
  note?: string
  coder_user_id: string
  created_at: string
  updated_at: string
}

export function PDFCodingWorkspace() {
  const { taskId } = useParams<{ taskId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  // PDF state
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Task data
  const [task, setTask] = useState<Task | null>(null)
  const [document, setDocument] = useState<PDFDocument | null>(null)
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([])

  // Document-level coding
  const [documentCodes, setDocumentCodes] = useState<string[]>([])
  const [documentNote, setDocumentNote] = useState('')
  const [documentCodingId, setDocumentCodingId] = useState<string | null>(null)

  // Passage annotations
  const [annotations, setAnnotations] = useState<PassageAnnotation[]>([])
  const [selectedAnnotation, setSelectedAnnotation] = useState<PassageAnnotation | null>(null)

  // Text selection
  const [showCodingDialog, setShowCodingDialog] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionCodes, setSelectionCodes] = useState<string[]>([])
  const [selectionNote, setSelectionNote] = useState('')
  const [selectionRectangles, setSelectionRectangles] = useState<Rectangle[]>([])
  const [selectionPageNumber, setSelectionPageNumber] = useState(1)

  // Edit annotation dialog
  const [editingAnnotation, setEditingAnnotation] = useState<PassageAnnotation | null>(null)
  const [editCodes, setEditCodes] = useState<string[]>([])
  const [editNote, setEditNote] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const pageRef = useRef<HTMLDivElement>(null)
  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  // Load task data
  const loadTaskData = useCallback(async () => {
    if (!taskId || !user?.project_id) return

    try {
      setLoading(true)
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/pdf-coding/task/${taskId}?token=${encodeURIComponent(token)}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error(`Failed to load task: ${response.status}`)
      }

      const data = await response.json()

      setTask(data.task)
      setDocument(data.document)
      setTagGroups(data.tag_groups || [])
      // Use backend proxy to avoid CORS issues (like video/audio)
      const driveFileId = data.document.drive_file_id
      const proxyUrl = driveFileId 
        ? `${apiBaseUrl}/api/proxy/drive/${driveFileId}`
        : data.document.drive_file_url
      
      setPdfUrl(proxyUrl)

      // Load document coding
      if (data.document_coding) {
        setDocumentCodes(data.document_coding.code_ids || [])
        setDocumentNote(data.document_coding.note || '')
        setDocumentCodingId(data.document_coding._id)
      }

      // Load annotations
      setAnnotations(data.annotations || [])

    } catch (err: any) {
      console.error('Failed to load task:', err)
      setError(err.message || 'Failed to load PDF coding task')
    } finally {
      setLoading(false)
    }
  }, [taskId, user?.project_id, apiBaseUrl])

  useEffect(() => {
    loadTaskData()
  }, [loadTaskData])

  const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)

    // Update page count in backend if not set
    if (document && !document.page_count) {
      try {
        const token = getToken()
        await fetch(
          `${apiBaseUrl}/api/projects/${user?.project_id}/pdf-coding/document/${document._id}/page-count?page_count=${numPages}&token=${encodeURIComponent(token)}`,
          { method: 'PUT' }
        )
      } catch (err) {
        console.error('Failed to update page count:', err)
      }
    }
  }

  // Handle text selection
  const handleTextSelection = () => {
    try {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const text = selection.toString().trim()
      if (!text || text.length < 3) return

      // Get selection rectangles
      const range = selection.getRangeAt(0)
      const rects = range.getClientRects()
      
      if (rects.length === 0) return

      // Get page dimensions for normalization
      const pageElement = window.document.querySelector('.react-pdf__Page')
      if (!pageElement) {
        console.warn('PDF page element not found')
        return
      }

      const pageWidth = pageElement.clientWidth
      const pageHeight = pageElement.clientHeight

      // Convert rectangles to normalized coordinates
      const rectangles: Rectangle[] = Array.from(rects).map(rect => ({
        x_ratio: rect.x / pageWidth,
        y_ratio: rect.y / pageHeight,
        width_ratio: rect.width / pageWidth,
        height_ratio: rect.height / pageHeight,
        page_width: pageWidth,
        page_height: pageHeight
      }))

      setSelectedText(text)
      setSelectionRectangles(rectangles)
      setSelectionPageNumber(pageNumber)
      setSelectionCodes([])
      setSelectionNote('')
      setShowCodingDialog(true)

      // Clear selection
      selection.removeAllRanges()
    } catch (err) {
      console.error('Error handling text selection:', err)
    }
  }

  // Save document-level coding
  const saveDocumentCoding = async () => {
    if (!document || !user?.project_id) return

    try {
      setSaving(true)
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/pdf-coding/document-coding?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: document._id,
            code_ids: documentCodes,
            note: documentNote.trim() || undefined
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to save document coding')
      }

      const result = await response.json()
      setDocumentCodingId(result.id)
      setMessage({ type: 'success', text: 'Document coding saved successfully' })

      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error('Save error:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  // Save passage annotation
  const savePassageAnnotation = async () => {
    if (!document || !user?.project_id || !selectedText.trim()) return

    if (selectionCodes.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one code' })
      return
    }

    try {
      setSaving(true)
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      console.log('💾 Saving passage annotation:', {
        document_id: document._id,
        page_number: selectionPageNumber,
        selected_text: selectedText.substring(0, 50) + '...',
        code_ids: selectionCodes,
        rectangles_count: selectionRectangles.length
      })

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/pdf-coding/passage-annotation?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: document._id,
            page_number: selectionPageNumber,
            selected_text: selectedText,
            rectangles: selectionRectangles,
            code_ids: selectionCodes,
            note: selectionNote.trim() || undefined
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.detail || 'Failed to save annotation')
      }

      const result = await response.json()
      console.log('✅ Annotation saved:', result)
      
      // Add new annotation to list
      setAnnotations(prev => {
        const updated = [...prev, result.annotation]
        console.log('📋 Updated annotations count:', updated.length)
        return updated
      })
      
      setMessage({ type: 'success', text: 'Annotation saved successfully' })
      setShowCodingDialog(false)
      setSelectedText('')
      setSelectionCodes([])
      setSelectionNote('')
      setSelectionRectangles([])

      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error('❌ Failed to save annotation:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to save annotation' })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  // Update annotation
  const updateAnnotation = async () => {
    if (!editingAnnotation || !user?.project_id) return

    try {
      setSaving(true)
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/pdf-coding/passage-annotation/${editingAnnotation._id}?token=${encodeURIComponent(token)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code_ids: editCodes,
            note: editNote.trim() || undefined
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update annotation')
      }

      const result = await response.json()
      
      // Update annotation in list
      setAnnotations(prev =>
        prev.map(ann => ann._id === editingAnnotation._id ? result.annotation : ann)
      )
      
      setMessage({ type: 'success', text: 'Annotation updated successfully' })
      setEditingAnnotation(null)

      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error('Update error:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to update annotation' })
    } finally {
      setSaving(false)
    }
  }

  // Delete annotation
  const deleteAnnotation = async (annotationId: string) => {
    if (!user?.project_id) return
    if (!confirm('Are you sure you want to delete this annotation?')) return

    try {
      const token = getToken()
      if (!token) throw new Error('No authentication token')

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/pdf-coding/passage-annotation/${annotationId}?token=${encodeURIComponent(token)}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete annotation')
      }

      // Remove from list
      setAnnotations(prev => prev.filter(ann => ann._id !== annotationId))
      
      setMessage({ type: 'success', text: 'Annotation deleted successfully' })
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      console.error('Delete error:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to delete annotation' })
    }
  }

  const jumpToPage = (page: number) => {
    setPageNumber(page)
    // Scroll to top of PDF viewer
    if (pageRef.current) {
      pageRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const getCodeLabel = (codeId: string): string => {
    for (const group of tagGroups) {
      const option = group.options.find(opt => opt.option_id === codeId)
      if (option) return option.label
    }
    return codeId
  }

  // Group annotations by code
  const annotationsByCode = annotations.reduce((acc, ann) => {
    ann.code_ids.forEach(codeId => {
      if (!acc[codeId]) acc[codeId] = []
      acc[codeId].push(ann)
    })
    return acc
  }, {} as Record<string, PassageAnnotation[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <Button onClick={() => navigate('/coder')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/coder')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold">{task?.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{task?.payload?.meta?.readable_task_id}</span>
                  <span>•</span>
                  <span>{document?.file_name}</span>
                  <span>•</span>
                  <Badge variant="outline">{task?.status}</Badge>
                </div>
              </div>
            </div>
            {message && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{message.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: PDF Viewer */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    PDF Document
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 min-w-[60px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg bg-gray-100 overflow-auto" ref={pageRef}>
                  <div
                    className="pdf-container"
                    onMouseUp={handleTextSelection}
                  >
                    {pdfUrl && (
                      <Document
                        file={pdfUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                          <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center py-20 text-red-600">
                            <AlertCircle className="h-6 w-6 mr-2" />
                            <span>Failed to load PDF</span>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    )}
                  </div>
                </div>

                {/* PDF Navigation */}
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageNumber >= numPages}
                    onClick={() => setPageNumber(pageNumber + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> Select text in the PDF to create a passage annotation
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Coding Panels */}
          <div className="space-y-4">
            {/* Document-level Coding */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document-level Coding</CardTitle>
                <CardDescription>Applies to the entire PDF document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tagGroups.map(group => (
                  <div key={group._id} className="space-y-2">
                    <Label className="font-semibold">{group.name}</Label>
                    {group.options
                      .filter(opt => opt.active)
                      .map(option => (
                        <div key={option.option_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-${option.option_id}`}
                            checked={documentCodes.includes(option.option_id)}
                            onCheckedChange={(checked) => {
                              setDocumentCodes(prev =>
                                checked
                                  ? [...prev, option.option_id]
                                  : prev.filter(id => id !== option.option_id)
                              )
                            }}
                          />
                          <Label htmlFor={`doc-${option.option_id}`} className="cursor-pointer font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                  </div>
                ))}

                <div className="space-y-2">
                  <Label htmlFor="doc-note">Notes (Optional)</Label>
                  <Input
                    id="doc-note"
                    placeholder="Add notes for document-level coding..."
                    value={documentNote}
                    onChange={(e) => setDocumentNote(e.target.value)}
                  />
                </div>

                <Button
                  onClick={saveDocumentCoding}
                  disabled={saving || documentCodes.length === 0}
                  className="w-full"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Save Document Coding</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Passage-level Coding List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Passage-level Coding</CardTitle>
                <CardDescription>
                  {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {Object.keys(annotationsByCode).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No passage annotations yet</p>
                    <p className="text-xs mt-1">Select text in the PDF to create one</p>
                  </div>
                ) : (
                  Object.entries(annotationsByCode).map(([codeId, anns]) => (
                    <div key={codeId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {getCodeLabel(codeId)} ({anns.length})
                        </Badge>
                      </div>
                      {anns.map(ann => (
                        <div
                          key={ann._id}
                          className="border rounded-lg p-3 space-y-2 hover:border-primary transition-colors cursor-pointer"
                          onClick={() => jumpToPage(ann.page_number)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 line-clamp-2">
                                "{ann.selected_text}"
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Page {ann.page_number}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingAnnotation(ann)
                                  setEditCodes(ann.code_ids)
                                  setEditNote(ann.note || '')
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteAnnotation(ann._id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {ann.note && (
                            <p className="text-xs text-gray-600 italic">Note: {ann.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Annotation Dialog */}
      <Dialog open={showCodingDialog} onOpenChange={setShowCodingDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Passage Annotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Selected Text</Label>
              <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                <p className="text-sm text-gray-900">"{selectedText}"</p>
                <p className="text-xs text-gray-500 mt-1">Page {selectionPageNumber}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="font-semibold">Assign Codes *</Label>
              {tagGroups.map(group => (
                <div key={group._id} className="space-y-2">
                  <Label className="text-sm font-medium">{group.name}</Label>
                  {group.options
                    .filter(opt => opt.active)
                    .map(option => (
                      <div key={option.option_id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sel-${option.option_id}`}
                          checked={selectionCodes.includes(option.option_id)}
                          onCheckedChange={(checked) => {
                            setSelectionCodes(prev =>
                              checked
                                ? [...prev, option.option_id]
                                : prev.filter(id => id !== option.option_id)
                            )
                          }}
                        />
                        <Label htmlFor={`sel-${option.option_id}`} className="cursor-pointer font-normal">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sel-note">Notes (Optional)</Label>
              <Input
                id="sel-note"
                placeholder="Add notes for this annotation..."
                value={selectionNote}
                onChange={(e) => setSelectionNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCodingDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={savePassageAnnotation}
                disabled={saving || selectionCodes.length === 0}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Save Annotation</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Annotation Dialog */}
      <Dialog open={!!editingAnnotation} onOpenChange={(open) => !open && setEditingAnnotation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Annotation</DialogTitle>
          </DialogHeader>
          {editingAnnotation && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Selected Text</Label>
                <div className="mt-2 p-3 bg-gray-50 border rounded-lg">
                  <p className="text-sm text-gray-900">"{editingAnnotation.selected_text}"</p>
                  <p className="text-xs text-gray-500 mt-1">Page {editingAnnotation.page_number}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-semibold">Assign Codes *</Label>
                {tagGroups.map(group => (
                  <div key={group._id} className="space-y-2">
                    <Label className="text-sm font-medium">{group.name}</Label>
                    {group.options
                      .filter(opt => opt.active)
                      .map(option => (
                        <div key={option.option_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${option.option_id}`}
                            checked={editCodes.includes(option.option_id)}
                            onCheckedChange={(checked) => {
                              setEditCodes(prev =>
                                checked
                                  ? [...prev, option.option_id]
                                  : prev.filter(id => id !== option.option_id)
                              )
                            }}
                          />
                          <Label htmlFor={`edit-${option.option_id}`} className="cursor-pointer font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-note">Notes (Optional)</Label>
                <Input
                  id="edit-note"
                  placeholder="Add notes for this annotation..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingAnnotation(null)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateAnnotation}
                  disabled={saving || editCodes.length === 0}
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Update Annotation</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
