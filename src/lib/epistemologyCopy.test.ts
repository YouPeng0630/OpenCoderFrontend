import { describe, expect, it } from 'vitest'
import {
  alignmentUserCopy,
  buildTendencySummary,
  buildWhyThisReadingGroups,
  evidenceStrengthLabel,
  humanReadableStatement,
  humanizeMissingEvidence,
  isInsufficientScore,
  paradigmDisplayLabel,
  paradigmRadarLabel,
  contributionRole,
} from '@/lib/epistemologyCopy'
import type { ParadigmTendency, SignalContribution } from '@/types/epistemology'
import { PARADIGM_ORDER, PARADIGM_SHORT_LABELS, SELF_REPORT_OPTIONS } from '@/types/epistemology'

function tendency(
  partial: Partial<ParadigmTendency> & { score: number | null },
): ParadigmTendency {
  return {
    paradigm: 'constructivist',
    ...partial,
  }
}

describe('initial view invariants', () => {
  it('exposes four observed dimensions with relational fourth axis', () => {
    expect(PARADIGM_ORDER).toHaveLength(4)
    expect(paradigmDisplayLabel('indigenous')).toMatch(/Relational \/ Community/i)
    expect(paradigmRadarLabel('indigenous')).toMatch(/Relational/i)
    expect(paradigmRadarLabel('indigenous')).toMatch(/Community/i)
    expect(PARADIGM_SHORT_LABELS.indigenous.toLowerCase()).not.toContain(
      'indigenous score',
    )
  })

  it('keeps Indigenous available only as self-report choice', () => {
    expect(SELF_REPORT_OPTIONS.some((o) => o.id === 'indigenous')).toBe(true)
    expect(
      SELF_REPORT_OPTIONS.find((o) => o.id === 'indigenous')?.label,
    ).toBe('Indigenous')
  })

  it('does not use categorical classification wording in summary', () => {
    const s = buildTendencySummary({
      constructivist: tendency({
        score: 78,
        confidence: { evidence_confidence: 70 },
      }),
      positivist_postpositivist: tendency({
        score: 31,
        confidence: { evidence_confidence: 70 },
      }),
    })
    expect(s.toLowerCase()).not.toMatch(
      /your epistemology is|classified as|probability|diagnosis/,
    )
    expect(s).toMatch(/strongest evidence|practices/i)
  })
})

describe('evidence strength', () => {
  it('maps confidence to Strong/Moderate/Limited without exposing raw numbers', () => {
    expect(evidenceStrengthLabel(80)).toBe('Strong')
    expect(evidenceStrengthLabel(50)).toBe('Moderate')
    expect(evidenceStrengthLabel(20)).toBe('Limited')
    expect(evidenceStrengthLabel(null, true)).toBe(
      'Not enough recorded evidence',
    )
  })
})

describe('isInsufficientScore', () => {
  it('does not treat true zero as insufficient', () => {
    expect(isInsufficientScore(tendency({ score: null }))).toBe(true)
    expect(isInsufficientScore(tendency({ score: 0 }))).toBe(false)
  })
})

describe('buildTendencySummary', () => {
  it('reports weak evidence without inventing a category', () => {
    expect(buildTendencySummary({})).toMatch(/not yet enough evidence/i)
  })

  it('avoids declaring one dominant when scores are close', () => {
    const s = buildTendencySummary({
      positivist_postpositivist: tendency({
        score: 55,
        confidence: { evidence_confidence: 60 },
      }),
      constructivist: tendency({
        score: 52,
        confidence: { evidence_confidence: 60 },
      }),
      critical_theory: tendency({
        score: 50,
        confidence: { evidence_confidence: 60 },
      }),
      indigenous: tendency({
        score: 48,
        confidence: { evidence_confidence: 60 },
      }),
    })
    expect(s).toMatch(/mixture/i)
  })

  it('mentions limited evidence when confidence is low', () => {
    const s = buildTendencySummary({
      constructivist: tendency({
        score: 70,
        confidence: { evidence_confidence: 20 },
      }),
    })
    expect(s).toMatch(/evidence is currently limited/i)
  })
})

