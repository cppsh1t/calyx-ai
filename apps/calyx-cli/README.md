# Calyx CLI

AI-driven command-line interaction tool.

## Features

- 🚀 Interactive chat interface with AI agents
- ⚙️ Configuration management for model settings
- 📦 Project-level and user-level configuration support
- 🔧 Easy initialization with `calyx init`

## Installation

```bash
bun install -g calyx-cli
```

The CLI will automatically create a user-level configuration file at `~/.calyx/config.json` on first run (skipped in CI environments).

## Quick Start

### Initialize Project Configuration

Create a new project configuration:

```bash
calyx init
```

This creates `.calyx/config.json` in your project directory with an empty configuration object.

### Copy User Configuration

If you have existing user configuration, you can copy it to your project:

```bash
calyx init --copy
# or
calyx init -c
```

### Configuration Locations

- **User-level**: `~/.calyx/config.json`
  - Created automatically on first run
  - Shared across all projects
  - Used as template for `--copy` option

- **Project-level**: `./.calyx/config.json`
  - Created with `calyx init`
  - Project-specific configuration
  - Overrides user-level settings

## Configuration File Format

The `config.json` file uses JSON format:

```json
{
  "configVersion": "0.1",
  "models": {
    "gpt-4": "your-api-endpoint",
    "claude": "another-endpoint"
  }
}
```

## Error Handling

The init command will:

- ✅ Create empty config if none exists
- ❌ Exit with error if config already exists (won't overwrite)
- 📋 Display helpful error messages for common issues

## Development

```bash
# Development mode
bun run dev

# Run tests
bun test

# Type checking
bun run check

# Build
bun run build
```

### Local Testing Installation Scripts

For quick local testing during development, use the provided installation scripts in the `apps/calyx-cli` directory:

**Windows (PowerShell):**

```powershell
cd apps/calyx-cli
.\install-local.ps1
```

**macOS/Linux:**

```bash
cd apps/calyx-cli
./install-local.sh
```

These scripts automate the following workflow:

1. Remove existing `.tgz` packages
2. Uninstall global `calyx-cli`
3. Build the project
4. Pack into `.tgz` file
5. Install globally from the local package

This allows for rapid iteration and testing of changes without publishing to npm.

## Project Structure

```
apps/calyx-cli/
├── src/
│   ├── index.tsx          # Entry point
│   ├── utils/
│   │   ├── cli.ts         # Commander.js CLI setup
│   │   └── config.ts      # Configuration management
│   ├── types/
│   │   └── cli.ts         # TypeScript types
│   ├── views/
│   │   └── tui.tsx        # TUI components
│   └── test/
│       ├── cli.test.ts    # CLI tests
│       ├── config.test.ts # Config tests
│       └── init.test.ts   # Init command tests
└── package.json
```
