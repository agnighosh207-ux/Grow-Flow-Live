import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, betaFeedbackTable, usersTable, npsResponsesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { requireAuth } from "../../middlewares/planMiddleware";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "");
}

const router: IRouter = Router();

const requireOwner = (req: any, res: any, next: any) => {
  const ownerUserId = process.env.OWNER_USER_ID;
  if (!ownerUserId) {
    res.status(403).json({ error: "Feedback review not configured" });
    return;
  }
  if (req.userId !== ownerUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};

router.post("/", requireAuth, async (req: any, res): Promise<void> => {
  const { rating, comment, trigger, page } = req.body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    return;
  }

  if (typeof trigger !== "string" || !trigger.trim()) {
    res.status(400).json({ error: "Trigger must be a valid string" });
    return;
  }

  if (typeof page !== "string" || !page.trim()) {
    res.status(400).json({ error: "Page must be a valid string" });
    return;
  }

  await db.insert(betaFeedbackTable).values({
    userId: req.userId,
    rating,
    comment: comment && typeof comment === "string" ? comment.trim() || null : null,
    trigger: trigger.trim(),
    page: page.trim(),
  });

  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).then(r => r[0]);
    const userEmail = user?.email || req.userId;
    
    // You can only send FROM onboarding@resend.dev until your domain is verified in Resend.
    await getResend().emails.send({
      from: "Grow Flow AI <onboarding@resend.dev>",
      to: "growflowhelp@gmail.com",
      subject: `New Feedback Received on ${page.trim()}`,
      html: `
        <h2>New Feedback</h2>
        <p><strong>From User:</strong> ${userEmail}</p>
        <p><strong>Page:</strong> ${page.trim()}</p>
        <p><strong>Trigger:</strong> ${trigger.trim()}</p>
        <p><strong>Rating:</strong> ${rating} / 5</p>
        <p><strong>Comment:</strong> ${comment || "No comment provided."}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send feedback email:", error);
  }

  res.json({ success: true });
});

router.get("/", requireAuth, requireOwner, async (_req: any, res): Promise<void> => {
  const rows = await db
    .select()
    .from(betaFeedbackTable)
    .orderBy(desc(betaFeedbackTable.createdAt));

  res.json({ feedback: rows });
});

router.post("/nps/respond", requireAuth, async (req: any, res): Promise<void> => {
  const { score, comment, trigger } = req.body;
  const userId = req.userId;

  if (typeof score !== "number" || score < 0 || score > 10) {
    res.status(400).json({ error: "Score must be a number between 0 and 10" });
    return;
  }

  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).then(r => r[0]);
    
    await db.insert(npsResponsesTable).values({
      userId,
      score,
      comment: (typeof comment === "string") ? comment.trim() || null : null,
      trigger: (typeof trigger === "string") ? trigger.trim() : "unknown",
      planTier: user?.planTier,
      generationsCount: user?.totalGenerations,
    });

    const userEmail = user?.email || userId;

    if (score >= 9) {
      // Promoter: ask for review
      await getResend().emails.send({
        from: "GrowFlow AI <onboarding@resend.dev>",
        to: userEmail,
        subject: "Thank you! Can you leave us a review?",
        html: `
          <h3>Wow, ${score}/10! Thank you!</h3>
          <p>We are so glad you're loving GrowFlow AI. Since you're a fan, would you mind leaving us a quick review on Twitter or the App Store?</p>
          <p>It helps us a lot!</p>
          <a href="https://twitter.com/intent/tweet?text=I've%20been%20using%20GrowFlow%20AI%20to%20grow%20my%20content%20and%20it's%20incredible!%20🚀" style="background:#00F2FF; color:black; padding:10px 20px; text-decoration:none; border-radius:10px; font-weight:bold;">Share on Twitter</a>
        `,
      }).catch(console.error);
    } else if (score <= 6) {
      // Detractor: notify Agnish
      await getResend().emails.send({
        from: "GrowFlow AI <onboarding@resend.dev>",
        to: "agnighosh207@gmail.com",
        subject: `⚠️ Detractor: ${userEmail} gave ${score}/10`,
        html: `
          <h2>Action Required: Detractor Follow-up</h2>
          <p><strong>User:</strong> ${userEmail}</p>
          <p><strong>Score:</strong> ${score}/10</p>
          <p><strong>Comment:</strong> ${comment || "No comment provided."}</p>
          <p>Personal followup is recommended to prevent churn.</p>
        `,
      }).catch(console.error);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("NPS Response Error:", err);
    res.status(500).json({ error: "Failed to save NPS response" });
  }
});

export default router;
