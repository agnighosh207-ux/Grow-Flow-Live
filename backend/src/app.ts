import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { authSyncMiddleware } from "./middlewares/authSyncMiddleware";
import { enforceGenerationLimit } from "./middlewares/generationLimiter";
import { guardianMiddleware } from "./middlewares/guardian";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, systemSettingsTable, securityLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { validateAIConfig } from "./services/ai-engine";

validateAIConfig();

import { isShuttingDown } from "./lib/state.js";

const app: Express = express();

// ─── 1. HEALTH CHECK — Must be the absolute first route (no middleware) ──────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── 2. Standard middleware ──────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet({ 
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "*.clerk.accounts.dev", "clerk.growflowai.space", "checkout.razorpay.com"],
      connectSrc: ["'self'", "*.clerk.accounts.dev", "clerk.growflowai.space", "api.razorpay.com", "v1.generate.growflowai.space"],
      imgSrc: ["'self'", "data:", "blob:", "*.clerk.com", "images.unsplash.com", "checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      frameSrc: ["'self'", "checkout.razorpay.com"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req: any) => req.url === "/api/health" },
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── 2.2 Graceful shutdown check ───────────────────────────────────────────
app.use((req, res, next) => {
  if (isShuttingDown && req.path.startsWith("/api/")) {
    res.status(503).json({ error: "Server is restarting, please retry in a moment" });
    return;
  }
  next();
});

// ─── 3. Clerk proxy (must be before express.json) ────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ─── 4. CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .filter(Boolean)
  .map(o => o.trim());

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // 1. Explicitly reject "null" origin (security risk from file:// or sandboxed iframes)
      if (origin === "null") {
        return callback(new Error(`Origin "null" not allowed by CORS`));
      }

      // 2. Allow requests with no origin (e.g. server-to-server, mobile apps, or curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // 3. Check allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== "production" && (origin.startsWith("http://localhost:") || origin.endsWith(".vercel.app"))) {
        // Allow localhost and Vercel previews in non-production
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  }),
);

// ─── 5. Body parsing ────────────────────────────────────────────────────────
app.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ─── 6. Auth (with timeout protection) ──────────────────────────────────────
let clerkMw: any = (req: any, res: any, next: any) => next();
try {
  clerkMw = clerkMiddleware();
} catch (err: any) {
  logger.error(`[CRITICAL] Failed to initialize Clerk Middleware: ${err?.message}. Authentication is disabled.`);
}
app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/api/subscription/webhook")) return next();
  
  const timer = setTimeout(() => {
    logger.error("[CRITICAL] Clerk middleware timed out after 15s. Rejecting request for security.");
    next(new Error("Authentication timeout"));
  }, 15000);
  
  clerkMw(req, res, (err?: any) => {
    clearTimeout(timer);
    if (err) return next(err);
    next();
  });
});
app.use(authSyncMiddleware);
app.use(guardianMiddleware);

// ─── 7. Security logging (Only log failures to avoid DB saturation) ─────────
app.use((req: any, res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") {
    res.on("finish", async () => {
      // Only log non-2xx responses. EXCLUDE 429 to avoid DB saturation/DOS during an attack
      if (res.statusCode >= 400 && res.statusCode !== 429) {
        try {
          await db.insert(securityLogsTable).values({
            id: crypto.randomUUID(),
            userId: (req as any).userId || "anonymous",
            eventType: res.statusCode === 401 || res.statusCode === 403 ? "AUTH_FAILURE" : "API_REQUEST",
            ipAddress: req.ip || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            metadata: { method: req.method, path: req.path, statusCode: res.statusCode }
          });
        } catch (err) {
          logger.error({ err, path: req.path }, "FAILED_TO_WRITE_SECURITY_LOG");
        }
      }
    });
  }
  next();
});

// ─── 8. Maintenance mode (cached) ──────────────────────────────────────────
let maintenanceModeCache = { value: false, lastChecked: 0 };

app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    if (req.path.startsWith("/api/admin") || req.path === "/api/health") {
      return next(); 
    }
    
    const now = Date.now();
    if (now - maintenanceModeCache.lastChecked > 30000) {
      try {
        const [settings] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global"));
        maintenanceModeCache = { value: !!settings?.maintenanceMode, lastChecked: now };
      } catch (err) {
        logger.error({ err }, "Maintenance mode DB check failed — preserving last known state");
        // Preserve last known state rather than assuming maintenance
        // This prevents a brief DB timeout from locking out all users
        maintenanceModeCache = { value: maintenanceModeCache.value, lastChecked: now - 25000 };
      }
    }

    if (maintenanceModeCache.value) {
      res.status(503).json({ 
        error: "Service Unavailable: Maintenance Mode",
        message: "We are currently performing scheduled maintenance. Please check back in a few minutes."
      });
      return;
    }
  }
  next();
});

// ─── 9. Rate limiting ──────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again." },
  skip: (req) => req.path.startsWith(CLERK_PROXY_PATH),
});

app.use("/api", generalLimiter);

// ─── 10. API router ─────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 11. Frontend serving (production only) ─────────────────────────────────
if (process.env.NODE_ENV === "production" || process.env.APP_STATUS === "PRODUCTION" || process.env.APP_STATUS === "BETA") {
  const frontendPath = path.resolve(__dirname, "../../frontend/dist/public");
  
  // Static assets (hashed files) can be cached for a long time
  app.use(express.static(frontendPath, {
    maxAge: '1y',
    etag: true,
    immutable: true,
    index: false 
  }));
  
  // SPA catch-all
  app.get(/(.*)/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    
    // Ensure index.html is NEVER cached so users always get the latest version
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.sendFile(path.join(frontendPath, "index.html"), (err) => {
      if (err) {
        res.status(200).send("GrowFlow AI API is running. Frontend is hosted separately.");
      }
    });
  });
}

// ─── 12. Error handler ──────────────────────────────────────────────────────
app.use((err: any, req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled application error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default app;
