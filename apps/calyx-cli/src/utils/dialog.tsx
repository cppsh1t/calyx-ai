import { KeyBindPriorityEnum, useKeyBind } from '@/utils/keybind'
import { Show, createContext, createSignal, useContext, type JSX, type ParentComponent } from 'solid-js'

/**
 * DialogContentProps - 组件接收的 props
 *
 * 组件规范：
 * - 组件负责渲染自己的内容和按钮
 * - 组件决定何时调用 confirm/cancel
 * - 组件可以自定义按钮数量、文字、样式
 */
export interface DialogContentProps<T = unknown> {
  /** 确认事件 - 组件内部调用，传递结果数据 */
  confirm: (result: T) => void
  /** 取消事件 - 组件内部调用 */
  cancel: () => void
}

/**
 * Dialog 组件类型
 */
export type DialogComponent<T = unknown> = (props: DialogContentProps<T>) => JSX.Element

/**
 * 内部状态
 */
type DialogState = {
  component: DialogComponent<unknown>
  onConfirm: (result: unknown) => void
  onCancel: () => void
} | null

/**
 * Context 类型
 */
type DialogContextValue = {
  isOpen: () => boolean
  currentState: () => DialogState
  internalConfirm: (result: unknown) => void
  internalCancel: () => void
}

const DialogContext = createContext<DialogContextValue>()

// 全局状态设置器
let setDialogStateGlobal: ((state: DialogState) => void) | null = null

/**
 * 访问 dialog context
 */
export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider')
  }
  return context
}

/**
 * DialogProvider - 包裹应用以启用 dialog 功能
 */
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

/**
 * 内部容器 - 只提供遮罩层和居中
 */
function DialogContainer(): JSX.Element {
  const { isOpen, internalCancel } = useDialog()

  // ESC 取消（默认行为，组件可以自行处理 ESC）
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

/**
 * 遮罩层 - 只负责居中显示，不干预组件内容
 */
function DialogOverlay(): JSX.Element {
  const { currentState, internalConfirm, internalCancel } = useDialog()
  const state = currentState()

  if (!state) return null

  return (
    // 遮罩层 - 全屏居中
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
      backgroundColor="1a1a1a54"
      zIndex={100}
    >
      {/* 渲染组件 - 组件自己处理内容和按钮 */}
      {state.component({
        confirm: (result) => internalConfirm(result),
        cancel: () => internalCancel(),
      })}
    </box>
  )
}

/**
 * 显示弹窗
 *
 * @param component - 弹窗组件，负责渲染内容和按钮，调用 confirm/cancel
 * @param onConfirm - 确认回调
 * @param onCancel - 取消回调
 *
 * @example
 * ```tsx
 * // 定义一个确认弹窗
 * function ConfirmDialog({ confirm, cancel }: DialogContentProps<boolean>) {
 *   return (
 *     <box width={40} border padding={1} backgroundColor="#1a1a1a">
 *       <text>确定删除吗？</text>
 *       <box flexDirection="row" gap={2}>
 *         <box onMouseDown={() => confirm(true)}><text fg="green">[是]</text></box>
 *         <box onMouseDown={() => cancel()}><text fg="red">[否]</text></box>
 *       </box>
 *     </box>
 *   )
 * }
 *
 * // 使用
 * showDialog(ConfirmDialog,
 *   (result) => { if (result) deleteItem() },
 *   () => console.log('cancelled')
 * )
 * ```
 *
 * @example
 * ```tsx
 * // 定义一个输入弹窗（自定义按钮文字）
 * function InputDialog({ confirm, cancel }: DialogContentProps<string>) {
 *   const [value, setValue] = createSignal('')
 *   return (
 *     <box width={50} border padding={1} backgroundColor="#1a1a1a">
 *       <text>输入名称：</text>
 *       <input value={value()} onInput={setValue} focused />
 *       <box flexDirection="row" gap={2}>
 *         <box onMouseDown={() => confirm(value())}><text>[确定]</text></box>
 *         <box onMouseDown={() => cancel()}><text>[取消]</text></box>
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
