# 正确的 CLI 参数传递架构 - index.tsx 入口

## 用户的真实需求（终于理解了！！！）

**架构**:

```
index.tsx (package.json 的 "module" 入口)
    ↓
导入并执行 cli.ts
    ↓
cli.ts 使用 commander.js 解析命令行参数
    ↓ 在 action 中创建真实的 CLIConfig 对象
    ↓
cli.ts 的 action 调用 renderTUI(config)
    ↓
tui.tsx 显示从命令行获取的真实参数
```

**关键理解**:

- ✅ cli.ts 的 action 已经正确解析命令行参数
- ✅ action 中调用 `renderTUI(config)` 传递的是真实参数
- ✅ 不应该使用默认值，应该使用 cli.ts 解析的值

---

## TODOs

### 1. 修改 index.tsx - 导入并执行 cli.ts

**文件**: `apps/calyx-cli/src/index.tsx`

**内容**:

```typescript
import "./cli.ts";
```

**原理**:

- 导入 cli.ts 会触发其执行
- cli.ts 的 `program.parse()` 会解析命令行参数
- commander.js 的 action 会被触发
- action 中已经调用 `renderTUI(config)` 并传递真实的 CLIConfig

**Acceptance Criteria**:

- [x] index.tsx 只有一行：`import "./cli.ts";`
- [x] 执行 index.tsx 能触发命令行参数解析

### 2. 修改 package.json - 更新入口点

**文件**: `apps/calyx-cli/package.json`

**修改**:

```json
{
  "module": "src/index.tsx" // 从 "src/cli.ts" 改为 "src/index.tsx"
}
```

**Acceptance Criteria**:

- [x] "module" 字段指向 "src/index.tsx"

### 3. tui.tsx 保持不变

**文件**: `apps/calyx-cli/src/tui.tsx`

**当前状态**:

- ✅ 已经有 `import type { CLIConfig } from "./types/cli.ts";`
- ✅ 函数签名是 `renderTUI(initialConfig?: CLIConfig)`
- ✅ 有默认配置作为 fallback（用于开发模式）

**不需要修改**:

- 保持现有的 fallback 逻辑（initialConfig || 默认值）
- 当 cli.ts 调用时，会传递真实的 config
- 当直接运行 tui.tsx 时（开发模式），使用默认值

### 4. 验证参数传递

**Acceptance Criteria**:

- [x] 运行 `bun run src/index.tsx --model pro --agent sisyphus` 能启动
- [x] UI 中显示 "Model: pro" 和 "Agent: sisyphus"（不是默认值）
- [x] 类型检查通过

---

## 执行命令示例

```bash
# 测试默认参数
bun run src/index.tsx

# 测试自定义参数
bun run src/index.tsx --model pro --agent sisyphus --temperature 1.5

# 测试 chat 命令
bun run src/index.tsx chat "hello" --model flash
```

---

## 完整的代码

### index.tsx

```typescript
import "./cli.ts";
```

### cli.ts (不需要修改，已经在做正确的事)

```typescript
// action 中已经有：
const config: CLIConfig = {
  ...globalOpts, // 从命令行解析的真实参数
  temperature: parseTemperature(globalOpts.temperature.toString()),
  command: "chat",
  prompt,
  chatOptions: options as ChatOptions,
};

const { renderTUI } = await import("./tui.tsx");
renderTUI(config); // 传递真实的 CLIConfig
```

### tui.tsx (不需要修改)

```typescript
import type { CLIConfig } from "./types/cli.ts";

export function renderTUI(initialConfig?: CLIConfig) {
  const config = initialConfig || {
    // 默认值只在开发模式使用
    command: "chat",
    model: "auto",
    // ...
  };

  render(() => (
    // 显示 config 的内容
    <text>Model: {config.model}</text>  // 会显示命令行传入的值
  ));
}
```

---

## 为什么这样可行

1. **index.tsx** 只是入口，导入 cli.ts
2. **cli.ts** 执行时：
   - `program.parse()` 解析命令行参数
   - 触发 action 回调
   - action 创建真实的 `CLIConfig` 对象
   - action 调用 `renderTUI(config)` 传递真实参数
3. **tui.tsx** 接收真实的 config 并显示

**不需要默认值**，因为 cli.ts 总是会传递真实的配置！
