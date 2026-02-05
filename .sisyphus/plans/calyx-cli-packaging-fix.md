# Calyx CLI 打包修复计划

## TL;DR

**问题概述**: `calyx-cli` 的打包配置完全错误，导致无法正常构建可执行的 CLI 工具。

**主要问题**:

1. **缺少 `bunfig.toml`** — Solid JSX 转换器无法加载
2. **package.json 配置错误** — `module` 和 `bin` 字段指向错误
3. **build.ts 配置不当** — 入口点和插件配置问题
4. **cli.ts 架构问题** — 顶层 `program.parse()` 导致打包执行问题

**修复方案**: 创建缺失配置文件，修正 package.json，重构 cli.ts 入口，确保 Solid + OpenTUI 正确打包

---

## Context

### 技术栈

- **TUI Framework**: OpenTUI with Solid reconciler (`@opentui/solid`)
- **Build**: Bun build with `solidPlugin`
- **CLI**: Commander.js for command parsing
- **Entry**: `src/cli.ts` contains command definitions and parse logic
- **TUI**: `src/tui.tsx` contains OpenTUI render() call

### OpenTUI Solid 打包要求（来自 skill）

根据 OpenTUI skill 的 `references/solid/configuration.md`：

1. **bunfig.toml 是必需的**:

   ```toml
   preload = ["@opentui/solid/preload"]
   ```

2. **tsconfig.json 必须设置**:

   ```json
   {
     "jsx": "preserve",
     "jsxImportSource": "@opentui/solid"
   }
   ```

3. **Build 配置**:

   ```typescript
   import solidPlugin from "@opentui/solid/bun-plugin";

   await Bun.build({
     entrypoints: ["./src/index.tsx"],
     outdir: "./dist",
     target: "bun",
     plugins: [solidPlugin],
   });
   ```

### 当前配置的问题分析

**问题 1: 缺少 bunfig.toml**

- 现状: 完全缺失
- 后果: Solid JSX 无法转换，运行时错误

**问题 2: package.json 混乱**

```json
{
  "module": "src/index.tsx", // 应该指向构建后的入口
  "bin": { "calyx": "dist/cli.js" } // cli.js 不存在，应该是 index.js
}
```

**问题 3: build.ts 配置错误**

```typescript
// 当前
entrypoints: ["./src/cli.ts"],  // 错误：cli.ts 不是 OpenTUI 入口
// 应该是
entrypoints: ["./src/index.tsx"], // 包含 render() 调用的入口
```

**问题 4: cli.ts 顶层执行问题**

```typescript
// 当前 cli.ts 底部直接调用
try {
  program.parse(); // 打包时会立即执行！
} catch (error) {
  process.exit(1);
}
```

- 问题: 打包时 `program.parse()` 会被立即执行
- 解决: 将 parse 移出 cli.ts，由 index.tsx 调用

---

## Work Objectives

### 核心目标

修复 `calyx-cli` 的打包配置，使其能正确构建为可执行的 CLI 工具。

### 具体交付

1. `bunfig.toml` — Solid 预加载配置
2. 修正后的 `package.json`
3. 修正后的 `build.ts`
4. 重构后的 `cli.ts`（移除顶层 parse）
5. 新的 `index.tsx` 作为真正入口

### 定义完成标准

- `bun run build` 成功执行，无错误
- 生成的 `./dist/cli.js` 可通过 `node ./dist/cli.js --help` 运行
- CLI 命令可正常解析和执行
- TUI 界面能正确渲染

### 必须做的

- 创建 bunfig.toml
- 修正 package.json 的 bin 和 module 字段
- 修改 build.ts 使用正确的入口文件
- 重构 cli.ts 避免顶层 side effects
- 确保所有文件路径正确

### 绝对不能做的

- 不要修改 tui.tsx（功能正常，只需正确导入）
- 不要修改 types/cli.ts（类型定义正确）
- 不要更改命令行接口（保持向后兼容）

---

## Verification Strategy

### 无测试基础设施

本项目暂无测试框架，依赖 Agent-Executed QA Scenarios 验证。

### Agent-Executed QA Scenarios

**Scenario 1: Build succeeds**

```
Tool: Bash
Steps:
  1. cd apps/calyx-cli
  2. bun run build
Expected: Build completes with "✅ Build complete! Output: ./dist/cli.js" message
No errors about JSX transformation or missing modules
```

**Scenario 2: CLI help works**

```
Tool: Bash
Steps:
  1. cd apps/calyx-cli
  2. bun ./dist/cli.js --help
Expected:
  - Shows "Usage: calyx [options] [command]"
  - Lists commands: chat, ask
  - Shows global options: -m, -a, --temperature, -d, -v, -c
```

