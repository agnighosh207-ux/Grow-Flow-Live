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
import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();

// ─── 1. HEALTH CHECK — Must be the absolute first route (no middleware) ──────
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── 2. Standard middleware ──────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
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

// ─── 3. Clerk proxy (must be before express.json) ────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ─── 4. CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000", "https://growflowai.space", "https://www.growflowai.space"];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
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
// Skip Clerk for non-API routes (static files, SPA) — they don't need auth
const clerkMw = clerkMiddleware();
app.use((req: any, res: any, next: any) => {
  if (!req.path.startsWith("/api/")) return next();
  
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

// ─── 7. Maintenance mode (cached) ──────────────────────────────────────────
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
        // DB unavailable — assume not in maintenance
        maintenanceModeCache = { value: false, lastChecked: now };
      }
    }

    if (maintenanceModeCache.value) {
      res.status(503).json({ error: "Service Unavailable: Maintenance Mode" });
      return;
    }
  }
  next();
});

// ─── 8. Rate limiting ──────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again." },
  skip: (req) => req.path.startsWith(CLERK_PROXY_PATH),
});

app.use("/api", generalLimiter);
app.use("/api", generalLimiter);

// ─── 9. API router ─────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 10. Frontend serving (production only) ─────────────────────────────────
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

// ─── 11. Error handler ──────────────────────────────────────────────────────
app.use((err: any, req: any, res: any, _next: any) => {
  logger.error({ err }, "Unhandled application error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default app;
