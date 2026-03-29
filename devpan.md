# Calyx AI 开发计划

## Phase 1 — 基础抽象（无依赖，可并行）

1. 从calyx-cli中抽象出calyx-app（功能调用层）
2. calyx-flow内建节点支持(Agent节点，脚本节点等等)

## Phase 2 — 核心功能扩展（依赖 Phase 1）

3. calyx-flow支持subflow
4. calyx-app服务器包装一层为calyx-server
5. calyx-flow实现钩子功能

## Phase 3 — 编辑器 + 多工作流（依赖 Phase 2）

6. calyx-flow支持multi工作流
7. calyx-flow-editor支持基础工作流编辑
8. calyx-flow-editor支持multi工作流编辑
## Phase 4 — Worker + 集成

9. calyx-worker搭建框架(类似claudecode app，codex app)
10. calyx-worker接入calyx-server和calyx-flow-editor

## Phase 5 — 高级功能

11. calyx-app实现flow lab，中央化管理工作流版本
12. calyx-worker实现局域网内链接其他server实例
13. calyx-flow-editor实现自定义节点编排面板