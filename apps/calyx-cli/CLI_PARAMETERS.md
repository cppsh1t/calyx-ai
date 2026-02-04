# Calyx CLI - 参数文档

> **Calyx AI** - AI驱动的命令行交互工具
>
> 版本: 1.0.0 | 更新日期: 2026-02-04

---

## 📋 目录

- [快速开始](#快速开始)
- [全局选项](#全局选项)
- [命令列表](#命令列表)
- [配置文件](#配置文件)
- [使用示例](#使用示例)
- [实现优先级](#实现优先级)

---

## 🚀 快速开始

### 安装

```bash
# 全局安装（待实现）
npm install -g @calyx/cli

# 或使用bun
bun install -g @calyx/cli
```

### 基本使用

```bash
# 启动交互式聊天
calyx chat

# 发送单次问题
calyx ask "解释TypeScript的类型系统"

# 使用特定模型
calyx chat --model flash "什么是React？"

# 继续之前的会话
calyx chat --session latest
```

---

## 🌐 全局选项

这些选项在所有命令中均可用：

| 选项        | 简写 | 类型    | 默认值                 | 描述                                     |
| ----------- | ---- | ------- | ---------------------- | ---------------------------------------- |
| `--config`  | `-c` | string  | `~/.calyx/config.yaml` | 配置文件路径                             |
| `--api-key` |      | string  | `env:CALYX_API_KEY`    | API密钥（覆盖环境变量）                  |
| `--model`   | `-m` | string  | `auto`                 | 模型别名（auto/pro/flash）               |
| `--agent`   | `-a` | string  | `prometheus`           | 默认智能体（prometheus/sisyphus/oracle） |
| `--debug`   | `-d` | boolean | `false`                | 启用调试模式                             |
| `--verbose` | `-v` | boolean | `false`                | 详细输出                                 |
| `--quiet`   | `-q` | boolean | `false`                | 仅输出错误信息                           |
| `--help`    | `-h` | boolean |                        | 显示帮助信息                             |
| `--version` | `-V` | boolean |                        | 显示版本号                               |

### 环境变量

| 变量名          | 描述         |
| --------------- | ------------ |
| `CALYX_API_KEY` | API密钥      |
| `CALYX_MODEL`   | 默认模型     |
| `CALYX_AGENT`   | 默认智能体   |
| `CALYX_CONFIG`  | 配置文件路径 |
| `CALYX_DEBUG`   | 启用调试模式 |

---

## 📚 命令列表

### 1. `chat` - 交互式聊天

**描述**: 启动交互式聊天会话或发送单次提示

**语法**:

```bash
calyx chat [OPTIONS] [PROMPT]
```

**选项**:

| 选项                   | 简写 | 类型    | 默认值    | 描述                                  |
| ---------------------- | ---- | ------- | --------- | ------------------------------------- |
| `--session`            | `-s` | string  |           | 恢复会话（使用"latest"或会话ID）      |
| `--new-session`        |      | boolean | `false`   | 强制创建新会话                        |
| `--prompt-interactive` | `-i` | string  |           | 执行提示后继续交互模式                |
| `--temperature`        |      | float   | `0.7`     | 创造性（0.0-2.0）                     |
| `--max-tokens`         |      | number  | `4096`    | 最大响应token数                       |
| `--stream`             |      | boolean | `true`    | 启用流式输出                          |
| `--no-stream`          |      | boolean |           | 禁用流式输出                          |
| `--output-format`      | `-o` | string  | `text`    | 输出格式：text/json/stream-json       |
| `--screen-reader`      |      | boolean | `false`   | 启用屏幕阅读器模式                    |
| `--approval-mode`      |      | string  | `default` | 批准模式：default/auto_edit/yolo/plan |

**使用示例**:

```bash
# 启动交互式聊天
calyx chat

# 发送单次问题
calyx chat "解释async/await"

# 恢复最近的会话
calyx chat --session latest

# 使用Oracle智能体调试代码
calyx chat --agent oracle "调试这段代码"

# 执行提示后继续交互
calyx chat -i "帮我写个测试用例"

# 高温模式提高创造性
calyx chat --temperature 1.2 "写首诗"

# 输出为JSON格式
calyx chat -o json "分析这个错误" > output.json
```

---

### 2. `ask` - 单次提问

**描述**: 非交互模式，发送单次问题并返回结果

**语法**:

```bash
calyx ask <PROMPT> [OPTIONS]
```

**选项**:

| 选项           | 简写 | 类型    | 描述                             |
| -------------- | ---- | ------- | -------------------------------- |
| `--file`       | `-F` | string  | 从文件读取提示                   |
| `--context`    | `-C` | path    | 添加文件/目录作为上下文（@语法） |
| `--output`     | `-o` | string  | 将响应写入文件                   |
| `--format`     | `-f` | string  | 输出格式：text/json/markdown     |
| `--raw-output` |      | boolean | 禁用输出清理（安全风险）         |

**使用示例**:

```bash
# 单次提问
calyx ask "什么是React？"

# 从文件读取提示
calyx ask -F prompt.txt

# 添加代码上下文
calyx ask -C src/ "重构这个函数"

# 输出到文件
calyx ask "解释TypeScript" -o explanation.md

# JSON格式输出
calyx ask "分析这段代码" -f json > analysis.json

# 多个上下文
calyx ask -C src/ -C tests/ "生成测试用例"
```

---

### 3. `session` - 会话管理

**描述**: 管理聊天会话

**语法**:

```bash
calyx session <ACTION> [OPTIONS]
```

**操作**:

| 操作            | 描述         |
| --------------- | ------------ |
| `list`          | 列出所有会话 |
| `show <id>`     | 显示会话详情 |
| `continue <id>` | 恢复会话     |
| `delete <id>`   | 删除会话     |
| `export <id>`   | 导出到文件   |

**选项** (用于`list`):

| 选项       | 简写 | 描述                 |
| ---------- | ---- | -------------------- |
| `--limit`  | `-n` | 最大显示会话数       |
| `--format` |      | 输出格式：table/json |

**使用示例**:

```bash
# 列出所有会话
calyx session list

# 显示最近10个会话
calyx session list -n 10

# 显示特定会话
calyx session show abc123

# 恢复会话
calyx session continue abc123

# 删除会话
calyx session delete abc123

# 导出到文件
calyx session export abc123 --output session.json

# JSON格式列出
calyx session list --format json
```

---

### 4. `agent` - 智能体管理

**描述**: 管理AI智能体

**语法**:

```bash
calyx agent <ACTION>
```

**操作**:

| 操作          | 描述                  |
| ------------- | --------------------- |
| `list`        | 列出可用智能体        |
| `info <name>` | 显示智能体详情        |
| `init`        | 初始化AGENTS.md知识库 |

**内置智能体**:

| 智能体       | 描述                            |
| ------------ | ------------------------------- |
| `prometheus` | 规划专家 - 仅读取，生成工作计划 |
| `sisyphus`   | 执行专家 - 实现代码，委托子任务 |
| `oracle`     | 咨询专家 - 高IQ推理，架构设计   |

**使用示例**:

```bash
# 列出所有智能体
calyx agent list

# 查看智能体详情
calyx agent info prometheus

# 初始化知识库
calyx agent init
```

---

### 5. `auth` - 身份验证

**描述**: 管理身份验证凭据

**语法**:

```bash
calyx auth <ACTION>
```

**操作**:

| 操作                        | 描述             |
| --------------------------- | ---------------- |
| `login [--provider <name>]` | 登录             |
| `logout`                    | 清除凭据         |
| `status`                    | 显示当前验证方法 |

**支持的提供商**:

| 提供商      | 描述                           |
| ----------- | ------------------------------ |
| `google`    | Google OAuth（推荐个人使用）   |
| `api-key`   | API密钥                        |
| `vertex-ai` | Google Cloud Vertex AI（企业） |

**使用示例**:

```bash
# 使用Google OAuth登录
calyx auth login --provider google

# 使用API密钥
calyx auth login --provider api-key

# 查看当前状态
calyx auth status

# 登出
calyx auth logout
```

---

### 6. `config` - 配置管理

**描述**: 管理配置文件

**语法**:

```bash
calyx config <ACTION>
```

**操作**:

| 操作                | 描述           |
| ------------------- | -------------- |
| `init`              | 创建配置文件   |
| `show`              | 显示当前配置   |
| `set <key> <value>` | 设置配置值     |
| `get <key>`         | 获取配置值     |
| `edit`              | 在编辑器中打开 |

**使用示例**:

```bash
# 创建配置文件
calyx config init

# 显示当前配置
calyx config show

# 设置模型
calyx config set model flash

# 获取值
calyx config get model

# 编辑配置
calyx config edit
```

---

### 7. `work` - 工作计划管理

**描述**: 管理Prometheus生成的工作计划

**语法**:

```bash
calyx work <ACTION>
```

**操作**:

| 操作         | 描述             |
| ------------ | ---------------- |
| `list`       | 列出工作计划     |
| `show <id>`  | 显示计划详情     |
| `start <id>` | 执行计划         |
| `status`     | 显示当前工作状态 |
| `cancel`     | 取消活动工作     |

**使用示例**:

```bash
# 列出所有计划
calyx work list

# 查看计划详情
calyx work show plan-123

# 执行计划
calyx work start plan-123

# 查看状态
calyx work status

# 取消工作
calyx work cancel
```

---

### 8. `code` - 代码命令

**描述**: 代码相关操作

**语法**:

```bash
calyx code <ACTION> <FILE>
```

**操作**:

| 操作              | 描述     |
| ----------------- | -------- |
| `explain <file>`  | 解释代码 |
| `refactor <file>` | 重构代码 |
| `test <file>`     | 生成测试 |
| `fix <file>`      | 修复问题 |

**选项**:

| 选项                   | 描述                      |
| ---------------------- | ------------------------- |
| `--line-range <range>` | 特定行范围（如：10-50）   |
| `--in-place`           | `-i` 直接修改文件         |
| `--dry-run`            | 显示更改但不应用          |
| `--framework <name>`   | 测试框架：jest/vitest/bun |

**使用示例**:

```bash
# 解释代码
calyx code explain src/utils.ts

# 解释特定行
calyx code explain src/utils.ts --line-range 10-50

# 重构代码
calyx code refactor src/utils.ts

# 干运行（预览）
calyx code refactor src/utils.ts --dry-run

# 直接修改文件
calyx code refactor src/utils.ts --in-place

# 生成测试
calyx code test src/utils.ts --framework vitest

# 修复问题
calyx code fix src/utils.ts
```

---

### 9. `serve` - 服务器模式

**描述**: 启动无头API服务器

**语法**:

```bash
calyx serve [OPTIONS]
```

**选项**:

| 选项                  | 描述                   |
| --------------------- | ---------------------- |
| `--port <number>`     | 监听端口（默认：4096） |
| `--hostname <string>` | 绑定主机名             |
| `--mdns`              | 启用mDNS发现           |
| `--cors <origin>`     | CORS来源               |

**使用示例**:

```bash
# 启动服务器
calyx serve

# 自定义端口
calyx serve --port 3000

# 启用mDNS
calyx serve --mdns

# 设置CORS
calyx serve --cors https://example.com
```

---

### 10. `web` - Web界面模式

**描述**: 启动Web界面和服务器

**语法**:

```bash
calyx web [OPTIONS]
```

**选项**:

| 选项                  | 描述     |
| --------------------- | -------- |
| `--port <number>`     | 端口号   |
| `--hostname <string>` | 主机名   |
| `--mdns`              | 启用mDNS |
| `--cors <origin>`     | CORS来源 |

**使用示例**:

```bash
# 启动Web界面
calyx web

# 自定义端口
calyx web --port 8080
```

---

## 📁 上下文/文件选项

### 上下文语法

| 语法               | 描述                           |
| ------------------ | ------------------------------ |
| `@path`            | 包含文件/目录内容（git感知）   |
| `@path/to/file.ts` | 包含特定文件                   |
| `@src/`            | 包含整个目录（排除.gitignore） |

### 文件选项

| 选项                     | 描述                       |
| ------------------------ | -------------------------- |
| `--context <path>`       | 添加文件/目录作为上下文    |
| `--exclude <pattern>`    | 从上下文排除模式           |
| `--include-dirs <paths>` | 额外包含的目录（逗号分隔） |
| `--max-size <kb>`        | 最大读取文件大小（KB）     |

**使用示例**:

```bash
# 添加单个文件上下文
calyx ask "解释这个函数" -C @src/utils.ts

# 添加整个目录
calyx ask "重构这个模块" -C @src/

# 多个上下文
calyx ask "生成测试" -C @src/ -C @tests/

# 排除模式
calyx ask "分析代码" --exclude "*.test.ts"

# 包含额外目录
calyx chat --include-dirs docs,examples
```

---

## 🔐 身份验证选项

### 认证方法

#### 1. Google OAuth（推荐个人使用）

**优势**: 免费额度（60请求/分钟，1000请求/天），无需API密钥管理

**设置**:

```bash
calyx auth login --provider google
# 浏览器将打开完成OAuth流程
```

**组织账户**: 需要设置 `GOOGLE_CLOUD_PROJECT` 环境变量

---

#### 2. API密钥

**优势**: 免费额度（1000请求/天），模型选择控制

**设置**:

```bash
export CALYX_API_KEY="your-api-key"
calyx chat
```

**或使用命令行**:

```bash
calyx chat --api-key "your-api-key"
```

---

#### 3. Vertex AI（企业）

**优势**: 企业功能，更高速率限制，Google Cloud集成

**设置**:

**方法A: Application Default Credentials**

```bash
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_GENAI_USE_VERTEXAI=true
calyx chat
```

**方法B: 服务账户**

```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_GENAI_USE_VERTEXAI=true
calyx chat
```

**方法C: API密钥**

```bash
export GOOGLE_API_KEY="your-api-key"
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_GENAI_USE_VERTEXAI=true
calyx chat
```

---

### 多提供商支持

| 提供商       | 环境变量            | 配置键                |
| ------------ | ------------------- | --------------------- |
| Google       | `CALYX_API_KEY`     | `provider: google`    |
| OpenAI       | `OPENAI_API_KEY`    | `provider: openai`    |
| Anthropic    | `ANTHROPIC_API_KEY` | `provider: anthropic` |
| Azure OpenAI | `AZURE_API_KEY`     | `provider: azure`     |

---

## 🧠 模型选项

### 模型别名

| 别名         | 解析为                                     | 描述                 |
| ------------ | ------------------------------------------ | -------------------- |
| `auto`       | `gemini-2.5-pro` 或 `gemini-3-pro-preview` | 默认，系统自动选择   |
| `pro`        | `gemini-2.5-pro`                           | 复杂推理任务         |
| `flash`      | `gemini-2.5-flash`                         | 快速，平衡大多数任务 |
| `flash-lite` | `gemini-2.5-flash-lite`                    | 最快，简单任务       |

### 模型参数

| 参数            | 类型  | 范围    | 默认值 | 描述                       |
| --------------- | ----- | ------- | ------ | -------------------------- |
| `--temperature` | float | 0.0-2.0 | 0.7    | 创造性（低=确定，高=随机） |
| `--top-p`       | float | 0.0-1.0 | 0.95   | 核采样                     |
| `--top-k`       | int   | 1-100   |        | Top-k采样                  |
| `--max-tokens`  | int   | 1-8192  | 4096   | 最大响应token              |
| `--seed`        | int   |         |        | 随机种子（可复现）         |

**使用示例**:

```bash
# 使用Flash模型（快速）
calyx chat --model flash "快速总结"

# 使用Pro模型（复杂推理）
calyx chat --model pro "设计架构"

# 高创造性
calyx chat --temperature 1.5 "写个创意故事"

# 确定性输出
calyx chat --temperature 0.1 --seed 42 "重复输出"

# 限制响应长度
calyx chat --max-tokens 100 "简短回答"
```

---

## 🎨 输出格式

### 格式类型

| 格式          | 描述                 |
| ------------- | -------------------- |
| `text`        | 人类可读文本（默认） |
| `json`        | 结构化数据与元数据   |
| `stream-json` | JSONL事件流（实时）  |
| `markdown`    | Markdown格式         |

### JSON格式示例

```json
{
  "response": "这是AI的响应内容",
  "stats": {
    "models": {
      "gemini-2.5-pro": {
        "api": { "latency": 1234 },
        "tokens": { "prompt": 100, "completion": 500 }
      }
    },
    "tools": {
      "totalCalls": 5,
      "totalSuccess": 5
    },
    "files": {
      "totalLinesAdded": 0,
      "totalLinesRemoved": 0
    }
  },
  "error": null
}
```

### Stream-JSON事件类型

| 事件类型      | 描述                                      |
| ------------- | ----------------------------------------- |
| `init`        | 会话开始                                  |
| `message`     | 用户提示和AI响应（`delta: true`表示流式） |
| `tool_use`    | 工具调用请求                              |
| `tool_result` | 工具执行结果                              |
| `error`       | 非致命错误/警告                           |
| `result`      | 最终会话结果与统计                        |

**使用示例**:

```bash
# 标准文本
calyx ask "问题" -o text

# JSON格式
calyx ask "问题" -o json

# 流式JSONL
calyx ask "问题" -o stream-json

# Markdown格式
calyx ask "问题" -o markdown
```

---

## 📜 TUI斜杠命令

在交互式会话中，可以使用以下斜杠命令：

### 会话管理

| 命令               | 描述                 |
| ------------------ | -------------------- |
| `/help`            | 显示帮助对话框       |
| `/sessions`        | 浏览和恢复之前的会话 |
| `/continue`        | 恢复最近的会话       |
| `/new`             | 创建新会话           |
| `/export`          | 导出当前会话         |
| `/share`           | 公开分享会话         |
| `/unshare`         | 取消分享会话         |
| `/exit` 或 `/quit` | 退出CLI              |

### 模型与智能体

| 命令      | 描述               |
| --------- | ------------------ |
| `/models` | 列出可用模型       |
| `/init`   | 初始化智能体知识库 |

### 显示与主题

| 命令        | 描述         |
| ----------- | ------------ |
| `/theme`    | 更改视觉主题 |
| `/compact`  | 切换紧凑模式 |
| `/details`  | 显示工具详情 |
| `/thinking` | 切换思考模式 |

### 编辑器

| 命令      | 描述       |
| --------- | ---------- |
| `/editor` | 打开编辑器 |

### 其他

| 命令       | 描述           |
| ---------- | -------------- |
| `/connect` | 添加提供商凭据 |
| `/undo`    | 撤销上一个操作 |
| `/redo`    | 重做上一个操作 |

---

## 📦 配置文件

### 配置文件位置

配置文件按优先级搜索：

1. `--config` 指定的路径
2. 当前目录：`.calyxrc`, `.calyxrc.json`, `.calyxrc.yaml`, `.calyxrc.yml`
3. 主目录：`~/.calyx/config.yaml`
4. 默认配置

### 配置优先级

```
CLI选项 > 环境变量 > 配置文件 > 默认值
```

### 配置文件示例

```yaml
# ~/.calyx/config.yaml

# 身份验证
api_key: "${CALYX_API_KEY}"
api_endpoint: "https://api.example.com"
provider: "google" # google, anthropic, openai, azure

# 模型设置
model: "auto"
temperature: 0.7
max_tokens: 4096
top_p: 0.95
stream: true

# 智能体设置
agent: "prometheus"

# 会话管理
session_dir: "~/.calyx/sessions"
auto_save: true
max_sessions: 50

# 输出
output_format: "text"
color: "auto" # always, auto, never
pager: true

# 代码分析
exclude_patterns:
  - "node_modules/**"
  - "dist/**"
  - "build/**"
  - ".git/**"
  - "*.test.ts"
  - "*.spec.ts"
max_file_size: 100 # KB

# 工具配置
tools:
  write: true
  bash: true
  browser: false
  mcp: []

# 批准模式
approval_mode: "default" # default, auto_edit, yolo, plan

# 调试
debug: false
log_level: "info" # debug, info, warn, error
log_file: "~/.calyx/logs/calcy.log"

# 服务器配置
server:
  port: 4096
  hostname: "localhost"
  cors: "*"
  mdns: false

# MCP服务器
mcp_servers:
  filesystem:
    command:
      [
        "npx",
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/files",
      ]
    enabled: true

# 提供商特定配置
providers:
  google:
    region: "us-central1"
  anthropic:
    endpoint: "https://api.anthropic.com"
  openai:
    endpoint: "https://api.openai.com/v1"
  azure:
    endpoint: "https://your-resource.openai.azure.com"
    api_version: "2023-05-15"
```

---

## 🎯 使用示例

### 开发工作流

```bash
# 1. 启动项目会话
calyx chat --session my-project

# 2. 添加上下文并提问
calyx ask "@src/ 解释这个模块的架构"

# 3. 生成测试
calyx code test src/utils.ts --framework vitest

# 4. 重构代码
calyx code refactor src/utils.ts --dry-run

# 5. 应用更改
calyx code refactor src/utils.ts --in-place

# 6. 继续会话
calyx chat --session my-project
```

### CI/CD集成

```bash
# 单次检查
calyx ask "检查代码风格" -C @src/ -f json --quiet > report.json

# 生成文档
calyx ask "生成API文档" @src/api/ -o docs/API.md

# 运行测试并修复
calyx code fix src/test.ts --framework vitest
```

### 调试

```bash
# 启用调试
calyx --debug chat

# 使用Oracle智能体
calyx chat --agent oracle "调试这个内存泄漏"

# 详细日志
calyx --verbose ask "问题" > output.log 2>&1
```

---

## 🎯 实现优先级

### P0 - 核心功能（MVP）

- [x] `chat` - 交互式聊天
- [x] `--api-key`, `--model` - 身份验证和模型选择
- [x] `--stream / --no-stream` - 输出控制
- [ ] `ask` - 单次提问
- [ ] `session list/continue` - 会话管理
- [ ] `auth login/logout` - 身份验证助手

### P1 - 重要功能

- [ ] `--config` - 配置文件支持
- [ ] `agent list/info` - 智能体管理
- [ ] `context` (@语法) - 文件上下文
- [ ] 多种输出格式 (json/markdown)

### P2 - 增强功能

- [ ] `code explain/refactor/test/fix` - 代码命令
- [ ] `config set/get` - 配置管理
- [ ] `work` - 工作计划管理
- [ ] TUI斜杠命令

### P3 - 高级功能

- [ ] `serve/web` - 服务器模式
- [ ] MCP服务器集成
- [ ] 会话分享
- [ ] 多提供商支持

---

## 📚 相关资源

- **项目仓库**: [calyx-ai](https://github.com/your-org/calyx-ai)
- **问题反馈**: [GitHub Issues](https://github.com/your-org/calyx-ai/issues)
- **贡献指南**: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

**最后更新**: 2026-02-04
**维护者**: Calyx AI Team
