/** @jsxImportSource react */

import { cn } from '@/components/ui/cn.ts'
import type { ButtonHTMLAttributes } from 'react'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function Button({ className, variant = 'default', size = 'default', type = 'button', ...props }: ButtonProps) {
  const variantClass =
    variant === 'default'
      ? 'border border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
      : variant === 'outline'
        ? 'border border-slate-200 bg-white text-slate-700 hover:text-slate-900'
        : 'border border-transparent bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'

  const sizeClass = size === 'sm' ? 'h-8 px-3 text-xs' : size === 'icon' ? 'h-8 w-8 p-0' : 'h-9 px-3 text-xs'

  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 disabled:pointer-events-none disabled:opacity-60',
        variantClass,
        sizeClass,
        className
      )}
      {...props}
    />
  )
}
