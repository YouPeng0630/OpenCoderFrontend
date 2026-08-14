import type { TimelineEvent } from '../types'

function formatDuration(seconds: unknown): string | null {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n < 0) return null
  if (n < 60) return `${Math.round(n)}s`
  const m = Math.floor(n / 60)
  const s = Math.round(n % 60)
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm ? `${h}h ${rm}m` : `${h}h`
}

function formatCount(n: unknown): string | null {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return v.toLocaleString()
}

export function TranscriptionRenderer({ event }: { event: TimelineEvent }) {
  const title = String(event.payload.taskTitle || 'Untitled task')

  if (event.type === 'transcription.summarized') {
    const model = event.payload.model ? String(event.payload.model) : null
    const preview = event.payload.preview ? String(event.payload.preview) : null
    const summaryChars = formatCount(event.payload.summaryCharCount)
    const sourceChars = formatCount(event.payload.sourceCharCount)

    return (
      <div>
        <p className="text-sm text-slate-800">
          Generated summary for{' '}
          <span className="font-semibold text-slate-900">{title}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {model && <span>model: {model}</span>}
          {summaryChars && <span>{summaryChars} summary chars</span>}
          {sourceChars && <span>{sourceChars} source chars</span>}
        </div>
        {preview && (
          <p className="mt-2 rounded-md border border-sky-100 bg-sky-50/50 px-2.5 py-1.5 text-sm text-slate-700 line-clamp-3">
            {preview}
          </p>
        )}
      </div>
    )
  }

  const duration = formatDuration(event.payload.durationSeconds)
  const chars = formatCount(event.payload.charCount)
  const words = formatCount(event.payload.wordCount)
  const segments = formatCount(event.payload.segmentCount)
  const model = event.payload.model ? String(event.payload.model) : null
  const language = event.payload.language ? String(event.payload.language) : null

  return (
    <div>
      <p className="text-sm text-slate-800">
        Completed transcription for{' '}
        <span className="font-semibold text-slate-900">{title}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {duration && <span>{duration}</span>}
        {chars && <span>{chars} chars</span>}
        {words && <span>{words} words</span>}
        {segments && <span>{segments} segments</span>}
        {language && <span>{language}</span>}
        {model && <span className="truncate max-w-[220px]" title={model}>{model}</span>}
      </div>
    </div>
  )
}
