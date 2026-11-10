/** Persist Project Hub onboarding tour completion (localStorage, per user). */

const STORAGE_PREFIX = 'opencoder.hubTour.v1:'

export function hubTourStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

export function hasCompletedHubTour(userId: string): boolean {
  try {
    return localStorage.getItem(hubTourStorageKey(userId)) === 'done'
  } catch {
    return false
  }
}

export function markHubTourComplete(userId: string): void {
  try {
    localStorage.setItem(hubTourStorageKey(userId), 'done')
  } catch {
    /* private mode */
  }
}

export function resetHubTour(userId: string): void {
  try {
    localStorage.removeItem(hubTourStorageKey(userId))
  } catch {
    /* ignore */
  }
}

export const HUB_TOUR_START_EVENT = 'opencoder:hub-tour-start'

export function requestHubTourStart(): void {
  window.dispatchEvent(new CustomEvent(HUB_TOUR_START_EVENT))
}

export function shouldAutoStartHubTour(userId: string): boolean {
  return !hasCompletedHubTour(userId)
}
