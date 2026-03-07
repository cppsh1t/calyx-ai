# Commander.js API Reference

Complete API reference for Commander.js v14+.

## Table of Contents

- [Command Class](#command-class)
- [Options](#options)
- [Arguments](#arguments)
- [Events](#events)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)

---

## Command Class

The `Command` class is the main building block for CLI applications.

### Creating a Command

```typescript
import { Command } from "commander";

// Method 1: Create a new instance
const program = new Command();

// Method 2: Use the default exported program
import { program } from "commander";
```

### Configuration Methods

#### `.name(name)`

Set the command name.

```typescript
program.name("my-cli").description("My awesome CLI tool");
```

**Parameters:**

- `name: string` - The command name

**Returns:** `Command` (for chaining)

---

#### `.description(text)`

Set the command description.

```typescript
program.description("A comprehensive CLI tool");
```

**Parameters:**

- `text: string` - Description text

**Returns:** `Command`

---

#### `.version(version, [flags], [description])`

Set the version number and add a `-v, --version` flag.

```typescript
program.version("1.0.0", "-v, --version", "Output the version number");
```

**Parameters:**

- `version: string` - Version number
- `flags?: string` - Custom version flags (default: `-v, --version`)
- `description?: string` - Custom description

**Returns:** `Command`

---

### Command Definition

#### `.command(name, [description], [opts])`

Define a subcommand.

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

// Command with options
program
  .command("deploy <env>")
  .description("Deploy to environment")
  .option("-v, --verbose", "Verbose output")
  .action((env: string, options: { verbose: boolean }) => {
    console.log(`Deploying to ${env}`);
  });
```

**Parameters:**

- `name: string` - Command name (use `<arg>` for required args, `[arg]` for optional)
- `description?: string` - Command description
- `opts?: CommandOptions` - Configuration options

**Returns:** `Command`

---

#### `.addCommand(command)`

Add a pre-configured subcommand.

```typescript
const subCommand = new Command("status");

subCommand.description("Show status").action(() => {
  console.log("Status: OK");
});

program.addCommand(subCommand);
```

**Parameters:**

- `command: Command` - The command instance to add

**Returns:** `Command`

---

### Options

#### `.option(flags, [description], [defaultValue], [parseFn])`

Define an option for the command.

```typescript
// Boolean flag
program.option("-d, --debug", "Enable debug mode");

// Option with value
program.option("-p, --port <number>", "Port number", 3000);

// Option with parser
program.option("--port <number>", "Port number", "8080", (val) =>
  parseInt(val, 10),
);

// Required option
program.requiredOption("-c, --config <path>", "Config file path");
```

**Parameters:**

- `flags: string` - Option flags (e.g., `-p, --port <number>`)
- `description?: string` - Option description
- `defaultValue?: any` - Default value
- `parseFn?: (value: string, previous: any) => any` - Custom parser function

**Returns:** `Command`

---

#### `.requiredOption(flags, [description], [defaultValue], [parseFn])`

Define a required option.

```typescript
program
  .requiredOption("-u, --user <name>", "Username")
  .action((options: { user: string }) => {
    console.log("User: " + options.user);
  });
```

**Parameters:** Same as `.option()`

**Returns:** `Command`

---

### Arguments

#### `.argument(name, [description], [defaultValue])`

Define a command argument.

```typescript
// Required argument
program
  .argument("<file>")
  .description("File to process")
  .action((file: string) => {
    console.log("Processing: " + file);
  });

// Optional argument
program
  .argument("[output]")
  .description("Output file")
  .action((output?: string) => {
    console.log("Output: " + (output || "default"));
  });

// Variadic argument
program
  .argument("<files...>")
  .description("Files to process")
  .action((files: string[]) => {
    files.forEach((f) => console.log("Processing: " + f));
  });
```

**Parameters:**

- `name: string` - Argument name (use `<arg>` for required, `[arg]` for optional, `...` for variadic)
- `description?: string` - Argument description
- `defaultValue?: any` - Default value for optional arguments

**Returns:** `Command`

---

#### `.arguments(desc)`

Define multiple arguments using a description string.

```typescript
program
  .arguments("<source> [destination]")
  .action((source: string, destination?: string) => {
    console.log(source + " -> " + destination);
  });
```

**Parameters:**

- `desc: string` - Arguments description

**Returns:** `Command`

---

### Action Handlers

#### `.action(fn)`

Set the action handler for the command.

```typescript
program.command("greet <name>").action((name: string, options?: object) => {
  console.log("Hello, " + name + "!");
});
```

**Parameters:**

- `fn: (...args: any[], options: any) => void | Promise<void>` - Action function

**Returns:** `Command`

**Note:** The action function receives:

1. All declared arguments (in order)
2. An options object as the last parameter (if options are defined)

---

### Execution

#### `.parse([argv], [options])`

Parse command-line arguments.

```typescript
// Parse from process.argv
program.parse();

// Parse custom argv
program.parse(["node", "script.js", "command", "--option"]);

// Parse with options
program.parse(process.argv, {
  from: "node", // Set to 'electron' or 'user' for other environments
});
```

**Parameters:**

- `argv?: string[]` - Arguments array (default: `process.argv`)
- `options?: ParseOptions` - Parse options

**Returns:** `Command`

---

#### `.parseAsync([argv], [options])`

Parse command-line arguments asynchronously (supports async action handlers).

```typescript
program.command("fetch").action(async () => {
  const data = await fetchData();
  console.log(data);
});

await program.parseAsync();
```

**Parameters:** Same as `.parse()`

**Returns:** `Promise<Command>`

---

### Configuration

#### `.configureOutput(configuration)`

Configure output and error handling.

```typescript
program.configureOutput({
  writeErr: (str) => process.stderr.write(str),
  writeOut: (str) => process.stdout.write(str),
  getOutHelpWidth: () => process.stdout.columns || 80,
  getErrHelpWidth: () => process.stderr.columns || 80,
  outputError: (str, write) => write("Error: " + str),
});
```

**Parameters:**

- `configuration: OutputConfiguration` - Output configuration object

---

#### `.configureHelp(configuration)`

Customize help output.

```typescript
program.configureHelp({
  sortSubcommands: true,
  sortOptions: true,
  showGlobalOptions: true,
  subcommandTerm: (cmd) => cmd.name(),
});
```

---

#### `.addHelpText(position, text)`

Add extra text to the help output.

```typescript
// Add text before or after help
program
  .addHelpText("before", "Welcome to My CLI!\n")
  .addHelpText("after", "\nVisit https://example.com for more info.\n");

// Add text before/after specific command
program
  .command("build")
  .addHelpText("beforeAll", "\nBuilding your project...\n");
```

**Parameters:**

- `position: 'before' | 'beforeAll' | 'after' | 'afterAll'` - Text position
- `text: string | ((context: HelpContext) => string)` - Text content

**Returns:** `Command`

---

### Properties

#### `.opts()`

Get parsed options for the command.

```typescript
program
  .option("-v, --verbose")
  .option("-p, --port <number>")
  .action(() => {
    const options = program.opts();
    console.log(options.verbose); // boolean
    console.log(options.port); // number
  });
```

**Returns:** `object`

---

#### `.args`

Get parsed arguments for the command.

```typescript
program
  .argument("<file>")
  .argument("[output]")
  .action(() => {
    console.log(program.args); // [file, output]
  });
```

**Type:** `any[]`

---

#### `.processedArgs`

Get processed command arguments.

```typescript
program.argument("<files...>").action(() => {
  console.log(program.processedArgs); // string[]
});
```

---

## Options

### Option Flags Syntax

| Pattern      | Description         | Example               |
| ------------ | ------------------- | --------------------- |
| `-f`         | Short flag only     | `-f`                  |
| `--flag`     | Long flag only      | `--flag`              |
| `-f, --flag` | Both short and long | `-f, --flag`          |
| `<value>`    | Required value      | `-p, --port <number>` |
| `[value]`    | Optional value      | `-c, --config [path]` |

### Option Types

```typescript
// Boolean flag
.option('-d, --debug', 'Enable debug mode')

// String option
.option('-n, --name <value>', 'Your name')

// Number option with parser
.option('-p, --port <number>', 'Port number', '8080', parseInt)

// Choice option
.option('-c, --color <color>', 'Color', 'red')
  .choices(['red', 'blue', 'green'])

// Variadic option
.option('-f, --files <value...>', 'List of files')
```

---

## Arguments

### Argument Syntax

| Pattern    | Description         | Example      |
| ---------- | ------------------- | ------------ |
| `<arg>`    | Required argument   | `<file>`     |
| `[arg]`    | Optional argument   | `[output]`   |
| `<arg...>` | Variadic (multiple) | `<files...>` |

### Argument Examples

```typescript
// Single required argument
.argument('<file>')

// Optional argument with default
.argument('[output]', 'Output file', 'out.txt')

// Multiple arguments
.arguments('<source> [destination]')

// Variadic arguments
.argument('<files...>')
```

---

## Events

### `'command:COMMAND_NAME'`

Emitted when a command is executed.

```typescript
program.on("command:deploy", (options) => {
  console.log("Deploy command executed with options:", options);
});
```

### `'option:OPTION_NAME'`

Emitted when an option is specified.

```typescript
program.on('option:verbose', () => {
  console logging.enabled = true;
});
```

### `'command:*'`

Emitted when any command is executed (catch-all).

```typescript
program.on("command:*", (operands) => {
  console.log("Command executed:", operands);
});
```

---

## Error Handling

### CommanderError

```typescript
import { CommanderError } from "commander";

try {
  program.parse();
} catch (err) {
  if (err instanceof CommanderError) {
    console.error("Commander error:", err.code);
    process.exit(err.exitCode);
  }
  throw err;
}
```

### InvalidOptionArgumentError

```typescript
import { InvalidOptionArgumentError } from "commander";

program
  .option("--port <number>", "Port number")
  .action((options: { port: string }) => {
    const port = parseInt(options.port, 10);
    if (isNaN(port)) {
      throw new InvalidOptionArgumentError("Port must be a number");
    }
  });
```

---

## TypeScript Support

### Type Definitions

Commander.js includes built-in TypeScript definitions.

```typescript
import { Command, Option, CommandOptions } from "commander";

// No need for @types/commander
```

### Typed Options

```typescript
interface MyOptions {
  verbose: boolean;
  port: number;
  config?: string;
}

program
  .option("-v, --verbose")
  .option("-p, --port <number>")
  .option("-c, --config <path>")
  .action((options: MyOptions) => {
    // Fully typed options
  });
```

### Custom Command Types

```typescript
interface CustomCommand extends Command {
  customMethod(): void;
}

const program = new Command() as CustomCommand;
program.customMethod = () => {
  /* ... */
};
```

---

## Complete Example

```typescript
#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program.name("my-cli").description("My awesome CLI tool").version("1.0.0");

// Global options
program
  .option("-v, --verbose", "Verbose output")
  .option("-c, --config <path>", "Config file path");

// Command with arguments and options
program
  .command("build <target>")
  .description("Build the project")
  .option("-w, --watch", "Watch mode")
  .option("-o, --output <path>", "Output directory", "./dist")
  .action(
    (
      target: string,
      options: {
        watch: boolean;
        output: string;
        verbose?: boolean;
        config?: string;
      },
    ) => {
      const globalOpts = program.opts();
      console.log("Building " + target);
      console.log("Output: " + options.output);
      if (options.watch) console.log("Watch mode enabled");
      if (globalOpts.verbose) console.log("Verbose logging");
    },
  );

// Another command
program
  .command("deploy <env>")
  .description("Deploy to environment")
  .requiredOption("-u, --user <name>", "Deployment user")
  .action((env: string, options: { user: string }) => {
    console.log(`Deploying to ${env} as user ${options.user}`);
  });

program.parse();
```

---

For more information, see the [official Commander.js documentation](https://github.com/tj/commander.js).
