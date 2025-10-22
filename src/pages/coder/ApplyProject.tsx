import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { AlertCircle, Loader2, Send, FileText } from 'lucide-react'

interface Project {
  id: string
  name: string
  slug: string
  description?: string
}

export function ApplyProject() {
  const { user, clearRole } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [reason, setReason] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchProjects()
  }, [])

  // Handle changing role
  const handleChangeRole = () => {
    console.log('🔄 User wants to change role, clearing current role...')
    clearRole()  // Clear role and navigate (handled inside clearRole)
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('📡 Fetching available projects...')

      const response = await fetch(`${apiBaseUrl}/api/projects?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Projects data:', data)

      // Parse projects
      let projectsList: any[] = []
      if (Array.isArray(data)) {
        projectsList = data
      } else if (data.projects && Array.isArray(data.projects)) {
        projectsList = data.projects
      } else if (data.data && Array.isArray(data.data)) {
        projectsList = data.data
      }

      const transformedProjects: Project[] = projectsList.map((project: any) => ({
        id: project.id || project._id || project.project_id || '',
        name: project.name || project.project_name || 'Untitled Project',
        slug: project.slug || '',
        description: project.description || '',
      }))

      setProjects(transformedProjects)
      console.log('✅ Projects loaded:', transformedProjects.length)
    } catch (error) {
      console.error('❌ Failed to fetch projects:', error)
      setMessage({ type: 'error', text: 'Failed to load projects' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject) {
      setMessage({ type: 'error', text: 'Please select a project' })
      return
    }

    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for your application' })
      return
    }

    try {
      setSubmitting(true)
      setMessage(null)
      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('📤 Submitting application...')
      console.log('  Project ID:', selectedProject)
      console.log('  User:', user?.username)
      console.log('  Email:', user?.email)

      // Backend expects "message" field instead of "reason"
      const requestBody: any = {
        message: reason.trim(),
      }
      
      // Only add additional_info if it's not empty
      if (additionalInfo.trim()) {
        requestBody.additional_info = additionalInfo.trim()
      }
      
      console.log('📦 Request body:', requestBody)

      const url = `${apiBaseUrl}/api/projects/${selectedProject}/apply?token=${encodeURIComponent(token)}`
      console.log('🔗 URL:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('❌ Error data:', errorData)
        
        // Handle different error formats
        let errorMessage = `Failed to submit application: ${response.status}`
        if (errorData) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            // Pydantic validation errors (array format)
            const firstError = errorData.detail[0]
            if (firstError?.msg) {
              errorMessage = `${firstError.msg}: ${firstError.loc?.join('.') || 'unknown field'}`
            } else {
              errorMessage = JSON.stringify(errorData.detail)
            }
          } else if (errorData.detail && typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail)
          } else if (errorData.message) {
            errorMessage = errorData.message
          } else if (errorData.error) {
            errorMessage = errorData.error
          }
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('✅ Application submitted:', result)

      // Save the applied project ID and application ID to localStorage
      localStorage.setItem('applied_project_id', selectedProject)
      
      // Save the application ID if returned
      const applicationId = result.id || result._id || result.application_id || result.app_id
      if (applicationId) {
        localStorage.setItem('application_id', applicationId)
        console.log('💾 Saved application ID to localStorage:', applicationId)
      }
      
      // Update user ID from backend response to ensure sync
      const backendUserId = result.applicant_user_id || result.applicantUserId || result.user_id
      if (backendUserId && user && backendUserId !== user.id) {
        console.warn('⚠️ User ID mismatch detected!')
        console.warn('  Frontend user ID:', user.id)
        console.warn('  Backend user ID:', backendUserId)
        console.warn('  Updating localStorage to match backend...')
        
        // Update user info in localStorage
        const updatedUser = { ...user, id: backendUserId }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        console.log('✅ User ID synchronized with backend')
      }
      
      console.log('💾 Saved applied project ID to localStorage:', selectedProject)

      setMessage({
        type: 'success',
        text: 'Application submitted successfully! Redirecting...',
      })

      // Redirect to pending page after 1.5 seconds
      setTimeout(() => {
        // Navigate to pending page (this will automatically load fresh user info)
        window.location.href = '/coder/pending'
      }, 1500)
    } catch (error) {
      console.error('❌ Application submission failed:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit application',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading projects...</p>
        </div>
      </div>
    )
  }

  // If no projects available, show empty state
  if (projects.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply to Join a Project</h1>
            <p className="text-gray-500">
              Select a project and tell us why you'd like to join
            </p>
          </div>

          {/* Empty State */}
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full">
                  <AlertCircle className="h-10 w-10 text-gray-400" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    No Projects Available
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    There are currently no projects available to apply to. 
                    Please check back later or contact an administrator.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleChangeRole}
                  >
                    Change Role
                  </Button>
                  <Button
                    onClick={() => fetchProjects()}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                    Refresh Projects
                  </Button>
                </div>

                <div className="pt-6 border-t">
                  <p className="text-xs text-gray-400">
                    💡 Tip: Project managers need to create projects first before coders can apply.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Apply to Join a Project</h1>
          <p className="text-gray-500">
            Select a project and tell us why you'd like to join
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-2 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
            <CardDescription>
              Complete the form below to submit your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Applicant Info (Read-only) */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Your Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Name</Label>
                    <p className="text-sm font-medium text-gray-900">{user?.username || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="text-sm font-medium text-gray-900">{user?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project" className="text-base font-medium">
                  Select Project <span className="text-red-500">*</span>
                </Label>
                <select
                  id="project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  required
                >
                  <option value="">-- Select a project --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {project.description && ` - ${project.description}`}
                    </option>
                  ))}
                </select>
                {projects.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No projects available at the moment
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-base font-medium">
                  Why do you want to join this project? <span className="text-red-500">*</span>
                </Label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us about your interest and relevant experience..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
                  required
                />
                <p className="text-xs text-gray-500">{reason.length} characters</p>
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                <Label htmlFor="additional" className="text-base font-medium">
                  Additional Information (Optional)
                </Label>
                <Input
                  id="additional"
                  type="text"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Any other information the project manager should know..."
                  className="text-sm"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChangeRole}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || projects.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Your application will be reviewed by the project manager.
            <br />
            You'll be notified once a decision is made.
          </p>
        </div>
      </div>
    </div>
  )
}

