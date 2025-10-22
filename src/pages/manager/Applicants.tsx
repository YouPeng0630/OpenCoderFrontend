import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Calendar, Check, X, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import * as Avatar from '@radix-ui/react-avatar'

interface Application {
  id: string
  applicant_user_id: string
  applicant_name?: string
  applicant_email?: string
  project_id: string
  project_name?: string
  status: 'pending' | 'approved' | 'rejected'
  message: string
  additional_info?: string
  created_at: string
  updated_at: string
}

export function ManagerApplicants() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchApplications()
  }, [user])

  const fetchApplications = async (isRefresh = false) => {
    if (!user?.project_id) {
      console.log('⚠️ No project ID found')
      setLoading(false)
      return
    }

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

      console.log('📡 Fetching applications for project:', user.project_id)

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/applications?token=${encodeURIComponent(token)}&limit=100`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.status}`)
      }

      const data = await response.json()
      console.log('📋 Applications data:', data)

      // Parse response
      const appsList = data.items || data.applications || data.data || []
      console.log('✅ Applications loaded:', appsList.length)

      // Transform to frontend format
      // Backend now includes applicant_name and applicant_email directly
      const transformedApps: Application[] = appsList.map((app: any) => ({
        id: app._id || app.id,
        applicant_user_id: app.applicant_user_id || app.applicantUserId || app.user_id || '',
        applicant_name: app.applicant_name || app.applicantName || 'Unknown',
        applicant_email: app.applicant_email || app.applicantEmail || app.email || 'N/A',
        project_id: app.project_id || app.projectId || '',
        project_name: app.project_name || app.projectName || '',
        status: app.status || 'pending',
        message: app.message || app.reason || '',
        additional_info: app.additional_info || app.additionalInfo,
        created_at: app.created_at || app.createdAt || new Date().toISOString(),
        updated_at: app.updated_at || app.updatedAt || new Date().toISOString(),
      }))

      console.log('✅ Applications transformed:', transformedApps.length)
      setApplications(transformedApps)
    } catch (error) {
      console.error('❌ Failed to fetch applications:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load applications',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleApprove = async (applicationId: string) => {
    if (!user?.project_id) {
      alert('No project found')
      return
    }

    if (!confirm('Are you sure you want to approve this application?')) {
      return
    }

    try {
      setActionLoading(applicationId)
      setMessage(null)

      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('✅ Approving application:', applicationId)

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/applications/${applicationId}/approve?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || errorData?.message || `Failed to approve: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Application approved:', result)

      // Update local state
      setApplications((apps) =>
        apps.map((app) =>
          app.id === applicationId ? { ...app, status: 'approved' as const } : app
        )
      )

      setMessage({
        type: 'success',
        text: 'Application approved successfully!',
      })

      // Auto-dismiss success message
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('❌ Failed to approve application:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to approve application',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (applicationId: string) => {
    if (!user?.project_id) {
      alert('No project found')
      return
    }

    if (!confirm('Are you sure you want to reject this application?')) {
      return
    }

    try {
      setActionLoading(applicationId)
      setMessage(null)

      const token = getToken()
      if (!token) {
        throw new Error('No authentication token')
      }

      console.log('❌ Rejecting application:', applicationId)

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/applications/${applicationId}/reject?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || errorData?.message || `Failed to reject: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Application rejected:', result)

      // Update local state
      setApplications((apps) =>
        apps.map((app) =>
          app.id === applicationId ? { ...app, status: 'rejected' as const } : app
        )
      )

      setMessage({
        type: 'success',
        text: 'Application rejected successfully!',
      })

      // Auto-dismiss success message
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('❌ Failed to reject application:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reject application',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const filteredApplications = applications.filter(
    (app) => filter === 'all' || app.status === filter
  )

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
          <h1 className="text-3xl font-bold text-gray-900">Applicant Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage project join requests
          </p>
        </div>
        <Button
          onClick={() => fetchApplications(true)}
          disabled={refreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
          const count = status === 'all' 
            ? applications.length 
            : applications.filter(app => app.status === status).length
          
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                filter === status
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">
              {loading ? 'Loading applications...' : `No ${filter} applications`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar.Root className="h-12 w-12">
                      <Avatar.Fallback className="h-full w-full rounded-full bg-primary text-white flex items-center justify-center font-medium text-lg">
                        {(application.applicant_name || application.applicant_email || 'U')[0].toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    <div>
                      <CardTitle className="text-lg">
                        {application.applicant_name || 'Applicant'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {application.applicant_email || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      application.status === 'approved'
                        ? 'default'
                        : application.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="capitalize"
                  >
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
              {application.message && (
                <CardContent className="border-t pt-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Application Message:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                      "{application.message}"
                    </p>
                    {application.additional_info && (
                      <>
                        <p className="text-sm font-medium text-gray-700 mt-3">Additional Information:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                          {application.additional_info}
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              )}
              {application.status === 'pending' && (
                <CardContent className={application.message ? 'pt-4 border-t' : ''}>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(application.id)}
                      disabled={actionLoading === application.id}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      {actionLoading === application.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(application.id)}
                      disabled={actionLoading === application.id}
                      variant="outline"
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      size="sm"
                    >
                      {actionLoading === application.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Reject
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

