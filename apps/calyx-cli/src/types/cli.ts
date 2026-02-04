/**
 * CLI Configuration Types
 *
 * Type definitions for parsed command-line arguments and options.
 * Used by both CLI parser (cli.ts) and TUI display (tui.tsx).
 */

/**
 * Global command-line options that apply to all commands
 */
export interface GlobalOptions {
  /** Model alias (auto/pro/flash) */
  model: string;
  /** Default agent (prometheus/sisyphus/oracle) */
  agent: string;
  /** Creativity level (0.0-2.0) */
  temperature: number;
  /** Enable debug mode */
  debug: boolean;
  /** Verbose output */
  verbose: boolean;
  /** Config file path (accept only, no reading yet) */
  config?: string;
}

/**
 * Options specific to the 'chat' command
 */
export interface ChatOptions {
  /** Resume session (use "latest" or session ID) */
  session?: string;
  /** Force new session creation */
  newSession?: boolean;
  /** Execute prompt then continue in interactive mode */
  promptInteractive?: boolean;
}

/**
 * Options specific to the 'ask' command
 */
export interface AskOptions {
  /** Read prompt from file */
  file?: string;
  /** Add file/directory as context (@ syntax) */
  context?: string[];
}

/**
 * Complete CLI configuration
 *
 * Merges global options with command-specific options
 */
export interface CLIConfig extends GlobalOptions {
  /** Command name (chat/ask) */
  command: "chat" | "ask";
  /** Optional prompt argument */
  prompt?: string;
  /** Chat-specific options (only if command='chat') */
  chatOptions?: ChatOptions;
  /** Ask-specific options (only if command='ask') */
  askOptions?: AskOptions;
}

/**
 * Default values for global options
 */
export const DEFAULT_GLOBAL_OPTIONS: GlobalOptions = {
  model: "auto",
  agent: "prometheus",
  temperature: 0.7,
  debug: false,
  verbose: false,
};

/**
 * Valid model choices
 */
export const VALID_MODELS = ["auto", "pro", "flash"] as const;

/**
 * Valid agent choices
 */
export const VALID_AGENTS = ["prometheus", "sisyphus", "oracle"] as const;