**Scenario 3: Chat command runs**

```
Tool: interactive_bash (tmux)
Steps:
  1. cd apps/calyx-cli
  2. bun ./dist/cli.js chat "hello"
Expected:
  - TUI renders with "Calyx CLI" ASCII art
  - Shows configuration section
  - Shows "Press Ctrl+C to exit"
  - Process exits cleanly with Ctrl+C
```

**Scenario 4: Dev mode works**

```
Tool: Bash
Steps:
  1. cd apps/calyx-cli
  2. bun run dev
Expected:
  - Starts in watch mode
  - Can accept command input
```

---

## Execution Strategy

### 任务顺序（必须顺序执行）

由于任务之间有依赖关系，必须按顺序执行：

```
Wave 1:
├── Task 1: 创建 bunfig.toml
├── Task 2: 修正 package.json
└── Task 3: 创建新的入口文件 src/main.ts

Wave 2 (After Wave 1):
├── Task 4: 重构 cli.ts 移除顶层 parse
└── Task 5: 更新 build.ts 配置

Wave 3 (After Wave 2):
└── Task 6: 更新 index.tsx 作为 CLI 入口

Wave 4 (After Wave 3):
└── Task 7: 测试打包和运行
```

### 关键依赖

- cli.ts 重构后才能修改 index.tsx（需要导出 parse function）
- 所有配置修复后才能测试打包

---

## TODOs

- [x] 1. 创建 bunfig.toml 配置文件

  **What to do**:
  创建 `apps/calyx-cli/bunfig.toml` 文件，内容：

  ```toml
  preload = ["@opentui/solid/preload"]
  ```

  **Must NOT do**:
  - 不要添加其他 bun 配置，保持最小化

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed (simple file creation)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - OpenTUI skill: `.agents/skills/opentui/references/solid/configuration.md:54-62`

  **Acceptance Criteria**:
  - [ ] 文件存在: `apps/calyx-cli/bunfig.toml`
  - [ ] 内容正确包含: `preload = ["@opentui/solid/preload"]`

  **Commit**: NO (group with other config changes)

---

- [x] 2. 修正 package.json 配置

  **What to do**:
  编辑 `apps/calyx-cli/package.json`，修正以下字段：
  1. 移除 `module` 字段（这不是一个库，不需要 module 字段）
  2. 修正 `bin` 字段指向正确的输出文件
  3. 更新 `files` 字段

  修改后的 package.json：

  ```json
  {
    "name": "calyx-cli",
    "version": "1.0.0",
    "type": "module",
    "private": true,
    "bin": {
      "calyx": "./dist/cli.js"
    },
    "scripts": {
      "dev": "bun run --watch src/main.ts",
      "build": "bun run build.ts",
      "test": "bun test",
      "check": "tsc --noEmit"
    },
    "files": ["dist/", "README.md"],
    "devDependencies": {
      "@types/bun": "latest"
    },
    "peerDependencies": {
      "typescript": "^5"
    },
    "dependencies": {
      "@opentui/core": "^0.1.75",
      "@opentui/solid": "^0.1.75",
      "commander": "^14.0.3",
      "solid-js": "1.9.9"
    }
  }
  ```

  **Must NOT do**:
  - 不要改变依赖版本
  - 不要添加新的 scripts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed (JSON editing)

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - OpenTUI skill: `.agents/skills/opentui/references/solid/configuration.md:66-88`

  **Acceptance Criteria**:
  - [ ] `module` 字段已移除
  - [ ] `bin.calyx` 指向 `"./dist/cli.js"`（相对路径）
  - [ ] `files` 包含 `"dist/"` 目录
  - [ ] `dev` script 更新为指向新的入口文件

  **Commit**: NO (group with other config changes)

---

- [x] 3. 创建新的入口文件 src/main.ts

  **What to do**:
  创建 `apps/calyx-cli/src/main.ts` 作为开发模式入口（替代 index.tsx）：

  ```typescript
  #!/usr/bin/env bun
  import { program } from "./cli.ts";

  // Parse and execute CLI commands
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  ```

  **Why needed**:
  - 开发时使用 `bun run src/main.ts`（直接执行，无需构建）
  - 生产构建使用 `src/index.tsx`（OpenTUI 入口）
  - 避免在 cli.ts 中直接调用 parse()

  **Must NOT do**:
  - 不要在 main.ts 中包含任何命令定义（在 cli.ts 中）
  - 不要修改 cli.ts 的逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1, 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4 (cli.ts 重构需要导出 program)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] 文件存在: `apps/calyx-cli/src/main.ts`
  - [ ] 正确导入 program 并调用 parseAsync
  - [ ] 包含 shebang `#!/usr/bin/env bun`
  - [ ] 有基本的错误处理

  **Commit**: NO (group with entry changes)

