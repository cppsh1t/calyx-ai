import { type UserModelMessage } from 'calyx-flow/ai'

type CalyxApplication = {
  run(prompt: UserModelMessage): Promise<void>
}