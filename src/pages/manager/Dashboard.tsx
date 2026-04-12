import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Users,
  FileText,
  TrendingUp,
  Activity,
  Loader2,
  LayoutDashboard,
  MessageSquare,
  Download,
  AlertTriangle,
} from 'lucide-react'
import { getToken } from '@/lib/storage'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ReportsTab } from '@/components/reports/ReportsTab'
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab'
import { ExportTab } from '@/components/exports/ExportTab'
import { TeamProgressTab } from '@/components/team/TeamProgressTab'
import { useAuth } from '@/contexts/AuthContext'

export function ManagerDashboard() {
  const [loading, setLoading] = useState(true)
  const [checkingProject, setCheckingProject] = useState(true)
  const [hasProject, setHasProject] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Stats data
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    activeAnnotators: 0,
    totalAnnotations: 0,
  })

  // Project overview data (from API)
  const [projectOverview, setProjectOverview] = useState<{
    project_id: string
    project_name: string
    statistics: {
      totals: {
        tasks: number
        annotations: number
        assignments: number
      }
      task_status_distribution: {
        open: number
        assigned: number
        in_progress: number
        done: number
      }
      completion_rate: number
    }
  } | null>(null)

  // Chart data for task completion over time
  const [taskChartData] = useState([
    { name: 'Mon', tasks: 0 },
    { name: 'Tue', tasks: 0 },
    { name: 'Wed', tasks: 0 },
    { name: 'Thu', tasks: 0 },
    { name: 'Fri', tasks: 0 },
    { name: 'Sat', tasks: 0 },
    { name: 'Sun', tasks: 0 },
  ])

  useEffect(() => {
    const checkProject = async () => {
      try {
        const token = getToken()
        if (!token) {
          throw new Error('No authentication token')
        }

        const apiBaseUrl =
          (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

        // Check if user has a project
        const response = await fetch(
          `${apiBaseUrl}/auth/user?token=${encodeURIComponent(token)}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch user info')
        }

        const user = await response.json()
        console.log('User info:', user)

        if (user.project_id) {
          console.log('✅ User has project:', user.project_id)
          setHasProject(true)
          setProjectId(user.project_id)
          
          // Fetch project overview and coders data from API (parallel requests)
          try {
            const [overviewResponse, codersResponse] = await Promise.all([
              fetch(
                `${apiBaseUrl}/api/dashboard/${user.project_id}/overview?days=7&token=${encodeURIComponent(token)}`
              ),
              fetch(
                `${apiBaseUrl}/api/dashboard/${user.project_id}/coders?token=${encodeURIComponent(token)}`
              ),
            ])
            
            if (!overviewResponse.ok) {
              throw new Error('Failed to fetch project overview')
            }
            
            const overview = await overviewResponse.json()
            setProjectOverview(overview)
            
            // Get active annotators count from coders API
            let activeAnnotatorsCount = 0
            if (codersResponse.ok) {
              const codersData = await codersResponse.json()
              activeAnnotatorsCount = codersData.total_coders || 0
            } else {
              console.warn('Failed to fetch coders data, using default value')
            }
            
            // Update stats from real data
            setStats({
              totalTasks: overview.statistics.totals.tasks,
              completedTasks: overview.statistics.task_status_distribution.done,
              activeAnnotators: activeAnnotatorsCount,  // From coders API
              totalAnnotations: overview.statistics.totals.annotations,
            })
          } catch (apiError) {
            console.error('Failed to fetch dashboard data:', apiError)
            // Keep projectOverview as null, will show loading state
          }
        } else {
          console.log('❌ User has no project')
          setHasProject(false)
        }
      } catch (error) {
        console.error('Failed to check project:', error)
      } finally {
        setCheckingProject(false)
        setLoading(false)
      }
    }

    checkProject()
  }, [])

  // Checking project state
  if (checkingProject) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-sm text-gray-500">Checking your project...</p>
      </div>
    )
  }

  // No project - redirect to create project
  if (!hasProject) {
    navigate('/project-manager/create-project', { replace: true })
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-8 h-8" />
          Manager Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          {projectId && (
            <Badge variant="outline" className="text-xs">
              Project ID: {projectId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team Progress
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tasks
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  All tasks in the project
                </p>
              </CardContent>
            </Card>

            {/* Completed Tasks */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Tasks
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completedTasks}</div>
                <p className="text-xs text-muted-foreground">
                  Tasks marked as done
                </p>
              </CardContent>
            </Card>

            {/* Active Annotators */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Annotators
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeAnnotators}</div>
                <p className="text-xs text-muted-foreground">
                  Total coders in project
                </p>
              </CardContent>
            </Card>

            {/* Total Annotations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Annotations
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalAnnotations}
                </div>
                <p className="text-xs text-muted-foreground">
                  Annotations in last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Task Completion Overview - Two separate cards */}
          <div className="grid gap-4 grid-cols-10">
            {/* Left: Line Chart (70%) */}
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Task Completion Overview</CardTitle>
                <CardDescription>
                  Task completion trends over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectOverview ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={taskChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `${value}`}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="tasks"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Segmented Ring Progress Chart (30%) */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
                <CardDescription>
                  Overall completion and recent activity
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                {projectOverview ? (
                  <>
                    {/* Segmented Ring SVG Chart */}
                    <div className="relative w-[220px] h-[220px] flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 220 220">
                        {(() => {
                          const centerX = 110
                          const centerY = 110
                          const radius = 85
                          const strokeWidth = 20
                          const recentStrokeWidth = 10  // Half width for recent activity
                          
                          // Calculate values
                          const totalTasks = projectOverview.statistics.totals.tasks
                          const doneTasks = projectOverview.statistics.task_status_distribution.done
                          const recentAnnotations = projectOverview.statistics.totals.annotations
                          
                          // Ensure recent annotations <= done tasks
                          const safeRecentAnnotations = Math.min(recentAnnotations, doneTasks)
                          
                          // Calculate angles (in degrees, starting from top)
                          const doneAngle = (doneTasks / totalTasks) * 360  // Total done angle
                          const recentAngle = (safeRecentAnnotations / totalTasks) * 360
                          
                          // Helper function to convert polar to cartesian coordinates
                          const polarToCartesian = (r: number, angle: number) => {
                            const angleInRadians = ((angle - 90) * Math.PI) / 180
                            return {
                              x: centerX + r * Math.cos(angleInRadians),
                              y: centerY + r * Math.sin(angleInRadians),
                            }
                          }
                          
                          // Create arc path
                          const createArc = (r: number, startAngle: number, endAngle: number) => {
                            const start = polarToCartesian(r, startAngle)
                            const end = polarToCartesian(r, endAngle)
                            const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
                            return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
                          }
                          
                          // Inner radius for recent activity (to show it inside the main ring)
                          const innerRadius = radius - strokeWidth / 2 + recentStrokeWidth / 2
                          
                          return (
                            <>
                              {/* Background ring (total tasks) */}
                              <circle
                                className="text-gray-200"
                                strokeWidth={strokeWidth}
                                stroke="currentColor"
                                fill="transparent"
                                r={radius}
                                cx={centerX}
                                cy={centerY}
                              />
                              
                              {/* Completed tasks segment (green) - full width */}
                              {doneTasks > 0 && (
                                <path
                                  d={createArc(radius, 0, doneAngle)}
                                  className="text-green-500 transition-all duration-1000 ease-out"
                                  stroke="currentColor"
                                  strokeWidth={strokeWidth}
                                  fill="transparent"
                                  strokeLinecap="butt"
                                />
                              )}
                              
                              {/* Recent 7-day annotations segment (orange, half width, inner layer) */}
                              {safeRecentAnnotations > 0 && (
                                <path
                                  d={createArc(innerRadius, doneAngle - recentAngle, doneAngle)}
                                  className="text-orange-500 transition-all duration-1000 ease-out"
                                  stroke="currentColor"
                                  strokeWidth={recentStrokeWidth}
                                  fill="transparent"
                                  strokeLinecap="butt"
                                />
                              )}
                            </>
                          )
                        })()}
                      </svg>
                      
                      {/* Center Text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-foreground">
                            {Math.round(projectOverview.statistics.completion_rate)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Complete</div>
                        </div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-6 space-y-3 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-sm bg-gray-200 mr-2"></span>
                          <span className="text-sm text-muted-foreground">Total Tasks</span>
                        </div>
                        <span className="text-sm font-medium">
                          {projectOverview.statistics.totals.tasks}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-sm bg-green-500 mr-2"></span>
                          <span className="text-sm text-muted-foreground">Completed</span>
                        </div>
                        <span className="text-sm font-medium">
                          {projectOverview.statistics.task_status_distribution.done}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-sm bg-orange-500 mr-2"></span>
                          <span className="text-sm text-muted-foreground">Last 7 Days</span>
                        </div>
                        <span className="text-sm font-medium">
                          {projectOverview.statistics.totals.annotations}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[350px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {projectId && <TeamProgressTab projectId={projectId} />}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {projectId && <AnalyticsTab projectId={projectId} />}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {projectId && <ReportsTab projectId={projectId} />}
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          {projectId && <ExportTab projectId={projectId} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

