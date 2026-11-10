import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { HelpCircle } from 'lucide-react'
import type { ParadigmTendency } from '@/types/epistemology'
import { PARADIGM_ORDER } from '@/types/epistemology'
import {
  evidenceStrengthLabel,
  isInsufficientScore,
  paradigmDisplayLabel,
  paradigmRadarLabel,
} from '@/lib/epistemologyCopy'

interface Props {
  tendencies: Record<string, ParadigmTendency>
}

function ColumnHint({ label }: { label: string }) {
  return (
    <span
      className="group relative ml-1 inline-flex align-middle"
      tabIndex={0}
      aria-label={label}
    >
      <HelpCircle
        className="h-3 w-3 cursor-help text-gray-400 hover:text-gray-600"
        aria-hidden
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-md bg-gray-900 px-2.5 py-2 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  )
}

function RadarAxisTick({ payload, x, y, cx, cy, ...rest }: any) {
  const raw = String(payload?.value ?? '')
  const lines = raw.split('\n').filter(Boolean)
  // Push labels slightly outward from chart center so they aren't clipped
  const dx = x - cx
  const dy = y - cy
  const push = 10
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const tx = x + (dx / len) * push
  const ty = y + (dy / len) * push
  const lineHeight = 13

  return (
    <text
      x={tx}
      y={ty}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#6b7280"
      fontSize={11}
      {...rest}
    >
      {lines.map((line, i) => (
        <tspan
          key={i}
          x={tx}
          dy={i === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function TendencyRadar({ tendencies }: Props) {
  const rows = PARADIGM_ORDER.map((id) => {
    const t = tendencies[id]
    const insufficient = isInsufficientScore(t)
    return {
      axis: paradigmRadarLabel(id),
      fullLabel: paradigmDisplayLabel(id, t),
      id,
      score: insufficient ? undefined : Number(t.score),
      insufficient,
      strength: evidenceStrengthLabel(
        t?.confidence?.evidence_confidence,
        insufficient,
      ),
    }
  })

  const hasAny = rows.some((r) => typeof r.score === 'number')

  return (
    <div className="space-y-6">
      <div
        className="mx-auto h-80 w-full max-w-xl overflow-visible sm:h-96"
        role="img"
        aria-label="Radar chart of four observed research-practice tendencies"
      >
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={rows}
              cx="50%"
              cy="50%"
              outerRadius="58%"
              margin={{ top: 24, right: 48, bottom: 24, left: 48 }}
            >
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="axis"
                tick={<RadarAxisTick />}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#d1d5db', fontSize: 9 }}
              />
              <Radar
                name="Observed practice"
                dataKey="score"
                stroke="#0f766e"
                fill="#0f766e"
                fillOpacity={0.22}
                isAnimationActive={false}
              />
              <Tooltip
                formatter={(value: any, _name: any, props: any) => {
                  if (props?.payload?.insufficient || value == null) {
                    return ['Not enough recorded evidence', 'Tendency']
                  }
                  return [`${value}`, 'Observed tendency']
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">
            Not enough recorded evidence to plot observed practices yet.
          </div>
        )}
      </div>

      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Observed research-practice tendency scores from 0 to 100. Scores are
          independent and do not sum to 100.
        </caption>
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400">
            <th className="py-2 pr-3 font-medium">
              <span className="inline-flex items-center">
                Observed practice
                <ColumnHint label="These four values are independent and do not need to sum to 100." />
              </span>
            </th>
            <th className="py-2 pr-3 font-medium tabular-nums">
              <span className="inline-flex items-center">
                Tendency
                <ColumnHint label="Tendency describes the direction of observed practice." />
              </span>
            </th>
            <th className="py-2 font-medium">
              <span className="inline-flex items-center">
                Evidence strength
                <ColumnHint label='Evidence strength describes how much and how varied the available evidence is — not a probability that a score is “correct.”' />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-50">
              <td className="py-2.5 pr-3 text-gray-800">{r.fullLabel}</td>
              <td className="py-2.5 pr-3 tabular-nums text-gray-700">
                {r.insufficient ? (
                  <span className="text-gray-500">—</span>
                ) : (
                  Math.round(Number(r.score))
                )}
              </td>
              <td className="py-2.5 text-gray-500">{r.strength}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
