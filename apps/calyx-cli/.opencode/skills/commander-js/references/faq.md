# Commander.js FAQ

Frequently asked questions and solutions for common Commander.js issues.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Options and Arguments](#options-and-arguments)
- [Async Operations](#async-operations)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Integration](#integration)
- [Common Errors](#common-errors)

---

## Basic Usage

### Q: How do I get started with Commander.js?

**A:** Install Commander.js and create a basic CLI:

```bash
bun add commander
```

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program.name("my-cli").description("My CLI tool").version("1.0.0").parse();
```

Run with: `node index.js --version`

---

### Q: What's the difference between `new Command()` and the exported `program`?

**A:** Both work the same way. Choose based on your preference:

```typescript
// Method 1: Create instance
import { Command } from "commander";
const program = new Command();

// Method 2: Use default export
import { program } from "commander";
```

---

### Q: How do I make my CLI executable?

**A:** Add a shebang and configure `package.json`:

**1.** Add shebang to your entry file:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
// ...
```

**2.** Set executable permissions:

```bash
chmod +x src/index.ts
```

**3.** Configure `package.json`:

```json
{
  "bin": {
    "my-cli": "./dist/index.js"
  }
}
```

**4.** Link globally:

```bash
bun link
```

---

## Options and Arguments

### Q: How do I pass an array of values to an option?

**A:** Use variadic options with `<value...>`:

```typescript
program
  .option("-f, --files <value...>", "List of files")
  .action((options: { files: string[] }) => {
    console.log(options.files); // string[]
  });

// Usage: my-cli --files file1.txt file2.txt file3.txt
```

---

### Q: How do I pass an array as a command argument?

**A:** Use variadic arguments:

```typescript
program
  .argument("<files...>")
  .description("Process multiple files")
  .action((files: string[]) => {
    files.forEach((f) => console.log("Processing: " + f));
  });

// Usage: my-cli file1.txt file2.txt file3.txt
```

---

### Q: How do I handle optional arguments?

**A:** Use square brackets `[arg]`:

```typescript
program
  .command("read <file> [output]")
  .action((file: string, output?: string) => {
    console.log("Reading: " + file);
    if (output) {
      console.log("Output to: " + output);
    }
  });

// Usage:
// my-cli read input.txt
// my-cli read input.txt output.txt
```

---

### Q: How do I provide a default value for an option?

**A:** Pass the default value as the third argument:

```typescript
program
  .option("-p, --port <number>", "Port number", 3000)
  .action((options: { port: number }) => {
    console.log("Port: " + options.port);
  });
```

---

### Q: How do I make an option required?

**A:** Use `.requiredOption()` instead of `.option()`:

```typescript
program
  .requiredOption("-c, --config <path>", "Configuration file")
  .action((options: { config: string }) => {
    console.log("Config: " + options.config);
  });

// If --config is not provided, Commander will show an error
```

---

### Q: How do I limit an option to specific choices?

**A:** Use `.choices()`:

```typescript
program
  .option("-e, --env <environment>", "Environment", "development")
  .choices(["development", "staging", "production"])
  .action((options: { env: string }) => {
    console.log("Environment: " + options.env);
  });

// Usage: my-cli --env staging ✓
// Usage: my-cli --env invalid ✗ (error)
```

---

### Q: How do I get both option values and command arguments?

**A:** Options are passed as the last parameter:

```typescript
program
  .command("deploy <env>")
  .option("-v, --verbose", "Verbose output")
  .action((env: string, options: { verbose: boolean }) => {
    console.log("Deploying to: " + env);
    console.log("Verbose: " + options.verbose);
  });
```

---

### Q: How do I access options from anywhere in my code?

**A:** Use `.opts()`:

```typescript
// Define options
program.option("-v, --verbose").option("-d, --debug");

// Access anywhere
const options = program.opts();
if (options.verbose) {
  console.log("Verbose mode enabled");
}
```

---

## Async Operations

### Q: How do I handle async operations in command actions?

**A:** Use `async`/`await` with `.parseAsync()`:

```typescript
program.command("fetch <url>").action(async (url: string) => {
  const data = await fetchData(url);
  console.log(data);
});

// Use parseAsync instead of parse
await program.parseAsync();
```

---

### Q: How do I handle errors in async commands?

**A:** Use try/catch in the action handler:

```typescript
program.command("deploy").action(async () => {
  try {
    await deploy();
  } catch (err) {
    console.error("Deployment failed: " + err.message);
    process.exit(1);
  }
});
```

---

### Q: Can I use Promise chains instead of async/await?

**A:** Yes, actions support Promises:

```typescript
program.command("process").action(() => {
  return processFile()
    .then((result) => console.log(result))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
});
```

---

## Error Handling

### Q: How do I customize error messages?

**A:** Configure output or use custom error classes:

```typescript
program.configureOutput({
  outputError: (str, write) => {
    // Custom error format
    write("\n❌ Error: " + str.replace("error: ", "") + "\n");
  },
});
```

---

### Q: How do I validate user input?

**A:** Use custom option parsers or argument validation:

```typescript
// Option parser
program.option("-p, --port <number>", "Port number", "3000", (val) => {
  const port = parseInt(val, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new InvalidOptionArgumentError("Port must be between 1 and 65535");
  }
  return port;
});

// Argument validation
program.argument("<email>").action((email: string) => {
  if (!email.includes("@")) {
    console.error("Invalid email address");
    process.exit(1);
  }
});
```

---

### Q: How do I handle "unknown command" errors?

**A:** Listen to the `command:*` event:

```typescript
program.on("command:*", (operands) => {
  const unknownCommand = operands[0];
  console.error(`\n❌ Unknown command: ${unknownCommand}`);
  console.log("Available commands:");
  program.commands.forEach((cmd) => {
    console.log("  - " + cmd.name());
  });
  process.exit(1);
});
```

---

### Q: How do I create custom error types?

**A:** Extend the `Error` class:

```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Usage
program.command("validate").action(() => {
  if (!isValid) {
    throw new ValidationError("Validation failed");
  }
});
```

---

## Testing

### Q: How do I test CLI commands programmatically?

**A:** Use `.parseAsync()` with custom argv:

```typescript
import { describe, it, expect } from "bun:test";

it("should execute build command", async () => {
  const program = new Command();
  program.command("build").action(() => {
    console.log("Building...");
  });

  await program.parseAsync(["build"], { from: "user" });

  // Assert build happened
});
```

---

### Q: How do I mock process.argv for testing?

**A:** Pass argv array to `.parse()` or `.parseAsync()`:

```typescript
// Test specific command
await program.parseAsync(["node", "cli.js", "deploy", "production"], {
  from: "user",
});
```

---

### Q: How do I capture console output in tests?

**A:** Use Bun's spyOn or mock console:

```typescript
import { spyOn } from "bun:test";

it("should print help text", async () => {
  const spy = spyOn(console, "log");

  await program.parseAsync(["--help"], { from: "user" });

  expect(spy).toHaveBeenCalled();
  expect(spy.mock.calls[0][0]).toContain("Usage:");
});
```

---

### Q: How do I test CLI exit codes?

**A:** Mock `process.exit`:

```typescript
import { spyOn } from "bun:test";

it("should exit with code 1 on error", async () => {
  const exitSpy = spyOn(process, "exit");

  program.command("fail").action(() => {
    process.exit(1);
  });

  await program.parseAsync(["fail"], { from: "user" });

  expect(exitSpy).toHaveBeenCalledWith(1);
});
```

---

## Integration

### Q: How do I integrate Commander.js with other CLI tools?

**A:** Use `.addCommand()` to combine CLIs:

```typescript
import { Command } from "commander";
import { webpack } from "./cli/webpack.js";
import { jest } from "./cli/jest.js";

const program = new Command();

program
  .name("my-toolbelt")
  .description("Unified CLI")
  .addCommand(webpack)
  .addCommand(jest);

// Usage: my-toolbelt webpack --mode production
// Usage: my-toolbelt jest --coverage
```

---

### Q: How do I read environment variables?

**A:** Use `.env()` or read `process.env`:

```typescript
// Method 1: .env() method
program
  .option("-p, --port <number>", "Port")
  .env("PORT") // Reads from PORT environment variable
  .default(3000);

// Method 2: Manual
program
  .option("-t, --token <value>", "API token")
  .action((options: { token: string }) => {
    const token = options.token || process.env.API_TOKEN;
    console.log("Token:", token);
  });
```

---

### Q: How do I use Commander.js with configuration files?

**A:** Load config and merge with CLI options:

```typescript
import fs from "fs";

function loadConfig() {
  if (fs.existsSync("cli.config.json")) {
    return JSON.parse(fs.readFileSync("cli.config.json", "utf-8"));
  }
  return {};
}

const config = loadConfig();

program
  .option("-p, --port <number>", "Port", config.port || 3000)
  .option("-h, --host <address>", "Host", config.host || "localhost");
```

---

### Q: How do I create Git-style subcommands?

**A:** Use executable subcommands:

```bash
# Create separate executables
my-cli-commit
my-cli-push
my-cli-branch

# Commander.js automatically detects and runs them
```

Or define them programmatically:

```typescript
program
  .command("commit <message>")
  .action((message) => {
    console.log("Committing: " + message);
  })
  .command("push [remote]")
  .action((remote) => {
    console.log("Pushing to: " + (remote || "origin"));
  });
```

---

## Common Errors

### Q: Why is my option always `undefined`?

**A:** Check the option flag syntax:

```typescript
// ❌ Wrong: Missing <value> marker
program
  .option("-p, --port", "Port number")
  .action((options: { port: string | undefined }) => {
    console.log(options.port); // undefined
  });

// ✅ Correct: Add <value> marker
program
  .option("-p, --port <number>", "Port number")
  .action((options: { port: string }) => {
    console.log(options.port); // works!
  });
```

---

### Q: Why are my arguments in the wrong order?

**A:** Arguments are passed in declaration order:

```typescript
program
  .arguments("<source> <destination>")
  .action((source: string, destination: string) => {
    // source is first argument
    // destination is second argument
  });
```

---

### Q: Why isn't my command being executed?

**A:** Common issues:

1. **Forgot `.parse()`**:

   ```typescript
   // ❌ Missing parse
   program.command("build").action(() => {});
   // Program exits without executing

   // ✅ Add parse
   program.command("build").action(() => {});
   program.parse();
   ```

2. **Wrong argument order**:

   ```typescript
   // ❌ Arguments after action
   program.action(() => {}).argument("<file>");

   // ✅ Arguments before action
   program.argument("<file>").action(() => {});
   ```

3. **Typo in command name**:
   ```bash
   # Command is "build"
   my-cli bild  # Typo - will fail
   my-cli build # Correct
   ```

---

### Q: How do I debug Commander.js?

**A:** Enable verbose logging:

```typescript
program
  .option("-d, --debug", "Enable debug mode")
  .action((options: { debug: boolean }) => {
    if (options.debug) {
      console.log("Debug mode enabled");
      console.log("Args:", process.argv);
      console.log("Options:", program.opts());
    }
  });
```

Or use Node.js debugging:

```bash
node --inspect index.js build
```

---

### Q: How do I handle different Node.js versions?

**A:** Specify minimum Node version:

**package.json:**

```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Check in code:**

```typescript
const nodeVersion = process.version;
const requiredVersion = "v20.0.0";

if (nodeVersion < requiredVersion) {
  console.error(`Node.js ${requiredVersion} or higher is required`);
  console.error(`Current version: ${nodeVersion}`);
  process.exit(1);
}
```

---

### Q: How do I update Commander.js to the latest version?

**A:**

```bash
bun update commander
```

Check your version:

```bash
bun pm ls | grep commander
```

---

## Additional Resources

- [Official Documentation](https://github.com/tj/commander.js)
- [TypeScript Definitions](https://github.com/tj/commander.js/blob/master/typings/index.d.ts)
- [Examples Repository](https://github.com/tj/commander.js/tree/master/examples)

---

Still have questions? Check the [GitHub Issues](https://github.com/tj/commander.js/issues) or ask in the community!
