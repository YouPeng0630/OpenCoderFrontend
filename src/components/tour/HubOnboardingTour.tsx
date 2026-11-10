import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  HUB_TOUR_START_EVENT,
  markHubTourComplete,
  resetHubTour,
  shouldAutoStartHubTour,
} from '@/lib/hubTour'

type TourStep = {
  id: string
  title: string
  body: string
  target?: string
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Your project list',
    body: 'After login you land here. Create a project, join one, or open a project you already belong to. Skip anytime—replay from the Quick tour button.',
  },
  {
    id: 'create',
    title: 'Create Project',
    body: 'Start a new study as Manager. You’ll also be able to code on the same project.',
    target: 'hub-create',
  },
  {
    id: 'join',
    title: 'Join a Project',
    body: 'Apply to an existing project as a Coder when someone shares an invite or project link.',
    target: 'hub-join',
  },
  {
    id: 'list',
    title: 'Projects you belong to',
    body: 'Each card shows your roles. Enter as Manager to run the study, or as Coder to annotate.',
    target: 'hub-list',
  },
  {
    id: 'done',
    title: "You're ready",
    body: 'Pick Create or Join to get started, then enter a project when it appears in your list.',
  },
]

type Spot = { top: number; left: number; width: number; height: number }

function readSpot(target?: string): Spot | null {
  if (!target) return null
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
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

export function HubOnboardingTour() {
  const { user } = useAuth()
  const userId = user?.id ? String(user.id) : user?.email || null

  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [spot, setSpot] = useState<Spot | null>(null)

  const step = STEPS[stepIndex] ?? STEPS[0]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const finish = useCallback(() => {
    if (userId) markHubTourComplete(userId)
    setOpen(false)
    setStepIndex(0)
    setSpot(null)
  }, [userId])

  const startTour = useCallback(
    (opts?: { reset?: boolean }) => {
      if (!userId) return
      if (opts?.reset) resetHubTour(userId)
      setStepIndex(0)
      setOpen(true)
    },
    [userId],
  )

  useEffect(() => {
    if (!userId || open) return
    if (!shouldAutoStartHubTour(userId)) return
    const t = window.setTimeout(() => startTour(), 450)
    return () => window.clearTimeout(t)
  }, [userId, startTour, open])

  useEffect(() => {
    const onStart = () => startTour({ reset: true })
    window.addEventListener(HUB_TOUR_START_EVENT, onStart)
    return () => window.removeEventListener(HUB_TOUR_START_EVENT, onStart)
  }, [startTour])

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
    const t2 = window.setTimeout(measure, 280)
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
    [stepIndex],
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
    <div
      className="fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-label="Project list tour"
    >
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
    document.body,
  )
}
