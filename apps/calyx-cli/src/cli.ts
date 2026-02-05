#!/usr/bin/env bun
import { Command, InvalidArgumentError } from "commander";
import type {
  GlobalOptions,
  CLIConfig,
  ChatOptions,
  AskOptions,
} from "./types/cli.ts";
import { DEFAULT_GLOBAL_OPTIONS } from "./types/cli.ts";
import packageJson from "../package.json" with { type: "json" };

// ============================================================================
// Module State Management
// ============================================================================
//
// Store parsed configuration from the most recent CLI invocation.
// This allows the entry point (main.ts or index.tsx) to retrieve
// the config after commander.js has parsed the command line.
//
// Pattern: Action handlers store config → Entry point retrieves config

let parsedConfig: CLIConfig | null = null;

/**
 * Get the parsed configuration from the most recent CLI invocation.
 * Used by entry points (main.ts/index.tsx) to retrieve config after parsing.
 *
 * @returns The parsed config, or null if no command was executed yet
 *
 * @example
 * // In index.tsx after parse():
 * const config = getParsedConfig();
 * if (config) {
 *   renderTUI(config);
 * }
 */
export function getParsedConfig(): CLIConfig | null {
  return parsedConfig;
}

/**
 * Reset the parsed configuration state.
 * Used by tests to ensure clean state between test runs.
 *
 * @example
 * resetConfigForTesting();
 * const config = getParsedConfig();
 * console.log(config === null); // true
 */
export function resetConfigForTesting(): void {
  parsedConfig = null;
}

const program = new Command();

// ============================================================================
// 程序基础配置
// ============================================================================

// .name(): 设置 CLI 工具的名称（用于帮助信息）
// .description(): 设置 CLI 工具的描述
// .version(): 设置版本号，自动生成 --version/-V 选项
program
  .name("calyx")
  .description("AI-driven command-line interaction tool")
  .version(packageJson.version);

// ============================================================================
// 全局选项定义
// ============================================================================
//
// .option() 方法用于定义命令行选项，有以下用法：
// .option(flags, description, defaultValue)
// .option(flags, description, parseFunction)
//
// flags 格式: "-s, --long <value>"
//   -s: 短选项（单个字符，用 - 前缀）
//   --long: 长选项（多个字符，用 -- 前缀）
//   <value>: 选项需要参数值（用 <> 包裹，必填）
//   [value]: 选项可选参数（用 [] 包裹，可选）
//   无尖括号: 布尔标志（不需要参数，如 --debug）
//
// 使用示例:
//   calyx chat hello --model pro        # --model 的值为 "pro"
//   calyx chat hello -m pro            # -m 的值为 "pro"（短选项）
//   calyx chat hello --debug           # --debug 的值为 true
//
// 解析后的值通过 program.opts() 获取，返回对象:
// { model: "pro", agent: "prometheus", temperature: "0.7", debug: true, ... }

program
  .option("-m, --model <name>", "Model alias", "auto")
  .option("-a, --agent <name>", "Default agent", "prometheus")
  .option("--temperature <number>", "Creativity (0.0-2.0)", "0.7")
  .option("-d, --debug", "Debug mode", false)
  .option("-v, --verbose", "Verbose output", false)
  .option("-c, --config <path>", "Config file path");

// ============================================================================
// 自定义验证函数
// ============================================================================
//
// 这些函数用于验证命令行参数的有效性
// 如果验证失败，抛出 InvalidArgumentError 会让 commander.js 自动显示
// 错误信息并退出，无需手动处理

function parseTemperature(value: string): number {
  const temp = parseFloat(value);
  if (isNaN(temp) || temp < 0.0 || temp > 2.0) {
    throw new InvalidArgumentError("Temperature must be between 0.0 and 2.0");
  }
  return temp;
}

function validateModel(model: string): void {
  const validModels = ["auto", "pro", "flash"];
  if (!validModels.includes(model)) {
    throw new InvalidArgumentError(
      `Model must be one of: ${validModels.join(", ")}`,
    );
  }
}

function validateAgent(agent: string): void {
  const validAgents = ["prometheus", "sisyphus", "oracle"];
  if (!validAgents.includes(agent)) {
    throw new InvalidArgumentError(
      `Agent must be one of: ${validAgents.join(", ")}`,
    );
  }
}

