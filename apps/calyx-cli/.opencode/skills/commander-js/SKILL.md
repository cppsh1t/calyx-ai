---
name: commander-js
description: Comprehensive Commander.js CLI framework skill for building command-line interfaces. Use this skill when: (1) Creating new CLI tools with Commander.js, (2) Adding commands/options/arguments to existing CLIs, (3) Parsing command-line parameters in Node.js/Bun applications, (4) Designing CLI project structure with TypeScript, (5) Implementing subcommands, (6) Handling CLI configuration and environment variables, (7) Writing tests for CLI tools, or any task involving "使用 commander", "创建 CLI 工具", "命令行参数", "CLI 框架", "parse args", "添加子命令", "处理命令行选项"
---

# Commander.js

Complete guide for building CLI tools with Commander.js - the most popular Node.js command-line interface framework.

## Quick Start

### Installation

```bash
bun add commander
```

### Basic Example

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("my-cli")
  .description("My awesome CLI tool")
  .version("1.0.0")
  .command("greet <name>")
  .description("Greet someone")
  .action((name: string) => {
    console.log("Hello, " + name + "!");
  });

program.parse();
```

Run it:

```bash
node index.js greet World
# Output: Hello, World!
```

---

## Core Concepts

### 1. Commands

Commands are the main building blocks of a CLI.

```typescript
// Simple command
program
  .command("start")
  .description("Start the server")
  .action(() => {
    console.log("Server started!");
  });

// Command with arguments
program
  .command("build <target>")
  .description("Build the project")
  .action((target: string) => {
    console.log("Building " + target);
  });
```

### 2. Options

Options modify command behavior.

```typescript
program
  .command("serve")
  .option("-p, --port <number>", "Port number", 3000)
  .option("-v, --verbose", "Verbose output")
  .action((options: { port: number; verbose: boolean }) => {
    console.log("Serving on port " + options.port);
    if (options.verbose) console.log("Verbose mode enabled");
  });
```

### 3. Arguments

Arguments are positional parameters.

```typescript
// Required argument
.argument('<file>')

// Optional argument
.argument('[output]')

// Multiple arguments
.argument('<files...>')
```

### 4. Subcommands

Organize related commands hierarchically.

```typescript
program.command("docker build").action(() => {
  /* ... */
});

program.command("docker run").action(() => {
  /* ... */
});
```

---

## Common Scenarios

### Scenario 1: CLI Project Initialization

**Use the bundled `init-cli.ts` script:**

```bash
bun run .agents/skills/commander-js/scripts/init-cli.ts my-awesome-cli
cd my-awesome-cli
bun run dev --help
```

This creates:

- ✅ Project structure (src/, package.json, tsconfig.json)
- ✅ TypeScript configuration
- ✅ Example command
- ✅ Dev scripts (dev, build, start)

### Scenario 2: Adding Commands with Options

```typescript
program
  .command("deploy <env>")
  .description("Deploy to environment")
  .option("-v, --verbose", "Verbose logging")
  .option("-d, --dry-run", "Dry run mode")
  .requiredOption("-u, --user <name>", "Deployment user")
  .action(
    (
      env: string,
      options: { verbose: boolean; dryRun: boolean; user: string },
    ) => {
      console.log(`Deploying to ${env} as user ${options.user}`);
      if (options.dryRun) console.log("Dry run - no actual deployment");
    },
  );
```

### Scenario 3: Generating Command Code

**Use the bundled `generate-command.ts` script:**

```bash
bun run .agents/skills/commander-js/scripts/generate-command.ts \
  deploy \
  --options env,version \
  --args target \
  --desc "Deploy application"
```

Output:

```typescript
program
  .command("deploy <target>")
  .description("Deploy application")
  .option("-e, --env <value>", "env option")
  .option("-v, --version <value>", "version option")
  .action((target: string, options: { env?: string; version?: string }) => {
    // TODO: Implement deploy logic
    console.log("Executing deploy", { target, options });
  });
```

### Scenario 4: Configuration Management

Load config from multiple sources (CLI > ENV > File > Defaults):

```typescript
interface Config {
  port: number;
  host: string;
  verbose: boolean;
}

function loadConfig(cliOptions: Partial<Config>): Config {
  const defaults = { port: 3000, host: "localhost", verbose: false };

  // Load from file
  const fileConfig = fs.existsSync("config.json")
    ? JSON.parse(fs.readFileSync("config.json", "utf-8"))
    : {};

  // Load from environment
  const envConfig = {
    port: process.env.PORT ? parseInt(process.env.PORT) : undefined,
    host: process.env.HOST,
    verbose: process.env.VERBOSE === "true",
  };

  return { ...defaults, ...fileConfig, ...envConfig, ...cliOptions } as Config;
}

program
  .option("-p, --port <number>", "Port")
  .option("-h, --host <address>", "Host")
  .option("-v, --verbose", "Verbose")
  .action((options) => {
    const config = loadConfig(options);
    startServer(config);
  });
