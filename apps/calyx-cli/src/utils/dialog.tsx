import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import { Show, createContext, createSignal, useContext, type JSX, type ParentComponent } from 'solid-js'

export interface DialogContentProps<T = unknown> {
  /** Confirm event - called internally by component, passes result data */
  confirm: (result: T) => void
  /** Cancel event - called internally by component */
  cancel: () => void
}

export type DialogComponent<T = unknown> = (props: DialogContentProps<T>) => JSX.Element

type DialogState = {
  component: DialogComponent<unknown>
  onConfirm: (result: unknown) => void
  onCancel: () => void
} | null

type DialogContextValue = {
  isOpen: () => boolean
  currentState: () => DialogState
  internalConfirm: (result: unknown) => void
  internalCancel: () => void
}

const DialogContext = createContext<DialogContextValue>()

let setDialogStateGlobal: ((state: DialogState) => void) | null = null

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}

export const DialogProvider: ParentComponent = (props) => {
  const [currentState, setCurrentState] = createSignal<DialogState>(null)

  const isOpen = () => currentState() !== null

  const internalConfirm = (result: unknown): void => {
    const state = currentState()
    if (state) {
      state.onConfirm(result)
    }
    setCurrentState(null)
  }

  const internalCancel = (): void => {
    const state = currentState()
    if (state) {
      state.onCancel()
    }
    setCurrentState(null)
  }

  setDialogStateGlobal = setCurrentState

  const contextValue: DialogContextValue = {
    isOpen,
    currentState,
    internalConfirm,
    internalCancel,
  }

  return (
    <DialogContext.Provider value={contextValue}>
      {props.children}
      <DialogContainer />
    </DialogContext.Provider>
  )
}

function DialogContainer(): JSX.Element {
  const { isOpen, internalCancel } = useDialog()

  // ESC to cancel (default behavior, component can handle ESC itself)
  useKeyBind(KeyBindPriorityEnum.ACTION, (event) => {
    if (event.name === 'escape' && isOpen()) {
      internalCancel()
      return { continue: false }
    }
    return { continue: true }
  })

  return (
    <Show when={isOpen()}>
      <DialogOverlay />
    </Show>
  )
}

function DialogOverlay(): JSX.Element {
  const { currentState, internalConfirm, internalCancel } = useDialog()
  const state = currentState()

  if (!state) return null

  return (
    // Overlay layer - full screen centered
    <box position="absolute" left={0} top={0} width="100%" height="100%" justifyContent="center" alignItems="center" backgroundColor="1a1a1a54" zIndex={100}>
      {/* Render component - component handles content and buttons itself */}
      {state.component({
        confirm: (result) => internalConfirm(result),
        cancel: () => internalCancel(),
      })}
    </box>
  )
}

/**
 * Show dialog
 *
 * @param component - Dialog component, responsible for rendering content and buttons, calls confirm/cancel
 * @param onConfirm - Confirm callback
 * @param onCancel - Cancel callback
 *
 * @example
 * ```tsx
 * // Define a confirm dialog
 * function ConfirmDialog({ confirm, cancel }: DialogContentProps<boolean>) {
 *   return (
 *     <box width={40} border padding={1} backgroundColor="#1a1a1a">
 *       <text>Are you sure you want to delete?</text>
 *       <box flexDirection="row" gap={2}>
 *         <box onMouseDown={() => confirm(true)}><text fg="green">[Yes]</text></box>
 *         <box onMouseDown={() => cancel()}><text fg="red">[No]</text></box>
 *       </box>
 *     </box>
 *   )
 * }
 *
 * // Usage
 * showDialog(ConfirmDialog,
 *   (result) => { if (result) deleteItem() },
 *   () => console.log('cancelled')
 * )
 * ```
 *
 * @example
 * ```tsx
 * // Define an input dialog (custom button text)
 * function InputDialog({ confirm, cancel }: DialogContentProps<string>) {
 *   const [value, setValue] = createSignal('')
 *   return (
 *     <box width={50} border padding={1} backgroundColor="#1a1a1a">
 *       <text>Enter name:</text>
 *       <input value={value()} onInput={setValue} focused />
 *       <box flexDirection="row" gap={2}>
 *         <box onMouseDown={() => confirm(value())}><text>[OK]</text></box>
 *         <box onMouseDown={() => cancel()}><text>[Cancel]</text></box>
 *       </box>
 *     </box>
 *   )
 * }
 * ```
 */
export function showDialog<T>(component: DialogComponent<T>, onConfirm: (result: T) => void, onCancel: () => void): void {
  if (!setDialogStateGlobal) {
    throw new Error('showDialog requires DialogProvider')
  }

  setDialogStateGlobal({
    component: component as DialogComponent<unknown>,
    onConfirm: onConfirm as (result: unknown) => void,
    onCancel,
  })
}
