#!/usr/bin/env bun
import { program } from "./cli.ts";

// Parse and execute CLI commands
try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
