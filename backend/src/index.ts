import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
const envFiles = [path.join(rootDir, ".env"), path.join(rootDir, ".env.example")];
const loadedEnv = envFiles.find((file) => fs.existsSync(file));
if (loadedEnv) {
  dotenv.config({ path: loadedEnv });
}

import { initSentry, Sentry } from "./sentry.js";
initSentry();

const { default: app } = await import("./app.js");
const { logger } = await import("./lib/logger.js");

if (!loadedEnv) {
  logger.warn({ envFiles }, "No .env or .env.example file found; environment variables must be provided.");
}

const desiredPort = Number(process.env.PORT) || 3000;
const fallbackPorts = [3001, 3002, 3003, 3004];
const portsToTry = [desiredPort, ...fallbackPorts.filter((port) => port !== desiredPort)];

function listenOnPort(port: number) {
  return new Promise<number>((resolve, reject) => {
    const server = app.listen(port);

    server.once("listening", () => resolve(port));
    server.once("error", (err: any) => {
      if (err?.code === "EADDRINUSE") {
        server.close(() => {});
        reject(err);
        return;
      }
      reject(err);
    });
  });
}

let boundPort: number | undefined;
for (const port of portsToTry) {
  try {
    boundPort = await listenOnPort(port);
    break;
  } catch (err: any) {
    if (err?.code === "EADDRINUSE") {
      logger.warn({ port }, `Port ${port} is already in use; trying the next available port.`);
      continue;
    }
    Sentry.captureException(err);
    logger.error({ err, port }, "Failed to start server");
    process.exit(1);
  }
}

if (!boundPort) {
  logger.error({ ports: portsToTry }, "Unable to bind the server to any available port.");
  process.exit(1);
}

logger.info({ port: boundPort }, `Server listening on http://localhost:${boundPort}`);
