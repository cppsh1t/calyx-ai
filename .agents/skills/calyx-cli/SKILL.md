---
name: calyx-cli
description: Calyx CLI project structure and development guidelines. Use this skill when: (1) Working on calyx-cli app in apps/calyx-cli/, (2) Creating or modifying CLI components, views, or utilities, (3) Understanding the calyx-cli directory structure and file placement, (4) Following calyx-cli code style and conventions, or any task involving "calyx-cli structure", "calyx-cli directory", "CLI components", "TUI views", "CLI 开发"
---

# Calyx CLI Project Guide

## Directory Structure

```
apps/calyx-cli/
└── src/
    ├── assets/       # Static assets (images, fonts, configs)
    ├── components/   # Reusable SolidJS UI components
    ├── views/        # TUI views/screens
    ├── store/        # State management (SolidJS stores)
    ├── test/         # Test files
    ├── types/        # TypeScript type definitions
    ├── utils/        # Utility functions
    └── index.tsx     # Entry point
```

## File Placement Guidelines

### `/assets/` - Static Assets

**Purpose**: Static files used by the application

**File types**:

- Images: `*.png`, `*.svg`, `*.jpg`
- Fonts: `*.ttf`, `*.woff`, `*.woff2`
- Configuration files: `*.json`, `*.yaml`
- Any other static resources

**Example structure**:

```
assets/
├── icons/
│   └── logo.svg
└── config/
    └── default-config.json
```

---

### `/components/` - Reusable UI Components

**Purpose**: Reusable SolidJS components for the TUI

**File types**:

- SolidJS components: `*.tsx`
- Component styles: `*.css` (if needed)

**Naming**: PascalCase files for components

**Example**:

```
components/
├── Button.tsx
├── Input.tsx
└── Modal.tsx
```

**Import pattern**:

```typescript
// In other files
import { Button } from "@/components/Button";
```

---

### `/views/` - TUI Views/Screens

**Purpose**: Main screens and views for the CLI application

**File types**:

- SolidJS view components: `*.tsx`
- Screen-specific logic

**Naming**: PascalCase files for views

**Example**:

```
views/
├── HomeView.tsx
├── SettingsView.tsx
└── tui.tsx       # Main TUI renderer
```

**Import pattern**:

```typescript
// In other files
import { HomeView } from "@/views/HomeView";
```

---

### `/store/` - State Management

**Purpose**: SolidJS stores for global/reactive state

**File types**:

- Store definitions: `*.ts`, `*.tsx`

**Naming**: camelCase files with `-store` suffix

**Example**:

```
store/
├── cli-store.ts
├── config-store.ts
└── ui-store.ts
```

**Import pattern**:

```typescript
// In other files
import { useCliStore } from "@/store/cli-store";
```

---

### `/test/` - Test Files

**Purpose**: Unit and integration tests

**File types**:

- Test files: `*.test.ts`, `*.test.tsx`
- Test utilities: `*.ts`

**Naming**: Match the file being tested with `.test.` suffix

**Example**:

```
test/
├── cli.test.ts
├── utils.test.ts
└── setup.ts
```

**Running tests**:

```bash
# From project root
bun run --filter=calyx-cli test

# From calyx-cli directory
bun test
```

---

### `/types/` - Type Definitions

**Purpose**: TypeScript types and interfaces

**File types**:

- Type definitions: `*.ts`

**Naming**: camelCase files

**Example**:

```
types/
├── cli.ts
├── config.ts
└── index.ts      # Re-exports common types
```

**Import pattern**:

```typescript
// In other files
import type { CliConfig } from "@/types/config";
import { CliCommand } from "@/types/cli";
```

---

### `/utils/` - Utility Functions

**Purpose**: Helper functions and utilities

**File types**:

- Utility modules: `*.ts`

**Naming**: camelCase files

**Example**:

```
utils/
├── cli.ts        # CLI-related helpers
├── format.ts     # Formatting utilities
└── validate.ts   # Validation functions
```

**Import pattern**:

```typescript
// In other files
import { formatOutput } from "@/utils/format";
```

---

### Root Files

#### `index.tsx` - Entry Point

**Purpose**: Main entry point for the CLI application

**Responsibilities**:

- Parse CLI arguments (using Commander)
- Initialize the TUI renderer
- Handle application lifecycle

---

## Code Style Guidelines

### Import Style

**MANDATORY: Use `@/` path alias for all src imports**

```typescript
// ✅ CORRECT
import { MyComponent } from "@/components/MyComponent";
import { myUtil } from "@/utils/cli";
import type { MyType } from "@/types/config";

// ❌ WRONG - Relative imports
import { MyComponent } from "../components/MyComponent";
```

### TypeScript Configuration

- **Strict mode**: Enabled
- **JSX**: `preserve` with `@opentui/solid` import source
- **Module**: ESNext with bundler resolution

### Naming Conventions

- **Components**: PascalCase (`Button`, `Modal`)
- **Types/Interfaces**: PascalCase (`CliConfig`, `ViewState`)
- **Functions**: camelCase (`formatOutput`, `validateInput`)
- **Files**: kebab-case for multi-word names

---

## Development Commands

```bash
# Development mode (watch)
bun run --filter=calyx-cli dev

# Build
bun run --filter=calyx-cli build

# Type check
bun run --filter=calyx-cli check

# Run tests
bun run --filter=calyx-cli test

# Run the built CLI
bun run dist/index.js
```

---

## Dependencies

### Core Dependencies

- **@opentui/core**: TUI framework core
- **@opentui/solid**: SolidJS integration for OpenTUI
- **solid-js**: Reactive framework (v1.9.9)
- **commander**: CLI argument parsing (v14.0.3)

### Adding New Dependencies

```bash
# From project root
bun add --filter=calyx-cli <package>

# Development dependency
bun add --filter=calyx-cli -d <package>
```

---

## Build Output

After building, the output will be in `dist/`:

```
dist/
└── index.js      # Executable CLI entry point
```

The `bin` field in `package.json` points to this file, making it executable as `calyx` when installed globally.

---

## Related Skills

For building the CLI and TUI components, combine with:

- **commander-js** - CLI command framework and argument parsing
- **opentui** - TUI component library and rendering
- **solid-js** - Reactive state management

Use `/skill-lookup` to discover and load these skills when needed.
