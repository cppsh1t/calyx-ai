# Calyx CLI 打包与部署指南

## ✅ 官方推荐方式（基于 OpenTUI 文档）

OpenTUI **官方支持打包**！关键是使用 `@opentui/solid/bun-plugin` 插件。

### 为什么之前说"不能打包"？

我之前完全错了！OpenTUI 官方文档明确说明：

> **使用官方的 `solidPlugin` 插件来处理 JSX 编译**

参考：`.agents/skills/opentui/references/solid/configuration.md` 第 181-223 行

---

## 方式一：打包成 JS 文件（推荐 ✅）

### 1. build.ts（已创建）

```typescript
import solidPlugin from "@opentui/solid/bun-plugin";

await Bun.build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./dist",
  target: "bun",
  minify: true,
  plugins: [solidPlugin], // 关键！官方插件
});
```

### 2. package.json（已配置）

```json
{
  "name": "calyx-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "calyx": "dist/cli.js"
  },
  "scripts": {
    "build": "bun run build.ts"
  },
  "files": ["dist", "README.md"]
}
```

### 3. 打包步骤

```bash
cd apps/calyx-cli
bun run build
```

**输出**：`dist/cli.js` (708K，包含所有依赖)

### 4. 测试

```bash
bun dist/cli.js --help
# ✅ 正常工作！
```

### 5. 发布到 npm

```bash
# 打包
npm pack
# 生成 calyx-cli-1.0.0.tgz

# 测试安装
bun install -g calyx-cli-1.0.0.tgz

# 使用
calyx --help
calyx chat "hello"
```

### 6. 正式发布

```bash
npm login
npm publish
```

用户安装：

```bash
bun install -g calyx-cli
calyx chat "hello"
```

---

## 方式二：编译成二进制（有限制 ⚠️）

### 尝试编译

```typescript
// build-binary.ts（已创建）
await Bun.build({
  entrypoints: ["./src/cli.ts"],
  target: "bun",
  plugins: [solidPlugin],
  compile: {
    target: "bun-windows-x64",
    outfile: "calyx",
  },
});
```

### 实测结果

```bash
$ bun run build:binary
✅ Compilation complete! Output: ./dist/calyx (114M)

$ ./dist/calyx --help
error: preload not found "@opentui/solid/preload"
```

### 问题原因

OpenTUI 需要 `bunfig.toml` 的 preload 配置：

```toml
preload = ["@opentui/solid/preload"]
```

编译后的二进制文件不包含这个 preload，导致运行时错误。

### 结论

❌ **不推荐编译成二进制**（OpenTUI 框架限制）
✅ **推荐打包成 JS 文件**（完全可用）

---

## 方式三：源码分发（仅开发测试）

用于本地开发快速测试。

### 创建 bin/calyx

```bash
#!/usr/bin/env bun
import "../src/cli.ts";
```

### 本地链接

```bash
cd apps/calyx-cli
bun link
bun link calyx-cli
```

---

## 📊 对比总结

| 方式           | 文件大小 | 需要 Bun | 可用性          | 推荐度        |
| -------------- | -------- | -------- | --------------- | ------------- |
| **打包 JS** ✅ | 708K     | ✅ 是    | ✅ 完全可用     | ⭐⭐⭐⭐⭐    |
| **二进制** ⚠️  | 114M     | ❌ 否    | ❌ preload 错误 | ⭐            |
| 源码分发       | N/A      | ✅ 是    | ✅ 可用         | ⭐⭐⭐ (开发) |

---

## ✅ 推荐流程

### 开发阶段

```bash
cd apps/calyx-cli
bun run dev  # 使用 --watch
```

### 打包

```bash
bun run build  # 生成 dist/cli.js
```

### 测试

```bash
npm pack
bun install -g calyx-cli-1.0.0.tgz
calyx --help
```

### 发布

```bash
npm publish
```

---

## 🎯 关键要点

1. ✅ **必须使用 `solidPlugin`** - OpenTUI 官方插件
2. ✅ **打包成 JS 文件** - 完全可用，官方推荐
3. ❌ **不要编译成二进制** - preload 限制
4. ✅ **通过 npm 发布** - 标准 CLI 工具分发方式

---

## 参考

- OpenTUI 官方文档：`.agents/skills/opentui/references/solid/configuration.md`
- opencode-bench：`https://github.com/sst/opencode-bench` (参考实现)
