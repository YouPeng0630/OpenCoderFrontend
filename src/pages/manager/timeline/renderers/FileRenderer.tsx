import type { FileUploadItem, TimelineEvent } from '../types'
import { ExpandableDetails } from './ExpandableDetails'
import { FileAudio, FileImage, FileText, FileVideo, File as FileIcon } from 'lucide-react'

function MediaIcon({ type }: { type?: string }) {
  const cls = 'h-3.5 w-3.5 shrink-0 text-slate-500'
  switch (type) {
    case 'image':
      return <FileImage className={cls} />
    case 'video':
      return <FileVideo className={cls} />
    case 'audio':
      return <FileAudio className={cls} />
    case 'pdf':
    case 'text':
      return <FileText className={cls} />
    default:
      return <FileIcon className={cls} />
  }
}

export function FileRenderer({ event }: { event: TimelineEvent }) {
  const files = (event.payload.files as FileUploadItem[]) || []
  const count = Number(event.payload.count || files.length || 0)
  const isDelete = event.type === 'file.deleted'

  return (
    <div>
      <p className="text-sm text-slate-800">
        {isDelete ? 'Deleted' : 'Uploaded'}{' '}
        <span className="font-semibold text-slate-900">{count}</span> task
        {count === 1 ? '' : 's'}
      </p>
      {files.length > 0 && (
        <ExpandableDetails summary={isDelete ? 'View deleted files' : 'View uploaded files'}>
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.taskId} className="flex items-center gap-2 text-sm">
                <MediaIcon type={f.mediaType} />
                <span className="text-slate-800">{f.title}</span>
                {f.mediaType && (
                  <span className="text-[11px] capitalize text-slate-400">{f.mediaType}</span>
                )}
              </li>
            ))}
          </ul>
        </ExpandableDetails>
      )}
    </div>
  )
}
