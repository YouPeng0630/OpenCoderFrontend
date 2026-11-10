import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Plus,
  UserPlus,
  FolderKanban,
  LogOut,
  HelpCircle,
} from 'lucide-react'
import { HubOnboardingTour } from '@/components/tour/HubOnboardingTour'
import { requestHubTourStart } from '@/lib/hubTour'

interface HubProject {
  membership_id: string
  project_id: string
  role: 'manager' | 'coder'
  roles?: Array<'manager' | 'coder'>
  status: string
  project_name: string
  project_slug: string
  project_status: string
  joined_at: string | null
  updated_at: string | null
}

function projectRoles(p: HubProject): Array<'manager' | 'coder'> {
  if (p.roles && p.roles.length) return p.roles
  return p.role ? [p.role] : ['coder']
}

export function ProjectHub() {
  const { user, logout, enterProject } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<HubProject[]>([])
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [enteringKey, setEnteringKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiBase = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      const res = await fetch(
        `${apiBase}/api/users/me/projects?token=${encodeURIComponent(token || '')}`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setProjects(data.projects || [])
      setTotal(data.total ?? 0)
      setLimit(data.limit ?? 10)
    } catch (e: any) {
      setError(e.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    load()
  }, [load])

  const handleEnter = async (p: HubProject, asRole: 'manager' | 'coder') => {
    const key = `${p.project_id}:${asRole}`
    setEnteringKey(key)
    try {
      await enterProject(p.project_id, asRole)
      navigate(asRole === 'manager' ? '/project-manager' : '/coder', { replace: true })
    } catch (e: any) {
      alert(e.message || 'Failed to enter project')
      setEnteringKey(null)
    }
  }

  const atLimit = total >= limit

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-tour="hub-welcome">
              Hi, {user?.username}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              This is your project list.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {total} / {limit} projects (create + join)
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => requestHubTourStart()}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-white/60"
              aria-label="Quick tour"
            >
              <HelpCircle className="h-4 w-4" />
              Quick tour
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-white/60"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Button
            className="h-auto py-4 flex flex-col items-start gap-1"
            disabled={atLimit}
            onClick={() => navigate('/project-manager/create-project')}
            data-tour="hub-create"
          >
            <span className="flex items-center gap-2 text-base font-semibold">
              <Plus className="h-5 w-5" />
              Create Project
            </span>
            <span className="text-xs font-normal opacity-80 text-left">
              Become Manager (+ Coder on the same project)
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-1 bg-white"
            disabled={atLimit}
            onClick={() => navigate('/coder/apply')}
            data-tour="hub-join"
          >
            <span className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="h-5 w-5" />
              Join a Project
            </span>
            <span className="text-xs font-normal text-gray-500 text-left">
              Apply as a Coder
            </span>
          </Button>
        </div>

        {atLimit && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
            You have reached the limit of {limit} projects. Leave or archive one before adding another.
          </p>
        )}

        <div className="space-y-3" data-tour="hub-list">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Projects you belong to
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-10 text-center text-red-500 text-sm">{error}</CardContent>
            </Card>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <FolderKanban className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No projects yet. Create one or apply to join.
                </p>
              </CardContent>
            </Card>
          ) : (
            projects.map((p) => {
              const roles = projectRoles(p)
              const hasManager = roles.includes('manager')
              const hasCoder = roles.includes('coder')
              return (
                <Card key={p.membership_id} className="hover:border-blue-300 transition-colors">
                  <CardHeader className="py-4 px-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{p.project_name}</CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">/{p.project_slug}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {hasManager && (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                              Manager
                            </Badge>
                          )}
                          {hasCoder && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              Coder
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {hasManager && (
                          <Button
                            size="sm"
                            disabled={enteringKey === `${p.project_id}:manager`}
                            onClick={() => handleEnter(p, 'manager')}
                            className="bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600"
                          >
                            {enteringKey === `${p.project_id}:manager` && (
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            )}
                            Enter as Manager
                          </Button>
                        )}
                        {hasCoder && (
                          <Button
                            size="sm"
                            disabled={enteringKey === `${p.project_id}:coder`}
                            onClick={() => handleEnter(p, 'coder')}
                            className="bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600"
                          >
                            {enteringKey === `${p.project_id}:coder` && (
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            )}
                            Enter as Coder
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )
            })
          )}
        </div>
      </div>
      <HubOnboardingTour />
    </div>
  )
}
