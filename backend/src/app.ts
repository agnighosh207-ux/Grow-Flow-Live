import express, { type Express } from "express";
import path from "path";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { authSyncMiddleware } from "./middlewares/authSyncMiddleware";
import { enforceGenerationLimit } from "./middlewares/generationLimiter";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, systemSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(compression());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000", "https://growflowai.space", "https://www.growflowai.space"];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use(express.json({
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());
app.use((req: any, res, next) => {
  if (req.path.startsWith("/api/admin")) {
    const impUser = req.headers["x-impersonate-user"];
    if (impUser && req.auth) {
      const adminEmail = process.env.ADMIN_EMAIL;
      const userEmail = req.auth.sessionClaims?.email || req.auth.claims?.email;
      if (adminEmail && userEmail === adminEmail) {
        req.auth.userId = impUser;
        if (req.auth.sessionClaims) {
          req.auth.sessionClaims.userId = impUser;
        }
      }
    }
  }
  next();
});
app.use(authSyncMiddleware);

let maintenanceModeCache = { value: false, lastChecked: 0 };

app.use(async (req, res, next) => {
  // Only apply maintenance mode to API routes
  if (req.path.startsWith("/api/")) {
    // Always allow admin requests so they can toggle maintenance mode
    if (req.path.startsWith("/api/admin")) {
      return next(); 
    }
    
    const now = Date.now();
    if (now - maintenanceModeCache.lastChecked > 30000) {
      try {
        const [settings] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global"));
        maintenanceModeCache = { value: !!settings?.maintenanceMode, lastChecked: now };
      } catch (err) {
        // ignore
      }
    }

    if (maintenanceModeCache.value) {
      res.status(503).json({ error: "Service Unavailable: Maintenance Mode" });
      return;
    }
  }
  next();
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again." },
  skip: (req) => req.path.startsWith(CLERK_PROXY_PATH),
});

// Using enforceGenerationLimit globally for the content endpoints instead


app.use("/api", generalLimiter);
app.use("/api/content/generate", enforceGenerationLimit);
app.use("/api/content/variations", enforceGenerationLimit);
app.use("/api/ideas/generate", enforceGenerationLimit);
app.use("/api/strategy/generate", enforceGenerationLimit);
app.use("/api/hooks/generate", enforceGenerationLimit);
app.use("/api/trends/generate", enforceGenerationLimit);
app.use("/api/content/analyze", enforceGenerationLimit);
app.use("/api/caption/generate", enforceGenerationLimit);
app.use("/api/bio/generate", enforceGenerationLimit);
app.use("/api/daily/generate", enforceGenerationLimit);
app.use("/api/repurpose/generate", enforceGenerationLimit);
app.use("/api/improve-competitor/generate", enforceGenerationLimit);
app.use("/api/content-pack/generate", enforceGenerationLimit);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

// Serve the frontend automatically in production/beta modes
if (process.env.NODE_ENV === "production" || process.env.APP_STATUS === "PRODUCTION" || process.env.APP_STATUS === "BETA") {
  // Use __dirname to safely anchor the path regardless of where the node command is executed from
  const frontendPath = path.resolve(__dirname, "../../frontend/dist/public");
  app.use(express.static(frontendPath));
  
  // Catch-all for SPA routing (must be AFTER all other routes)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err }, "Unhandled application error");
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