---

- [x] 4. 重构 cli.ts 移除顶层 parse()

  **What to do**:
  编辑 `apps/calyx-cli/src/cli.ts`，做出以下修改：
  1. **移除底部的 `try-catch` 和 `program.parse()` 调用**
  2. **添加 `shebang` 到文件顶部**（如果还没有）
  3. **确保 `program` 被导出**（已有，但确认）
  4. **修改 TUI 渲染延迟加载方式**（可选优化）

  关键变更：

  ```typescript
  // 文件顶部（保持不变）
  #!/usr/bin/env bun
  import { Command, InvalidArgumentError } from "commander";
  // ... imports ...

  const program = new Command();
  // ... 所有配置代码保持不变 ...

  // === 移除这部分 ===
  // try {
  //   program.parse();
  // } catch (error) {
  //   console.error("Error:", error);
  //   process.exit(1);
  // }

  // === 保持导出 ===
  export { program };
  ```

  **为什么重要**:
  - 当 Bun 构建打包时，顶层代码会立即执行
  - `program.parse()` 在构建时执行会导致命令解析失败
  - 通过移除顶层 parse，代码变成可安全导入的模块

  **Must NOT do**:
  - 不要改变任何命令定义逻辑
  - 不要改变选项或验证函数
  - 不要移除 program 导出

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6 (index.tsx 依赖导出的 program)
  - **Blocked By**: Task 3 (main.ts 创建后)

  **References**:
  - OpenTUI skill: `.agents/skills/opentui/references/core/gotchas.md` (关于 process.exit)

  **Acceptance Criteria**:
  - [ ] 移除底部的 `try { program.parse() }` 块
  - [ ] 保留 `export { program };`
  - [ ] 保留所有命令定义和验证逻辑
  - [ ] 文件可以通过 `import { program } from "./cli.ts"` 导入而不立即执行

  **Commit**: YES
  - Message: `refactor(cli): remove top-level program.parse() for bundle compatibility`
  - Files: `apps/calyx-cli/src/cli.ts`
  - Pre-commit: `bun run check` (type check)

---

- [x] 5. 更新 build.ts 配置

  **What to do**:
  编辑 `apps/calyx-cli/build.ts`，修正构建配置：

  ```typescript
  #!/usr/bin/env bun
  import solidPlugin from "@opentui/solid/bun-plugin";

  console.log("Building Calyx CLI...");

  const result = await Bun.build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./dist",
    target: "bun",
    minify: true,
    plugins: [solidPlugin],
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log("✅ Build complete! Output: ./dist/cli.js");
  ```

  **关键变更**:
  1. 保持使用 `./src/index.tsx` 作为入口（正确）
  2. 添加构建结果检查
  3. 改进错误处理

  **Must NOT do**:
  - 不要改变 entrypoints（已经是正确的 index.tsx）
  - 不要移除 solidPlugin
  - 不要改变 target 或 minify 设置

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7 (打包测试)
  - **Blocked By**: None

  **References**:
  - OpenTUI skill: `.agents/skills/opentui/references/solid/configuration.md:183-198`

  **Acceptance Criteria**:
  - [ ] 构建结果检查逻辑正确
  - [ ] 错误时打印 logs 并 exit(1)
  - [ ] 成功时打印确认消息

  **Commit**: NO (group with Task 4)

---

