/** Persist manager onboarding tour completion per project (localStorage). */

const STORAGE_PREFIX = 'opencoder.managerTour.v1:'
const FORCE_KEY = 'opencoder.managerTour.force'

export function managerTourStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

export function hasCompletedManagerTour(projectId: string): boolean {
  try {
    return localStorage.getItem(managerTourStorageKey(projectId)) === 'done'
  } catch {
    return false
  }
}

export function markManagerTourComplete(projectId: string): void {
  try {
    localStorage.setItem(managerTourStorageKey(projectId), 'done')
  } catch {
    /* private mode */
  }
  clearForceManagerTour()
}

export function resetManagerTour(projectId: string): void {
  try {
    localStorage.removeItem(managerTourStorageKey(projectId))
  } catch {
    /* ignore */
  }
}

/** After create-project: show tour once. */
export function setForceManagerTour(projectId: string): void {
  try {
    sessionStorage.setItem(FORCE_KEY, String(projectId))
  } catch {
    /* ignore */
  }
}

/** Read force flag without clearing (Strict Mode safe). */
export function peekForceManagerTour(projectId: string): boolean {
  try {
    return sessionStorage.getItem(FORCE_KEY) === String(projectId)
  } catch {
    return false
  }
}

export function clearForceManagerTour(): void {
  try {
    sessionStorage.removeItem(FORCE_KEY)
  } catch {
    /* ignore */
  }
}

export const MANAGER_TOUR_START_EVENT = 'opencoder:manager-tour-start'

export function requestManagerTourStart(): void {
  window.dispatchEvent(new CustomEvent(MANAGER_TOUR_START_EVENT))
}

/** Whether this project should auto-open the tour. */
export function shouldAutoStartManagerTour(projectId: string): boolean {
  return peekForceManagerTour(projectId) || !hasCompletedManagerTour(projectId)
}
