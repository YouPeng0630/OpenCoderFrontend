import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import type { AlignmentResult, SelfReport } from '@/types/epistemology'
import { SELF_REPORT_OPTIONS } from '@/types/epistemology'
import { saveSelfReport, submitFeedback } from '@/lib/epistemologyApi'
import { alignmentUserCopy, paradigmDisplayLabel } from '@/lib/epistemologyCopy'
import { PARADIGM_ORDER } from '@/types/epistemology'
import type { ParadigmTendency } from '@/types/epistemology'

interface Props {
  projectId: string
  initial: SelfReport | null | undefined
  alignment?: AlignmentResult | null
  tendencies: Record<string, ParadigmTendency>
  onSaved: (report: SelfReport) => void
}

export function PerspectiveSection({
  projectId,
  initial,
  alignment,
  tendencies,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<string[]>(
    initial?.selected_paradigms || [],
  )
  const [otherText, setOtherText] = useState(initial?.other_text || '')
  const [note, setNote] = useState(initial?.note || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [fbResponse, setFbResponse] = useState<'yes' | 'partially' | 'no' | ''>(
    '',
  )
  const [fbComment, setFbComment] = useState('')
  const [fbOpen, setFbOpen] = useState(false)
  const [fbSaving, setFbSaving] = useState(false)
  const [fbDone, setFbDone] = useState<string | null>(null)
  const [fbErr, setFbErr] = useState<string | null>(null)

  useEffect(() => {
    setSelected(initial?.selected_paradigms || [])
    setOtherText(initial?.other_text || '')
    setNote(initial?.note || '')
  }, [initial])

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const save = async () => {
    setSaving(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await saveSelfReport(projectId, {
        selected_paradigms: selected,
        other_text: otherText || undefined,
        note: note || undefined,
      })
      onSaved(res.self_report)
      setMsg('Saved. Your response is kept separate from observed tendencies.')
    } catch (e: any) {
      setErr(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const submitFb = async () => {
    if (!fbResponse) return
    setFbSaving(true)
    setFbErr(null)
    setFbDone(null)
    try {
      await submitFeedback(projectId, {
        response: fbResponse,
        comment: fbComment || undefined,
      })
      setFbDone(
        'Thanks. Your response has been recorded and can support future evaluation of this feature.',
      )
    } catch (e: any) {
      setFbErr(e.message || 'Failed to submit feedback')
    } finally {
      setFbSaving(false)
    }
  }

  const copy = alignmentUserCopy(alignment)
  const hasSelfReport = Boolean(initial?.selected_paradigms?.length)

  return (
    <section className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Perspective</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
          How would you describe the epistemological orientation of this project?
          Select any that apply.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Your response is kept separate from the system&apos;s observed
          tendencies.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {SELF_REPORT_OPTIONS.map((opt) => {
            const on = selected.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? 'border-teal-700 bg-teal-50 text-teal-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
                aria-pressed={on}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {selected.includes('other') ? (
          <div className="mt-4 max-w-md space-y-1.5">
            <Label htmlFor="other-text">Other (optional detail)</Label>
            <Input
              id="other-text"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Describe another orientation"
            />
          </div>
        ) : null}

        <div className="mt-4 max-w-lg space-y-1.5">
          <Label htmlFor="sr-note">Optional reflection note</Label>
          <Textarea
            id="sr-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional context"
          />
        </div>

        {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}
        {msg ? <p className="mt-2 text-sm text-teal-800">{msg}</p> : null}

        <Button
          className="mt-4"
          onClick={save}
          disabled={saving || selected.length === 0}
        >
          {saving ? 'Saving…' : hasSelfReport ? 'Update perspective' : 'Save perspective'}
        </Button>
      </div>

      {/* Practice ↔ Perspective */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Practice &amp; Perspective
        </h3>

        {hasSelfReport ? (
          <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Observed Practice
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {PARADIGM_ORDER.map((id) => {
                  const t = tendencies[id]
                  const score = t?.score
                  return (
                    <li key={id} className="flex justify-between gap-2">
                      <span>{paradigmDisplayLabel(id, t)}</span>
                      <span className="tabular-nums text-gray-500">
                        {score == null ? '—' : Math.round(score)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div
              className="hidden text-center text-gray-300 sm:block sm:pt-8"
              aria-hidden
            >
              ↔
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Your Perspective
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-700">
                {(initial?.selected_paradigms || []).map((id) => (
                  <li key={id}>
                    {id === 'indigenous'
                      ? 'Indigenous'
                      : id === 'prefer_not_to_say'
                        ? 'Prefer not to say'
                        : id === 'other'
                          ? `Other${initial?.other_text ? `: ${initial.other_text}` : ''}`
                          : paradigmDisplayLabel(id)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div
          className={`mt-5 max-w-2xl ${
            copy.tone === 'reflect' ? 'text-gray-700' : 'text-gray-600'
          }`}
        >
          <p className="text-sm font-medium text-gray-900">{copy.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed">{copy.body}</p>
          {hasSelfReport &&
          initial?.selected_paradigms?.includes('indigenous') ? (
            <p className="mt-3 text-xs leading-relaxed text-gray-500">
              Behavioral and text traces cannot establish Indigenous
              epistemological orientation. Relational/community indicators are
              shown only as partial observations of research practice — a
              difference here does not contradict an Indigenous self-report.
            </p>
          ) : null}
        </div>
      </div>

      {/* Feedback — after reflection */}
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Does this reading match your own sense of the project&apos;s research
          orientation?
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ['yes', 'Yes'],
              ['partially', 'Partially'],
              ['no', 'No'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={fbResponse === id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFbResponse(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-xs text-gray-500 underline-offset-2 hover:underline"
          onClick={() => setFbOpen((v) => !v)}
        >
          {fbOpen ? 'Hide comment' : 'Add a comment'}
        </button>
        {fbOpen ? (
          <Textarea
            className="mt-2 max-w-lg"
            rows={3}
            value={fbComment}
            onChange={(e) => setFbComment(e.target.value)}
            placeholder="Optional comment"
          />
        ) : null}
        {fbErr ? <p className="mt-2 text-sm text-red-700">{fbErr}</p> : null}
        {fbDone ? (
          <p className="mt-2 max-w-lg text-sm text-teal-800">{fbDone}</p>
        ) : null}
        <Button
          className="mt-3"
          size="sm"
          onClick={submitFb}
          disabled={!fbResponse || fbSaving}
        >
          {fbSaving ? 'Submitting…' : 'Submit'}
        </Button>
        <p className="mt-2 text-xs text-gray-400">
          Feedback does not change the current observed tendency scores.
        </p>
      </div>
    </section>
  )
}
