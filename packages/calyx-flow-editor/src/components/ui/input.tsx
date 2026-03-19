/** @jsxImportSource react */

import { cn } from '@/components/ui/cn.ts'
import type { InputHTMLAttributes } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-400/30',
        className
      )}
      {...props}
    />
  )
}
