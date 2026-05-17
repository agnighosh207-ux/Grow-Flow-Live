import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
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

function validateRazorpayConfig() {
  const requiredKeys = [
    'RAZORPAY_LIVE_KEY_ID', 'RAZORPAY_LIVE_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET',
    'RAZORPAY_PLAN_STARTER_MONTHLY', 'RAZORPAY_PLAN_CREATOR_MONTHLY', 'RAZORPAY_PLAN_INFINITY_MONTHLY',
  ];
  const missing = requiredKeys.filter(k => !process.env[k]);
  if (missing.length > 0) {
    logger.error({ missing }, '[RAZORPAY] Missing required environment variables — subscriptions will fail');
  } else {
    logger.info('[RAZORPAY] All required keys present ✓');
  }
}
validateRazorpayConfig();

logger.info({
  environment: process.env.APP_STATUS || process.env.NODE_ENV,
  hasOpenRouter: !!(process.env.OPENROUTER_API_KEY || process.env.PERPLEXITY_AI_API),
  hasGroq: !!process.env.GROQ_API_KEY,
  hasRazorpay: !!process.env.RAZORPAY_LIVE_KEY_ID,
  hasClerk: !!process.env.CLERK_SECRET_KEY,
  hasResend: !!process.env.RESEND_API_KEY,
  hasDatabase: !!process.env.DATABASE_URL,
}, "🚀 GrowFlow AI starting up");

function validateClerkConfig() {
  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    if (process.env.VITE_CLERK_PUBLISHABLE_KEY) {
      process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
    } else if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    }
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    logger.error('[CLERK] CRITICAL: CLERK_PUBLISHABLE_KEY missing');
  } else {
    logger.info('[CLERK] Publishable key configured ✓');
  }

  if (!secretKey) {
    logger.error('[CLERK] CRITICAL: CLERK_SECRET_KEY missing');
  } else if (secretKey.startsWith('sk_test_')) {
    logger.warn('[CLERK] Using TEST secret key — switch to sk_live_ for production');
  } else if (secretKey.startsWith('sk_live_')) {
    logger.info('[CLERK] Live secret key configured ✓');
  }
}
validateClerkConfig();

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
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "blob:", // Required for Clerk/Razorpay workers and dynamic scripts
        "https://clerk.growflowai.space",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://cdn.jsdelivr.net",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        "https://*.razorpay.com",
      ],
      workerSrc: ["'self'", "blob:"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://*.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://*.gstatic.com",
        "data:",
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:", "https://*.clerk.com", "https://img.clerk.com"],
      connectSrc: [
        "'self'",
        "https://api.clerk.com",
        "https://clerk.growflowai.space",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://img.clerk.com",
        "https://clerk-telemetry.com",
        "https://*.clerk-telemetry.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://*.googleapis.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://growflowai.space",
        "https://www.growflowai.space",
        "https://api.growflowai.space",
        "wss://growflowai.space",
        "https://api.groq.com",
        "https://*.razorpay.com",
        "https://checkout.razorpay.com",
      ],
      frameSrc: [
        "'self'",
        "https://checkout.razorpay.com",
        "https://api.razorpay.com",
        "https://*.razorpay.com",
        "https://accounts.google.com",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, 
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
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
  if (isShuttingDown && req.path.startsWith("/api/") && req.path !== "/api/health") {
    res.status(503).json({ error: "Server is restarting, please retry in a moment" });
    return;
  }
  next();
});

// ─── 3. Clerk proxy (must be before express.json) ────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ─── 4. CORS ─────────────────────────────────────────────────────────────────
const defaultOrigins = ["https://growflowai.space", "https://www.growflowai.space"];
const allowedOrigins = [
  ...defaultOrigins,
  ...(process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean).map(o => o.trim())
];

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
// --- FIX (ARCH-5): Increased from 10kb to 50kb to prevent Razorpay webhook payloads from being silently rejected ---
app.use(express.json({
  limit: '50kb',
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// ─── 6. Auth (with timeout protection) ──────────────────────────────────────
app.use(clerkMiddleware());
app.use(authSyncMiddleware);
app.use(guardianMiddleware);

// ─── 7. Security logging (Throttled to avoid DB saturation) ─────────
const securityLogThrottle = new Map<string, number>();
const SECURITY_LOG_THROTTLE_MAX = 5000; // Max entries to prevent memory leak

// --- FIX (MOD-3): Clean up old entries every 10 minutes ---
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of securityLogThrottle.entries()) {
    if (now - timestamp > 10 * 60 * 1000) securityLogThrottle.delete(key);
  }
}, 10 * 60 * 1000);

