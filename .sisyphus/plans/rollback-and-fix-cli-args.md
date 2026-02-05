# 回滚并正确修复 CLI 参数类型问题

## 问题总结

之前的修复有严重错误：

1. 删除了 `tui.tsx` 的 `if (import.meta.main)` 块，导致 `bun run dev` 无法启动
2. 错误地修改了 `index.tsx`，而它本不应该被改动

## 正确的修复目标

**唯一需要修改的文件**: `apps/calyx-cli/src/tui.tsx`

**修改内容**:

- 添加导入: `import type { CLIConfig } from "./types/cli.ts";`
- 修改函数签名: `renderTUI(initialConfig?: any)` → `renderTUI(initialConfig?: CLIConfig)`
- **保留** `if (import.meta.main)` 块（dev 模式需要）

**不需要修改**:

- ❌ `index.tsx` - 保持原样（或删除）
- ❌ `cli.ts` - 已经正确传递参数
- ❌ `types/cli.ts` - 类型定义已正确

---

## TODOs

### 1. 恢复 tui.tsx 的正确版本

**文件**: `apps/calyx-cli/src/tui.tsx`

**需要做的**:

- 保持 `import type { CLIConfig } from "./types/cli.ts";`
- 保持 `export function renderTUI(initialConfig?: CLIConfig)`
- **恢复** `if (import.meta.main)` 块

**Acceptance Criteria**:

- [x] 类型注解正确: `renderTUI(initialConfig?: CLIConfig)`
- [x] 保留了 `if (import.meta.main)` 块
- [x] `bun run dev` 能够正常启动
- [x] `bun run check` 类型检查通过

### 2. 恢复 index.tsx

**文件**: `apps/calyx-cli/src/index.tsx`

**需要做的**:

- 恢复为原始的 OpenTUI 示例代码
- 或者直接删除这个文件（如果不需要）

**Acceptance Criteria**:

- [x] 文件恢复到原始状态

### 3. 验证功能

**Acceptance Criteria**:

- [x] `bun run dev` 启动 TUI 成功
- [x] `cli.ts` 传递的配置能正确显示
- [x] 类型检查通过

---

## 执行步骤

1. 恢复 `tui.tsx` 的 `if (import.meta.main)` 块
2. 恢复 `index.tsx` 到原始状态
3. 测试 `bun run dev` 能否启动
4. 运行类型检查