- [x] 6. 重构 index.tsx 作为构建入口

  **What to do**:
  完全重写 `apps/calyx-cli/src/index.tsx`，使其成为正确的 OpenTUI + CLI 入口：

  ```typescript
  #!/usr/bin/env bun
  import { render } from "@opentui/solid";
  import { program } from "./cli.ts";
  import { renderTUI } from "./tui.tsx";
  import type { CLIConfig } from "./types/cli.ts";

  // Check if this file is being run directly (not imported)
  const isMain = import.meta.main;

  if (isMain) {
    // Set up TUI rendering for commands
    const originalAction = program.action.bind(program);

    // Override program action to ensure TUI cleanup
    program.hook("preAction", () => {
      // Any pre-action setup
    });

    // Parse CLI arguments and execute
    try {
      await program.parseAsync(process.argv);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  }
  ```

  **Wait - 这不对！**

  让我重新思考：index.tsx 应该是 CLI 的入口，但它不需要直接渲染 TUI。TUI 是在 cli.ts 的 action 中被调用的（通过 `renderTUI(config)`）。

  正确的 index.tsx 应该是：

  ```typescript
  #!/usr/bin/env bun
  import { program } from "./cli.ts";

  // Entry point for bundled CLI
  if (import.meta.main) {
    try {
      await program.parseAsync(process.argv);
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  }
  ```

  但等等，这样 TUI 怎么渲染？

  看 cli.ts 的代码，TUI 是在 action 中通过 `await import("./tui.tsx")` 动态导入的，然后调用 `renderTUI(config)`。所以只要我们能运行 cli.ts 的代码，TUI 就能工作。

  **关键洞察**:
  - `src/index.tsx` 是 Bun build 的入口（因为构建系统需要找到所有依赖）
  - 但 index.tsx 的内容只需要导入 cli.ts 并执行 parse
  - cli.ts 中的动态导入 `tui.tsx` 会在需要时加载

  **正确的 index.tsx**：

  ```typescript
  #!/usr/bin/env bun
  import "./cli.ts"; // This imports and sets up the program
  import { program } from "./cli.ts";

  // Parse and execute
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
  ```

  **但是！** 这里有个问题：如果 cli.ts 导出 program，那么 `import "./cli.ts"` 就会执行所有顶层代码（包括 command 定义），但不会在构建时调用 parse（因为我们移除了 parse）。然后 index.tsx 调用 `program.parseAsync()` 来启动。

  这看起来是正确的。

  **Must NOT do**:
  - 不要直接在这里调用 renderTUI（留给 cli.ts 的 action）
  - 不要改变命令解析逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 7
  - **Blocked By**: Task 4 (cli.ts 必须已重构)

  **Acceptance Criteria**:
  - [ ] index.tsx 正确导入 program
  - [ ] 调用 `program.parseAsync(process.argv)`
  - [ ] 包含错误处理
  - [ ] 包含 shebang

  **Commit**: YES
  - Message: `fix(entry): update index.tsx as proper CLI entry point`
  - Files: `apps/calyx-cli/src/index.tsx`
  - Pre-commit: `bun run check`

---

- [x] 7. 测试打包和运行

  **What to do**:
  执行完整测试流程验证修复：
  1. 类型检查: `bun run check`
  2. 构建: `bun run build`
  3. 测试 CLI help: `bun ./dist/cli.js --help`
  4. 测试 chat 命令: `bun ./dist/cli.js chat "test"`

  **Expected behavior**:
  - 构建成功，无错误
  - `--help` 显示正确的命令列表
  - `chat` 命令启动 TUI 并显示配置信息
  - Ctrl+C 能正常退出

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO (final verification)
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: All previous tasks

  **Acceptance Criteria**:
  - [ ] `bun run check` passes with no errors
  - [ ] `bun run build` creates `dist/cli.js`
  - [ ] `bun ./dist/cli.js --help` shows usage info
  - [ ] `bun ./dist/cli.js chat "hello"` launches TUI
  - [ ] TUI displays "Calyx CLI" and configuration

  **Commit**: YES (if all tests pass)
  - Message: `chore: verify CLI build and execution`

---

## Commit Strategy

| After Task    | Message                                                          | Files                     | Verification    |
| ------------- | ---------------------------------------------------------------- | ------------------------- | --------------- |
| 1-3 (config)  | `chore(config): add bunfig.toml and fix package.json`            | bunfig.toml, package.json | -               |
| 4 (cli.ts)    | `refactor(cli): remove top-level parse for bundle compatibility` | cli.ts                    | `bun run check` |
| 5 (build.ts)  | `chore(build): improve build.ts error handling`                  | build.ts                  | -               |
| 6 (index.tsx) | `fix(entry): update index.tsx as proper CLI entry point`         | index.tsx                 | `bun run check` |
| 7 (verify)    | `chore: verify CLI build and execution`                          | -                         | Full test       |

---

## Success Criteria

### 验证命令

```bash
cd apps/calyx-cli

# Type check
bun run check

# Build
bun run build

# Test CLI
bun ./dist/cli.js --help
bun ./dist/cli.js chat "test"
```

### 最终检查清单

- [ ] `bunfig.toml` 存在且包含 Solid preload
- [ ] `package.json` bin 指向正确的输出文件
- [ ] `cli.ts` 没有顶层 `program.parse()`
- [ ] `index.tsx` 是构建入口并调用 parse
- [ ] `main.ts` 是开发入口
- [ ] 构建成功，dist/cli.js 存在
- [ ] CLI 命令可正常执行
- [ ] TUI 界面渲染正常
