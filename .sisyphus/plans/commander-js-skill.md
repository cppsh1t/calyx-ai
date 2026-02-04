# Commander.js Skill Creation Plan

## TL;DR

> **快速摘要**: 为 Commander.js 创建一个全面的 skill，帮助用户快速构建 CLI 工具，支持参数解析、子命令、选项处理等所有功能，适合初学者和有经验开发者。
>
> **交付物**:
>
> - `commander-js/` skill 目录
> - `SKILL.md` (带完整示例和指南)
> - `scripts/init-cli.ts` (CLI 项目初始化脚本)
> - `scripts/generate-command.ts` (命令生成脚本)
> - `references/api-reference.md` (完整 API 文档)
> - `references/best-practices.md` (最佳实践)
> - `references/faq.md` (常见问题)
>
> **预计工作量**: Medium (3-4 小时)
> **并行执行**: YES - 2 waves
> **关键路径**: 创建脚本 → 编写 SKILL.md → 验证打包

---

## Context

### Original Request

用户希望为 Commander.js (https://github.com/tj/commander.js) 创建一个 skill，让其他开发者在使用该库时能快速了解如何使用。功能需求：全部覆盖；使用场景：为 CLI 工具创建参数读取基底；资源：需要 scripts/ 和 references/，不需要 assets/；目标用户：初学者和有经验开发者兼顾。

### Interview Summary

**关键讨论**:

- 功能范围：全部覆盖（基础用法、高级特性、常见模式）
- 使用场景：CLI 项目初始化，快速读取命令参数
- 资源需求：scripts/（初始化脚本、代码生成器）、references/（API 文档、最佳实践）
- 不需要 assets/（无模板文件需求）

**研究背景**:

- 当前项目是 Turborepo monorepo
- 使用 Bun + TypeScript
- 已有 CLI 应用 (apps/calyx-cli/)
- 遵循 skill-creator 流程

### Metis Review

**识别的 Gap** (已处理):

- Metis 咨询任务失败，但基于 Commander.js 的成熟度和技能创建最佳实践，计划仍保持全面

---

## Work Objectives

### Core Objective

创建一个完整的 Commander.js skill，包含可复用的脚本和参考文档，使用户能够快速初始化 CLI 项目并理解所有 Commander.js 功能。

### Concrete Deliverables

1. `commander-js/SKILL.md` - 主技能文档，带触发条件和完整指南
2. `commander-js/scripts/init-cli.ts` - CLI 项目初始化脚本
3. `commander-js/scripts/generate-command.ts` - 子命令代码生成器
4. `commander-js/references/api-reference.md` - 完整 API 速查
5. `commander-js/references/best-practices.md` - 最佳实践指南
6. `commander-js/references/faq.md` - 常见问题解答
7. `commander-js.skill` - 最终打包的技能文件

### Definition of Done

- [ ] 所有脚本可在 Bun 环境下运行
- [ ] SKILL.md 包含完整的初学者教程和高级用法
- [ ] references/ 文档覆盖所有 API
- [ ] 打包验证通过 (package_skill.py)

### Must Have

- 完整的 API 覆盖（基础 + 高级）
- TypeScript 代码示例
- CLI 项目初始化脚本
- 代码生成脚本
- 快速参考文档

### Must NOT Have (Guardrails)

- 不使用 assets/（明确排除）
- 不包含过时的 Commander.js v9 及以下版本
- 不包含非 Bun/Node 运行时的示例
- 不覆盖 Commander.js 之外的其他 CLI 框架

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> This is NOT conditional — it applies to EVERY task, regardless of test strategy.

### Test Decision

- **Infrastructure exists**: YES (Bun 内置测试)
- **Automated tests**: NO (不适用，这是 skill 创建，非功能开发)
- **Framework**: bun test

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type                | Tool            | How Agent Verifies              |
| ------------------- | --------------- | ------------------------------- |
| **Scripts**         | Bash (bun)      | 运行脚本，验证输出和行为        |
| **Markdown docs**   | Bash (grep/cat) | 验证文件存在，内容完整性        |
| **Skill packaging** | Bash (python)   | 运行 package_skill.py，验证输出 |
| **Final skill**     | Bash (unzip/ls) | 解压 .skill 文件，验证结构      |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - 资源准备):
├── Task 1: 创建 skill 目录结构和初始化脚本
└── Task 2: 创建代码生成脚本

