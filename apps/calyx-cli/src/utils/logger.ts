import pino from "pino";
import envPaths from "env-paths";
import { join } from "node:path";

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
