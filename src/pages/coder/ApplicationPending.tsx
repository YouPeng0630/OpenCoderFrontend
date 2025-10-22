import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Mail, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface Application {
  id: string
  project_id: string
  project_name: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  additional_info?: string
  created_at: string
  manager_email?: string
  applicant_user_id?: string  // Applicant's user_id
  applicant_email?: string     // Applicant's email
}

export function ApplicationPending() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    // If user already has a project_id, they've been approved
    if (user?.project_id) {
      console.log('✅ User already has project_id, redirecting to workspace...')
      setTimeout(() => {
        window.location.href = '/coder'
      }, 1000)
      return
    }
    
    fetchApplicationStatus()
  }, [user])

  const fetchApplicationStatus = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      // Get the project_id from localStorage (saved during application)
      const appliedProjectId = localStorage.getItem('applied_project_id')
      if (!appliedProjectId) {
        console.log('⚠️ No applied project ID found')
        setLoading(false)
        return
      }

      console.log('📡 Fetching application status...')
      console.log('  Applied Project ID:', appliedProjectId)
      console.log('  Current User ID:', user?.id)

      // Get all applications for the project
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${appliedProjectId}/applications?token=${encodeURIComponent(token)}&limit=1000`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch application status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Applications data:', data)

      // Parse application list
      let applicationsList: any[] = []
      if (Array.isArray(data)) {
        applicationsList = data
      } else if (data.items && Array.isArray(data.items)) {
        applicationsList = data.items
      } else if (data.applications && Array.isArray(data.applications)) {
        applicationsList = data.applications
      } else if (data.data && Array.isArray(data.data)) {
        applicationsList = data.data
      }

      console.log('📋 Total applications:', applicationsList.length)

      // Debug: Print full application data
      console.log('🔍 Full application data for debugging:')
      applicationsList.forEach((app: any, index: number) => {
        console.log(`  Application ${index + 1}:`, {
          _id: app._id,
          id: app.id,
          applicant_user_id: app.applicant_user_id,
          applicantUserId: app.applicantUserId,
          user_id: app.user_id,
          userId: app.userId,
          coder_user_id: app.coder_user_id,
          status: app.status,
          created_at: app.created_at,
        })
      })

      // Filter to find current user's application
      const myApplications = applicationsList.filter((app: any) => {
        // Try multiple possible field names
        const appUserId = app.applicant_user_id || app.applicantUserId || app.user_id || app.userId || app.coder_user_id
        console.log('  Matching:', app._id || app.id, '→ User ID:', appUserId, 'vs Current:', user?.id)
        return appUserId === user?.id
      })

      console.log('📋 My applications found:', myApplications.length)

      let applicationData = null
      if (myApplications.length > 0) {
        // Get the most recent application
        applicationData = myApplications[0]
        console.log('✅ Found application by user_id match')
      } else {
        // ⚠️ Fallback: Try to find by saved application ID (with verification)
        const savedAppId = localStorage.getItem('application_id')
        if (savedAppId) {
          console.log('🔍 Trying to find application by saved ID:', savedAppId)
          const foundApp = applicationsList.find((app: any) => {
            const appId = app._id || app.id || app.application_id || app.app_id
            return appId === savedAppId
          })
          
          if (foundApp) {
            console.log('✅ Found application by saved ID')
            
            // ⭐ Security check: Verify this application might belong to current user
            const appUserId = foundApp.applicant_user_id || foundApp.applicantUserId || foundApp.user_id
            const appEmail = foundApp.applicant_email || foundApp.email
            
            // Check if this is likely the user's application
            const isLikelyMine = (
              appUserId === user?.id ||  // User ID matches (unlikely due to backend bug)
              appEmail === user?.email || // Email matches (more reliable)
              (foundApp.status === 'pending' && applicationsList.length === 1) // Only one pending app in project
            )
            
            if (isLikelyMine) {
              console.log('✅ Application verified as likely belonging to current user')
              console.log('  - App User ID:', appUserId, 'vs Current:', user?.id)
              console.log('  - App Email:', appEmail, 'vs Current:', user?.email)
              applicationData = foundApp
            } else {
              console.error('❌ Security check failed: Application does not belong to current user!')
              console.error('  - App User ID:', appUserId, 'vs Current:', user?.id)
              console.error('  - App Email:', appEmail, 'vs Current:', user?.email)
              
              // Clear invalid saved IDs
              localStorage.removeItem('application_id')
              localStorage.removeItem('applied_project_id')
              
              // Redirect to apply page
              console.log('⚠️ Redirecting to apply page...')
              navigate('/coder/apply', { replace: true })
              return
            }
          }
        }
      }

      if (applicationData) {
        const projectId = applicationData.project_id || applicationData.projectId || appliedProjectId
        
        // ⭐ Prefer using project name stored redundantly in application (optimization A)
        let projectName = applicationData.project_name || applicationData.projectName
        
        // If application doesn't have project name, query it (backward compatibility)
        if (!projectName && projectId) {
          try {
            console.log('🔍 Project name not in application, fetching from API...')
            console.log('  Project ID:', projectId)
            
            const projectResponse = await fetch(
              `${apiBaseUrl}/api/projects/${projectId}?token=${encodeURIComponent(token)}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              }
            )
            
            if (projectResponse.ok) {
              const projectData = await projectResponse.json()
              projectName = projectData.name || projectData.project_name
              console.log('✅ Project name fetched:', projectName)
            } else {
              console.warn('⚠️ Failed to fetch project name:', projectResponse.status)
              projectName = 'Unknown Project'
            }
          } catch (error) {
            console.error('❌ Error fetching project name:', error)
            projectName = 'Unknown Project'
          }
        } else if (projectName) {
          console.log('✅ Using project name from application data:', projectName)
        } else {
          console.warn('⚠️ No project ID available')
          projectName = 'Unknown Project'
        }
        
        // Get manager email from application data (if available)
        let managerEmail = applicationData.manager_email || applicationData.managerEmail
        
        // If not available, we'll show "not available" message
        // Backend should include manager_email in application data
        if (!managerEmail) {
          console.log('⚠️ Manager email not included in application data')
          console.log('💡 Backend should add manager_email field to application records')
        } else {
          console.log('✅ Manager email from application:', managerEmail)
        }
        
        // Get applicant information
        const applicantUserId = applicationData.applicant_user_id || applicationData.applicantUserId || applicationData.user_id
        const applicantEmail = applicationData.applicant_email || applicationData.applicantEmail || applicationData.email
        
        const app: Application = {
          id: applicationData.id || applicationData._id || applicationData.app_id || '',
          project_id: projectId,
          project_name: projectName,
          status: applicationData.status || 'pending',
          reason: applicationData.message || applicationData.reason || '',
          additional_info: applicationData.additional_info || applicationData.additionalInfo,
          created_at: applicationData.created_at || applicationData.createdAt || new Date().toISOString(),
          manager_email: managerEmail,
          applicant_user_id: applicantUserId,  // ⭐ Retain applicant user_id
          applicant_email: applicantEmail,      // ⭐ Retain applicant email
        }
        setApplication(app)
        console.log('✅ Application loaded:', app)
        console.log('  📋 Applicant User ID:', applicantUserId)
        console.log('  📧 Applicant Email:', applicantEmail)

        // If approved, reload the page to refresh user info
        if (app.status === 'approved') {
          console.log('✅ Application approved! Reloading to update user info...')
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }

        // If rejected, redirect to apply page
        if (app.status === 'rejected') {
          console.log('❌ Application rejected. You can apply again.')
        }
      } else {
        console.log('⚠️ No application found')
      }
    } catch (error) {
      console.error('❌ Failed to fetch application status:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchApplicationStatus(true)
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Checking application status...</p>
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <CardTitle>No Application Found</CardTitle>
            </div>
            <CardDescription>
              You don't have any pending applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                To join a project, please submit an application first.
              </p>
              <div className="flex gap-3">
                <Button onClick={() => window.location.href = '/coder/apply'} className="flex-1">
                  Apply to Join Project
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Application status display
  const getStatusBadge = () => {
    switch (application.status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pending Review</Badge>
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const getStatusMessage = () => {
    switch (application.status) {
      case 'pending':
        return {
          icon: <Clock className="h-12 w-12 text-yellow-500" />,
          title: 'Application Under Review',
          description: 'Your application is being reviewed by the project manager',
        }
      case 'approved':
        return {
          icon: <div className="text-6xl">🎉</div>,
          title: 'Application Approved!',
          description: 'Congratulations! Your application has been approved. Redirecting to workspace...',
        }
      case 'rejected':
        return {
          icon: <AlertCircle className="h-12 w-12 text-red-500" />,
          title: 'Application Not Approved',
          description: 'Unfortunately, your application was not approved at this time',
        }
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-gray-400" />,
          title: 'Unknown Status',
          description: 'Application status is unclear',
        }
    }
  }

  const statusInfo = getStatusMessage()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-50 rounded-full mb-2">
                {statusInfo.icon}
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">{statusInfo.title}</CardTitle>
                <CardDescription className="text-base">
                  {statusInfo.description}
                </CardDescription>
              </div>
              <div>{getStatusBadge()}</div>
            </div>
          </CardHeader>
        </Card>

        {/* Application Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Project</p>
                <p className="text-sm font-medium text-gray-900">{application.project_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(application.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Reason for Application</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                {application.reason}
              </p>
            </div>

            {application.additional_info && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Additional Information</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {application.additional_info}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info (only for pending applications) */}
        {application.status === 'pending' && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                If you have questions about your application, please contact the project manager:
              </p>
              {application.manager_email ? (
                <a
                  href={`mailto:${application.manager_email}`}
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {application.manager_email}
                </a>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Manager contact information not available
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          {application.status === 'pending' && (
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </Button>
          )}
          {application.status === 'rejected' && (
            <Button onClick={() => window.location.href = '/coder/apply'}>
              Apply Again
            </Button>
          )}
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Info Text */}
        {application.status === 'pending' && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Your application is currently under review. You'll receive a notification when there's an update.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

