# Commander.js Best Practices

Production-ready patterns and conventions for building CLI tools with Commander.js.

## Table of Contents

- [Project Structure](#project-structure)
- [Command Organization](#command-organization)
- [Error Handling](#error-handling)
- [Configuration Management](#configuration-management)
- [Help Information](#help-information)
- [Testing CLI Tools](#testing-cli-tools)
- [TypeScript Best Practices](#typescript-best-practices)
- [Performance Considerations](#performance-considerations)

---

## Project Structure

### Recommended Directory Layout

```
my-cli/
├── src/
│   ├── index.ts              # Main entry point
│   ├── commands/             # Command implementations
│   │   ├── build.ts          # Build command
│   │   ├── deploy.ts         # Deploy command
│   │   └── index.ts          # Command registry
│   ├── utils/                # Shared utilities
│   │   ├── logger.ts         # Logging utilities
│   │   ├── config.ts         # Configuration handling
│   │   └── validator.ts      # Input validation
│   └── types/                # TypeScript types
│       └── index.ts
├── tests/                    # Test files
│   ├── commands/
│   └── utils/
├── package.json
├── tsconfig.json
└── README.md
```

### ❌ Bad: Monolithic File

```typescript
// index.ts - 500+ lines with everything mixed together
program.command("build").action(() => {
  /* 50 lines */
});
program.command("deploy").action(() => {
  /* 50 lines */
});
program.command("test").action(() => {
  /* 50 lines */
});
// ... more commands
```

### ✅ Good: Modular Structure

```typescript
// src/index.ts
import { buildCommand } from "./commands/build.js";
import { deployCommand } from "./commands/deploy.js";
import { testCommand } from "./commands/test.js";

program.addCommand(buildCommand);
program.addCommand(deployCommand);
program.addCommand(testCommand);
```

---

## Command Organization

### Pattern 1: Command Factory Functions

Export command factory functions for easy testing and reusability.

```typescript
// src/commands/build.ts
import { Command } from "commander";
import { build } from "../utils/build.js";

export function createBuildCommand(): Command {
  const cmd = new Command("build");

  cmd
    .description("Build the project")
    .argument("[target]", "Build target", "development")
    .option("-w, --watch", "Watch mode")
    .option("-o, --output <dir>", "Output directory", "./dist")
    .action(async (target, options) => {
      await build(target, options);
    });

  return cmd;
}

// src/index.ts
import { createBuildCommand } from "./commands/build.js";

program.addCommand(createBuildCommand());
```

### Pattern 2: Separate Command Classes

For complex commands, use a class-based approach.

```typescript
// src/commands/deploy.ts
import { Command } from "commander";

export class DeployCommand {
  private command: Command;

  constructor() {
    this.command = new Command("deploy");
    this.setup();
  }

  private setup(): void {
    this.command
      .description("Deploy application")
      .argument("<env>", "Deployment environment")
      .option("-v, --verbose", "Verbose logging")
      .action(this.execute.bind(this));
  }

  private async execute(
    env: string,
    options: { verbose: boolean },
  ): Promise<void> {
    // Deployment logic
  }

  get instance(): Command {
    return this.command;
  }
}

// src/index.ts
import { DeployCommand } from "./commands/deploy.js";

program.addCommand(new DeployCommand().instance);
```

### Pattern 3: Subcommands with Shared Context

```typescript
// src/commands/docker.ts
import { Command } from "commander";

export function createDockerCommands(): Command {
  const docker = new Command("docker");

  docker
    .description("Docker-related commands")
    .addCommand(createDockerBuildCommand())
    .addCommand(createDockerRunCommand())
    .addCommand(createDockerStopCommand());

  return docker;
}

function createDockerBuildCommand(): Command {
  return new Command("build")
    .description("Build Docker image")
    .argument("<image>")
    .action((image) => {
      console.log("Building Docker image: " + image);
    });
}

// Usage: my-cli docker build <image>
```

---

## Error Handling

### Global Error Handler

```typescript
// src/index.ts
import { Command, CommanderError, InvalidOptionArgumentError } from "commander";

program.configureOutput({
  writeErr: (str) => {
    // Custom error output
    if (str.includes("error:")) {
      console.error("\n❌ " + str);
    } else {
      console.error(str);
    }
  },
});

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("\n💥 Uncaught Exception:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("\n💥 Unhandled Rejection:", reason);
  process.exit(1);
});
```

### Command-Specific Error Handling

```typescript
// src/commands/build.ts
program
  .command("build")
  .argument("[target]")
  .action(async (target) => {
    try {
      await build(target);
    } catch (err) {
      if (err instanceof BuildError) {
        console.error("\n❌ Build failed: " + err.message);
        console.error("💡 Hint: Check your build configuration");
        process.exit(1);
      }
      throw err;
    }
  });
```

### Custom Error Classes

```typescript
// src/utils/errors.ts
export class CliError extends Error {
  constructor(
    message: string,
    public exitCode = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}

export class ValidationError extends CliError {
  constructor(message: string) {
    super("Validation failed: " + message);
    this.name = "ValidationError";
  }
}

// Usage
import { ValidationError } from "../utils/errors.js";

if (!config.required) {
  throw new ValidationError("Missing required configuration");
}
```

### Input Validation

```typescript
// ❌ Bad: No validation
program
  .command("serve")
  .option("-p, --port <number>", "Port number")
  .action((options) => {
    const port = parseInt(options.port, 10);
    // What if port is NaN or out of range?
    server.listen(port);
  });

// ✅ Good: Validate inputs
program
  .command("serve")
  .option("-p, --port <number>", "Port number", "3000")
  .action((options) => {
    const port = validatePort(options.port);
    server.listen(port);
  });

function validatePort(port: string): number {
  const num = parseInt(port, 10);
  if (isNaN(num)) {
    throw new InvalidOptionArgumentError("Port must be a number");
  }
  if (num < 1 || num > 65535) {
    throw new InvalidOptionArgumentError("Port must be between 1 and 65535");
  }
  return num;
}
```

---

## Configuration Management

### Priority Order

1. Command-line options (highest priority)
2. Environment variables
3. Config file
4. Default values (lowest priority)

### Implementation Pattern

```typescript
// src/utils/config.ts
import fs from "fs";
import path from "path";

interface Config {
  port: number;
  host: string;
  verbose: boolean;
}

export function loadConfig(cliOptions: Partial<Config>): Config {
  const defaults: Config = {
    port: 3000,
    host: "localhost",
    verbose: false,
  };

  // Load from file
  const fileConfig = loadConfigFile();

  // Load from environment
  const envConfig = loadEnvConfig();

  // Merge: defaults < file < env < cli
  return {
    ...defaults,
    ...fileConfig,
    ...envConfig,
    ...cliOptions,
  } as Config;
}

function loadConfigFile(): Partial<Config> {
  const configPath = path.resolve(process.cwd(), "cli.config.json");

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.warn("Warning: Failed to parse config file");
    return {};
  }
}

function loadEnvConfig(): Partial<Config> {
  return {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    host: process.env.HOST,
    verbose: process.env.VERBOSE === "true",
  };
}

// Usage
program
  .option("-p, --port <number>", "Port number")
  .option("-h, --host <address>", "Host address")
  .option("-v, --verbose", "Verbose output")
  .action((options) => {
    const config = loadConfig(options);
    console.log("Final config:", config);
  });
```

### Using .env() Method

```typescript
program
  .option("-p, --port <number>", "Port number")
  .env("PORT") // Read from PORT environment variable
  .default(3000);

program
  .option("-t, --token <value>", "API token")
  .env("API_TOKEN") // Read from API_TOKEN environment variable
  .requiredOption("-u, --user <name>", "Username");
```

---

## Help Information

### Custom Help Templates

```typescript
program.configureHelp({
  sortSubcommands: true,
  sortOptions: true,
  subcommandTerm: (cmd) => cmd.name() + " " + cmd.description(),
  optionTerm: (option) => option.flags + " → " + option.description,
  commandUsage: (cmd) => {
    const usage = cmd.usage();
    return "Usage: " + usage + "\n\nExample:\n  $ my-cli " + cmd.name();
  },
});
```

### Contextual Help

```typescript
program
  .command("deploy")
  .addHelpText("before", "\n⚠️  This will deploy to production!\n")
  .addHelpText("after", "\n📖 Documentation: https://docs.example.com/deploy\n")
  .addHelpText("afterAll", "\nNeed help? Contact support@example.com\n");
```

### Example Sections in Help

```typescript
function addExamples(command: Command, examples: string[]): void {
  command.addHelpText("after", "\nExamples:\n");
  examples.forEach((ex, i) => {
    command.addHelpText("after", `  ${i + 1}. ${ex}\n`);
  });
}

// Usage
addExamples(program, [
  "my-cli build --watch",
  "my-cli deploy production",
  "my-cli status --verbose",
]);
```

---

## Testing CLI Tools

### Testing with Node

```typescript
// tests/build.test.ts
import { describe, it, expect } from "bun:test";
import { Command } from "commander";
import { createBuildCommand } from "../src/commands/build.js";

describe("build command", () => {
  it("should build successfully", async () => {
    const program = new Command();
    program.addCommand(createBuildCommand());

    await program.parseAsync(["build", "development"], { from: "user" });

    // Assert build happened
  });

  it("should handle build errors", async () => {
    const program = new Command();
    program.addCommand(createBuildCommand());

    await expect(
      program.parseAsync(["build", "invalid-target"], { from: "user" }),
    ).toThrow();
  });
});
```

### Mocking File System

```typescript
import { mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";

function setupTestProject(): string {
  const testDir = tmpdir() + "/cli-test-" + Date.now();

  mkdirSync(testDir + "/src", { recursive: true });
  writeFileSync(testDir + "/src/index.ts", 'console.log("test");');

  return testDir;
}

// Usage
it("should build project", async () => {
  const testDir = setupTestProject();
  process.chdir(testDir);

  await program.parseAsync(["build"], { from: "user" });

  // Assertions
});
```

### Testing Output Capture

```typescript
import { spyOn } from "bun:test";

it("should print build status", async () => {
  const spy = spyOn(console, "log");

  await program.parseAsync(["build"], { from: "user" });

  expect(spy).toHaveBeenCalled();
  expect(spy.mock.calls[0][0]).toContain("Building");
});
```

---

## TypeScript Best Practices

### Strict Type Definitions

```typescript
// Define option interfaces
interface ServeOptions {
  port: number;
  host: string;
  ssl: boolean;
}

program
  .command("serve")
  .option("-p, --port <number>", "Port", "3000")
  .option("-h, --host <address>", "Host", "localhost")
  .option("--ssl", "Enable SSL")
  .action((options: ServeOptions) => {
    // Fully typed options
    startServer(options);
  });
```

### Type Guards

```typescript
function isDeployEnvironment(
  env: string,
): env is "development" | "staging" | "production" {
  return ["development", "staging", "production"].includes(env);
}

program.command("deploy <env>").action((env: string) => {
  if (!isDeployEnvironment(env)) {
    throw new InvalidOptionArgumentError(
      "Environment must be development, staging, or production",
    );
  }
  // env is now typed as 'development' | 'staging' | 'production'
});
```

### Enum Options

```typescript
enum LogLevel {
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
}

program
  .option("-l, --level <level>", "Log level", "info")
  .choices(Object.values(LogLevel))
  .action((options: { level: LogLevel }) => {
    setLogLevel(options.level);
  });
```

---

## Performance Considerations

### Lazy Load Commands

```typescript
// Instead of:
import { buildCommand } from "./commands/build.js";
import { deployCommand } from "./commands/deploy.js";
// ... many imports

// Use dynamic imports:
program.command("build").action(async () => {
  const { buildCommand } = await import("./commands/build.js");
  await buildCommand();
});
```

### Avoid Heavy Operations in Setup

```typescript
// ❌ Bad: Heavy operation during command definition
program.command("process").action(() => {
  // This loads during CLI startup
  const data = loadHugeConfigFile();
});

// ✅ Good: Load only when needed
program.command("process").action(async () => {
  // Load only when command is executed
  const data = await loadHugeConfigFile();
});
```

### Use Parallel Processing

```typescript
import { Worker } from "worker_threads";

program.command("process <files...>").action(async (files: string[]) => {
  const workers = files.map((file) => {
    return new Worker("./worker.js", {
      workerData: { file },
    });
  });

  await Promise.all(
    workers.map((w) => new Promise((resolve) => w.on("exit", resolve))),
  );
});
```

---

## Security Best Practices

### Sanitize User Input

```typescript
import { validate } from "schema-validator";

program.command("exec <command>").action(async (command: string) => {
  // Validate command against whitelist
  const allowedCommands = ["build", "test", "deploy"];
  if (!allowedCommands.includes(command)) {
    throw new Error("Invalid command");
  }
  executeCommand(command);
});
```

### Protect Sensitive Data

```typescript
program
  .option("-p, --password <value>", "Password")
  .action((options: { password: string }) => {
    // Don't log passwords
    const password = options.password;
    // Process password securely

    // Clear from options after use
    options.password = "";
  });
```

---

## Summary

| Practice              | Description                                |
| --------------------- | ------------------------------------------ |
| **Modular Structure** | Separate commands into individual files    |
| **Error Handling**    | Use global handlers + custom error classes |
| **Config Priority**   | CLI > ENV > File > Defaults                |
| **Type Safety**       | Define interfaces for all options          |
| **Testing**           | Use Bun test + mock file system            |
| **Performance**       | Lazy load heavy modules                    |
| **Security**          | Validate and sanitize all inputs           |

---

For more examples, see the [official Commander.js examples](https://github.com/tj/commander.js/tree/master/examples).