// ============================================================================
// 子命令定义: chat
// ============================================================================
//
// .command(name) 方法定义子命令
//   - "chat <prompt>": 必填参数（用户必须提供）
//   - "chat [prompt]": 可选参数（用户可以不提供）
//
// .description(): 命令的描述，显示在帮助信息中
//
// .option(): 子命令专属选项（只对该命令有效）
//
// .action(handler): 当命令被执行时调用的函数
//   handler 的参数顺序与命令定义的参数和选项对应
//   async (prompt, options) => { ... }
//         ^^^^^^  ^^^^^^^
//         命令参数  命令选项
//
// 执行流程:
//   1. 用户输入: calyx chat hello --session abc123
//   2. commander.js 解析，提取 prompt="hello", options={session: "abc123"}
//   3. 调用 action 函数，传入解析好的参数
//   4. action 内部:
//      - program.opts() 获取全局选项
//      - 构建完整的 config 对象
//      - 调用 renderTUI(config) 启动界面

program
  .command("chat [prompt]")
  .description("Start interactive chat or send single prompt")
  .option("-s, --session <id>", "Resume session")
  .option("--new-session", "Force new session")
  .option("-i, --prompt-interactive", "Continue after prompt")
  .action(async (prompt, options) => {
    // program.opts<GlobalOptions>() 获取所有全局选项
    // 返回类型: GlobalOptions = { model, agent, temperature, debug, verbose, config }
    const globalOpts = program.opts<GlobalOptions>();

    // 验证全局选项的有效性
    // 如果失败，会抛出异常，commander.js 会捕获并显示错误信息
    validateModel(globalOpts.model);
    validateAgent(globalOpts.agent);

    // 构建完整的配置对象
    // ...globalOpts: 展开所有全局选项（model, agent, temperature 等）
    // 然后覆盖/添加命令特定的字段
    const config: CLIConfig = {
      ...globalOpts,
      temperature: parseTemperature(globalOpts.temperature.toString()),
      command: "chat",
      prompt,
      chatOptions: options as ChatOptions,
    };

    // Store config for entry point to retrieve
    parsedConfig = config;
  });

// ============================================================================
// 子命令定义: ask
// ============================================================================
//
// 与 chat 命令类似，但是:
//   - prompt 是必填参数（<prompt> 而不是 [prompt]）
//   - 用途: 单次问答，不进入交互模式
//
// 使用示例:
//   calyx ask "how to use git?"       # 直接提问
//   calyx ask "help me" -F question.txt  # 从文件读取问题
//   calyx ask "fix bug" -C src/ tests/  # 添加上下文文件

program
  .command("ask <prompt>")
  .description("Single question, non-interactive")
  .option("-F, --file <path>", "Read prompt from file")
  .option("-C, --context <paths...>", "Add context")
  .action(async (prompt, options) => {
    const globalOpts = program.opts<GlobalOptions>();

    // Validate
    validateModel(globalOpts.model);
    validateAgent(globalOpts.agent);

    const config: CLIConfig = {
      ...globalOpts,
      temperature: parseTemperature(globalOpts.temperature.toString()),
      command: "ask",
      prompt,
      askOptions: options as AskOptions,
    };

    // Store config for entry point to retrieve
    parsedConfig = config;
  });

// ============================================================================
// Default Action (No Command Provided)
// ============================================================================
//
// When no subcommand is provided, launch TUI with default configuration
// This allows users to run `bun run src/index.tsx` without arguments
// to start the interactive chat interface

program.action(() => {
  const globalOpts = program.opts<GlobalOptions>();

  // Validate global options if provided
  if (globalOpts.model) {
    validateModel(globalOpts.model);
  }
  if (globalOpts.agent) {
    validateAgent(globalOpts.agent);
  }

  // Build default config for TUI launch
  const config: CLIConfig = {
    ...DEFAULT_GLOBAL_OPTIONS,
    ...globalOpts,
    temperature: globalOpts.temperature
      ? parseTemperature(globalOpts.temperature.toString())
      : DEFAULT_GLOBAL_OPTIONS.temperature,
    command: "chat",
    chatOptions: {},
  };

  // Store config for entry point to retrieve
  parsedConfig = config;
});

// ============================================================================
// 解析命令行参数
// ============================================================================
//
// program.parse() 是整个 CLI 的启动点
//
// 工作流程:
//   1. 解析 process.argv（命令行参数数组）
//      process.argv[0] = node/bun 可执行文件路径
//      process.argv[1] = 当前脚本路径
//      process.argv[2+] = 用户输入的参数
//
//   2. 匹配命令和选项
//      例如: "bun run src/cli.ts chat hello --model pro"
//      识别出: 命令="chat", 参数="hello", 选项={model: "pro"}
//
//   3. 调用匹配命令的 .action() 函数
//
//   4. 如果参数格式错误，commander.js 自动显示帮助或错误信息
//
// try-catch 用于捕获验证函数抛出的异常
// 例如: --model 3.5 （不在允许列表中）
// NOTE: Parse() is now called by entry points (main.ts for dev, index.tsx for build)

// 导出 program 供测试使用
export { program };
