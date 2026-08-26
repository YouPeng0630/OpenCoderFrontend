import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

export const TASK_TYPE_FILTER_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'multimodal', label: 'Multimodal' },
  { value: 'bibliographic', label: 'Bibliographic' },
  { value: 'pdf_document_coding', label: 'PDF' },
] as const

/** null = all types; empty Set = none; non-empty = only those types. */
export type TaskTypeFilterValue = Set<string> | null

export function isAllTaskTypes(selected: TaskTypeFilterValue): boolean {
  return selected === null
}

export function isNoTaskTypes(selected: TaskTypeFilterValue): boolean {
  return selected !== null && selected.size === 0
}

/** null / all → omit API param. Empty set → caller should short-circuit (no results). */
export function taskTypeFilterParam(selected: TaskTypeFilterValue): string | null {
  if (selected === null || selected.size === 0) return null
  return Array.from(selected).join(',')
}

interface TaskTypeFilterProps {
  selected: TaskTypeFilterValue
  onChange: (next: TaskTypeFilterValue) => void
  className?: string
}

/**
 * Multi-select task type filter.
 * null = All Types · empty Set = None · otherwise = selected subset.
 */
export function TaskTypeFilter({ selected, onChange, className }: TaskTypeFilterProps) {
  const allValues = TASK_TYPE_FILTER_OPTIONS.map((o) => o.value)
  const isAll = selected === null
  const isNone = selected !== null && selected.size === 0
  const label = isAll
    ? 'All Types'
    : isNone
    ? 'No types'
    : selected.size === 1
    ? TASK_TYPE_FILTER_OPTIONS.find((o) => o.value === Array.from(selected)[0])?.label ??
      '1 type'
    : `${selected.size} types`

  const toggle = (value: string) => {
    if (selected === null) {
      // Was all — uncheck this one ⇒ keep every other type
      onChange(new Set(allValues.filter((v) => v !== value)))
      return
    }
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    // All types checked again ⇒ treat as All (null)
    if (next.size === allValues.length && allValues.every((v) => next.has(v))) {
      onChange(null)
    } else {
      onChange(next) // may be empty = None (stays empty; does NOT flip back to All)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-9 gap-1.5 border-gray-200 bg-white px-3 text-sm font-normal text-gray-700 ${className ?? ''}`}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[100] w-52 bg-white p-2 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-gray-500">Task type</span>
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[11px] text-gray-400 hover:text-gray-700"
              onClick={() => onChange(null)}
            >
              All
            </button>
            <span className="text-[11px] text-gray-300">·</span>
            <button
              type="button"
              className="text-[11px] text-gray-400 hover:text-gray-700"
              onClick={() => onChange(new Set())}
            >
              None
            </button>
          </div>
        </div>
        <ul className="space-y-0.5">
          {TASK_TYPE_FILTER_OPTIONS.map((opt) => {
            const checked = selected === null || selected.has(opt.value)
            return (
              <li key={opt.value}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-gray-50">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(opt.value)}
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
