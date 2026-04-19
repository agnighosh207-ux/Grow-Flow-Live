import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 1.0, 
      profilesSampleRate: 1.0, 
    });
    console.log("[Sentry] Initialized error tracking");
  } else {
    console.log("[Sentry] Skipped initialization (No DSN provided)");
  }
}

export { Sentry };
