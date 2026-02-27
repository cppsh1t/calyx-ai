import type { CliRenderer } from '@opentui/core'

/**
 * Global renderer reference for application-wide access
 * Set once during app initialization via setRendererRef()
 */
let rendererRef: CliRenderer | null = null

/**
 * Set the renderer reference during app initialization
 * Should be called once in the root component's onMount
 */
export function setRendererRef(renderer: CliRenderer): void {
  rendererRef = renderer
}

/**
 * Get the renderer reference
 * Returns null if not initialized
 */
export function getRendererRef(): CliRenderer | null {
  return rendererRef
}

export function reloadApp() {
  //TODO: Implement reload logic, e.g., re-read config files, reset state, etc.
  //DO NOT Implement this, i will do it later
}

/**
 * Exit the application gracefully
 * Cleans up terminal state before exiting
 */
export function exitApp(): void {
  if (rendererRef) {
    rendererRef.destroy()
  }
  process.exit(0)
}
