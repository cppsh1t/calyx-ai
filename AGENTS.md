# AGENTS.md - Calyx AI Repository Guide

## Build, Lint, Test Commands

### Root-level (Turborepo)

```bash
# Build all packages and apps
bun run build

# Development mode (watch)
bun run dev

# Lint all workspaces
bun run lint

# Format code with Prettier
bun run format

# Type check all workspaces
bun run check-types
```

### Running Single Package Commands

```bash
# Build specific package/app
bun run build --filter=calyx-cli
bun run build --filter=calyx-agent

# Dev mode for specific app
bun run dev --filter=calyx-cli

# Type check specific package
bun run check-types --filter=calyx-agent
```

### Package-Level (Individual)

```bash
# CLI app
bun run --filter=calyx-cli dev      # Watch mode

# Agent package
# No scripts defined yet - add as needed
```

### Testing (No infrastructure yet)

```bash
# To add testing:
# 1. Install test framework: bun add -d bun:test
# 2. Run single test: bun test path/to/test.ts
# 3. Run all tests: bun test
```

---

## Code Style Guidelines

### Package Manager & Runtime

- **Use Bun**: `bun` for all package operations and runtime
- Node version: `>=18`
- Package manager: `bun@1.3.6` (enforced in package.json)

### TypeScript Configuration

- **Strict mode**: Always enabled (`strict: true`)
- **Target**: ESNext with modern features
- **Module**: `Preserve` with `bundler` resolution
- **JSX**:
  - CLI apps: `preserve` with `@opentui/solid` import source
  - Libraries: `react-jsx` (standard)

### Import Style

- Use TypeScript extension imports: `import { x } from "./file.ts"`
- Verbatim module syntax enabled (imports preserved as-is)
- Prefer named exports over default exports

### Formatting (Prettier)

```bash
# Format all files
bun run format
```

- Runs on: `**/*.{ts,tsx,md}`
- No custom config found - using Prettier defaults

### TypeScript Strict Flags

```json
{
  "strict": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "skipLibCheck": true
}
```

### Naming Conventions

- **Classes**: PascalCase (`CalyxAgent`)
- **Types/Interfaces**: PascalCase (`AgentMessage`, `AgentTool`)
- **Functions**: camelCase (`addTool`, `execute`)
- **Variables**: camelCase
- **Files**: kebab-case for multi-word (`calyx-cli`, `calyx-agent`)

### Error Handling

- Use strict null checks (`noUncheckedIndexedAccess: true`)
- Always check array bounds before accessing (`messages[messages.length - 1]`)
- Handle async errors with try/catch
- Return empty string or safe defaults for missing data

### Monorepo Structure

```
apps/           # Applications (runnable)
  calyx-cli/    # TUI CLI app using OpenTUI + SolidJS
packages/       # Shared libraries
  calyx-agent/  # Core agent functionality
```

### Key Technologies

- **TUI Framework**: OpenTUI (`@opentui/core`, `@opentui/solid`)
- **Reactivity**: SolidJS (v1.9.9)
- **Build**: Turborepo with task pipelining
- **Transpilation**: Babel with TypeScript preset

### Code Patterns

- Use explicit return types on public methods
- Prefer `const` and `let` over `var`
- Use template literals for string interpolation
- Leverage TypeScript's strict mode for safety

### Workspace Dependencies

```bash
# Install in root (shared dev deps)
bun add -d <package>

# Install in specific workspace
bun add --filter=calyx-cli <package>
```

### Git & Commits

- `.gitignore` excludes: `node_modules`, `.turbo`, `dist`, `build`, `.env*`
- Use `.npmrc` for registry configuration (currently empty)

---

## Quick Reference

| Task         | Command                         |
| ------------ | ------------------------------- |
| Install deps | `bun install`                   |
| Build all    | `bun run build`                 |
| Build one    | `bun run build --filter=<name>` |
| Format       | `bun run format`                |
| Type check   | `bun run check-types`           |
| Dev mode     | `bun run dev --filter=<name>`   |

## Notes for Agents

- Always use Bun, never npm/yarn/pnpm
- Respect Turborepo task dependencies (defined in turbo.json)
- Follow existing TypeScript strict patterns
- When adding new packages, use kebab-case names
- CLI apps use JSX with OpenTUI components (not React)
