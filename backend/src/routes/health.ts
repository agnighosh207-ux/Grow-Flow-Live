import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { redis } from "../lib/redis";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/", async (_req, res) => {
  const health: {
    status: string;
    timestamp: string;
    version: string;
    environment: string | undefined;
    services: Record<string, string>;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.APP_STATUS || process.env.NODE_ENV,
    services: {
      database: "checking",
      redis: redis ? "connected" : "not configured",
      ai: !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.CEREBRAS_API_KEY) ? "configured" : "missing",
      payments: !!(process.env.RAZORPAY_LIVE_KEY_ID) ? "configured" : "missing",
    },
  };

  // Quick DB connectivity check
  try {
    await db.execute(sql`SELECT 1`);
    health.services.database = "connected";
  } catch {
    health.services.database = "error";
    health.status = "degraded";
  }

  res.status(health.status === "ok" ? 200 : 503).json(health);
});

export default router;
