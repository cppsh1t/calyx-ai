import APIKeyInput from '@/components/dialog/APIKeyInput'
import ProviderConnector from '@/components/dialog/ProviderConnector'
import { showDialog } from '@/utils/dialog.tsx'
import { exitApp, reloadApp } from './application'

export type CommandGroup = {
  name: string
  commands: CommandRaw[]
}

export type Command = {
  id: string
  name: string
  description?: string
  group?: string // Add group reference for flattened view
  handler?: () => void | Promise<void>
}

export type CommandRaw = Omit<Command, 'group'>

const isDev = process.env.NODE_ENV !== 'production'

const normalCommandsGroup: CommandGroup[] = [
  {
    name: 'Application',
    commands: [
      {
        id: 'app-reload',
        name: 'Reload App',
        description: 'Reload application configuration',
        handler: reloadApp,
      },
      {
        id: 'app-exit',
        name: 'Exit App',
        description: 'Exit the application',
        handler: exitApp,
      },
    ],
  },
  {
    name: 'Model',
    commands: [
      {
        id: 'connect-provider',
        name: 'Connect Model Provider',
        description: 'Connect to a model provider (e.g., OpenAI, Azure)',
        handler: () => {
          showDialog(
            ProviderConnector,
            (result) => {
              // result is now { provider: string; apiKey: string }
              console.log(`Connected to ${result.provider}`)
            },
            () => console.log('Cancelled')
          )
        },
      },
    ],
  },
]

const devCommandsGroup: CommandGroup[] = [
  {
    name: 'Test',
    commands: [
      {
        id: 'test-command',
        name: 'Test Command',
        description: 'A command for testing purposes',
        handler: () => {
          showDialog(
            APIKeyInput,
            (result) => console.log('Confirmed with:', result),
            () => console.log('Cancelled')
          )
        },
      },
    ],
  },
]
const commandGroups = isDev ? [...normalCommandsGroup, ...devCommandsGroup] : normalCommandsGroup

// Flattened commands for select component
export const flatCommands: Command[] = commandGroups.flatMap((group) =>
  group.commands.map((cmd) => ({
    ...cmd,
    group: group.name,
  }))
)
