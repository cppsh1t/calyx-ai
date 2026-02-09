import pino from "pino";
import envPaths from "env-paths";
import { join } from "node:path";
import { cleanupOldLogs } from "./log-cleanup.ts";

const paths = envPaths("calyx-cli", { suffix: "" });
const logDir = join(paths.config, "logs");

const transport = pino.transport({
  target: "pino-roll",
  options: {
    file: join(logDir, "calyx.log"),
    frequency: "daily",
    dateFormat: "yyyy-MM-dd",
    mkdir: true,
    size: "10m",
  },
});

export const logger = pino(
  {
    level: "info",
  },
  transport,
);

export default logger;

// Clean up old log files on logger initialization
// This runs automatically when the logger module is imported
cleanupOldLogs(logDir).catch((err) => {
  // Silently ignore cleanup errors to not disrupt application startup
  logger.warn({ err }, "Failed to clean up old log files");
});
