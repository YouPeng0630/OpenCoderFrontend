import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { AlertCircle, HelpCircle, Loader2, RefreshCw } from 'lucide-react'
import { fetchParadigmScores } from '@/lib/epistemologyApi'
import { buildTendencySummary } from '@/lib/epistemologyCopy'
import type { ParadigmScoresResponse, SelfReport } from '@/types/epistemology'
import { TendencyRadar } from '@/components/epistemology/TendencyRadar'
import { PerspectiveSection } from '@/components/epistemology/PerspectiveSection'

/**
 * Epistemology Reflection — formative indices for researcher reflection,
 * not an analytics dashboard or epistemology classifier.
 */
export function ManagerEpistemology() {
  const { user } = useAuth()
  const projectId = user?.project_id ? String(user.project_id) : null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState<ParadigmScoresResponse | null>(null)

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setScores(await fetchParadigmScores(projectId))
    } catch (e: any) {
      setError(e.message || 'Failed to load epistemology')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const tendencies = scores?.observed_tendencies || {}
  const summary = useMemo(
    () => buildTendencySummary(tendencies),
    [tendencies],
  )

  const onSelfReportSaved = (_report: SelfReport) => {
    load()
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-sm text-gray-600">
        Select a project to explore Epistemology Reflection.
      </div>
    )
  }

  if (loading && !scores) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-14 pb-16 pt-2">
      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight text-gray-900">
              Epistemology Reflection
              <span
                className="group relative inline-flex"
                tabIndex={0}
                aria-label="Explore how patterns in your research practice relate to different epistemological orientations. These observations are provisional and are intended to support reflection, not classify your project."
              >
                <HelpCircle
                  className="h-4 w-4 cursor-help text-gray-400 hover:text-gray-600"
                  aria-hidden
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  Explore how patterns in your research practice relate to
                  different epistemological orientations. These observations are
                  provisional and are intended to support reflection, not
                  classify your project.
                </span>
              </span>
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-gray-400"
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <div className="mt-10">
          <TendencyRadar tendencies={tendencies} />
        </div>

        <p className="mt-8 text-base leading-relaxed text-gray-800">{summary}</p>
      </section>

      <hr className="border-gray-100" />

      <PerspectiveSection
        projectId={projectId}
        initial={scores?.self_report}
        alignment={scores?.alignment}
        tendencies={tendencies}
        onSaved={onSelfReportSaved}
      />
    </div>
  )
}
