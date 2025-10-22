/**
 * Projects API utilities
 * Support batch querying of project information (backend optimization B)
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface Project {
  _id: string
  id?: string
  name: string
  slug?: string
  description?: string
  owner_user_id?: string
  status?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
}

/**
 * Batch query project information
 * Uses backend POST /api/projects/batch endpoint (optimization B)
 * 
 * @param projectIds - Array of project IDs
 * @returns Array of project information
 */
export async function getProjectsBatch(projectIds: string[]): Promise<Project[]> {
  if (!projectIds || projectIds.length === 0) {
    return []
  }

  try {
    console.log(`📡 Batch fetching ${projectIds.length} project(s)...`)
    
    const response = await fetch(`${API_BASE_URL}/api/projects/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectIds),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`)
    }

    const projects = await response.json()
    console.log(`✅ Fetched ${projects.length} project(s)`)
    
    return projects.map((p: any) => ({
      _id: p._id || p.id,
      id: p.id || p._id,
      name: p.name || p.project_name || 'Untitled Project',
      slug: p.slug,
      description: p.description,
      owner_user_id: p.owner_user_id || p.ownerUserId,
      status: p.status,
      tags: p.tags || [],
      created_at: p.created_at || p.createdAt,
      updated_at: p.updated_at || p.updatedAt,
    }))
  } catch (error) {
    console.error('❌ Failed to batch fetch projects:', error)
    return []
  }
}

/**
 * Convert project array to Map for easy lookup
 * 
 * @param projects - Array of projects
 * @returns Project Map (key: project_id, value: Project)
 */
export function projectsToMap(projects: Project[]): Record<string, Project> {
  const map: Record<string, Project> = {}
  projects.forEach(project => {
    const id = project._id || project.id
    if (id) {
      map[id] = project
    }
  })
  return map
}

/**
 * Extract unique project IDs from application list
 * 
 * @param applications - Application list
 * @returns Array of unique project IDs
 */
export function extractUniqueProjectIds(applications: any[]): string[] {
  const projectIds = new Set<string>()
  
  applications.forEach(app => {
    const projectId = app.project_id || app.projectId
    if (projectId) {
      projectIds.add(projectId)
    }
  })
  
  return Array.from(projectIds)
}

/**
 * Query single project information
 * 
 * @param projectId - Project ID
 * @param token - Authentication token (optional)
 * @returns Project information or null
 */
export async function getProject(projectId: string, token?: string): Promise<Project | null> {
  try {
    const url = token 
      ? `${API_BASE_URL}/api/projects/${projectId}?token=${encodeURIComponent(token)}`
      : `${API_BASE_URL}/api/projects/${projectId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const project = await response.json()
    return {
      _id: project._id || project.id,
      id: project.id || project._id,
      name: project.name || project.project_name || 'Untitled Project',
      slug: project.slug,
      description: project.description,
      owner_user_id: project.owner_user_id || project.ownerUserId,
      status: project.status,
      tags: project.tags || [],
      created_at: project.created_at || project.createdAt,
      updated_at: project.updated_at || project.updatedAt,
    }
  } catch (error) {
    console.error(`❌ Failed to fetch project ${projectId}:`, error)
    return null
  }
}

