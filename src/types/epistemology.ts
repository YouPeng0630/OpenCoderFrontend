/** Types for Epistemology Engine Step 6/7 UI (backend paradigm_scoring_v1). */

export type ParadigmId =
  | 'positivist_postpositivist'
  | 'constructivist'
  | 'critical_theory'
  | 'indigenous'

export interface SignalContribution {
  signal_id: string
  family?: string
  layer?: string
  direction?: string
  raw_value?: number | null
  normalized?: number | null
  oriented?: number | null
  weight?: number
  weighted_contribution?: number
  rationale?: string
  n_events?: number
  sufficient_data?: boolean
  normalization?: Record<string, unknown>
}

export interface ParadigmTendency {
  paradigm: ParadigmId | string
  label?: string
  score: number | null
  status?: string
  evidence_coverage?: number
  available_weight?: number
  total_possible_weight?: number
  families?: Array<{
    family: string
    family_weight?: number
    family_score?: number
    weighted_family_contribution?: number
    signals_used?: SignalContribution[]
  }>
  top_contributors?: SignalContribution[]
  counter_evidence?: SignalContribution[]
  missing_signals?: string[]
  interpretation_limit?: string | null
  scoring_version?: string
  weight_set_version?: string
  weight_status?: string
  confidence?: {
    evidence_confidence?: number
    components?: Record<string, number>
    notes?: string[]
    note?: string
    confidence_version?: string
  }
}

export interface SelfReport {
  id?: string
  project_id?: string
  selected_paradigms: string[]
  other_text?: string | null
  note?: string | null
  submitted_by?: string | null
  submitted_at?: string | null
  updated_at?: string | null
  schema_version?: string
}

export interface AlignmentResult {
  status: string
  alignment?: string | null
  explanation?: string
  selected_paradigms?: string[]
  selected_scores?: Record<string, number | null | undefined>
  other_high_observed?: Record<string, number>
  thresholds?: Record<string, number>
}

export interface ParadigmScoresResponse {
  projectId: string
  inferenceLayer?: string
  self_report?: SelfReport | null
  observed_tendencies: Record<string, ParadigmTendency>
  alignment?: AlignmentResult
  parallel_independent?: boolean
  scores_sum_to_100?: boolean
  language?: { preferred?: string[]; avoid?: string[] }
  disclaimer?: string
  versions?: Record<string, string | undefined>
  indigenous_safeguard?: {
    interpretation_limit?: string
    self_report_authoritative?: boolean
    no_identity_inference?: boolean
  }
  inputs?: {
    observable_metric_layer?: string
    text_signal_layer?: string
    observable_support?: Record<string, unknown>
    text_meta?: Record<string, unknown>
  }
}

export interface MetricBlob {
  value: number | null
  sufficient_data?: boolean
  insufficient_reason?: string | null
  [key: string]: unknown
}

export interface ObservableMetricsResponse {
  projectId?: string
  metricLayer?: string
  support?: Record<string, unknown>
  assumptions?: Record<string, string>
  [key: string]: unknown
}

export interface TextSignalsResponse {
  projectId?: string
  signalLayer?: string
  signals?: Record<string, MetricBlob>
  meta?: Record<string, unknown>
}

export const PARADIGM_ORDER: ParadigmId[] = [
  'positivist_postpositivist',
  'constructivist',
  'critical_theory',
  'indigenous',
]

export const PARADIGM_SHORT_LABELS: Record<ParadigmId, string> = {
  positivist_postpositivist: 'Positivist / Post-Positivist',
  constructivist: 'Constructivist',
  critical_theory: 'Critical Theory',
  indigenous: 'Relational / Community-Oriented Practice',
}

export const SELF_REPORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'positivist_postpositivist', label: 'Positivist / Post-Positivist' },
  { id: 'constructivist', label: 'Constructivist' },
  { id: 'critical_theory', label: 'Critical Theory' },
  { id: 'indigenous', label: 'Indigenous' },
  { id: 'other', label: 'Other' },
  { id: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export const OBSERVABLE_METRIC_KEYS = [
  'codebook_volatility',
  'code_stability',
  'inductive_ratio',
  'memo_density',
  'disagreement_rate',
  'temporal_cocoding_proximity',
  'coder_initiated_code_creation_ratio',
  'irr_usage_rate',
  'blind_independent_coding_rate',
  'authority_override_rate',
  'consensus_resolution_rate',
  'dialectical_resolution_support',
] as const

export const TEXT_SIGNAL_KEYS = [
  'reflexivity_score',
  'reflexive_memo_rate',
  'positionality_marker_rate',
  'power_marker_rate',
  'relational_marker_rate',
  'reciprocity_marker_rate',
  'community_marker_rate',
  'negotiation_marker_rate',
  'mutual_revision_marker_rate',
  'consensus_language_rate',
] as const
