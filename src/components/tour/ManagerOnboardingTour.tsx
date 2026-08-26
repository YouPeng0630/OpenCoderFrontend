import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  MANAGER_TOUR_START_EVENT,
  clearForceManagerTour,
  markManagerTourComplete,
  resetManagerTour,
  shouldAutoStartManagerTour,
} from '@/lib/managerTour'

/** Fired so ManagerLayout can expand Assignments / open mobile drawer. */
export const MANAGER_TOUR_PREP_EVENT = 'opencoder:manager-tour-prep'

type TourStep = {
  id: string
  title: string
  body: string
  href?: string
  /** Matches data-tour on a sidebar nav item. Empty = centered card. */
  target?: string
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your project',
    body: 'Use the left sidebar to run your study. We’ll highlight each tab—skip anytime and replay from Settings or your profile menu.',
  },
  {
    id: 'tasks',
    title: 'Data Upload',
    body: 'Upload texts, images, audio, video, PDFs, or bibliographies as coding tasks. Filter by type and track transcription here.',
    href: '/project-manager/tasks',
    target: 'tasks',
  },
  {
    id: 'tags',
    title: 'Code Book',
    body: 'Define tag groups and codes your team will apply so coding stays consistent across raters.',
    href: '/project-manager/tags',
    target: 'tags',
  },
  {
    id: 'assignments',
    title: 'Assignments',
    body: 'Approve coder applications under Applicants, then assign open tasks under Task Assignment.',
    href: '/project-manager/assignment',
    target: 'assignments',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    body: 'See team progress at a glance—completion rates, activity over time, and where attention is needed.',
    href: '/project-manager/dashboard',
    target: 'dashboard',
  },
  {
    id: 'logbook',
    title: 'Project Logbook',
    body: 'Event history of uploads, coding, settings changes, and more. Filter by people or event types in the side rail.',
    href: '/project-manager/activity',
    target: 'logbook',
  },
  {
    id: 'memos',
    title: 'Coder Memos',
    body: 'Read reflexive notes coders write while working—useful for methodology and qualitative insight.',
    href: '/project-manager/notes',
    target: 'memos',
  },
  {
    id: 'chat',
    title: 'Team Chat',
    body: 'Coordinate in-project—questions about codes, edge cases, or logistics.',
    href: '/project-manager/chat',
    target: 'chat',
  },
  {
    id: 'settings',
    title: 'Settings',
    body: 'Database options and AI (enable/disable, keys, models). A basic model is included; your own key unlocks more.',
    href: '/project-manager/settings',
    target: 'settings',
  },
  {
    id: 'done',
    title: "You're ready",
    body: 'Suggested start: upload tasks → set up the code book → approve/assign coders. Replay this tour anytime from Settings.',
    href: '/project-manager/dashboard',
  },
]

type Spot = { top: number; left: number; width: number; height: number }

function readSpot(target?: string): Spot | null {
  if (!target) return null
  // Prefer desktop sidebar target; fall back to any match (mobile drawer)
  const el =
    document.querySelector<HTMLElement>(`aside [data-tour="${target}"]`) ||
    document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  const r = el.getBoundingClientRect()
  const pad = 6
  return {
    top: Math.max(8, r.top - pad),
    left: Math.max(8, r.left - pad),
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
}

export function ManagerOnboardingTour() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const projectId = user?.project_id ? String(user.project_id) : null

  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spot, setSpot] = useState<Spot | null>(null)

  const step = STEPS[stepIndex] ?? STEPS[0]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const finish = useCallback(() => {
    if (projectId) markManagerTourComplete(projectId)
    clearForceManagerTour()
    setOpen(false)
    setStepIndex(0)
    setSpot(null)
    if (searchParams.get('tour') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('tour')
      setSearchParams(next, { replace: true })
    }
  }, [projectId, searchParams, setSearchParams])

  const startTour = useCallback(
    (opts?: { reset?: boolean }) => {
      if (!projectId) {
        console.warn('[ManagerTour] No project_id — cannot start tour')
        return
      }
      if (opts?.reset) resetManagerTour(projectId)
      clearForceManagerTour()
      setStepIndex(0)
      setOpen(true)
    },
    [projectId]
  )

  useEffect(() => {
    if (!projectId || open) return
    const fromQuery = searchParams.get('tour') === '1'
    if (!fromQuery && !shouldAutoStartManagerTour(projectId)) return
    const t = window.setTimeout(() => startTour({ reset: fromQuery }), 500)
    return () => window.clearTimeout(t)
  }, [projectId, searchParams, startTour, open])

  useEffect(() => {
    const onStart = () => startTour({ reset: true })
    window.addEventListener(MANAGER_TOUR_START_EVENT, onStart)
    return () => window.removeEventListener(MANAGER_TOUR_START_EVENT, onStart)
  }, [startTour])

  // Navigate + prep layout (expand Assignments, open mobile nav)
  useEffect(() => {
    if (!open) return
    window.dispatchEvent(
      new CustomEvent(MANAGER_TOUR_PREP_EVENT, {
        detail: { id: step.id, target: step.target },
      })
    )
    if (step.href) navigate(step.href)
  }, [open, step.id, step.target, step.href, navigate])

  // Measure spotlight after layout/navigation settles
  useLayoutEffect(() => {
    if (!open) {
      setSpot(null)
      return
    }
    let cancelled = false
    const measure = () => {
      if (cancelled) return
      setSpot(readSpot(step.target))
    }
    measure()
    const t1 = window.setTimeout(measure, 50)
    const t2 = window.setTimeout(measure, 320)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelled = true
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, stepIndex, step.target])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, finish])

  const progressLabel = useMemo(
    () => `${stepIndex + 1} / ${STEPS.length}`,
    [stepIndex]
  )

  const tooltipStyle = useMemo(() => {
    if (!spot) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      } as const
    }
    const gap = 14
    const tipW = 340
    const tipH = 220
    let left = spot.left + spot.width + gap
    let top = spot.top
    if (left + tipW > window.innerWidth - 12) {
      left = Math.max(12, spot.left - tipW - gap)
    }
    if (top + tipH > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - tipH - 12)
    }
    return { top, left, transform: 'none' } as const
  }, [spot])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Light dim — hole cut via spotlight box-shadow when a tab is targeted */}
      {spot ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-primary/70 transition-all duration-200"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.22)',
            background: 'transparent',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/20" />
      )}

      {/* Click-catcher (does not cover the tooltip) */}
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Tour backdrop"
        onClick={(e) => e.stopPropagation()}
      />

      <div
        className="fixed z-[201] w-[min(100%-24px,340px)] rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
        style={tooltipStyle}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">{step.title}</h2>
          <span className="shrink-0 text-xs font-medium tabular-nums text-gray-400">
            {progressLabel}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? 'w-5 bg-primary'
                  : i < stepIndex
                  ? 'w-1.5 bg-primary/40'
                  : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-800"
            onClick={finish}
          >
            Skip
          </Button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (isLast) finish()
                else setStepIndex((i) => i + 1)
              }}
            >
              {isLast ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
