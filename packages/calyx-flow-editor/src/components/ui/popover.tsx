import { cn } from '@/components/ui/cn.ts'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as React from 'react'

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    portalContainer?: HTMLElement | null
  }
>(({ className, align = 'center', sideOffset = 4, portalContainer, ...props }, ref) => (
  <PopoverPrimitive.Portal container={portalContainer ?? undefined}>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn('calyx-flow-editor-theme z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none', className)}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
