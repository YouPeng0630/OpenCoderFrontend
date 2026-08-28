import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getToken } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'

type Stance = string

interface CoderOption {
  id: string
  name: string
  email?: string
}

interface StatusPayload {
  codedSegmentCount: number
  revelationThreshold: number
  revelationReady: boolean
  inferredStance?: Stance | null
  scores?: Record<string, number> | null
  evidence?: string[]
}

interface InferencePayload extends StatusPayload {
  inferenceVersion?: number
}

const DIM_LABELS: Record<string, string> = {
  inductiveReasoning: 'Inductive reasoning',
  codeStability: 'Code stability',
  contextSensitivity: 'Context sensitivity',
  reflexiveAwareness: 'Reflexive awareness',
}

function tendencyLabel(stance?: string | null): string {
  const s = (stance || 'emerging').toLowerCase()
  if (s === 'emerging') return 'Emerging / still forming'
  const pretty = s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
  return `${pretty} tendencies`
}

export function ManagerEpistemology() {
  const { user } = useAuth()
  const apiBase = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
  const projectId = user?.project_id ? String(user.project_id) : null

  const [coders, setCoders] = useState<CoderOption[]>([])
  const [coderId, setCoderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [inference, setInference] = useState<InferencePayload | null>(null)

  const qs = (extra?: Record<string, string>) => {
    const token = getToken() || ''
    const params = new URLSearchParams({ token, ...(extra || {}) })
    if (coderId) params.set('coder_user_id', coderId)
    return params.toString()
  }

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) throw new Error('Not authenticated')

      const [codersRes, statusRes, infRes] = await Promise.all([
        fetch(`${apiBase}/api/epistemology/${projectId}/coders?token=${encodeURIComponent(token)}`),
        fetch(`${apiBase}/api/epistemology/${projectId}/status?${qs()}`),
        fetch(`${apiBase}/api/epistemology/${projectId}/inference?${qs({ force: 'true' })}`),
      ])

      if (!statusRes.ok) {
        const err = await statusRes.json().catch(() => ({}))
        throw new Error(err.detail || `Status HTTP ${statusRes.status}`)
      }

      setStatus(await statusRes.json())
      if (codersRes.ok) {
        const c = await codersRes.json()
        setCoders(c.coders || [])
      }
      if (infRes.ok) setInference(await infRes.json())
    } catch (e: any) {
      setError(e.message || 'Failed to load epistemology')
    } finally {
      setLoading(false)
    }
  }, [apiBase, projectId, coderId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Select a project to view Epistemology.
      </div>
    )
  }

  if (loading && !status) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const threshold = status?.revelationThreshold ?? 20
  const coded = status?.codedSegmentCount ?? 0
  const ready = coded >= threshold
  const scores = inference?.scores || status?.scores || {}
  const evidence = (inference?.evidence || status?.evidence || []).slice(0, 5)
  const stance = inference?.inferredStance || status?.inferredStance || 'emerging'
  const scopeLabel = coderId
    ? coders.find((c) => c.id === coderId)?.name || 'Coder'
    : 'Project overview'
  const progress = Math.min(100, Math.round((coded / threshold) * 100))

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Epistemological Reflection
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Based on{' '}
              <span className="font-medium text-gray-700">{coded} coded segments</span>
              {ready ? ' and recent project activity.' : '.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-500"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Scope
          </label>
          <select
            className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-sm text-gray-700"
            value={coderId}
            onChange={(e) => setCoderId(e.target.value)}
          >
            <option value="">Project overview</option>
            {coders.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-400">{scopeLabel}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!ready ? (
        <section className="rounded-xl border border-gray-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-base font-medium text-gray-900">
            Reflection unlocks after {threshold} coded segments
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Currently <span className="font-medium text-gray-700">{coded}</span> of {threshold}.
            Keep coding — behavior is tracked in the background. Interpretation and patterns will
            appear here once the threshold is reached.
          </p>
          <div className="mx-auto mt-6 h-2 max-w-xs overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-teal-700/80 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-gray-400">
            {coded} / {threshold}
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-2 border-b border-gray-100 pb-8">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Current interpretation
            </p>
            <h2 className="text-xl font-semibold text-gray-900">{tendencyLabel(stance)}</h2>
            <p className="text-sm text-gray-500">
              Provisional — based on observed coding practices, not a fixed identity.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Why this interpretation?</h3>
            {evidence.length === 0 ? (
              <p className="text-sm text-gray-500">
                Not enough distinctive patterns yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {evidence.map((e, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-600" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Behavioral patterns</h3>
            <div className="space-y-2.5">
              {Object.keys(DIM_LABELS).map((key) => {
                const v = typeof scores[key] === 'number' ? scores[key] : 0
                return (
                  <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div>
                      <div className="mb-1 text-xs text-gray-600">{DIM_LABELS[key]}</div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-teal-700/75"
                          style={{ width: `${Math.min(100, Math.max(0, v))}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-xs tabular-nums text-gray-500">{v}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
