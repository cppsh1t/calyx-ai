import type { KeyEvent } from '@opentui/core'
import { onCleanup } from 'solid-js'

/**
 * @returns `{ continue: true }` to allow event to propagate to other handlers, or `{ continue: false }` to stop propagation after this handler
 */
export type KeyBindHandler = (event: KeyEvent) => { continue: boolean }

export enum KeyBindPriorityEnum {
  PAGE = 0,
  DIALOG = 1,
  ACTION = 2,
}

export type KeyBindPriority = KeyBindPriorityEnum | number

export type KeyBindContext = {
  priority: KeyBindPriority
  handler: KeyBindHandler
}

// Global registry for all keybinds (handler as key)
const keybindRegistry = new Map<KeyBindHandler, KeyBindContext>()

// Process keyboard event through registered handlers in priority order
export function handleKeyboardEvent(event: KeyEvent): void {
  // Sort contexts by priority (higher priority first)
  const sortedContexts = Array.from(keybindRegistry.values()).sort((a, b) => b.priority - a.priority)

  // Iterate through handlers in priority order
  for (const context of sortedContexts) {
    const result = context.handler(event)

    // Stop propagation if handler returns { continue: false }
    if (!result.continue) {
      return
    }
  }
}

export function useKeyBind(priority: KeyBindPriority, handler: KeyBindHandler): void {
  // Create context for this binding
  const context: KeyBindContext = {
    priority,
    handler,
  }

  // Register in global registry using handler as key
  keybindRegistry.set(handler, context)

  // Cleanup on component unmount
  onCleanup(() => {
    keybindRegistry.delete(handler)
  })
}

// Optional utility functions for manual management
export function removeKeyBind(handler: KeyBindHandler): boolean {
  return keybindRegistry.delete(handler)
}

export function clearAllKeyBinds(): void {
  keybindRegistry.clear()
}
