import CommandPalette from '@/components/CommandPalette'
import type { CliConfigParsed } from '@/types/cli.ts'
import type { ErrorState, View } from '@/types/views.ts'
import { setRendererRef } from '@/utils/application'
import { DialogProvider } from '@/utils/dialog.tsx'
import { ChatView } from '@/views/chat.tsx'
import { ErrorView } from '@/views/error.tsx'
import { WelcomeView } from '@/views/welcome.tsx'
import { useRenderer } from '@opentui/solid'
import type { Accessor, JSX } from 'solid-js'
import { createContext, createSignal, Match, onMount, Switch, useContext } from 'solid-js'
import { createStore } from 'solid-js/store'

/**
 * Router context type
 */
type RouterContextValue = {
  /** Accessor for current view state */
  currentView: Accessor<View>
  /** Navigate to a different view */
  navigate: (view: View) => void
  /** Set an error state (navigates to error view) */
  setError: (error: Error) => void
  /** Shared state object */
  state: ErrorState & { config: CliConfigParsed }
}

/**
 * Router context for sharing navigation state across components
 */
const RouterContext = createContext<RouterContextValue>()

/**
 * Router component for managing multi-view TUI navigation
 *
 * Provides:
 * - View state management with createSignal
 * - Shared state (error, config) with createStore
 * - Navigation via navigate() and setError()
 * - Context provider for child components
 *
 * @param config - Parsed CLI configuration
 */
export function Router(props: { config: CliConfigParsed }): JSX.Element {
  const renderer = useRenderer()

  // Set global renderer reference for application-wide access (e.g., exitApp)
  onMount(() => {
    setRendererRef(renderer)
  })

  // View state managed with signal (simple value, changes frequently)
  const [currentView, setCurrentView] = createSignal<View>('welcome')

  // Shared state managed with store (complex nested state)
  const [state, setState] = createStore<ErrorState & { config: CliConfigParsed }>({
    error: null,
    message: '',
    config: props.config,
  })

  /**
   * Navigate to a specific view
   */
  const navigate = (view: View): void => {
    setCurrentView(view)
  }

  /**
   * Set error state and navigate to error view
   */
  const setError = (error: Error): void => {
    setState({ error, message: error.message })
    setCurrentView('error')
  }

  // Context value for child components
  const routerValue: RouterContextValue = {
    currentView,
    navigate,
    setError,
    state,
  }

  return (
    <DialogProvider>
      <box flexDirection="column" flexGrow={1} padding={1}>
        <RouterContext.Provider value={routerValue}>
          <Switch>
            <Match when={currentView() === 'welcome'}>
              <WelcomeView />
            </Match>
            <Match when={currentView() === 'chat'}>
              <ChatView />
            </Match>
            <Match when={currentView() === 'error'}>
              <ErrorView error={state.error} message={state.message} />
            </Match>
          </Switch>
        </RouterContext.Provider>
        <CommandPalette />
      </box>
    </DialogProvider>
  )
}

/**
 * Hook to access router context from child components
 *
 * @throws Error if used outside of Router provider
 * @returns Router context value with navigation functions and state
 */
export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within a Router component')
  }
  return context
}

export default Router
