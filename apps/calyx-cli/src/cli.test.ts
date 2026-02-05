import { describe, test, expect, beforeEach } from "bun:test";
import { program, resetConfigForTesting, getParsedConfig } from "./cli.ts";
import {
  VALID_MODELS,
  VALID_AGENTS,
  DEFAULT_GLOBAL_OPTIONS,
} from "./types/cli.ts";

/**
 * CLI Parsing Logic Tests
 *
 * This test suite validates the command-line argument parsing logic
 * for the Calyx CLI tool. Tests cover:
 *
 * 1. Parsing: Argument parsing and option handling
 * 2. Config Management: Configuration storage and retrieval
 * 3. Validation: Model and agent validation
 * 4. Edge Cases: Error handling and boundary conditions
 *
 * Baseline captures (apps/calyx-cli/fixtures/):
 * - baseline-help.txt: Expected help text output
 * - baseline-error.txt: Expected validation error output
 */

describe("CLI Parsing Logic", () => {
  describe("Chat Command Parsing", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("parses chat command with prompt", async () => {
      await program.parseAsync(["node", "cli", "chat", "hello world"]);
      const config = getParsedConfig();
      expect(config).toBeDefined();
      expect(config?.command).toBe("chat");
      expect(config?.prompt).toBe("hello world");
      expect(config?.model).toBe("auto"); // default
      expect(config?.agent).toBe("prometheus"); // default
    });

    test("parses chat command with session option", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "chat",
        "hello",
        "--session",
        "abc123",
      ]);
      const config = getParsedConfig();
      expect(config?.command).toBe("chat");
      expect(config?.chatOptions?.session).toBe("abc123");
    });

    test("parses chat command with new-session flag", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "chat",
        "test",
        "--new-session",
      ]);
      const config = getParsedConfig();
      expect(config?.chatOptions?.newSession).toBe(true);
    });

    test("parses chat command with prompt-interactive flag", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "chat",
        "test",
        "--prompt-interactive",
      ]);
      const config = getParsedConfig();
      expect(config?.chatOptions?.promptInteractive).toBe(true);
    });

    test("parses chat command with all options combined", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "chat",
        "complex prompt",
        "--model",
        "pro",
        "--agent",
        "oracle",
        "--temperature",
        "1.5",
        "--session",
        "sess123",
        "--debug",
        "--verbose",
      ]);
      const config = getParsedConfig();
      expect(config?.command).toBe("chat");
      expect(config?.prompt).toBe("complex prompt");
      expect(config?.model).toBe("pro");
      expect(config?.agent).toBe("oracle");
      expect(config?.temperature).toBe(1.5);
      expect(config?.chatOptions?.session).toBe("sess123");
      expect(config?.debug).toBe(true);
      expect(config?.verbose).toBe(true);
    });
  });

  describe("Ask Command Parsing", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("parses ask command with prompt", async () => {
      await program.parseAsync(["node", "cli", "ask", "what is git?"]);
      const config = getParsedConfig();
      expect(config?.command).toBe("ask");
      expect(config?.prompt).toBe("what is git?");
    });

    test("parses ask command with file option", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "ask",
        "help me",
        "--file",
        "question.txt",
      ]);
      const config = getParsedConfig();
      expect(config?.askOptions?.file).toBe("question.txt");
    });

    test("parses ask command with context paths", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "ask",
        "fix bug",
        "--context",
        "src/",
        "tests/",
      ]);
      const config = getParsedConfig();
      expect(config?.askOptions?.context).toEqual(["src/", "tests/"]);
    });

    test("parses ask command with global options", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "ask",
        "help",
        "--model",
        "flash",
        "--temperature",
        "0.5",
      ]);
      const config = getParsedConfig();
      expect(config?.model).toBe("flash");
      expect(config?.temperature).toBe(0.5);
    });
  });

  describe("Global Options Parsing", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("parses --model option with valid values", async () => {
      for (const model of VALID_MODELS) {
        resetConfigForTesting();
        await program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--model",
          model,
        ]);
        const config = getParsedConfig();
        expect(config?.model).toBe(model);
      }
    });

    test("parses --agent option with valid values", async () => {
      for (const agent of VALID_AGENTS) {
        resetConfigForTesting();
        await program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--agent",
          agent,
        ]);
        const config = getParsedConfig();
        expect(config?.agent).toBe(agent);
      }
    });

    test("parses --temperature option with valid range", async () => {
      const testCases = [
        { value: "0.0", expected: 0.0 },
        { value: "0.7", expected: 0.7 },
        { value: "1.5", expected: 1.5 },
        { value: "2.0", expected: 2.0 },
      ];
      for (const { value, expected } of testCases) {
        resetConfigForTesting();
        await program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--temperature",
          value,
        ]);
        const config = getParsedConfig();
        expect(config?.temperature).toBe(expected);
      }
    });

    test("parses --debug flag", async () => {
      await program.parseAsync(["node", "cli", "chat", "test", "--debug"]);
      const config = getParsedConfig();
      expect(config?.debug).toBe(true);
    });

    test("parses --verbose flag", async () => {
      await program.parseAsync(["node", "cli", "chat", "test", "--verbose"]);
      const config = getParsedConfig();
      expect(config?.verbose).toBe(true);
    });

    test("parses short options -m, -a, -d, -v", async () => {
      await program.parseAsync([
        "node",
        "cli",
        "chat",
        "test",
        "-m",
        "pro",
        "-a",
        "oracle",
        "-d",
        "-v",
      ]);
      const config = getParsedConfig();
      expect(config?.model).toBe("pro");
      expect(config?.agent).toBe("oracle");
      expect(config?.debug).toBe(true);
      expect(config?.verbose).toBe(true);
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("throws error for invalid model", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--model",
          "invalid",
        ]),
      ).rejects.toThrow();
    });

    test("throws error for invalid agent", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--agent",
          "invalid",
        ]),
      ).rejects.toThrow();
    });

    test("throws error for temperature below minimum", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--temperature",
          "-0.1",
        ]),
      ).rejects.toThrow();
    });

    test("throws error for temperature above maximum", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--temperature",
          "2.1",
        ]),
      ).rejects.toThrow();
    });

    test("throws error for non-numeric temperature", async () => {
      await expect(
        program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--temperature",
          "abc",
        ]),
      ).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("applies default config when no arguments provided", async () => {
      await program.parseAsync(["node", "cli"]);
      const config = getParsedConfig();
      expect(config).toBeDefined();
      expect(config?.command).toBe("chat"); // default command
      expect(config?.model).toBe(DEFAULT_GLOBAL_OPTIONS.model);
      expect(config?.agent).toBe(DEFAULT_GLOBAL_OPTIONS.agent);
      expect(config?.temperature).toBe(DEFAULT_GLOBAL_OPTIONS.temperature);
    });

    // Note: Skipping --help and --version tests because commander.js
    // calls process.exit() which terminates the test runner
    test.skip("handles --help flag successfully", async () => {
      // Should not throw, should output help and exit
      await expect(
        program.parseAsync(["node", "cli", "--help"]),
      ).rejects.toThrow(); // commander exits with help
    });

    test.skip("handles --version flag successfully", async () => {
      // Should not throw, should output version and exit
      await expect(
        program.parseAsync(["node", "cli", "--version"]),
      ).rejects.toThrow(); // commander exits with version
    });

    test("handles empty prompt in chat command", async () => {
      await program.parseAsync(["node", "cli", "chat"]);
      const config = getParsedConfig();
      expect(config?.command).toBe("chat");
      expect(config?.prompt).toBeUndefined();
    });

    test("handles special characters in prompt", async () => {
      const specialPrompt =
        'Test with "quotes", `backticks`, $symbols, and @mentions #tags';
      await program.parseAsync(["node", "cli", "chat", specialPrompt]);
      const config = getParsedConfig();
      expect(config?.prompt).toBe(specialPrompt);
    });

    test("handles unicode characters in prompt", async () => {
      const unicodePrompt = "Hello 世界 🌍 🚀";
      await program.parseAsync(["node", "cli", "chat", unicodePrompt]);
      const config = getParsedConfig();
      expect(config?.prompt).toBe(unicodePrompt);
    });

    test("handles temperature at boundary values", async () => {
      const boundaryCases = ["0.0", "2.0"];
      for (const temp of boundaryCases) {
        resetConfigForTesting();
        await program.parseAsync([
          "node",
          "cli",
          "chat",
          "test",
          "--temperature",
          temp,
        ]);
        const config = getParsedConfig();
        expect(config?.temperature).toBe(parseFloat(temp));
      }
    });

    test("resets config between test runs", async () => {
      // First run
      await program.parseAsync(["node", "cli", "chat", "first"]);
      let config = getParsedConfig();
      expect(config?.prompt).toBe("first");

      // Reset and second run
      resetConfigForTesting();
      config = getParsedConfig();
      expect(config).toBeNull();

      await program.parseAsync(["node", "cli", "chat", "second"]);
      config = getParsedConfig();
      expect(config?.prompt).toBe("second");
    });
  });

  describe("Config Management", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("stores config after parsing", async () => {
      expect(getParsedConfig()).toBeNull();
      await program.parseAsync(["node", "cli", "chat", "test"]);
      expect(getParsedConfig()).toBeDefined();
    });

    test("resets config to null", () => {
      resetConfigForTesting();
      expect(getParsedConfig()).toBeNull();
    });
  });
});
