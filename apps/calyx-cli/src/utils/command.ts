import { TestDialog } from '@/components/dialog/TestDialog.tsx'
import { showDialog } from '@/utils/dialog.tsx'

export interface CommandGroup {
  name: string
  commands: Command[]
}

export interface Command {
  id: string
  name: string
  description?: string
  group?: string // Add group reference for flattened view
  handler?: () => void | Promise<void>
}

export const commandGroups: CommandGroup[] = [
  {
    name: 'Navigation',
    commands: [
      {
        id: 'nav-chat',
        name: 'Open Chat',
        description: 'Navigate to chat view',
        group: 'Navigation',
      },
      {
        id: 'nav-welcome',
        name: 'Back to Welcome',
        description: 'Return to welcome screen',
        group: 'Navigation',
      },
    ],
  },
  {
    name: 'Test',
    commands: [
      {
        id: 'test-command',
        name: 'Test Command',
        description: 'A command for testing purposes',
        group: 'Test',
        handler: () => {
          showDialog(
            TestDialog,
            (result) => console.log('Confirmed with:', result),
            () => console.log('Cancelled')
          )
        },
      },
    ],
  },
  {
    name: 'Actions',
    commands: [
      {
        id: 'action-clear',
        name: 'Clear Screen',
        description: 'Clear terminal output',
        group: 'Actions',
      },
      {
        id: 'action-exit',
        name: 'Exit',
        description: 'Quit application',
        group: 'Actions',
      },
    ],
  },
  {
    name: 'Configuration',
    commands: [
      {
        id: 'config-open',
        name: 'Open Config',
        description: 'Open configuration panel',
        group: 'Configuration',
      },
      {
        id: 'config-reload',
        name: 'Reload Config',
        description: 'Reload configuration file',
        group: 'Configuration',
      },
    ],
  },
  {
    name: 'Help',
    commands: [
      {
        id: 'help-shortcuts',
        name: 'Keyboard Shortcuts',
        description: 'Show keyboard shortcuts',
        group: 'Help',
      },
      {
        id: 'help-about',
        name: 'About',
        description: 'Show application information',
        group: 'Help',
      },
    ],
  },
]

// Flattened commands for select component
export const flatCommands: Command[] = commandGroups.flatMap((group) =>
  group.commands.map((cmd) => ({
    ...cmd,
    group: group.name,
  }))
)
