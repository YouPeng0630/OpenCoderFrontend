import type { TimelineEvent } from '../types'
import { FileArchive } from 'lucide-react'

export function ExportRenderer({ event }: { event: TimelineEvent }) {
  const fileName = String(event.payload.fileName || 'export.zip')
  const kind = String(event.payload.exportKind || 'export')

  return (
    <div>
      <p className="text-sm text-slate-800">Exported project data</p>
      <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50/60 px-2.5 py-1.5 text-sm text-teal-900">
        <FileArchive className="h-4 w-4 text-teal-700" />
        <span className="font-medium">{fileName}</span>
        <span className="text-[11px] capitalize text-teal-600/80">
          {kind.replace(/-/g, ' ')}
        </span>
      </div>
    </div>
  )
}