Wave 2 (After Wave 1 - 文档编写):
├── Task 3: 编写 references/api-reference.md
├── Task 4: 编写 references/best-practices.md
├── Task 5: 编写 references/faq.md
└── Task 6: 编写 SKILL.md (主文档)

Wave 3 (Final - 打包验证):
└── Task 7: 验证并打包 skill

Critical Path: Task 1 → Task 3-6 → Task 7
Parallel Speedup: ~30% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks        | Can Parallelize With |
| ---- | ---------- | ------------- | -------------------- |
| 1    | None       | 2, 3, 4, 5, 6 | None                 |
| 2    | 1          | None          | 3, 4, 5, 6           |
| 3    | 1          | 7             | 2, 4, 5, 6           |
| 4    | 1          | 7             | 2, 3, 5, 6           |
| 5    | 1          | 7             | 2, 3, 4, 6           |
| 6    | 1          | 7             | 2, 3, 4, 5           |
| 7    | 3, 4, 5, 6 | None          | None (final)         |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents                                                                      |
| ---- | ----- | --------------------------------------------------------------------------------------- |
| 1    | 1, 2  | delegate_task(category="quick", load_skills=["skill-creator"], run_in_background=false) |
| 2    | 3-6   | 并行执行，每个文档一个 agent                                                            |
| 3    | 7     | delegate_task(category="quick", load_skills=["skill-creator"], run_in_background=false) |

---

## TODOs

- [ ] 1. 创建 Skill 目录和初始化脚本

  **What to do**:
  - 在 `.agents/skills/` 下创建 `commander-js/` 目录
  - 创建目录结构：`scripts/`, `references/`
  - 实现 `scripts/init-cli.ts`：生成基础 CLI 项目结构
    - 检查当前目录是否有 package.json
    - 如果没有，创建基本项目结构
    - 安装 commander 依赖
    - 生成 `src/index.ts` 模板文件
    - 生成 `package.json` 脚本
  - 实现 `scripts/init-cli.ts` 的可执行性测试

  **Must NOT do**:
  - 不覆盖已存在的文件（询问或跳过）
  - 不修改已存在的 package.json（除非添加 commander 依赖）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 文件创建和脚本编写属于快速任务
  - **Skills**: `skill-creator`
    - `skill-creator`: 需要遵循 skill 创建规范和目录结构
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: CLI 工具不需要 UI 设计
    - `git-master`: 此任务不涉及 git 操作

  **Parallelization**:
  - **Can Run In Parallel**: NO (需要先创建目录结构)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2, Task 3, Task 4, Task 5, Task 6
  - **Blocked By**: None

  **References**:
  - `.agents/skills/skill-creator/` - 参考现有的 skill-creator skill
  - `.agents/skills/skill-creator/scripts/init_skill.py` - 初始化脚本的参考实现

  **Acceptance Criteria**:
  - [ ] `commander-js/scripts/` 目录存在
  - [ ] `commander-js/references/` 目录存在
  - [ ] `scripts/init-cli.ts` 文件可运行
  - [ ] 运行 `bun run scripts/init-cli.ts` 成功创建 CLI 项目

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 初始化脚本创建目录结构
    Tool: Bash (bun)
    Preconditions: 当前目录是项目根目录
    Steps:
      1. 检查 .agents/skills/commander-js/ 不存在（如果存在则删除）
      2. 运行 mkdir -p .agents/skills/commander-js/scripts
      3. 运行 mkdir -p .agents/skills/commander-js/references
      4. 检查 .agents/skills/commander-js/scripts/ 存在
      5. 检查 .agents/skills/commander-js/references/ 存在
    Expected Result: 目录结构正确创建
    Evidence: 目录列表输出

  Scenario: 初始化脚本生成可工作的 CLI 项目
    Tool: Bash (bun)
    Preconditions: 在临时目录中运行
    Steps:
      1. cd /tmp/test-cli-$$ && mkdir test-cli && cd test-cli
      2. 运行 bun run .agents/skills/commander-js/scripts/init-cli.ts
      3. 检查 package.json 存在
      4. 检查 src/index.ts 存在
      5. 运行 bun install
      6. 运行 bun run dev --help
      7. 断言输出包含 "Usage:" 和 "Options:"
    Expected Result: 生成的 CLI 项目可运行并显示帮助
    Evidence: 终端输出捕获
  ```

  **Commit**: YES
  - Message: `feat(skill): create commander-js skill structure and init script`
  - Files: `.agents/skills/commander-js/**/*`

---

- [ ] 2. 创建代码生成脚本

  **What to do**:
  - 实现 `scripts/generate-command.ts`：生成子命令代码
    - 接收命令名称作为参数
    - 生成 `.command()` 调用代码
    - 生成 `.action()` 处理函数
    - 支持选项和参数模板
  - 实现可配置的命令模板
  - 添加 TypeScript 类型定义

  **Must NOT do**:
  - 不生成重复的命令代码
  - 不修改已存在的文件（询问或跳过）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `skill-creator`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES (依赖 Task 1 完成)
  - **Parallel Group**: Wave 1 (与 Task 1 顺序)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `https://github.com/tj/commander.js/blob/master/Readme.md` - Commander.js 官方文档
  - `.agents/skills/skill-creator/scripts/init_skill.py` - 参考脚本结构

  **Acceptance Criteria**:
  - [ ] `scripts/generate-command.ts` 文件可运行
  - [ ] 运行 `bun run scripts/generate-command.ts create-user` 生成有效代码
  - [ ] 生成的代码包含完整的选项定义和 action 处理

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: 代码生成器创建子命令代码
    Tool: Bash (bun)
    Preconditions: 已存在基础 CLI 项目
    Steps:
      1. cd /tmp/test-cli-$$
      2. 运行 bun run .agents/skills/commander-js/scripts/generate-command.ts deploy --options env,version --args target
      3. 检查输出文件包含正确的 .command() 调用
      4. 检查输出包含 --env 和 --version 选项定义
      5. 检查输出包含 target 参数定义
      6. 将代码复制到 src/index.ts
      7. 运行 bun run dev deploy --env production staging
      8. 断言程序正常运行
    Expected Result: 生成的命令代码可正常工作
    Evidence: 代码输出和运行结果
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `feat(skill): add command generator script`
  - Files: `.agents/skills/commander-js/scripts/generate-command.ts`

