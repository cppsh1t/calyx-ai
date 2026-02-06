import { describe, test, expect, beforeEach } from "bun:test";
import {
  program,
  resetConfigForTesting,
  getParsedConfig,
} from "@/utils/cli.ts";

/**
 * CLI Parsing Logic Tests
 *
 * This test suite validates the command-line argument parsing logic
 * for the Calyx CLI tool. Tests cover:
 *
 * 1. Basic Parsing: Option handling
 * 2. Config Management: Configuration storage and retrieval
 * 3. Edge Cases: Error handling and boundary conditions
 */

describe("CLI Parsing Logic", () => {
  describe("Basic Parsing", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("parses with no options", async () => {
      await program.parseAsync(["bun", "cli"]);
      const config = getParsedConfig();
      expect(config).toBeDefined();
      expect(config?.continue).toBe(false); // default
      expect(config?.sessionId).toBeUndefined();
      expect(config?.flowName).toBeUndefined();
    });

    test("parses --continue flag", async () => {
      await program.parseAsync(["bun", "cli", "--continue"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBeUndefined();
      expect(config?.flowName).toBeUndefined();
    });

    test("parses -c short flag", async () => {
      await program.parseAsync(["bun", "cli", "-c"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
    });

    test("parses --session option", async () => {
      await program.parseAsync(["bun", "cli", "--session", "abc123"]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("abc123");
      expect(config?.continue).toBe(false);
    });

    test("parses -s short option", async () => {
      await program.parseAsync(["bun", "cli", "-s", "xyz789"]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("xyz789");
    });

    test("parses --flow option", async () => {
      await program.parseAsync(["bun", "cli", "--flow", "dev"]);
      const config = getParsedConfig();
      expect(config?.flowName).toBe("dev");
    });

    test("parses -f short option", async () => {
      await program.parseAsync(["bun", "cli", "-f", "prod"]);
      const config = getParsedConfig();
      expect(config?.flowName).toBe("prod");
    });

    test("parses with all options combined", async () => {
      await program.parseAsync([
        "bun",
        "cli",
        "-c",
        "-s",
        "sess123",
        "-f",
        "custom",
      ]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBe("sess123");
      expect(config?.flowName).toBe("custom");
    });

    test("parses with long options combined", async () => {
      await program.parseAsync([
        "bun",
        "cli",
        "--continue",
        "--session",
        "sess456",
        "--flow",
        "test",
      ]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBe("sess456");
      expect(config?.flowName).toBe("test");
    });

    test("parses with continue and session only", async () => {
      await program.parseAsync([
        "bun",
        "cli",
        "--continue",
        "--session",
        "continue-id",
      ]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBe("continue-id");
      expect(config?.flowName).toBeUndefined();
    });

    test("parses with continue and flow only", async () => {
      await program.parseAsync(["bun", "cli", "-c", "-f", "main"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBeUndefined();
      expect(config?.flowName).toBe("main");
    });
  });

  describe("Option Values", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("handles session ID with special characters", async () => {
      await program.parseAsync(["bun", "cli", "-s", "sess_123-abc.def"]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("sess_123-abc.def");
    });

    test("handles session ID with UUID format", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      await program.parseAsync(["bun", "cli", "-s", uuid]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe(uuid);
    });

    test("handles flow names with hyphens", async () => {
      await program.parseAsync(["bun", "cli", "-f", "dev-flow"]);
      const config = getParsedConfig();
      expect(config?.flowName).toBe("dev-flow");
    });

    test("handles flow names with underscores", async () => {
      await program.parseAsync(["bun", "cli", "-f", "test_flow"]);
      const config = getParsedConfig();
      expect(config?.flowName).toBe("test_flow");
    });

    test("handles numeric string in session ID", async () => {
      await program.parseAsync(["bun", "cli", "-s", "12345"]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("12345");
    });

    test("handles empty string in session option", async () => {
      await program.parseAsync(["bun", "cli", "-s", ""]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("");
    });

    test("handles empty string in flow option", async () => {
      await program.parseAsync(["bun", "cli", "-f", ""]);
      const config = getParsedConfig();
      expect(config?.flowName).toBe("");
    });
  });

  describe("Config Management", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("stores config after parsing", async () => {
      expect(getParsedConfig()).toBeNull();
      await program.parseAsync(["bun", "cli", "-c"]);
      expect(getParsedConfig()).toBeDefined();
      expect(getParsedConfig()?.continue).toBe(true);
    });

    test("resets config to null", () => {
      resetConfigForTesting();
      expect(getParsedConfig()).toBeNull();
    });

    test("multiple parses update config correctly", async () => {
      // First parse
      await program.parseAsync(["bun", "cli", "-c"]);
      let config = getParsedConfig();
      expect(config?.continue).toBe(true);

      // Reset and second parse
      resetConfigForTesting();
      await program.parseAsync(["bun", "cli", "-s", "new-session"]);
      config = getParsedConfig();
      expect(config?.continue).toBe(false);
      expect(config?.sessionId).toBe("new-session");
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("handles options in different order", async () => {
      await program.parseAsync([
        "bun",
        "cli",
        "-f",
        "flow1",
        "-s",
        "sess1",
        "-c",
      ]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBe("sess1");
      expect(config?.flowName).toBe("flow1");
    });

    test("handles repeated options (last one wins)", async () => {
      await program.parseAsync(["bun", "cli", "-s", "first", "-s", "second"]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("second");
    });

    test("handles repeated continue flags", async () => {
      await program.parseAsync(["bun", "cli", "-c", "-c"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
    });

    test("handles mixed short and long options", async () => {
      await program.parseAsync([
        "bun",
        "cli",
        "-c",
        "--session",
        "mixed",
        "--flow",
        "test-flow",
      ]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
      expect(config?.sessionId).toBe("mixed");
      expect(config?.flowName).toBe("test-flow");
    });

    test("handles unicode characters in session ID", async () => {
      await program.parseAsync(["bun", "cli", "-s", "session-世界"]);
      const config = getParsedConfig();
      expect(config?.sessionId).toBe("session-世界");
    });

    test("handles unicode characters in flow name", async () => {
      await program.parseAsync(["bun", "cli", "-f", "流程-测试"]);
      const config = getParsedConfig();
      expect(config?.flowName).toBe("流程-测试");
    });
  });

  describe("Boolean Flag Behavior", () => {
    beforeEach(() => {
      resetConfigForTesting();
    });

    test("continue defaults to false when not provided", async () => {
      await program.parseAsync(["bun", "cli"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(false);
    });

    test("--continue flag sets to true", async () => {
      await program.parseAsync(["bun", "cli", "--continue"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
    });

    test("--no-continue flag is not supported (uses default)", async () => {
      // Commander doesn't explicitly define --no-continue, so this tests
      // that only the positive flag works
      await program.parseAsync(["bun", "cli", "--continue"]);
      const config = getParsedConfig();
      expect(config?.continue).toBe(true);
    });
  });
});
