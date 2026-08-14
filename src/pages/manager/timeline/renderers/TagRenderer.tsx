import type { ReactNode } from 'react'
import type { TagChangePayload, TimelineEvent } from '../types'
import { ExpandableDetails } from './ExpandableDetails'

function optionWord(count: number): string {
  return count === 1 ? 'option' : 'options'
}

/** Bold count + lowercase "option(s)" — shared by create / update summaries. */
function OptionCount({ count, prefix }: { count: number; prefix?: string }) {
  return (
    <span>
      {prefix}
      <span className="font-semibold text-slate-900">{count}</span> {optionWord(count)}
    </span>
  )
}

function OptionList({
  options,
  tone,
}: {
  options: Array<{ id: string; label: string }>
  tone: 'added' | 'removed' | 'neutral'
}) {
  if (!options.length) return null
  const toneCls =
    tone === 'added'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'removed'
        ? 'bg-rose-50 text-rose-800 border-rose-200 line-through'
        : 'bg-slate-50 text-slate-700 border-slate-200'

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <span
          key={o.id}
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${toneCls}`}
        >
          {o.label}
        </span>
      ))}
    </div>
  )
}

function BeforeAfter({ change }: { change: TagChangePayload }) {
  if (!change.before || !change.after) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-rose-100 bg-rose-50/40 p-2.5">
        <p className="mb-1.5 text-[11px] font-medium text-rose-600">before</p>
        <p className="mb-2 text-sm font-medium text-slate-800">{change.before.name}</p>
        <OptionList options={change.before.options} tone="neutral" />
      </div>
      <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-2.5">
        <p className="mb-1.5 text-[11px] font-medium text-emerald-700">after</p>
        <p className="mb-2 text-sm font-medium text-slate-800">{change.after.name}</p>
        <OptionList options={change.after.options} tone="neutral" />
      </div>
    </div>
  )
}

export function TagRenderer({ event }: { event: TimelineEvent }) {
  const change = event.payload.change as TagChangePayload | undefined
  const changeNote = String(
    (change?.changeNote || event.payload.changeNote || '') as string
  ).trim()

  if (!change) {
    return <p className="text-sm text-slate-800">{event.summary}</p>
  }

  const noteBlock = changeNote ? (
    <p className="mt-1.5 text-sm text-slate-600 italic border-l-2 border-violet-200 pl-3">
      “{changeNote}”
    </p>
  ) : null

  if (event.type === 'tag.group_created') {
    const options = change.group?.options || change.addedOptions || []
    return (
      <div>
        <p className="text-sm text-slate-800">
          Created tag group{' '}
          <span className="font-semibold text-violet-800">{change.groupName}</span>
          {' '}with <OptionCount count={options.length} />
        </p>
        {noteBlock}
        <ExpandableDetails summary="view group & options" defaultOpen>
          <p className="mb-2 text-xs text-slate-500">options added</p>
          <OptionList options={options} tone="added" />
        </ExpandableDetails>
      </div>
    )
  }

  if (event.type === 'tag.group_deleted') {
    const options = change.group?.options || change.removedOptions || []
    return (
      <div>
        <p className="text-sm text-slate-800">
          Deleted tag group{' '}
          <span className="font-semibold text-rose-700 line-through decoration-rose-300">
            {change.groupName}
          </span>
          {options.length > 0 && (
            <>
              {' '}
              · <OptionCount count={options.length} />
            </>
          )}
        </p>
        {noteBlock}
        <ExpandableDetails summary="view removed options">
          <p className="mb-2 text-xs text-slate-500">options removed</p>
          <OptionList options={options} tone="removed" />
        </ExpandableDetails>
      </div>
    )
  }

  // tag.group_updated — build summary parts with the same OptionCount style
  const metaParts: ReactNode[] = []
  if (change.nameChanged) {
    metaParts.push(
      <span key="rename">
        renamed “{change.nameChanged.from}” → “{change.nameChanged.to}”
      </span>
    )
  }
  if (change.addedOptions?.length) {
    metaParts.push(
      <OptionCount key="add" count={change.addedOptions.length} prefix="+" />
    )
  }
  if (change.removedOptions?.length) {
    metaParts.push(
      <OptionCount key="rm" count={change.removedOptions.length} prefix="−" />
    )
  }

  return (
    <div>
      <p className="text-sm text-slate-800">
        Updated tag group{' '}
        <span className="font-semibold text-violet-800">
          {change.after?.name || change.groupName}
        </span>
        {metaParts.length > 0 && (
          <span className="text-slate-500">
            {' '}
            ·{' '}
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 ? ' · ' : null}
                {part}
              </span>
            ))}
          </span>
        )}
      </p>
      {noteBlock}
      <ExpandableDetails summary="view before / after details" defaultOpen>
        <div className="space-y-3">
          {change.nameChanged && (
            <p className="text-sm">
              <span className="text-slate-500">name:</span>{' '}
              <span className="line-through text-rose-600">{change.nameChanged.from}</span>
              {' → '}
              <span className="font-medium text-emerald-700">{change.nameChanged.to}</span>
            </p>
          )}
          {change.descriptionChanged && (
            <p className="text-sm">
              <span className="text-slate-500">description:</span>{' '}
              <span className="line-through text-rose-600">
                {change.descriptionChanged.from || '—'}
              </span>
              {' → '}
              <span className="font-medium text-emerald-700">
                {change.descriptionChanged.to || '—'}
              </span>
            </p>
          )}
          {(change.renamedOptions?.length || 0) > 0 && (
            <ul className="space-y-1 text-sm">
              {change.renamedOptions!.map((r, i) => (
                <li key={i}>
                  <span className="text-slate-500">tag:</span>{' '}
                  <span className="line-through text-rose-600">{r.from}</span>
                  {' → '}
                  <span className="text-emerald-700">{r.to}</span>
                </li>
              ))}
            </ul>
          )}
          {(change.optionDescriptionChanged?.length || 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">tag descriptions</p>
              {change.optionDescriptionChanged!.map((d, i) => (
                <p key={i} className="text-sm">
                  <span className="font-medium text-slate-800">{d.label}:</span>{' '}
                  <span className="line-through text-rose-600">{d.from || '—'}</span>
                  {' → '}
                  <span className="font-medium text-emerald-700">{d.to || '—'}</span>
                </p>
              ))}
            </div>
          )}
          {(change.before || change.after || change.addedOptions?.length || change.removedOptions?.length) && (
            <BeforeAfter change={change} />
          )}
          {!change.before && (change.addedOptions?.length || 0) > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-emerald-700">
                options added · <OptionCount count={change.addedOptions!.length} />
              </p>
              <OptionList options={change.addedOptions!} tone="added" />
            </div>
          )}
          {!change.after && (change.removedOptions?.length || 0) > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-rose-700">
                options removed · <OptionCount count={change.removedOptions!.length} />
              </p>
              <OptionList options={change.removedOptions!} tone="removed" />
            </div>
          )}
        </div>
      </ExpandableDetails>
    </div>
  )
}