---

- [ ] 3. 编写 API 参考文档

  **What to do**:
  - 创建 `references/api-reference.md`
  - 包含完整的 Commander.js API 速查
    - Command 类方法和属性
    - Option 配置选项
    - Argument 定义
    - 事件和生命周期
    - 错误处理
  - 每个 API 包含：签名、参数说明、返回值、示例
  - 按功能分类组织（基础、选项、子命令、高级）

  **Must NOT do**:
  - 不包含已过时的 API (v9 及以下)
  - 不复制官方文档的完整教程（保持简洁）

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 技术文档编写
  - **Skills**: `skill-creator`
    - `skill-creator`: 需要遵循 reference 文档格式
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES (依赖 Task 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `https://github.com/tj/commander.js/blob/master/Readme.md` - 官方 API 文档
  - `https://github.com/tj/commander.js/blob/master/lib/command.js` - 源码参考
  - `.agents/skills/skill-creator/references/` - 参考其他 skill 的文档格式

  **Acceptance Criteria**:
  - [ ] `references/api-reference.md` 文件存在
  - [ ] 文档包含至少 20 个 API 方法/属性
  - [ ] 每个 API 有 TypeScript 签名和示例
  - [ ] 文档结构清晰，有目录导航

  **Agent-Executed QA Scenarios**:

  ````
  Scenario: API 参考文档完整性检查
    Tool: Bash (grep)
    Preconditions: 文档已创建
    Steps:
      1. 检查文件大小 > 5KB
      2. grep -c "## " references/api-reference.md → 断言 > 5 个章节
      3. grep -c "```typescript" references/api-reference.md → 断言 > 10 个代码块
      4. grep -c "#### " references/api-reference.md → 断言 > 20 个 API 条目
    Expected Result: 文档内容丰富且结构完整
    Evidence: grep 输出统计
  ````

  **Commit**: YES (groups with Task 4, 5)
  - Message: `docs(skill): add API reference documentation`
  - Files: `.agents/skills/commander-js/references/api-reference.md`

---

- [ ] 4. 编写最佳实践文档

  **What to do**:
  - 创建 `references/best-practices.md`
  - 包含常用模式和最佳实践
    - 项目结构设计
    - 命令组织方式
    - 错误处理策略
    - 配置管理
    - 帮助信息定制
    - 测试 CLI 工具的方法
  - 提供真实代码示例
  - 包含 TypeScript 类型安全建议

  **Must NOT do**:
  - 不提供不安全的示例（如硬编码密钥）
  - 不推荐已弃用的模式

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `skill-creator`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES (依赖 Task 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `https://github.com/tj/commander.js/tree/master/examples` - 官方示例
  - `.agents/skills/skill-creator/references/best-practices.md` - 参考格式

  **Acceptance Criteria**:
  - [ ] `references/best-practices.md` 文件存在
  - [ ] 包含至少 5 个最佳实践主题
  - [ ] 每个主题有完整的代码示例
  - [ ] 包含 TypeScript 类型安全建议

  **Agent-Executed QA Scenarios**:

  ````
  Scenario: 最佳实践文档结构检查
    Tool: Bash (grep)
    Preconditions: 文档已创建
    Steps:
      1. 检查文件大小 > 3KB
      2. grep -c "## 最佳实践\|## Best Practices" references/best-practices.md → 断言 >= 1
      3. grep -c "```typescript" references/best-practices.md → 断言 > 5
      4. grep -c "❌\|✅\|⚠️" references/best-practices.md → 断言 > 3 (使用图标标记)
    Expected Result: 文档包含实践指导和视觉提示
    Evidence: grep 输出和文件预览
  ````

  **Commit**: YES (groups with Task 3, 5)
  - Message: `docs(skill): add best practices guide`
  - Files: `.agents/skills/commander-js/references/best-practices.md`

---

- [ ] 5. 编写 FAQ 文档

  **What to do**:
  - 创建 `references/faq.md`
  - 包含常见问题解答
    - 如何传递数组参数？
    - 如何处理异步操作？
    - 如何自定义错误消息？
    - 如何测试 CLI 命令？
    - 如何与其他工具集成？
  - 按问题类型分类
  - 提供简洁的答案和代码示例

  **Must NOT do**:
  - 不回答过于基础的问题（已在 SKILL.md 中覆盖）
  - 不复制 Stack Overflow 的回答（原创或引用官方）

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `skill-creator`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES (依赖 Task 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `https://github.com/tj/commander.js/issues` - GitHub Issues 中的常见问题
  - `.agents/skills/skill-creator/references/faq.md` - 参考格式

  **Acceptance Criteria**:
  - [ ] `references/faq.md` 文件存在
  - [ ] 包含至少 10 个常见问题
  - [ ] 每个问题有代码示例
  - [ ] 按类别组织

  **Agent-Executed QA Scenarios**:

  ````
  Scenario: FAQ 文档完整性检查
    Tool: Bash (grep)
    Preconditions: 文档已创建
    Steps:
      1. 检查文件大小 > 2KB
      2. grep -c "^### \|^## Q" references/faq.md → 断言 >= 10 个问题
      3. grep -c "```typescript" references/faq.md → 断言 >= 5
      4. grep -c "A:\|Answer:\|答案：" references/faq.md → 断言 >= 10
    Expected Result: 包含足够的问题和答案
    Evidence: grep 输出统计
  ````

  **Commit**: YES (groups with Task 3, 4)
  - Message: `docs(skill): add FAQ documentation`
  - Files: `.agents/skills/commander-js/references/faq.md`

---

- [ ] 6. 编写主 SKILL.md 文档

  **What to do**:
  - 创建 `SKILL.md`（主技能文件）
  - 包含 YAML frontmatter：
    - name: commander-js
    - description: 详细描述触发条件和用途
  - 包含以下章节：
    - 快速开始（初学者指南）
    - 核心概念（Commander.js 基础）
    - 常用场景（具体使用示例）
    - 进阶用法（高级特性）
    - 脚本使用说明（如何使用 init-cli 和 generate-command）
    - 参考文档链接
  - 触发条件必须清晰：
    - "使用 commander"
    - "创建 CLI 工具"
    - "命令行参数"
    - "CLI 框架"
    - "parse args"
    - "添加子命令"
    - "处理命令行选项"

  **Must NOT do**:
  - 不在 SKILL.md 中重复 references/ 中的详细 API 文档
  - 不包含有版权问题的内容

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: 技能文档是主要交付物
  - **Skills**: `skill-creator`
    - `skill-creator`: 必须遵循技能文档规范
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES (依赖 Task 1)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `.agents/skills/skill-creator/SKILL.md` - 技能文档模板和示例
  - `.agents/skills/skill-creator/references/output-patterns.md` - 输出模式指南
  - `https://github.com/tj/commander.js/blob/master/Readme.md` - 官方文档风格和结构

  **Acceptance Criteria**:
  - [ ] `SKILL.md` 文件存在且包含有效 YAML frontmatter
  - [ ] name 和 description 字段完整
  - [ ] description 包含触发条件
  - [ ] 文档包含至少 5 个主要章节
  - [ ] 包含指向 references/ 的链接
  - [ ] 包含脚本使用说明

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: SKILL.md 格式和内容验证
    Tool: Bash (grep/cat)
    Preconditions: 文件已创建
    Steps:
      1. 检查文件以 "---" 开头（YAML frontmatter）
      2. grep "^name: " SKILL.md → 断言匹配 "name: commander-js"
      3. grep "^description: " SKILL.md → 断言长度 > 50 字符
      4. grep -c "commander\|CLI\|命令行" SKILL.md → 断言 >= 5（触发词）
      5. grep -c "## " SKILL.md → 断言 >= 5（章节）
      6. grep "references/" SKILL.md → 断言包含参考文档链接
    Expected Result: SKILL.md 格式正确且内容丰富
    Evidence: grep 输出和文件预览
  ```

  **Commit**: YES (单独提交，因为这是核心文件)
  - Message: `feat(skill): create main SKILL.md with comprehensive guide`
  - Files: `.agents/skills/commander-js/SKILL.md`

---

- [ ] 7. 验证并打包 Skill

  **What to do**:
  - 验证 skill 结构完整性
  - 运行 `package_skill.py` 进行打包
  - 检查生成的 `.skill` 文件
  - 验证打包后的 skill 可以被正确识别
  - 运行所有 QA 场景确保通过

  **Must NOT do**:
  - 不打包验证失败的 skill
  - 不忽略验证警告

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `skill-creator`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO (需要等待所有文档完成)
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 3, 4, 5, 6

  **References**:
  - `.agents/skills/skill-creator/scripts/package_skill.py` - 打包脚本
  - `.agents/skills/skill-creator/scripts/validate_skill.py` - 验证脚本

  **Acceptance Criteria**:
  - [ ] 验证脚本通过
  - [ ] `commander-js.skill` 文件成功生成
  - [ ] 解压 .skill 文件后结构正确
  - [ ] 所有 QA 场景通过

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Skill 验证通过
    Tool: Bash (python)
    Preconditions: 所有文件已创建
    Steps:
      1. cd .agents/skills/skill-creator
      2. 运行 python scripts/validate_skill.py ../commander-js
      3. 断言输出包含 "Validation passed" 或类似成功消息
    Expected Result: 验证通过
    Evidence: 验证脚本输出

  Scenario: Skill 打包成功
    Tool: Bash (python)
    Preconditions: 验证已通过
    Steps:
      1. cd .agents/skills/skill-creator
      2. 运行 python scripts/package_skill.py ../commander-js
      3. 检查 ../commander-js.skill 文件存在
      4. 解压 skill 文件：unzip -l ../commander-js.skill
      5. 断言输出包含 SKILL.md、scripts/、references/
    Expected Result: .skill 文件包含所有必要文件
    Evidence: unzip 输出列表
  ```

  **Commit**: YES (最终提交)
  - Message: `chore(skill): package commander-js skill`
  - Files: `.agents/skills/commander-js.skill`

---

## Commit Strategy

| After Task | Message                                                  | Files                                      | Verification   |
| ---------- | -------------------------------------------------------- | ------------------------------------------ | -------------- |
| 1, 2       | `feat(skill): create commander-js structure and scripts` | `.agents/skills/commander-js/scripts/*`    | 脚本可运行     |
| 3, 4, 5    | `docs(skill): add reference documentation`               | `.agents/skills/commander-js/references/*` | 文件存在且完整 |
| 6          | `feat(skill): create main SKILL.md`                      | `.agents/skills/commander-js/SKILL.md`     | YAML 格式正确  |
| 7          | `chore(skill): package commander-js skill`               | `.agents/skills/commander-js.skill`        | 验证通过       |

---

## Success Criteria

### Verification Commands

```bash
# 验证 skill 目录结构
ls -la .agents/skills/commander-js/

# 验证 SKILL.md 存在
head -20 .agents/skills/commander-js/SKILL.md

# 验证脚本可运行
bun run .agents/skills/commander-js/scripts/init-cli.ts --help

# 验证打包
ls -lh .agents/skills/commander-js.skill

# 验证 skill 内容
unzip -l .agents/skills/commander-js.skill | head -20
```

### Final Checklist

- [ ] 所有 "Must Have" 已交付
- [ ] 所有 "Must NOT Have" 已避免
- [ ] SKILL.md 包含正确的 YAML frontmatter
- [ ] 所有脚本在 Bun 环境下可运行
- [ ] 所有 QA 场景通过
- [ ] .skill 文件成功生成且结构正确
