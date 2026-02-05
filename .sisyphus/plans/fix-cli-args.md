# CLI 参数传递修复计划

## 问题概述

`renderTUI` 函数当前接受 `any` 类型参数，丢失了从 `cli.ts` 传递过来的类型安全。需要在 `tui.tsx` 中修复类型注解，并在 `index.tsx` 中正确调用 `renderTUI`。

## 修复范围

1. **apps/calyx-cli/src/tui.tsx** - 修复类型注解，删除 `import.meta.main` 检查
2. **apps/calyx-cli/src/index.tsx** - 导入并使用 `renderTUI`，传递配置参数

## 不需要处理

- 不添加测试
- 不自动提交
- 不处理 `cli.ts`（已正确传递参数）

---

## TODOs

### 1. 修复 tui.tsx

**文件**: `apps/calyx-cli/src/tui.tsx`

**需要修改的内容**:

- 导入 `CLIConfig` 类型
- 将函数签名从 `any` 改为 `CLIConfig`
- 删除第46-48行的 `if (import.meta.main)` 块

**预期结果**:

```typescript
import { TextAttributes } from "@opentui/core";
import { render } from "@opentui/solid";
import type { CLIConfig } from "./types/cli.ts";

export function renderTUI(initialConfig?: CLIConfig) {
  const config = initialConfig || {
    command: "chat",
    model: "auto",
    agent: "prometheus",
    temperature: 0.7,
    debug: false,
    verbose: false,
  };

  // ... 其余代码保持不变
}
// import.meta.main 块已删除
```

**Acceptance Criteria**:

- [x] 成功导入 CLIConfig 类型
- [x] 函数签名改为 `renderTUI(initialConfig?: CLIConfig)`
- [x] 删除 `if (import.meta.main)` 块
- [x] 类型检查通过 (`bun run check`)

---

### 2. 修复 index.tsx

**文件**: `apps/calyx-cli/src/index.tsx`

**需要修改的内容**:

- 导入 `renderTUI` 从 `./tui.tsx`
- 导入 `CLIConfig` 类型从 `./types/cli.ts`
- 创建配置对象并调用 `renderTUI(config)`

**预期结果**:

```typescript
import { renderTUI } from "./tui.tsx";
import type { CLIConfig } from "./types/cli.ts";

const config: CLIConfig = {
  command: "chat",
  model: "auto",
  agent: "prometheus",
  temperature: 0.7,
  debug: false,
  verbose: false,
};

renderTUI(config);
```

**Acceptance Criteria**:

- [x] 成功导入 renderTUI 函数
- [x] 成功导入 CLIConfig 类型
- [x] 创建有效的 CLIConfig 对象
- [x] 调用 renderTUI(config) 替代原有的 render() 调用
- [x] 类型检查通过

---

## 执行策略

### 并行执行

- **Task 1** (tui.tsx) 和 **Task 2** (index.tsx) **可以并行**
- 两个文件独立，没有相互依赖

### 验证步骤

1. 完成两个文件修改后，运行类型检查：
   ```bash
   bun run check --filter=calyx-cli
   ```

### 风险评估

- **低风险**: 纯类型修复，不改变运行时行为
- **CLIConfig 类型**: 已存在且稳定，无需担心接口变更

---

## Success Criteria

### 类型检查

```bash
cd apps/calyx-cli && bun run check
# 预期: 0 errors, 0 warnings
```

### 代码审查清单

- [x] tui.tsx 使用正确的 CLIConfig 类型
- [x] index.tsx 正确导入并调用 renderTUI
- [x] 没有使用 `any` 类型
- [x] 删除了 import.meta.main 检查
