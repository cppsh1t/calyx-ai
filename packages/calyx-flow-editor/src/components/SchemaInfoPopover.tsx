/** @jsxImportSource react */

import * as Popover from '@radix-ui/react-popover'
import { useMemo, useState } from 'react'

export type SchemaInfoPopoverProps = {
  title: string
  schema: unknown
  description?: string
  className?: string
}

function formatSchema(schema: unknown): string {
  if (schema === null) {
    return 'null'
  }

  if (schema === undefined) {
    return 'unknown'
  }

  if (typeof schema === 'string') {
    return schema
  }

  if (typeof schema === 'number' || typeof schema === 'boolean') {
    return String(schema)
  }

  if (typeof schema === 'object') {
    const withDescription = schema as { description?: unknown; _def?: { typeName?: unknown } }
    if (typeof withDescription.description === 'string' && withDescription.description.trim().length > 0) {
      return withDescription.description
    }
    if (withDescription._def && typeof withDescription._def.typeName === 'string') {
      return withDescription._def.typeName
    }
    const ctorName = (schema as { constructor?: { name?: unknown } }).constructor?.name
    if (typeof ctorName === 'string' && ctorName !== 'Object') {
      return ctorName
    }
    try {
      return JSON.stringify(schema)
    } catch {
      return 'schema'
    }
  }

  return String(schema)
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
      <path d="M12 11v5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  )
}

export function SchemaInfoPopover({ title, schema, description, className }: SchemaInfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const schemaText = useMemo(() => formatSchema(schema), [schema])

  return (
    <div
      className={`group/info relative inline-flex items-center ${className ?? ''}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300/80 bg-white/70 text-slate-500 shadow-sm transition hover:border-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40"
            aria-label={`Show metadata for ${title}`}
          >
            <InfoIcon />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            className="z-[1000] min-w-52 max-w-72 rounded-lg border border-slate-200/80 bg-white/95 p-3 text-left shadow-xl backdrop-blur-sm"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
            <div className="mt-1 text-xs text-slate-900">
              <span className="font-medium">Schema:</span> {schemaText}
            </div>
            {description && (
              <div className="mt-1.5 text-xs leading-relaxed text-slate-600">
                <span className="font-medium text-slate-700">Description:</span> {description}
              </div>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}

export default SchemaInfoPopover
