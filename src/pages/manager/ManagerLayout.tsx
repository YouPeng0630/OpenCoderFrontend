import { useState } from 'react'
import { Outlet, NavLink, useNavigate, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Tags,
  Users,
  Database,
  CheckSquare,
  UserCheck,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Code,
  Settings,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { Coder } from '@/pages/Coder'
import { CoderProgress } from '@/pages/coder/CoderProgress'
import { CoderConsensus } from '@/pages/coder/CoderConsensus'
import { ConsensusResolution } from '@/pages/manager/ConsensusResolution'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function ManagerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mode, setMode] = useState<'manager' | 'coder'>('manager')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navigation = [
    { name: 'Dashboard', href: '/project-manager/dashboard', icon: LayoutDashboard },
    { name: 'Tags', href: '/project-manager/tags', icon: Tags },
    { name: 'Applicants', href: '/project-manager/applicants', icon: Users },
    { name: 'Tasks', href: '/project-manager/tasks', icon: CheckSquare },
    { name: 'Assignment', href: '/project-manager/assignment', icon: UserCheck },
    { name: 'Database', href: '/project-manager/database', icon: Database },
  ]

  const coderNavigation = [
    { name: 'Tasks', href: '#tasks', icon: CheckSquare },
    { name: 'My Progress', href: '#progress', icon: TrendingUp },
    { name: 'Consensus', href: '#consensus', icon: AlertTriangle },
  ]

  const [coderView, setCoderView] = useState<'tasks' | 'progress' | 'consensus'>('tasks')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar for desktop - Manager mode */}
      {mode === 'manager' && (
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <span className="ml-2 text-xl font-bold text-gray-900">Manager</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>

          {/* User info at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <Avatar.Root className="h-8 w-8">
                <Avatar.Image
                  src={user?.avatar}
                  alt={user?.username}
                  className="h-full w-full rounded-full object-cover"
                />
                <Avatar.Fallback className="h-full w-full rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Sidebar for desktop - Coder mode */}
      {mode === 'coder' && (
        <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
            <Code className="h-6 w-6 text-primary" />
            <span className="ml-2 text-xl font-bold text-gray-900">Coder</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {coderNavigation.map((item) => {
              const Icon = item.icon
              const isActive = 
                (coderView === 'tasks' && item.href === '#tasks') ||
                (coderView === 'progress' && item.href === '#progress') ||
                (coderView === 'consensus' && item.href === '#consensus')
              
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.href === '#tasks') setCoderView('tasks')
                    if (item.href === '#progress') setCoderView('progress')
                    if (item.href === '#consensus') setCoderView('consensus')
                  }}
                  className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </button>
              )
            })}
          </nav>

          {/* User info at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <Avatar.Root className="h-8 w-8">
                <Avatar.Image
                  src={user?.avatar}
                  alt={user?.username}
                  className="h-full w-full rounded-full object-cover"
                />
                <Avatar.Fallback className="h-full w-full rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-700">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      )}

      {/* Mobile sidebar - Manager mode */}
      {mode === 'manager' && sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Mobile navigation */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900">Manager</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar - Coder mode */}
      {mode === 'coder' && sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            {/* Mobile navigation */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <Code className="h-6 w-6 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900">Coder</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {coderNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive = 
                    (coderView === 'tasks' && item.href === '#tasks') ||
                    (coderView === 'progress' && item.href === '#progress') ||
                    (coderView === 'consensus' && item.href === '#consensus')
                  
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        if (item.href === '#tasks') setCoderView('tasks')
                        if (item.href === '#progress') setCoderView('progress')
                        if (item.href === '#consensus') setCoderView('consensus')
                        setSidebarOpen(false)
                      }}
                      className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.name}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={mode === 'manager' ? 'md:pl-64 flex flex-col flex-1' : 'md:pl-64 flex flex-col flex-1'}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
          {/* Mobile menu button */}
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                {mode === 'coder' ? 'Coder Mode' : ''}
              </h1>
            </div>

            {/* Mode Switch & User menu */}
            <div className="ml-4 flex items-center gap-3 md:ml-6">
              {/* Mode Switch Button */}
              <button
                onClick={() => {
                  const newMode = mode === 'manager' ? 'coder' : 'manager'
                  setMode(newMode)
                  if (newMode === 'coder') {
                    setCoderView('tasks')  // 切换到 coder 模式时默认显示 Tasks
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200 font-medium text-sm"
              >
                {mode === 'manager' ? (
                  <>
                    <Code className="h-4 w-4" />
                    <span className="hidden sm:inline">Switch to Coder Mode</span>
                    <span className="sm:hidden">Coder</span>
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Switch to Manager Mode</span>
                    <span className="sm:hidden">Manager</span>
                  </>
                )}
              </button>

              {/* Notification Bell - Only in Manager mode */}
              {mode === 'manager' && (
                <NotificationBell />
              )}

              {/* User menu */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary">
                  <Avatar.Root className="h-8 w-8">
                    <Avatar.Image
                      src={user?.avatar}
                      alt={user?.username}
                      className="h-full w-full rounded-full object-cover"
                    />
                    <Avatar.Fallback className="h-full w-full rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                      {user?.username?.[0]?.toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {user?.username}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50"
                    align="end"
                    sideOffset={5}
                  >
                    <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 cursor-pointer outline-none">
                      <User className="h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                    <DropdownMenu.Item
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded hover:bg-red-50 cursor-pointer outline-none"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {mode === 'manager' ? (
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Outlet />
              </div>
            </div>
          ) : (
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {coderView === 'tasks' && <Coder noLayout={true} />}
                {coderView === 'progress' && <CoderProgress />}
                {coderView === 'consensus' && <CoderConsensus />}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

