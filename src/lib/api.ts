import { User, UserRole } from '@/types/auth'
import { getToken } from './storage'

// API Base URL
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'

// ==================== Helper Functions ====================

const getAuthHeaders = (): HeadersInit => {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

// ==================== API Functions ====================

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface BackendUser {
  id?: string
  _id?: string  // MongoDB may use _id
  email?: string
  name?: string
  username?: string  // Some responses may use username
  avatar?: string
  avatar_url?: string  // Field returned by Google OAuth
  avatarUrl?: string  // Camel case version
  role?: 'manager' | 'coder' | null  // ✅ Backend roles: manager or coder
  projectId?: string | null
  project_id?: string | null  // Underscore version
  status?: string
}

/**
 * Get current user information
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/api/users/me`, {
    headers: getAuthHeaders(),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get user' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const result = await response.json()
  
  // Support multiple response formats
  let userData: BackendUser
  if (result.success && result.data) {
    userData = result.data
  } else if (result.data) {
    userData = result.data
  } else if (result.id || result._id) {
    userData = result
  } else {
    throw new Error('Invalid response from server')
  }
  
  // Transform backend user to frontend format
  return {
    id: userData.id || userData._id || '',
    username: userData.name || userData.username || '',
    email: userData.email || '',
    role: userData.role === 'manager' ? 'project-manager' : 
          userData.role === 'coder' ? 'coder' : null,
    avatar: userData.avatar_url || userData.avatarUrl || userData.avatar || '',
    project_id: userData.project_id || userData.projectId || null,  // Add project_id
  }
}

/**
 * Update user role
 * ✅ Fixed implementation:
 * - Correct role mapping: project-manager → manager, coder → coder
 * - Token passed as query parameter (backend requirement: ?token=xxx)
 * - Returns complete user object
 */
export const updateUserRole = async (role: UserRole): Promise<User> => {
  // Transform frontend role to backend format
  // Frontend: "project-manager" | "coder"
  // Backend:  "manager" | "coder"
  const backendRole = role === 'project-manager' ? 'manager' : 'coder'
  
  // ✅ Backend requires token as query parameter, not Authorization header
  const token = getToken()
  if (!token) {
    throw new Error('No authentication token found')
  }
  
  const response = await fetch(`${API_BASE_URL}/api/users/me/role?token=${encodeURIComponent(token)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: backendRole }),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update role' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  const result = await response.json()
  console.log('Update role response:', result)
  
  // ✅ Support multiple response formats (consistent with AuthCallback)
  let userData: BackendUser
  if (result.success && result.data) {
    // Format 1: { success: true, data: { ... } }
    userData = result.data
  } else if (result.data) {
    // Format 2: { data: { ... } }
    userData = result.data
  } else if (result.id || result._id) {
    // Format 3: Direct user object { id, name, email, ... }
    userData = result
  } else {
    console.error('Unexpected response format:', result)
    throw new Error('Invalid response from server. Check console for details.')
  }
  
  // Transform backend user to frontend format
  return {
    id: userData.id || userData._id || '',
    username: userData.name || userData.username || '',
    email: userData.email || '',
    role: userData.role === 'manager' ? 'project-manager' : 
          userData.role === 'coder' ? 'coder' : null,
    avatar: userData.avatar_url || userData.avatarUrl || userData.avatar || '',
    project_id: userData.project_id || userData.projectId || null,  // Add project_id
  }
}

/**
 * Logout (optional - can be client-side only)
 */
export const logout = async (): Promise<void> => {
  // If you have a logout endpoint on backend, call it here
  // Otherwise, just clear local storage (handled in AuthContext)
  return Promise.resolve()
}

// ==================== Project APIs ====================

export interface Project {
  id: string
  name: string
  description: string
  managerId: string
  status: 'active' | 'paused' | 'archived'
  totalSamples: number
  completedSamples: number
  progress: number
  members: string[]
  createdAt: string
  updatedAt: string
}

/**
 * Create a new project (Manager only)
 */
export const createProject = async (data: {
  name: string
  description: string
}): Promise<Project> => {
  const response = await fetch(`${API_BASE_URL}/api/projects/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
  const result: ApiResponse<Project> = await handleResponse(response)
  return result.data
}

/**
 * Get my project (Manager)
 */
export const getMyProject = async (): Promise<Project | null> => {
  const response = await fetch(`${API_BASE_URL}/api/projects/me`, {
    headers: getAuthHeaders(),
  })
  const result: ApiResponse<Project | null> = await handleResponse(response)
  return result.data
}

/**
 * Get all available projects (Annotator)
 */
export const getAllProjects = async (): Promise<Project[]> => {
  const response = await fetch(`${API_BASE_URL}/api/projects/`, {
    headers: getAuthHeaders(),
  })
  const result: ApiResponse<Project[]> = await handleResponse(response)
  return result.data
}

// ==================== Application APIs ====================

export interface Application {
  id: string
  userId: string
  projectId: string
  status: 'pending' | 'approved' | 'rejected'
  appliedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

/**
 * Apply to join a project (Annotator)
 */
export const applyToProject = async (projectId: string, message?: string): Promise<Application> => {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/applications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  })
  const result: ApiResponse<Application> = await handleResponse(response)
  return result.data
}

/**
 * Review an application (Manager)
 */
export const reviewApplication = async (
  applicationId: string,
  status: 'approved' | 'rejected'
): Promise<Application> => {
  const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
  const result: ApiResponse<Application> = await handleResponse(response)
  return result.data
}
