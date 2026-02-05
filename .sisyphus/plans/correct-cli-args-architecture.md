# 正确的 CLI 参数传递架构修复

## 用户的真实需求

**架构流程**：

```
index.tsx (主入口)
    ↓ 调用
cli.ts (解析命令行参数)
    ↓ 返回 CLIConfig
    ↓
index.tsx 将 config 传递给
tui.tsx (renderTUI 函数)
    ↓
渲染 UI 并显示从命令行获取的参数
```

**关键要求**：

- ❌ 不要在 tui.tsx 中使用默认参数
- ❌ 不要在 index.tsx 中硬编码配置
- ✅ 从 cli.ts 获取命令行解析的参数
- ✅ 将真实的命令行参数传递给 renderTUI

---

## TODOs

### 1. 修改 cli.ts - 导出解析函数

**文件**: `apps/calyx-cli/src/cli.ts`

**需要做的**:

- 导出一个函数 `parseCLIConfig()` 来解析命令行参数并返回 `CLIConfig`
- 保持现有的 commander.js 逻辑
- 让 action 回调可以被外部控制或禁用

**Acceptance Criteria**:

- [ ] 导出 `parseCLIConfig()` 函数
- [ ] 函数返回解析后的 `CLIConfig` 对象
- [ ] 保持所有验证逻辑（model, agent, temperature）

### 2. 修改 index.tsx - 使用 cli.ts 解析参数

**文件**: `apps/calyx-cli/src/index.tsx`

**需要做的**:

- 导入 `parseCLIConfig` 从 `./cli.ts`
- 导入 `renderTUI` 从 `./tui.tsx`
- 调用 `parseCLIConfig()` 获取配置
- 将配置传递给 `renderTUI(config)`

**Acceptance Criteria**:

- [ ] 从 cli.ts 获取配置（不是硬编码）
- [ ] 传递真实配置给 renderTUI
- [ ] 不使用默认值

### 3. 修改 tui.tsx - 移除默认值

**文件**: `apps/calyx-cli/src/tui.tsx`

**需要做的**:

- 移除默认配置的 fallback 逻辑
- 或者保持 fallback 但只用于开发模式

**Acceptance Criteria**:

- [ ] 从命令行获取的参数能正确显示
- [ ] 类型安全保持（CLIConfig）

### 4. 验证完整流程

**Acceptance Criteria**:

- [ ] `bun run --watch src/index.tsx` 能启动
- [ ] 传递命令行参数如 `--model pro --agent sisyphus` 能正确显示
- [ ] 类型检查通过

---

## 实现方案

### 方案 A: 修改 cli.ts 导出解析函数

```typescript
// 在 cli.ts 中添加
export async function parseCLIConfig(): Promise<CLIConfig> {
  return new Promise((resolve, reject) => {
    // 创建新的 program 实例
    const program = new Command();

    // ... 配置选项 ...

    let capturedConfig: CLIConfig | null = null;

    program.action(async (prompt, options) => {
      const globalOpts = program.opts<GlobalOptions>();
      validateModel(globalOpts.model);
      validateAgent(globalOpts.agent);

      capturedConfig = {
        ...globalOpts,
        temperature: parseTemperature(globalOpts.temperature.toString()),
        command: "chat",
        prompt,
        chatOptions: options as ChatOptions,
      };
    });

    program.parseAsync().then(() => {
      if (capturedConfig) {
        resolve(capturedConfig);
      } else {
        reject(new Error("Failed to parse CLI config"));
      }
    });
  });
}
```

### 方案 B: 更简单的方式 - 直接修改入口

**package.json**:

```json
{
  "module": "src/index.tsx"
}
```

**index.tsx**:

```typescript
import { program } from "./cli.ts";
import { renderTUI } from "./tui.tsx";

// 解析参数
program.parse();
// commander.js 的 action 会自动触发 renderTUI
```

这种方式最简单，因为 cli.ts 的 action 已经在调用 renderTUI 了！

---

## 推荐方案：方案 B（最简单）

只需要：

1. 修改 package.json 的 `"module"` 为 `"src/index.tsx"`
2. 在 index.tsx 中导入并执行 cli.ts 的 program

这样 cli.ts 的 action 会自动处理一切！