app.use((req: any, res, next) => {
  if (req.path.startsWith("/api/") && req.path !== "/api/health") {
    res.on("finish", async () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        const ip = req.ip || "unknown";
        const throttleKey = `${ip}:${res.statusCode}:${req.path}`;
        const now = Date.now();
        const lastLog = securityLogThrottle.get(throttleKey) || 0;
        
        // Log at most once every 5 minutes per IP/path combo for auth failures
        if (now - lastLog > 5 * 60 * 1000) {
          // Cap map size to prevent OOM under sustained attack
          if (securityLogThrottle.size >= SECURITY_LOG_THROTTLE_MAX) {
            const oldestKey = securityLogThrottle.keys().next().value;
            if (oldestKey) securityLogThrottle.delete(oldestKey);
          }
          securityLogThrottle.set(throttleKey, now);
          try {
            await db.insert(securityLogsTable).values({
              id: crypto.randomUUID(),
              userId: (req as any).userId || "anonymous",
              eventType: "AUTH_FAILURE",
              ipAddress: ip,
              userAgent: req.get("User-Agent") || "unknown",
              metadata: { method: req.method, path: req.path, statusCode: res.statusCode }
            });
          } catch (err) {
            logger.error({ err, path: req.path }, "FAILED_TO_WRITE_SECURITY_LOG");
          }
        }
      } else if (res.statusCode >= 500) {
        // Log server errors to aggregator but NOT to DB
        logger.error({ 
          userId: (req as any).userId || "anonymous", 
          path: req.path, 
          method: req.method, 
          statusCode: res.statusCode 
        }, "SERVER_ERROR_DETECTED");
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

// Cache static assets aggressively
app.use('/assets', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
});

// Cache API responses that don't change often
app.use('/api/subscription/status', (req, res, next) => {
  res.setHeader('Cache-Control', 'private, max-age=30');  // 30 second cache
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
  validate: false,
});

app.use("/api", generalLimiter);

// ─── 10. API router ─────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 11. Frontend serving (production only) ─────────────────────────────────
import { IS_PRODUCTION } from "./lib/env";

const isProd = IS_PRODUCTION;

if (isProd) {
  // ESM-safe path resolution
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  // Structure: backend/dist/index.mjs -> ../../frontend/dist/public
  const frontendPath = path.resolve(currentDir, "../../frontend/dist/public");
  
  logger.info(`[BOOT] Production mode: Serving frontend from ${frontendPath}`);
  
  // Static assets (hashed files) can be cached for a long time
  app.use(express.static(frontendPath, {
    maxAge: '1y',
    etag: true,
    immutable: true,
    index: false 
  }));
  
  // SPA catch-all
  app.get(/(.*)/, (req, res, next) => {
    // 1. Skip API routes
    if (req.path.startsWith("/api/")) return next();

    // 2. CRITICAL: If the request looks like a static asset (has an extension) 
    // but wasn't caught by express.static, it's a 404.
    // This prevents MIME type mismatch errors (serving index.html as .css/.js)
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
      return res.status(404).send('Not Found');
    }
    
    // Ensure index.html is NEVER cached so users always get the latest version
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const indexPath = path.join(frontendPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        logger.error({ err: err.message, indexPath }, `[ERROR] Failed to send index.html`);
        res.status(200).send(`
          <html>
            <body style="background: #050111; color: white; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center; border: 1px solid #1e293b; padding: 40px; border-radius: 12px; background: #0a051d;">
                <h1 style="color: #00F2FF;">GrowFlow AI</h1>
                <p>API is healthy, but frontend assets are missing.</p>
                <p style="font-size: 12px; color: #475569;">Path: ${frontendPath}</p>
              </div>
            </body>
          </html>
        `);
      }
    });
  });
} else {
  logger.info("[BOOT] Development mode: API only server. Start frontend separately.");
}

if (process.env.NODE_ENV === "development") {
  app.get("/api/debug-ping", (req, res) => {
    res.json({ message: "pong" });
  });

  // --- FIX (CRIT-6): Debug endpoints now require admin authentication ---
  // Previously these were completely unauthenticated, leaking partial secrets.
  app.get("/api/diag/env", async (req: any, res: any) => {
    try {
      const { getAuth } = await import("@clerk/express");
      const auth = getAuth(req);
      const userId = auth?.sessionClaims?.userId || auth?.userId;
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { db: dbImport, usersTable: usersImport } = await import("@workspace/db");
      const { eq: eqImport } = await import("drizzle-orm");
      const [user] = await dbImport.select().from(usersImport).where(eqImport(usersImport.id, userId as string));
      if (!user?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
    } catch (e) { res.status(500).json({ error: "Auth check failed" }); return; }

    const scrubbedEnv = Object.keys(process.env).reduce((acc: any, key) => {
      const val = process.env[key] || "";
      acc[key] = val.length > 8 ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : "***";
      return acc;
    }, {});
    res.json(scrubbedEnv);
  });

  app.get("/api/diag/db-check", async (req: any, res: any) => {
    try {
      const { getAuth } = await import("@clerk/express");
      const auth = getAuth(req);
      const userId = auth?.sessionClaims?.userId || auth?.userId;
      if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
      const { db: dbImport, usersTable: usersImport } = await import("@workspace/db");
      const { eq: eqImport, sql: sqlImport } = await import("drizzle-orm");
      const [user] = await dbImport.select().from(usersImport).where(eqImport(usersImport.id, userId as string));
      if (!user?.isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
      const countResult = await dbImport.select({ count: sqlImport<number>`count(*)` }).from(usersImport);
      res.json({ success: true, count: countResult[0].count });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// ─── 11.5 Cron Endpoint (Triggered via GitHub Action) ──────────────────────
app.post("/api/cron/process", async (req, res) => {
  const secret = req.headers["authorization"]?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    logger.warn({ ip: req.ip }, "Unauthorized cron attempt blocked");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const { processDailyCron } = await import("./services/cron");
    const result = await processDailyCron();
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, "Cron endpoint failure");
    res.status(500).json({ error: err.message });
  }
});

// ─── 12. Error handler (RECOVERY MODE: Exposing errors) ──────────────────────
app.use((err: any, req: any, res: any, _next: any) => {
  const isDev = process.env.NODE_ENV === "development" && !process.env.RAILWAY_ENVIRONMENT;
  
  // Log the full error object for server logs
  logger.error({ 
    err: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    userId: (req as any).userId
  }, "SYSTEMIC_FAILURE_DETECTED");

  const errorDetails = {
    error: "Internal Server Error",
    message: err.message || "Something went wrong.",
    path: req.path,
    method: req.method,
    code: err.code, // Useful for DB errors like 23505
    timestamp: new Date().toISOString(),
    stack: isDev ? err.stack : undefined
  };

  if (!res.headersSent) {
    res.status(500).json(errorDetails);
  }
});

export default app;
