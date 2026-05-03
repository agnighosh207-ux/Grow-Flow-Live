import { Router } from "express";
import { requireAuth, requirePlanOrTrial } from "../../middlewares/planMiddleware";
import { db, usersTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { sendWeeklyTrendDigest } from "../../services/email";
import { generateContent, extractJson } from "../../services/ai-engine";

const router = Router();

// Cache map: niche -> { timestamp, data }
const digestCache = new Map<string, { timestamp: number, data: any }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

async function generateDigestForNiche(niche: string) {
  const systemPrompt = "You are a social media trend analyst. Search the web for the latest trending content formats, audio trends, and viral patterns right now.";
  const userPrompt = `What are the top 5 trending content opportunities for ${niche} creators this week? Include specific audio trends on Instagram Reels, trending formats on TikTok/YouTube Shorts, and a high-opportunity topic that is gaining traction. Return only JSON in this exact format: {"trends": [{"type": "string", "description": "string", "platform": "string", "opportunityScore": number, "actionableIdea": "string"}], "weekSummary": "string"}`;

  const completion = await generateContent({
    userPlan: "CREATOR", // Use a rank that matches or falls back to Perplexity if configured
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3
  });
  
  const raw = completion.choices[0]?.message?.content || "";
  const parsed = extractJson(raw);
  if (!parsed || !parsed.trends) {
    throw new Error("Failed to parse AI response for trend digest");
  }
  
  return parsed;
}

router.post("/generate-digest", async (req, res): Promise<void> => {
  // Cron check
  if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      niche: usersTable.niche
    }).from(usersTable).where(
      and(
        eq(usersTable.emailNotifications, true),
        eq(usersTable.weeklyDigest, true),
        isNotNull(usersTable.email)
      )
    );

    const usersByNiche = new Map<string, typeof users>();
    for (const u of users) {
      const niche = u.niche || "General";
      if (!usersByNiche.has(niche)) usersByNiche.set(niche, []);
      usersByNiche.get(niche)!.push(u);
    }

    let processed = 0, succeeded = 0, failed = 0;

    for (const [niche, nicheUsers] of usersByNiche.entries()) {
      try {
        const digest = await generateDigestForNiche(niche);
        
        // Cache it while we are at it
        digestCache.set(niche, { timestamp: Date.now(), data: digest });

        for (const u of nicheUsers) {
          processed++;
          try {
            await sendWeeklyTrendDigest(u.email!, niche, digest.trends, digest.weekSummary);
            succeeded++;
          } catch (e) {
            failed++;
          }
        }
      } catch (e) {
        console.error(`Failed to generate digest for niche ${niche}`, e);
      }
    }

    res.json({ processed, succeeded, failed });
  } catch (error) {
    console.error("Cron Trend Digest Error:", error);
    res.status(500).json({ error: "Failed to run cron job" });
  }
});

router.get("/latest", requireAuth, requirePlanOrTrial("trend-alerts"), async (req: any, res): Promise<void> => {
  try {
    const [user] = await db.select({ niche: usersTable.niche }).from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const niche = user.niche || "General";
    
    // Check cache
    const cached = digestCache.get(niche);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    // Generate fresh
    const fresh = await generateDigestForNiche(niche);
    digestCache.set(niche, { timestamp: Date.now(), data: fresh });
    
    res.json(fresh);
  } catch (error) {
    console.error("Fetch latest digest error:", error);
    res.status(500).json({ error: "Failed to fetch latest digest" });
  }
});

router.post("/preferences", requireAuth, requirePlanOrTrial("trend-alerts"), async (req: any, res): Promise<void> => {
  try {
    const { weeklyDigest } = req.body;
    await db.update(usersTable)
      .set({ weeklyDigest: Boolean(weeklyDigest) })
      .where(eq(usersTable.id, req.userId));
      
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update preference" });
  }
});

export default router;
