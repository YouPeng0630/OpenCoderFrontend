import { describe, expect, it } from 'vitest'
import { PARADIGM_ORDER, PARADIGM_SHORT_LABELS } from '@/types/epistemology'
import {
  evidenceStrengthLabel,
  isInsufficientScore,
  paradigmDisplayLabel,
} from '@/lib/epistemologyCopy'
import type { ParadigmTendency } from '@/types/epistemology'

describe('radar presentation (redesign)', () => {
  it('shows evidence strength labels instead of raw confidence', () => {
    expect(evidenceStrengthLabel(72)).toBe('Strong')
    expect(evidenceStrengthLabel(45)).toBe('Moderate')
    expect(evidenceStrengthLabel(15)).toBe('Limited')
  })

  it('fourth observed axis is relational/community, not Indigenous score', () => {
    expect(paradigmDisplayLabel('indigenous')).not.toMatch(/^Indigenous$/i)
    expect(PARADIGM_SHORT_LABELS.indigenous).toMatch(/Relational/i)
  })

  it('builds four independent score rows without null→0', () => {
    const tendencies: Record<string, ParadigmTendency> = {
      positivist_postpositivist: {
        paradigm: 'positivist_postpositivist',
        score: 31,
        confidence: { evidence_confidence: 55 },
      },
      constructivist: {
        paradigm: 'constructivist',
        score: 78,
        confidence: { evidence_confidence: 80 },
      },
      critical_theory: {
        paradigm: 'critical_theory',
        score: null,
        status: 'insufficient_evidence',
      },
      indigenous: {
        paradigm: 'indigenous',
        score: 25,
        confidence: { evidence_confidence: 30 },
      },
    }

    const rows = PARADIGM_ORDER.map((id) => {
      const t = tendencies[id]
      const insufficient = isInsufficientScore(t)
      return {
        id,
        label: paradigmDisplayLabel(id, t),
        score: insufficient ? undefined : Number(t.score),
        strength: evidenceStrengthLabel(
          t.confidence?.evidence_confidence,
          insufficient,
        ),
      }
    })

    expect(rows).toHaveLength(4)
    expect(rows.find((r) => r.id === 'critical_theory')?.score).toBeUndefined()
    expect(rows.find((r) => r.id === 'critical_theory')?.strength).toBe(
      'Not enough recorded evidence',
    )
    expect(rows.find((r) => r.id === 'indigenous')?.label).toMatch(/Relational/)
  })
})
