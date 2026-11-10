import { getToken } from '@/lib/storage'
import type {
  ObservableMetricsResponse,
  ParadigmScoresResponse,
  SelfReport,
  TextSignalsResponse,
} from '@/types/epistemology'

function apiBase(): string {
  return (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000'
}

function withToken(path: string, extra?: Record<string, string>): string {
  const token = getToken() || ''
  const params = new URLSearchParams({ token, ...(extra || {}) })
  return `${apiBase()}${path}?${params.toString()}`
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = (err as any).detail
    throw new Error(
      typeof detail === 'string' ? detail : `HTTP ${res.status}`,
    )
  }
  return res.json()
}

export async function fetchParadigmScores(
  projectId: string,
): Promise<ParadigmScoresResponse> {
  const res = await fetch(
    withToken(`/api/epistemology/${projectId}/paradigm-scores`),
  )
  return readJson(res)
}

export async function fetchObservableMetrics(
  projectId: string,
): Promise<ObservableMetricsResponse> {
  const res = await fetch(
    withToken(`/api/epistemology/${projectId}/observable-metrics`),
  )
  return readJson(res)
}

export async function fetchTextSignals(
  projectId: string,
): Promise<TextSignalsResponse> {
  const res = await fetch(
    withToken(`/api/epistemology/${projectId}/text-signals`),
  )
  return readJson(res)
}

export async function fetchSelfReport(
  projectId: string,
): Promise<{ self_report: SelfReport | null }> {
  const res = await fetch(
    withToken(`/api/epistemology/${projectId}/self-report`),
  )
  return readJson(res)
}

export async function saveSelfReport(
  projectId: string,
  body: {
    selected_paradigms: string[]
    other_text?: string
    note?: string
  },
): Promise<{ success: boolean; self_report: SelfReport }> {
  const res = await fetch(
    withToken(`/api/epistemology/${projectId}/self-report`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
  return readJson(res)
}

export async function submitFeedback(
  projectId: string,
  body: {
    response: 'yes' | 'partially' | 'no'
    comment?: string
    include_score_snapshot?: boolean
  },
): Promise<{
  success: boolean
  feedback: unknown
  observed_tendencies?: unknown
  scores_unchanged_note?: string
}> {
  const res = await fetch(
    withToken(`/api/epistemology/${projectId}/feedback`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        include_score_snapshot: true,
        ...body,
      }),
    },
  )
  return readJson(res)
}

export async function fetchCoders(
  projectId: string,
): Promise<{ coders: { id: string; name: string; email?: string }[] }> {
  const res = await fetch(withToken(`/api/epistemology/${projectId}/coders`))
  if (!res.ok) return { coders: [] }
  return res.json()
}