```

### Scenario 5: Async Commands with Error Handling

```typescript
program
  .command("fetch <url>")
  .description("Fetch data from URL")
  .action(async (url: string) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log(data);
    } catch (err) {
      console.error("Failed to fetch: " + err.message);
      process.exit(1);
    }
  });

// Important: Use parseAsync for async commands
await program.parseAsync();
```

### Scenario 6: Testing CLI Tools

```typescript
import { describe, it, expect } from "bun:test";
import { Command } from "commander";

describe("CLI commands", () => {
  it("should build successfully", async () => {
    const program = new Command();
    program.command("build").action(() => {
      console.log("Building...");
    });

    await program.parseAsync(["build"], { from: "user" });
    // Assert build happened
  });
});
```

---

## Advanced Usage

### Custom Help Text

```typescript
program
  .addHelpText("before", "\nWelcome to My CLI!\n")
  .addHelpText("after", "\nVisit https://example.com for more info.\n")
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true,
  });
```

### Validation

```typescript
program
  .option("-p, --port <number>", "Port number", "3000")
  .action((options: { port: string }) => {
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new InvalidOptionArgumentError("Port must be 1-65535");
    }
  });
```

### Environment Variables

```typescript
program
  .option("-t, --token <value>", "API token")
  .env("API_TOKEN") // Read from API_TOKEN env var
  .requiredOption("-u, --user <name>", "Username");
```

### Modular Commands

```typescript
// src/commands/build.ts
export function createBuildCommand(): Command {
  return new Command("build").description("Build project").action(() => {
    /* ... */
  });
}

// src/index.ts
import { createBuildCommand } from "./commands/build.js";
program.addCommand(createBuildCommand());
```

---

## Scripts

### init-cli.ts

Initialize a new Commander.js CLI project.

```bash
bun run init-cli.ts [project-name] [options]
```

**Options:**

- `--skip-install` - Skip dependency installation
- `--force` - Overwrite existing directory

**Example:**

```bash
bun run init-cli.ts my-tool --force
```

### generate-command.ts

Generate boilerplate code for commands.

```bash
bun run generate-command.ts <command-name> [options]
```

**Options:**

- `--options, --opts` - Comma-separated option names
- `--args` - Comma-separated argument names (use `[arg]` for optional)
- `--required-opts` - Comma-separated required options
- `--description, --desc` - Command description
- `--output, --out, -o` - Output file path

**Examples:**

```bash
# Simple command
bun run generate-command.ts deploy

# With options
bun run generate-command.ts build --options output,watch

# Full example
bun run generate-command.ts login \
  --args username \
  --required-opts password \
  --desc "Login to server" \
  --output login-command.ts
```

---

## Reference Documentation

For detailed information, see:

- **[API Reference](references/api-reference.md)** - Complete API documentation with all methods, parameters, and examples
- **[Best Practices](references/best-practices.md)** - Production-ready patterns, project structure, error handling, testing
- **[FAQ](references/faq.md)** - Common questions and solutions

---

## TypeScript Support

Commander.js includes built-in TypeScript definitions. No separate `@types` package needed.

```typescript
import { Command, Option, InvalidOptionArgumentError } from "commander";

// Fully typed
interface MyOptions {
  port: number;
  verbose: boolean;
  config?: string;
}

program
  .option("-p, --port <number>", "Port")
  .option("-v, --verbose", "Verbose")
  .option("-c, --config <path>", "Config file")
  .action((options: MyOptions) => {
    // options is fully typed
  });
```

---

## Common Patterns

| Pattern               | Description        | Example                         |
| --------------------- | ------------------ | ------------------------------- |
| **Boolean flag**      | Simple on/off      | `--debug`                       |
| **Option with value** | Requires a value   | `--port 3000`                   |
| **Required option**   | Must be provided   | `.requiredOption('-u, --user')` |
| **Variadic args**     | Multiple values    | `<files...>`                    |
| **Optional args**     | With default value | `[output]`                      |
| **Choice option**     | Limit values       | `.choices(['dev', 'prod'])`     |

---

## Migration Guide

### From v11 to v12+

No breaking changes for most users. Key updates:

1. **ESM support**: Use `"type": "module"` in package.json
2. **Node.js 20+**: Minimum version required
3. **Built-in types**: No need for `@types/commander`

```json
{
  "type": "module",
  "engines": {
    "node": ">=20"
  }
}
```

---

## Resources

- [Official GitHub](https://github.com/tj/commander.js)
- [npm Package](https://www.npmjs.com/package/commander)
- [Examples](https://github.com/tj/commander.js/tree/master/examples)

---

## Tips

1. **Start simple**: Create basic commands first, add options later
2. **Use TypeScript**: Catch errors at compile time
3. **Test your CLI**: Use `.parseAsync()` in tests
4. **Validate inputs**: Use custom parsers and error handling
5. **Provide help**: Add descriptions and examples
6. **Be consistent**: Use similar option names across commands
7. **Handle errors**: Use try/catch in async actions

---

**Ready to build your CLI?** Start with `init-cli.ts` and create your first command!
