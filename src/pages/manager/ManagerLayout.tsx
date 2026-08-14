import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  UserCheck,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  ChevronLeft,
  UploadCloud,
  BookOpen,
  MessageSquare,
  FolderKanban,
  MoreHorizontal,
  ScrollText,
  StickyNote,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import {
  TimelineFilterProvider,
  TimelineSidebarFilters,
} from './timeline/TimelineFilterContext'

export function ManagerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [assignmentsOpen, setAssignmentsOpen] = useState(true)
  const [dataUploadOpen, setDataUploadOpen] = useState(true)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const onTimeline = location.pathname.includes('/project-manager/activity')

  const navigation = [
    {
      name: 'Data Upload',
      icon: UploadCloud,
      isDropdown: true,
      children: [
        { name: 'Tasks', href: '/project-manager/tasks', icon: CheckSquare },
        { name: 'Others', href: '/project-manager/database', icon: MoreHorizontal },
      ],
    },
    { name: 'Code Book', href: '/project-manager/tags', icon: BookOpen },
    {
      name: 'Assignments',
      icon: FolderKanban,
      isDropdown: true,
      children: [
        { name: 'Applicants Management', href: '/project-manager/applicants', icon: Users },
        { name: 'Task Assignment', href: '/project-manager/assignment', icon: UserCheck },
      ],
    },
    { name: 'Dashboard', href: '/project-manager/dashboard', icon: LayoutDashboard },
    { name: 'Timeline', href: '/project-manager/activity', icon: ScrollText },
    { name: 'Coder Memos', href: '/project-manager/notes', icon: StickyNote },
    { name: 'Team Chat', href: '/project-manager/chat', icon: MessageSquare },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const brand = (
    <div className="inline-flex items-center gap-2">
      <img src="/logo.png" alt="OpenCoder" className="h-8 w-8" />
      <span className="text-xl font-bold text-gray-900">OpenCoder</span>
    </div>
  )

  const projectsBack = (onNavigate?: () => void) => (
    <div className="mb-3 pb-3 border-b border-gray-200">
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          navigate('/hub')
        }}
        className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="mr-2 h-4 w-4 flex-shrink-0" />
        All Projects
      </button>
    </div>
  )

  const renderNav = (onNavigate?: () => void) =>
    navigation.map((item) => {
      const Icon = item.icon

      if (item.isDropdown && item.children) {
        const isOpen = item.name === 'Data Upload' ? dataUploadOpen : assignmentsOpen
        const toggleOpen =
          item.name === 'Data Upload'
            ? () => setDataUploadOpen(!dataUploadOpen)
            : () => setAssignmentsOpen(!assignmentsOpen)

        return (
          <div key={item.name} className="space-y-1">
            <button
              onClick={toggleOpen}
              className="w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center">
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen && (
              <div className="ml-4 space-y-1">
                {item.children.map((child) => {
                  const ChildIcon = child.icon
                  return (
                    <NavLink
                      key={child.name}
                      to={child.href}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`
                      }
                    >
                      <ChildIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                      {child.name}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        )
      }

      return (
        <NavLink
          key={item.name}
          to={item.href!}
          onClick={onNavigate}
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
    })

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      {projectsBack(onNavigate)}
      <div className="space-y-1">{renderNav(onNavigate)}</div>
    </>
  )

  return (
    <TimelineFilterProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Main nav sidebar */}
        <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col z-20">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
            <nav className="flex-1 px-2 py-4">{sidebarBody()}</nav>
          </div>
        </aside>

        {/* Dedicated Timeline filter sidebar (second rail) */}
        {onTimeline && (
          <aside className="hidden md:fixed md:inset-y-0 md:left-64 md:flex md:w-64 md:flex-col z-10">
            <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-hidden">
              <TimelineSidebarFilters />
            </div>
          </aside>
        )}

        {/* Mobile sidebar (nav only) */}
        {sidebarOpen && (
          <div className="fixed inset-0 flex z-40 md:hidden">
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />

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

              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <nav className="mt-2 px-2">
                  {sidebarBody(() => setSidebarOpen(false))}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main content — extra left pad when filter rail is open */}
        <div
          className={`flex flex-col flex-1 ${
            onTimeline ? 'md:pl-[32rem]' : 'md:pl-64'
          }`}
        >
          <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 px-4 flex justify-between items-center">
              <div className="flex-1">{brand}</div>

              <div className="ml-4 flex items-center gap-3 md:ml-6">
                <NotificationBell />

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

          <main className="flex-1">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </TimelineFilterProvider>
  )
}
