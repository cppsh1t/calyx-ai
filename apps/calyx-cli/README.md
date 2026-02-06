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

The CLI will automatically create a user-level configuration file at `~/.calyx/models.json` on first run (skipped in CI environments).

## Quick Start

### Initialize Project Configuration

Create a new project configuration:

```bash
calyx init
```

This creates `.calyx/models.json` in your project directory with an empty configuration object.

### Copy User Configuration

If you have existing user configuration, you can copy it to your project:

```bash
calyx init --copy
# or
calyx init -c
```

### Configuration Locations

- **User-level**: `~/.calyx/models.json`
  - Created automatically on first run
  - Shared across all projects
  - Used as template for `--copy` option

- **Project-level**: `./.calyx/models.json`
  - Created with `calyx init`
  - Project-specific configuration
  - Overrides user-level settings

## Configuration File Format

The `models.json` file uses JSON format:

```json
{
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
├── scripts/
│   └── init-user-config.ts  # Postinstall script
└── package.json
```

## License

MIT
