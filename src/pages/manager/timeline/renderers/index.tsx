import type { TimelineEvent } from '../types'
import { TimelineItemShell } from '../components/TimelineItemShell'
import { ProjectRenderer } from './ProjectRenderer'
import { MemberRenderer } from './MemberRenderer'
import { FileRenderer } from './FileRenderer'
import { TagRenderer } from './TagRenderer'
import { CodingRenderer } from './CodingRenderer'
import { IcrRenderer } from './IcrRenderer'
import { ExportRenderer } from './ExportRenderer'
import { TranscriptionRenderer } from './TranscriptionRenderer'

function EventBody({ event }: { event: TimelineEvent }) {
  switch (event.renderer) {
    case 'project':
      return <ProjectRenderer event={event} />
    case 'member':
      return <MemberRenderer event={event} />
    case 'file':
      return <FileRenderer event={event} />
    case 'tag':
      return <TagRenderer event={event} />
    case 'coding':
      return <CodingRenderer event={event} />
    case 'icr':
      return <IcrRenderer event={event} />
    case 'export':
      return <ExportRenderer event={event} />
    case 'transcription':
      return <TranscriptionRenderer event={event} />
    default:
      return <p className="text-sm text-slate-800">{event.summary}</p>
  }
}
export function TimelineEventRenderer({
  event,
  isLast,
}: {
  event: TimelineEvent
  isLast?: boolean
}) {
  return (
    <TimelineItemShell
      actor={event.actor}
      createdAt={event.createdAt}
      eventType={event.type}
      renderer={event.renderer}
      isLast={isLast}
    >
      <EventBody event={event} />
    </TimelineItemShell>
  )
}
