/**
 * TUI view types for multi-view router system
 */

/**
 * Available views in the TUI application
 */
export type View = 'welcome' | 'chat' | 'error'

/**
 * Router state for navigating between views
 */
export type RouteState = {
  /** Current active view */
  currentView: View
  /** Navigate to a different view */
  navigate: (view: View) => void
  /** Set an error state (navigates to error view) */
  setError: (error: Error) => void
}

/**
 * Error state data structure
 */
export type ErrorState = {
  /** Error object if an error occurred */
  error: Error | null
  /** Human-readable error message */
  message: string
}
