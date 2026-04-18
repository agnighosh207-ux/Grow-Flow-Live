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
app.use(helmet({ crossOriginResourcePolicy: false }));
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

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());
app.use((req: any, res, next) => {
  const impUser = req.headers["x-impersonate-user"];
  if (impUser && req.auth) {
    const adminEmail = "agnighosh207@gmail.com";
    const userEmail = req.auth.sessionClaims?.email || req.auth.claims?.email;
    if (userEmail === adminEmail) {
      req.auth.userId = impUser;
      if (req.auth.sessionClaims) {
        req.auth.sessionClaims.userId = impUser;
      }
    }
  }
  next();
});
app.use(authSyncMiddleware);

app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/admin")) {
    return next(); // Always allow admin requests so they can toggle maintenance mode
  }
  try {
    const [settings] = await db.select().from(systemSettingsTable).where(eq(systemSettingsTable.id, "global"));
    if (settings?.maintenanceMode) {
      res.status(503).json({ error: "Service Unavailable: Maintenance Mode" });
      return;
    }
  } catch (err) {
    // ignore
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

app.use("/api", router);

// Serve the frontend automatically in production
if (process.env.NODE_ENV === "production" || process.env.APP_STATUS === "BETA") {
  // Use __dirname to safely anchor the path regardless of where the node command is executed from
  const frontendPath = path.resolve(__dirname, "../../frontend/dist/public");
  app.use(express.static(frontendPath));
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err }, "Unhandled application error");
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