describe('alignmentUserCopy', () => {
  it('uses reflective wording for all statuses', () => {
    expect(alignmentUserCopy({ status: 'broad_alignment' }).title).toBe(
      'Broad alignment',
    )
    expect(alignmentUserCopy({ status: 'mixed_alignment' }).title).toBe(
      'Mixed pattern',
    )
    expect(alignmentUserCopy({ status: 'potential_tension' }).title).toBe(
      'A point for reflection',
    )
    expect(alignmentUserCopy({ status: 'insufficient_evidence' }).title).toBe(
      'Not enough evidence yet',
    )
    expect(alignmentUserCopy({ status: 'not_self_reported' }).tone).toBe(
      'invite',
    )
  })

  it('avoids evaluative framing', () => {
    const body = alignmentUserCopy({
      status: 'potential_tension',
    }).body.toLowerCase()
    expect(body).not.toMatch(
      /hypocrisy|incorrect epistemology|mismatch score|failed alignment|accuracy/,
    )
    expect(body).toMatch(/does not indicate an error/)
  })
})

describe('Why This Reading evidence', () => {
  it('produces human-readable statements before raw metrics', () => {
    const tendencies = {
      constructivist: tendency({
        score: 70,
        top_contributors: [
          {
            signal_id: 'inductive_ratio',
            family: 'codebook_practice',
            raw_value: 0.8,
            weighted_contribution: 0.5,
            sufficient_data: true,
          },
        ],
        counter_evidence: [
          {
            signal_id: 'code_stability',
            family: 'codebook_practice',
            raw_value: 0.9,
            weighted_contribution: 0.1,
            sufficient_data: true,
          },
        ],
      }),
    }
    const groups = buildWhyThisReadingGroups(tendencies)
    expect(groups.some((g) => g.id === 'code_development')).toBe(true)
    const code = groups.find((g) => g.id === 'code_development')!
    expect(code.items.some((i) => i.role === 'Supports')).toBe(true)
    expect(code.items.some((i) => i.role === 'Counter-evidence')).toBe(true)
    expect(humanReadableStatement(code.items[0].technical)).not.toBe(
      'inductive_ratio',
    )
  })

  it('marks disagreement as context only', () => {
    const c: SignalContribution = {
      signal_id: 'disagreement_rate',
      raw_value: 0.4,
      sufficient_data: true,
    }
    expect(contributionRole(c)).toBe('Context only')
  })
})

describe('missing data presentation', () => {
  it('hides implementation reasons in default copy', () => {
    expect(
      humanizeMissingEvidence('no_role_at_time_on_code_creation_logs'),
    ).toBe('Not enough recorded evidence')
    expect(humanizeMissingEvidence('no_typed_resolutions')).toBe(
      'Not enough recorded evidence',
    )
  })
})

describe('radar score rows', () => {
  it('does not coerce null to zero and does not require sum 100', () => {
    const tendencies: Record<string, ParadigmTendency> = {
      positivist_postpositivist: tendency({ score: 62 }),
      constructivist: tendency({
        score: null,
        status: 'insufficient_evidence',
      }),
      critical_theory: tendency({ score: 0 }),
      indigenous: tendency({ score: 25 }),
    }
    const rows = PARADIGM_ORDER.map((id) => {
      const t = tendencies[id]
      const insufficient = isInsufficientScore(t)
      return {
        score: insufficient ? undefined : Number(t.score),
        insufficient,
        label: paradigmDisplayLabel(id, t),
      }
    })
    expect(rows[1].score).toBeUndefined()
    expect(rows[2].score).toBe(0)
    expect(rows[3].label).toMatch(/Relational/i)
    const sum = rows
      .map((r) => r.score)
      .filter((s): s is number => typeof s === 'number')
      .reduce((a, b) => a + b, 0)
    expect(sum).not.toBe(100)
  })
})
