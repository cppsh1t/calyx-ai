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

**MANDATORY: Use `@/` path alias for all src imports**

- All internal imports MUST use `@/` alias pointing to `src/` directory
- Relative imports (e.g., `../`, `./`) are PROHIBITED for src files
- External packages and workspace dependencies use normal imports

```typescript
// ✅ CORRECT - Use @/ alias for src files
import { foo } from "@/utils/bar.ts";
import { MyComponent } from "@/components/Button.tsx";
import type { Config } from "@/types/config.ts";

// ✅ CORRECT - External packages
import { Command } from "commander";
import { render } from "@opentui/solid";

// ✅ CORRECT - Workspace dependencies
import { Agent } from "calyx-agent/...";

// ❌ WRONG - Relative imports
import { foo } from "../utils/bar.ts";
import { MyComponent } from "./components/Button.tsx";
```

**Configuration:**

- `tsconfig.json` has `baseUrl: "."` and `paths: { "@/*": ["./src/*"] }`
- Bun automatically recognizes these aliases at runtime
- TypeScript provides type checking via the paths config

**Other Rules:**

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

### Skill Discovery (MANDATORY)

**ALWAYS use `skill-lookup` before starting ANY task:**

1. **First Step**: Run `/skill-lookup` to discover available skills
2. **Match Requirements**: Find skills that match your task domain
3. **Load Relevant Skills**: Include ALL relevant skills via `load_skills=[]`
4. **Justify Omissions**: If a potentially relevant skill is omitted, explain why

**Workflow Pattern:**

```bash
# Before delegating any task
/skill-lookup  # Discover available skills

# Then use found skills in delegation
delegate_task(
  category="[appropriate-category]",
  load_skills=["skill-1", "skill-2"],  # From skill-lookup results
  prompt="..."
)
```

**Common Skills to Look For:**

- `playwright` - Browser automation, scraping, testing
- `frontend-ui-ux` - UI/UX design and implementation
- `git-master` - Git operations (commits, rebase, history)
- `dev-browser` - Browser automation with persistent state
- `opentui` - Terminal UI development
- `skill-creator` - Creating/updating skills
- `skill-lookup` - Finding skills (meta-skill)

**Why This Matters:**

- Skills inject domain expertise into agents
- Subagents are stateless - they only know what you tell them
- Missing relevant skills = suboptimal output
- Proper skill selection = 10x better results

### Sub-Project Skills

**IMPORTANT: Each sub-project has its own specialized skill.**

When working on a specific app or package, load its skill:

```bash
# Use skill-lookup to find sub-project skills
/skill-lookup

# Then load the relevant skill when working on that sub-project
```

**Available Sub-Project Skills:**

| Sub-Project            | Skill Name          | Use When                                        |
| ---------------------- | ------------------- | ----------------------------------------------- |
| `apps/calyx-cli`       | `calyx-cli`         | Working on CLI app structure, components, views |
| `packages/calyx-agent` | _(not yet created)_ | Working on agent package                        |

**Example:**

```
User task: "Add a new view to calyx-cli"
→ Load skill: calyx-cli
→ Follow the skill's directory structure guidelines
```

**Why Sub-Project Skills?**

- Each app/package has unique structure and conventions
- Skills provide detailed file placement guidelines
- Prevents mixing patterns across different projects
- Keeps root AGENTS.md focused on monorepo-level standards

### Development Guidelines

- Always use Bun, never npm/yarn/pnpm
- Respect Turborepo task dependencies (defined in turbo.json)
- Follow existing TypeScript strict patterns
- When adding new packages, use kebab-case names
- CLI apps use JSX with OpenTUI components (not React)
