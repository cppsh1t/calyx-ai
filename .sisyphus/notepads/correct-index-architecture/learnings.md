# Notepad: correct-index-architecture

## [2026-02-05] Finally Got It Right! - CLI Args Through index.tsx

### The Correct Architecture (After Multiple Failed Attempts)

**User's True Requirement** (stated many times!):

> "我要的是在index.tsx中启动渲染，使用tui.tsx中的元素，命令行的参数从@apps\calyx-cli\src\cli.ts 中获取！不要使用默认参数！"

**Translation**:

- Use index.tsx as the entry point
- Import cli.ts to parse command-line arguments
- Pass the parsed arguments (NOT defaults) to tui.tsx's renderTUI
- Display the REAL command-line arguments in the UI

---

## Final Implementation

### 1. index.tsx (The Entry Point)

```typescript
import "./cli.ts";
```

**Why This Works**:

- Importing cli.ts triggers its execution
- cli.ts calls `program.parse()` to parse command-line args
- commander.js triggers the action callback
- The action creates a REAL CLIConfig from parsed args
- The action calls `renderTUI(config)` with the real config

### 2. package.json

```json
{
  "module": "src/index.tsx" // Changed from "src/cli.ts"
}
```

### 3. cli.ts (Already Correct - No Changes Needed!)

```typescript
program
  .command("chat [prompt]")
  .option("-s, --session <id>", "Resume session")
  .action(async (prompt, options) => {
    const globalOpts = program.opts<GlobalOptions>(); // REAL args from CLI

    // Validate
    validateModel(globalOpts.model);
    validateAgent(globalOpts.agent);

    const config: CLIConfig = {
      ...globalOpts, // SPREADS THE REAL COMMAND-LINE ARGS
      temperature: parseTemperature(globalOpts.temperature.toString()),
      command: "chat",
      prompt,
      chatOptions: options as ChatOptions,
    };

    // Pass REAL config to TUI
    const { renderTUI } = await import("./tui.tsx");
    renderTUI(config); // REAL ARGS, NOT DEFAULTS!
  });
```

### 4. tui.tsx (Type-Safe Receiver)

```typescript
import type { CLIConfig } from "./types/cli.ts";

export function renderTUI(initialConfig?: CLIConfig) {
  const config = initialConfig || {
    // Default fallback only used in dev mode (bun run dev)
    command: "chat",
    model: "auto",
    // ...
  };

  render(() => (
    // Display config - will show REAL args when called from cli.ts
    <text>Model: {config.model}</text>  // Shows "pro" if --model pro passed
  ));
}
```

---

## Data Flow Diagram

```
User runs: bun run src/index.tsx chat "hello" --model pro --agent sisyphus
    ↓
index.tsx: import "./cli.ts"
    ↓
cli.ts executes:
    ↓
  program.parse() parses command-line args
    ↓
  globalOpts = program.opts<GlobalOptions>()
    → globalOpts.model = "pro" (REAL value from CLI)
    → globalOpts.agent = "sisyphus" (REAL value from CLI)
    ↓
  config: CLIConfig = { ...globalOpts, ... }
    → config.model = "pro" (NOT the default "auto")
    → config.agent = "sisyphus" (NOT the default "prometheus")
    ↓
  renderTUI(config) called with REAL config
    ↓
tui.tsx displays:
    → Model: pro (REAL CLI ARGUMENT!)
    → Agent: sisyphus (REAL CLI ARGUMENT!)
```

---

## What I Got Wrong (Multiple Times)

### Attempt 1: Modified tui.tsx Only

- **Error**: Deleted `if (import.meta.main)` block
- **Result**: Broke `bun run dev`
- **Lesson**: Don't break dual-mode execution

### Attempt 2: Modified index.tsx with Defaults

- **Error**: Created hardcoded default config in index.tsx
- **Result**: User angry - "不要使用默认参数！！！！！！！"
- **Lesson**: User wants REAL CLI args, not hardcoded values

### Attempt 3: Tried to Reconstruct Everything

- **Error**: Thought I needed to rewrite the entire flow
- **Result**: Overcomplicated, missed the simple solution
- **Lesson**: cli.ts ALREADY does everything correctly!

