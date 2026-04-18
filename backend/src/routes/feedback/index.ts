import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, betaFeedbackTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.sessionClaims?.userId || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
};

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

router.post("/feedback", requireAuth, async (req: any, res): Promise<void> => {
  const { rating, comment, trigger, page } = req.body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    return;
  }

  if (!trigger || typeof trigger !== "string") {
    res.status(400).json({ error: "Trigger is required" });
    return;
  }

  if (!page || typeof page !== "string") {
    res.status(400).json({ error: "Page is required" });
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
    await resend.emails.send({
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

router.get("/feedback", requireAuth, requireOwner, async (_req: any, res): Promise<void> => {
  const rows = await db
    .select()
    .from(betaFeedbackTable)
    .orderBy(desc(betaFeedbackTable.createdAt));

  res.json({ feedback: rows });
});

export default router;
