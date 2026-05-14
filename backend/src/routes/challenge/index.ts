import { Router } from "express";
import { db, challengeParticipantsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../middlewares/planMiddleware";

const router = Router();

router.post("/join", requireAuth, async (req: any, res) => {
  const userId = req.userId;
  const challengeId = "30-day-creator-2026";

  try {
    const [existing] = await db.select().from(challengeParticipantsTable)
      .where(and(eq(challengeParticipantsTable.userId, userId), eq(challengeParticipantsTable.challengeId, challengeId)));

    if (existing) {
      return res.status(400).json({ error: "Already joined this challenge" });
    }

    await db.insert(challengeParticipantsTable).values({
      userId,
      challengeId,
      startDate: new Date(),
      completedDays: 0,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Join challenge error:", err);
    return res.status(500).json({ error: "Failed to join challenge" });
  }
});

router.get("/certificate", requireAuth, async (req: any, res) => {
  const userId = req.userId;
  const challengeId = "30-day-creator-2026";

  try {
    const [challenge] = await db.select().from(challengeParticipantsTable)
      .where(and(eq(challengeParticipantsTable.userId, userId), eq(challengeParticipantsTable.challengeId, challengeId)));

    if (!challenge || !challenge.isCompleted) {
      return res.status(403).json({ error: "Challenge not completed yet" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const name = user?.displayName || user?.firstName || "Creator";
    const date = new Date(challenge.lastCompletedAt || new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const width = 1200;
    const height = 800;

    // Generate SVG certificate — returned as SVG (no sharp required)
    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#030303"/>
        <rect x="40" y="40" width="1120" height="720" fill="none" stroke="#06b6d4" stroke-width="4" rx="20"/>
        <rect x="50" y="50" width="1100" height="700" fill="none" stroke="rgba(6,182,212,0.1)" stroke-width="1" rx="15"/>
        <defs>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.1" />
            <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.1" />
          </linearGradient>
        </defs>
        <rect x="40" y="40" width="1120" height="720" fill="url(#glow)" rx="20"/>
        <text x="600" y="200" font-family="Arial" font-size="24" font-weight="900" fill="#06b6d4" text-anchor="middle" letter-spacing="8">CERTIFICATE OF ACHIEVEMENT</text>
        <text x="600" y="280" font-family="Arial" font-size="16" font-weight="700" fill="rgba(255,255,255,0.4)" text-anchor="middle">THIS IS TO CERTIFY THAT</text>
        <text x="600" y="380" font-family="Arial" font-size="84" font-weight="900" fill="#ffffff" text-anchor="middle">${name.toUpperCase()}</text>
        <line x1="300" y1="410" x2="900" y2="410" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
        <text x="600" y="480" font-family="Arial" font-size="20" font-weight="500" fill="rgba(255,255,255,0.6)" text-anchor="middle">HAS SUCCESSFULLY COMPLETED THE</text>
        <text x="600" y="520" font-family="Arial" font-size="32" font-weight="900" fill="#8b5cf6" text-anchor="middle">30-DAY CREATOR CONSISTENCY CHALLENGE</text>
        <text x="600" y="580" font-family="Arial" font-size="16" font-weight="500" fill="rgba(255,255,255,0.4)" text-anchor="middle">BY GENERATING CONTENT EVERY SINGLE DAY FOR 30 DAYS STRAIGHT.</text>
        <g transform="translate(600, 680)">
          <text x="-200" y="0" font-family="Arial" font-size="14" font-weight="700" fill="rgba(255,255,255,0.4)" text-anchor="middle">DATE COMPLETED</text>
          <text x="-200" y="30" font-family="Arial" font-size="18" font-weight="900" fill="#ffffff" text-anchor="middle">${date}</text>
          <text x="200" y="0" font-family="Arial" font-size="14" font-weight="700" fill="rgba(255,255,255,0.4)" text-anchor="middle">ISSUED BY</text>
          <text x="200" y="30" font-family="Arial" font-size="18" font-weight="900" fill="#06b6d4" text-anchor="middle">GROWFLOW AI ACADEMY</text>
        </g>
        <circle cx="1000" cy="150" r="60" fill="rgba(6,182,212,0.1)" />
        <path d="M1000 110 L1015 140 L1045 140 L1020 160 L1030 190 L1000 170 L970 190 L980 160 L955 140 L985 140 Z" fill="#06b6d4" />
      </svg>
    `;

    // Serve the certificate as an SVG (no native dependencies required)
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", `attachment; filename="GrowFlow-Certificate-${name}.svg"`);
    return res.send(svg);
  } catch (err) {
    console.error("Certificate generation error:", err);
    return res.status(500).json({ error: "Failed to generate certificate" });
  }
});

export default router;