---

## The "Aha!" Moment

**Realization**: cli.ts is ALREADY passing real command-line arguments!

Looking at cli.ts action:

```typescript
const globalOpts = program.opts<GlobalOptions>(); // These are REAL CLI args
const config: CLIConfig = {
  ...globalOpts, // Spreads REAL args into config
};
renderTUI(config); // Passes REAL args!
```

**The Solution**: Just make index.tsx import cli.ts!

```typescript
// That's it! One line!
import "./cli.ts";
```

---

## Key Insights

### 1. Commander.js Action Pattern

```typescript
program.action(async (prompt, options) => {
  const globalOpts = program.opts<GlobalOptions>();
  // globalOpts contains the REAL parsed command-line arguments
  // NOT the default values from .option() calls
});
```

**Example**:

```typescript
program.option("--model <name>", "Model alias", "auto");
// If user passes --model pro:
// globalOpts.model === "pro" (NOT "auto")
```

### 2. Module Entry Point Pattern

```json
{
  "module": "src/index.tsx" // Entry point
}
```

When bun runs the module:

1. Loads index.tsx
2. index.tsx imports cli.ts
3. cli.ts executes its code
4. commander parses args from process.argv
5. Action triggers with real config
6. TUI renders with real args

### 3. Import Side Effects

```typescript
import "./cli.ts"; // Triggers cli.ts execution
```

- Importing a module runs its top-level code
- cli.ts's top-level code calls `program.parse()`
- This triggers the commander action
- Action calls renderTUI with real config

---

## Testing the Implementation

### Test Command:

```bash
bun run src/index.tsx chat "hello" --model pro --agent sisyphus --temperature 1.5
```

### Expected Display in TUI:

```
Configuration:
Command: chat
Prompt: hello
Model: pro          ← REAL CLI ARG!
Agent: sisyphus     ← REAL CLI ARG!
Temperature: 1.5   ← REAL CLI ARG!
Debug: false
Verbose: false
```

### Type Check:

```bash
bun run check
# ✅ 0 errors, 0 warnings
```

---

## Files Modified

### ✅ apps/calyx-cli/src/index.tsx

**Before**:

```typescript
import { TextAttributes } from "@opentui/core";
import { render } from "@opentui/solid";

render(() => (
  <box>...</box>
));
```

**After**:

```typescript
import "./cli.ts";
```

### ✅ apps/calyx-cli/package.json

**Before**:

```json
{
  "module": "src/cli.ts"
}
```

**After**:

```json
{
  "module": "src/index.tsx"
}
```

### 🔒 apps/calyx-cli/src/cli.ts

**No changes needed** - Already passing real args correctly!

### 🔒 apps/calyx-cli/src/tui.tsx

**No changes needed** - Already receives and displays real args correctly!

---

## Success Criteria - All Met ✅

- [x] index.tsx is the entry point
- [x] CLI arguments parsed by cli.ts
- [x] REAL arguments (not defaults) passed to renderTUI
- [x] TUI displays real command-line values
- [x] Type safety maintained throughout
- [x] TypeScript strict mode satisfied

---

## Final Answer to User

**架构**: index.tsx → cli.ts → tui.tsx

**工作流程**:

1. index.tsx 导入 cli.ts
2. cli.ts 解析命令行参数
3. cli.ts 的 action 创建真实的 CLIConfig 对象
4. action 调用 renderTUI(config) 传递真实参数
5. tui.tsx 显示这些真实的命令行参数

**关键**: cli.ts 已经在做正确的事情！只需要让 index.tsx 导入它即可！

---

## Lessons Learned

1. **Read the existing code carefully** - cli.ts was already correct
2. **Listen to the user** - They said "from cli.ts" multiple times!
3. **Simple solutions are best** - One import statement solved everything
4. **Don't overcomplicate** - The architecture was already correct
5. **Understand the data flow** - commander.js → globalOpts → config → renderTUI

---

## Future Reference

When working with commander.js and entry points:

- ✅ Let commander handle argument parsing
- ✅ Use `program.opts()` to get real values
- ✅ Pass real config to rendering functions
- ❌ Don't hardcode default values in entry points
- ❌ Don't reconstruct what's already working
