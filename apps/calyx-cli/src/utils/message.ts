// import { getFlowBuilder } from '@/services/useFlow'
// import logger from '@/utils/logger'
// import type { LanguageModelUsage } from 'ai'
// import type { AssistantMessage, Message, PendingMessage, Tool, UserMessage } from 'calyx-flow/types'
// import { isEmpty } from 'radash'
// import { createMemo, createSignal, type Accessor } from 'solid-js'
// import { runCommand, runCommandToolParamZod } from './shell'

// const systemPrompt = `

//   <Role>
//   你是calyx-cli，一个运行在本地终端的cli助手，可以调用工具或终端来帮助用户解决问题,严格遵循ReAct（推理-行动-观察）范式解决问题
//   </Role>

//   <Behaviour>
//   ## 核心规则
//   1. 必须通过<thought>→<action>→<observation>的迭代闭环处理问题，当任务完成或者无法继续进行，或者情况出现变化需要用户重新决策时输出<answer>；
//   2. <action>可以调用工具，格式在下方；
//   3. 每次仅输出一个<thought>+一个<action>（除非可直接输出<answer>），等待<observation>后再继续推理；
//   4. 若工具调用失败/返回无效信息，需在<thought>中复盘并调整策略。
//   5. <answer>的格式用户可以自定义，详细参考下文

//   #### 工具格式
//   根据系统提供的工具参数schema，填入到Action块中，示例:
//   <action>
//   "{
//     name: "writeToFile",
//     argument: { //schema示例的格式
//       fileName: "example.txt",
//       content: "hello world"
//     }
//   }"
//   </action>
//   ####

//   #### 上下文格式
//   在你进行回复时，不要携带上一轮的历史内容。如果携带了上一轮的内容
//   示例:

//   <question>我在什么目录下?</question>
//   <thought>
//   用户问我现在程序运行在什么目录下，我需要调用bash工具来查看
//   </thought>
//   <action>
//   {
//     tool: "bash",
//     arguments: "pwd"
//   }
//   </action>

//   <observation>
//   {
//     tool: "bash",
//     status: true,
//     error: null,
//     result: "D:/project/front/vue-template"
//   }
//   </observation>
//   <thought>
//   根据工具调用结果，用户位于D:/project/front/vue-template，看起来是一个vue模板项目，我应该进行总结
//   </thought>
//   <answer>
//   您当前位于D:/project/front/vue-template，这应该时一个vue模板项目
//   </answer>

//   #### 当前自定义Answer输出格式
//   当前<answer>格式为纯文本，没有复杂结构

//   ## 警告
//   ReAct xml标签必须出现在正文中！！！出现在思考内容中视为无效！！！
//   </Behaviour>
//   `
// const bashTool: Tool = {
//   name: 'bash',
//   description: 'bash command tool',
//   paramsSchema: JSON.stringify(runCommandToolParamZod.toJSONSchema({ target: 'draft-2020-12' })),
//   execute: runCommand,
// }

// const [messageHistory, setMessageHistory] = createSignal<Message[]>([])
// const [pending, setPending] = createSignal<boolean>(false)
// const [pendingMessages, setPendingMessages] = createSignal<PendingMessage[]>([])

// function convertPeningToNormal(messages: PendingMessage[]): AssistantMessage {
//   let content = ''
//   let reason = ''
//   let usage: LanguageModelUsage | null = null

//   const reasonMessages = messages.filter((item) => item.type === 'reason')
//   if (!isEmpty(reasonMessages)) {
//     reason += `${reasonMessages.map((item) => item.content).join('')}\n`
//   }

//   const thoughtMessages = messages.filter((item) => item.type === 'thought')
//   if (!isEmpty(thoughtMessages)) {
//     content += `${thoughtMessages.map((item) => item.content).join('')}\n`
//   }

//   const actionMessages = messages.filter((item) => item.type === 'action')
//   if (!isEmpty(actionMessages)) {
//     content += `Tool Excute: ${actionMessages.map((item) => item.content).join('')}\n`
//   }

//   const answerMessage = messages.filter((item) => item.type === 'answer')
//   if (!isEmpty(answerMessage)) {
//     content += `${answerMessage.map((item) => item.content).join('')}`
//   }

//   const usageMessage = messages.find((item) => item.type === 'usage')
//   if (usageMessage) {
//     usage = usageMessage.content
//   } else {
//     usage = null
//   }

//   return {
//     role: 'assistant',
//     wrapperContent: '',
//     displayContent: content,
//     reasonContent: reason,
//     usage,
//   }
// }

// type CombinedMessage = { streaming: boolean } & Message

// const combinedMessages: Accessor<CombinedMessage[]> = createMemo(() => {
//   const convertMessages = messageHistory().map((item) => ({ streaming: false, ...item }) as const)
//   if (!pending()) return convertMessages
//   const pendingMsg = convertPeningToNormal(pendingMessages())
//   return [...convertMessages, { streaming: true, ...pendingMsg }]
// })

// function appendMessageHistory(message: Message) {
//   setMessageHistory([...messageHistory(), message])
// }

// function updatePendingMessage(newMessage: PendingMessage) {
//   const msgs = pendingMessages()
//   setPendingMessages([...msgs, newMessage])
// }

// async function chat(prompt: string) {
//   if (isEmpty(prompt)) return
//   if (pending()) return
//   logger.info(`User input submitted: ${prompt}`)
//   setPending(true)
//   const userMessage: UserMessage = { role: 'user', displayContent: prompt, wrapperContent: '' }
//   appendMessageHistory(userMessage)

//   try {
//     const flowBuilder = await getFlowBuilder()
//     const flow = await flowBuilder.build({
//       providerId: 'deepseek',
//       modelId: 'deepseek-reasoner',
//       systemPrompt: systemPrompt,
//       tools: [bashTool],
//       history: messageHistory(),
//     })
//     logger.debug('Calling streamChat')
//     const stream = flow.run()
//     for await (const chunk of stream) {
//       updatePendingMessage(chunk)
//     }
//     const assistantMessage: Message = convertPeningToNormal(pendingMessages())
//     await stop(assistantMessage)
//   } catch (error) {
//     logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat error')
//     const exceptionMessage: Message = {
//       role: 'assistant',
//       reasonContent: '',
//       wrapperContent: '',
//       usage: null,
//       displayContent: `Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
//     }
//     await stop(exceptionMessage)
//   } finally {
//     setPending(false)
//     logger.info(`LLm stream completed`)
//   }
// }

// async function stop(assistantMessage: Message) {
//   if (!pending()) return
//   logger.info('User stop chat')
//   setPendingMessages([])
//   appendMessageHistory(assistantMessage)
// }

// export { chat, combinedMessages, messageHistory, pending, pendingMessages, stop }
