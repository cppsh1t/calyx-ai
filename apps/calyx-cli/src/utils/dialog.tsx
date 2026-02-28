import { handleKeyboardEvent, KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import { useKeyboard } from '@opentui/solid'
import { createContext, For, useContext, type JSX, type ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'

export interface DialogContentProps<T = unknown> {
  /** Confirm event - called internally by component, passes result data */
  confirm: (result: T) => void
  /** Cancel event - called internally by component */
  cancel: () => void
}

export type DialogComponent<T = unknown> = (props: DialogContentProps<T>) => JSX.Element

type DialogState = {
  id: string
  component: DialogComponent<unknown>
  onConfirm: (result: unknown) => void
  onCancel: () => void
}

type DialogContextValue = {
  isOpen: () => boolean
  currentDialog: () => DialogState | undefined
  dialogStack: () => readonly DialogState[]
  /** Get the keybind priority for the current dialog layer (ACTION + layerIndex) */
  getKeyBindPriority: () => number
  internalConfirm: (result: unknown) => void
  internalCancel: () => void
}

const DialogContext = createContext<DialogContextValue>()

// Global setters for pushDialog (used by showDialog)
let pushDialogGlobal: ((state: DialogState) => void) | null = null

// Counter for generating unique dialog IDs
let dialogIdCounter = 0

export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}

export const DialogProvider: ParentComponent = (props) => {
  // Initialize global keyboard listener (only once at app root)
  useKeyboard(handleKeyboardEvent)

  const [dialogStack, setDialogStack] = createStore<DialogState[]>([])

  const isOpen = () => dialogStack.length > 0

  const currentDialog = () => {
    const stack = dialogStack
    return stack.length > 0 ? stack[stack.length - 1] : undefined
  }

  /**
   * Push a new dialog onto the stack
   */
  const pushDialog = (state: DialogState): void => {
    setDialogStack(dialogStack.length, state)
  }

  /**
   * Pop the top dialog from the stack and call its cancel callback
   */
  const popDialog = (): void => {
    const stack = dialogStack
    if (stack.length === 0) return
    const topDialog = stack[stack.length - 1]
    if (topDialog) {
      topDialog.onCancel()
    }
    setDialogStack((stack) => stack.slice(0, -1))
  }

  /**
   * Close the top dialog (alias for internal cancel behavior without callback)
   */
  const closeTopDialog = (): void => {
    const stack = dialogStack
    if (stack.length === 0) return
    setDialogStack((stack) => stack.slice(0, -1))
  }

  const internalConfirm = (result: unknown): void => {
    const stack = dialogStack
    if (stack.length === 0) return
    const topDialog = stack[stack.length - 1]
    if (topDialog) {
      topDialog.onConfirm(result)
    }
    setDialogStack((stack) => stack.slice(0, -1))
  }

  const internalCancel = (): void => {
    popDialog()
  }

  // Expose pushDialog globally for showDialog function
  pushDialogGlobal = pushDialog

  /**
   * Get the keybind priority for the current dialog layer.
   * Each layer gets ACTION + layerIndex, so top layer has highest priority.
   */
  const getKeyBindPriority = (): number => {
    return KeyBindPriorityEnum.ACTION + dialogStack.length
  }

  const contextValue: DialogContextValue = {
    isOpen,
    currentDialog,
    dialogStack: () => dialogStack,
    getKeyBindPriority,
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
  const { dialogStack, internalCancel, getKeyBindPriority } = useDialog()

  // ESC to cancel (default behavior, component can handle ESC itself)
  useKeyBind(getKeyBindPriority(), (event) => {
    if (event.name === 'escape' && dialogStack().length > 0) {
      internalCancel()
      return { continue: false }
    }
    return { continue: true }
  })

  return <For each={dialogStack()}>{(dialog, index) => <DialogOverlay dialog={dialog} index={index()} />}</For>
}

function DialogOverlay(props: { dialog: DialogState; index: number }): JSX.Element {
  const { internalConfirm, internalCancel } = useDialog()

  return (
    // Overlay layer - full screen centered
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      backgroundColor="#1a1a1a54"
      zIndex={100 + props.index}
    >
      {/* Render component - component handles content and buttons itself */}
      {props.dialog.component({
        confirm: (result: unknown) => internalConfirm(result),
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
  if (!pushDialogGlobal) {
    throw new Error('showDialog requires DialogProvider')
  }

  pushDialogGlobal({
    id: `dialog-${dialogIdCounter++}`,
    component: component as DialogComponent<unknown>,
    onConfirm: onConfirm as (result: unknown) => void,
    onCancel,
  })
}
