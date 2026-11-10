import type {
  AlignmentResult,
  ParadigmId,
  ParadigmTendency,
  SignalContribution,
} from '@/types/epistemology'
import { PARADIGM_ORDER, PARADIGM_SHORT_LABELS } from '@/types/epistemology'

/** Observed-side axis label (Indigenous safeguard wording). */
export function paradigmDisplayLabel(
  id: string,
  _tendency?: ParadigmTendency,
): string {
  if (id === 'indigenous') {
    return 'Relational / Community-Oriented Practice'
  }
  return PARADIGM_SHORT_LABELS[id as ParadigmId] || id
}

/** Compact axis label for radar ticks (full name stays in the table). */
export function paradigmRadarLabel(id: string): string {
  if (id === 'indigenous') return 'Relational /\nCommunity'
  if (id === 'positivist_postpositivist') return 'Positivist /\nPost-Pos'
  if (id === 'critical_theory') return 'Critical\nTheory'
  if (id === 'constructivist') return 'Constructivist'
  return PARADIGM_SHORT_LABELS[id as ParadigmId] || id
}

export function formatSignalName(signalId: string): string {
  return signalId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Map numeric evidence confidence to human strength (not a probability). */
export function evidenceStrengthLabel(
  confidence?: number | null,
  insufficient?: boolean,
): 'Strong' | 'Moderate' | 'Limited' | 'Not enough recorded evidence' {
  if (insufficient || confidence == null || Number.isNaN(confidence)) {
    return 'Not enough recorded evidence'
  }
  if (confidence >= 70) return 'Strong'
  if (confidence >= 40) return 'Moderate'
  return 'Limited'
}

/**
 * Human-readable observed-practice summary.
 * Does not declare a single true epistemology.
 */
export function buildTendencySummary(
  tendencies: Record<string, ParadigmTendency>,
): string {
  const scored = PARADIGM_ORDER.map((id) => ({
    id,
    score: tendencies[id]?.score,
    conf: tendencies[id]?.confidence?.evidence_confidence ?? 0,
    label: paradigmDisplayLabel(id, tendencies[id]),
  })).filter((x) => typeof x.score === 'number') as Array<{
    id: string
    score: number
    conf: number
    label: string
  }>

  if (scored.length === 0) {
    return "There is not yet enough evidence to describe a clear pattern in the project's research practice."
  }

  const lowConf = scored.every((s) => s.conf < 40)
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const top = sorted[0]
  const close = sorted.filter((s) => top.score - s.score <= 12)

  let summary: string
  if (close.length >= 3) {
    summary =
      "Your project's current practices reflect a mixture of methodological tendencies across several orientations."
  } else if (close.length === 2) {
    summary = `Your project's current practices reflect a mixture of ${close[0].label} and ${close[1].label} tendencies.`
  } else {
    summary = `Your project's current practices show the strongest evidence of ${top.label}-oriented research practice.`
  }

  if (lowConf) {
    summary +=
      ' Evidence is currently limited; treat this reading as provisional.'
  }
  return summary
}

export function alignmentUserCopy(alignment?: AlignmentResult | null): {
  title: string
  body: string
  tone: 'neutral' | 'invite' | 'reflect'
} {
  const status = alignment?.status || 'not_self_reported'
  switch (status) {
    case 'broad_alignment':
      return {
        title: 'Broad alignment',
        body:
          'Your self-reported orientation broadly aligns with patterns currently observed in your research practice.',
        tone: 'neutral',
      }
    case 'mixed_alignment':
      return {
        title: 'Mixed pattern',
        body:
          'Some observed practices align with your perspective, while others reflect additional methodological tendencies.',
        tone: 'neutral',
      }
    case 'potential_tension':
      return {
        title: 'A point for reflection',
        body:
          'Some observed practices differ from the orientation you reported. This does not indicate an error; it may highlight an interesting difference between methodological intention and enacted practice. Research practices can shift across phases of a project, and a project may draw from more than one methodological orientation.',
        tone: 'reflect',
      }
    case 'insufficient_evidence':
      return {
        title: 'Not enough evidence yet',
        body:
          'There is not yet enough observed activity to meaningfully compare practice and perspective.',
        tone: 'neutral',
      }
    case 'not_self_reported':
    default:
      return {
        title: 'Share your perspective',
        body:
          'Optionally describe how you see this project’s orientation. Your response stays separate from observed tendencies.',
        tone: 'invite',
      }
  }
}

export function isInsufficientScore(t?: ParadigmTendency): boolean {
  if (!t) return true
  if (t.score === null || t.score === undefined) return true
  if (t.status === 'insufficient_evidence') return true
  return false
}

export function familyDisplayName(family: string): string {
  const map: Record<string, string> = {
    codebook_practice: 'Code development',
    reflexive_practice: 'Reflection',
    governance_resolution: 'Collaboration & resolution',
    textual_orientation: 'Power & positionality',
    textual_orientation_discussion: 'Collaboration & resolution',
    collaborative_relational: 'Relational & community practice',
  }
  return map[family] || formatSignalName(family)
}

/** Practice groups for “Why this reading?” */
export type PracticeGroupId =
  | 'code_development'
  | 'coding_structure'
  | 'reflection'
  | 'collaboration'
  | 'power_positionality'
  | 'relational_community'
  | 'other'

export const PRACTICE_GROUP_ORDER: PracticeGroupId[] = [
  'code_development',
  'coding_structure',
  'reflection',
  'collaboration',
  'power_positionality',
  'relational_community',
  'other',
]

export const PRACTICE_GROUP_TITLES: Record<PracticeGroupId, string> = {
  code_development: 'Code development',
  coding_structure: 'Coding structure',
  reflection: 'Reflection',
  collaboration: 'Collaboration & resolution',
  power_positionality: 'Power & positionality',
  relational_community: 'Relational & community practice',
  other: 'Other observations',
}

const SIGNAL_PRACTICE: Record<
  string,
  { group: PracticeGroupId; statement: string; contextOnly?: boolean }
> = {
  codebook_volatility: {
    group: 'code_development',
    statement: 'Your codebook continued to change after coding began.',
  },
  code_stability: {
    group: 'code_development',
    statement: 'The codebook became relatively stable after early coding.',
  },
  inductive_ratio: {
    group: 'code_development',
    statement: 'Many codes were introduced during the coding process.',
  },
  coder_initiated_code_creation_ratio: {
    group: 'code_development',
    statement: 'Coders introduced new codes while coding was underway.',
  },
  irr_usage_rate: {
    group: 'coding_structure',
    statement: 'Inter-rater reliability checks were used in the project.',
  },
  blind_independent_coding_rate: {
    group: 'coding_structure',
    statement:
      'Independent coding was explicitly used across multiple assignments.',
  },
  authority_override_rate: {
    group: 'collaboration',
    statement: 'Some coding differences were resolved by authority override.',
  },
  consensus_resolution_rate: {
    group: 'collaboration',
    statement: 'Coding differences were often resolved through discussion.',
  },
  dialectical_resolution_support: {
    group: 'collaboration',
    statement:
      'Resolutions were linked to multi-party discussion of disagreements.',
  },
  disagreement_rate: {
    group: 'collaboration',
    statement: 'Coders sometimes disagreed on coding decisions.',
    contextOnly: true,
  },
  temporal_cocoding_proximity: {
    group: 'relational_community',
    statement: 'Coders sometimes worked in close temporal proximity.',
    contextOnly: true,
  },
  memo_density: {
    group: 'reflection',
    statement: 'Researchers wrote interpretive notes alongside coding.',
  },
  reflexivity_score: {
    group: 'reflection',
    statement:
      'Researcher notes contained evidence of interpretive reflection and self-revision.',
  },
  reflexive_memo_rate: {
    group: 'reflection',
    statement: 'A share of memos met a reflexivity language threshold.',
  },
  positionality_marker_rate: {
    group: 'power_positionality',
    statement: 'Research notes referenced researcher positionality.',
  },
  power_marker_rate: {
    group: 'power_positionality',
    statement:
      'Research notes frequently referenced power relations and structure.',
  },
  relational_marker_rate: {
    group: 'relational_community',
    statement:
      'Research notes contained relational or relationship-oriented language.',
  },
  reciprocity_marker_rate: {
    group: 'relational_community',
    statement:
      'Research notes contained reciprocity or accountability-oriented language.',
  },
  community_marker_rate: {
    group: 'relational_community',
    statement: 'Research notes contained community-oriented language.',
  },
  negotiation_marker_rate: {
    group: 'collaboration',
    statement: 'Linked discussion used negotiation-oriented language.',
  },
  mutual_revision_marker_rate: {
    group: 'collaboration',
    statement: 'Linked discussion used mutual-revision language.',
  },
  consensus_language_rate: {
    group: 'collaboration',
    statement: 'Linked discussion used consensus-oriented language.',
  },
}

export type EvidenceRole =
  | 'Supports'
  | 'Counter-evidence'
  | 'Context only'
  | 'Insufficient evidence'

export function contributionRole(
  c: SignalContribution,
  asCounter?: boolean,
): EvidenceRole {
  if (c.sufficient_data === false || c.raw_value == null) {
    return 'Insufficient evidence'
  }
  const meta = SIGNAL_PRACTICE[c.signal_id]
  if (meta?.contextOnly) return 'Context only'
  if (asCounter) return 'Counter-evidence'
  return 'Supports'
}

export function humanReadableStatement(c: SignalContribution): string {
  const meta = SIGNAL_PRACTICE[c.signal_id]
  if (meta?.statement) return meta.statement
  if (c.rationale) return c.rationale
  return formatSignalName(c.signal_id)
}

export function practiceGroupForSignal(signalId: string, family?: string): PracticeGroupId {
  if (SIGNAL_PRACTICE[signalId]) return SIGNAL_PRACTICE[signalId].group
  if (family === 'codebook_practice') return 'code_development'
  if (family === 'reflexive_practice') return 'reflection'
  if (family === 'governance_resolution') return 'collaboration'
  if (family === 'collaborative_relational') return 'relational_community'
  if (family === 'textual_orientation') return 'power_positionality'
  if (family === 'textual_orientation_discussion') return 'collaboration'
  return 'other'
}

export function contributionTendencyPhrase(
  paradigmId: string,
  role: EvidenceRole,
): string {
  const label = paradigmDisplayLabel(paradigmId)
  if (role === 'Context only') {
    return 'Context only — this observation is not treated as evidence of a particular paradigm.'
  }
  if (role === 'Insufficient evidence') {
    return 'Not enough recorded evidence for this indicator.'
  }
  if (role === 'Counter-evidence') {
    return `Pulls against the ${label} reading.`
  }
  if (paradigmId === 'indigenous') {
    return 'This is treated only as relational/community evidence.'
  }
  return `This contributes to the ${label} tendency.`
}

export interface WhyEvidenceItem {
  signal_id: string
  paradigmId: string
  statement: string
  role: EvidenceRole
  contributionPhrase: string
  technical: SignalContribution
}

export interface WhyPracticeGroup {
  id: PracticeGroupId
  title: string
  items: WhyEvidenceItem[]
}

/** Build practice-grouped evidence for Level-1 explanations. */
export function buildWhyThisReadingGroups(
  tendencies: Record<string, ParadigmTendency>,
): WhyPracticeGroup[] {
  const buckets: Record<PracticeGroupId, WhyEvidenceItem[]> = {
    code_development: [],
    coding_structure: [],
    reflection: [],
    collaboration: [],
    power_positionality: [],
    relational_community: [],
    other: [],
  }

  const seen = new Set<string>()

  for (const id of PARADIGM_ORDER) {
    const t = tendencies[id]
    if (!t) continue

    const push = (c: SignalContribution, asCounter: boolean) => {
      const key = `${id}:${c.signal_id}:${asCounter ? 'c' : 's'}`
      if (seen.has(key)) return
      seen.add(key)
      const role = contributionRole(c, asCounter)
      const group = practiceGroupForSignal(c.signal_id, c.family)
      buckets[group].push({
        signal_id: c.signal_id,
        paradigmId: id,
        statement: humanReadableStatement(c),
        role,
        contributionPhrase: contributionTendencyPhrase(id, role),
        technical: c,
      })
    }

    for (const c of t.top_contributors || []) push(c, false)
    for (const c of t.counter_evidence || []) push(c, true)
  }

  return PRACTICE_GROUP_ORDER.map((gid) => ({
    id: gid,
    title: PRACTICE_GROUP_TITLES[gid],
    items: buckets[gid],
  })).filter((g) => g.items.length > 0)
}

/** Default UI: hide implementation insufficient reasons. */
export function humanizeMissingEvidence(_reason?: string | null): string {
  return 'Not enough recorded evidence'
}
