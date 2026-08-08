import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Calendar, Check, X, AlertCircle, Loader2, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalApps, setTotalApps] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setCurrentPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

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

      const params = new URLSearchParams({
        token,
        page: String(currentPage),
        limit: String(pageSize),
      })
      if (filter !== 'all') params.set('status', filter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (debouncedSearch) params.set('search', debouncedSearch)

      const response = await fetch(
        `${apiBaseUrl}/api/projects/${user.project_id}/applications?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.status}`)
      }

      const data = await response.json()
      const appsList = data.items || data.applications || data.data || []

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

      setApplications(transformedApps)
      setTotalApps(typeof data.total === 'number' ? data.total : transformedApps.length)
      setTotalPages(typeof data.pages === 'number' ? Math.max(1, data.pages) : 1)
    } catch (error) {
      console.error('❌ Failed to fetch applications:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load applications',
      })
      setApplications([])
      setTotalApps(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [user?.project_id, filter, dateFrom, dateTo, debouncedSearch, currentPage, pageSize])

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

  const hasActiveFilter = filter !== 'all' || !!searchQuery || !!dateFrom || !!dateTo

  if (loading && applications.length === 0 && !hasActiveFilter) {
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
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setCurrentPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {filter === status && (
              <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                {totalApps}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Date filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">Applied from</label>
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
        {(searchQuery || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setCurrentPage(1) }}
            className="text-xs text-gray-400 hover:text-gray-600 underline self-end mb-1"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        {totalApps} application{totalApps !== 1 ? 's' : ''}
        {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ''}
      </p>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">
              {loading ? 'Loading applications...' : hasActiveFilter ? 'No applications match your filters' : `No ${filter} applications`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
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

      {totalApps > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages} · {totalApps} applications
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
  )
}

