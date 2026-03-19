/** @jsxImportSource react */

import { cn } from '@/components/ui/cn.ts'
import type { TextareaHTMLAttributes } from 'react'

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/30',
        className
      )}
      {...props}
    />
  )
}
