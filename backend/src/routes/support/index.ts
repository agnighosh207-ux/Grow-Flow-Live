import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, supportMessagesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.post("/support/message", requireAuth, async (req: any, res): Promise<void> => {
  const { subject, message } = req.body;

  if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
    res.status(400).json({ error: "Subject is required (min 3 characters)" });
    return;
  }
  if (!message || typeof message !== "string" || message.trim().length < 10) {
    res.status(400).json({ error: "Message is required (min 10 characters)" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  const email = user?.email || req.body.email || "unknown@user.com";

  await db.insert(supportMessagesTable).values({
    userId: req.userId,
    email,
    subject: subject.trim(),
    message: message.trim(),
    status: "open",
  });

  try {
    await resend.emails.send({
      from: "Grow Flow AI <onboarding@resend.dev>",
      to: "growflowhelp@gmail.com",
      subject: `[Support Query] ${subject.trim()}`,
      html: `
        <h2>New Support Query</h2>
        <p><strong>From User:</strong> ${email}</p>
        <p><strong>User ID:</strong> ${req.userId}</p>
        <hr />
        <h3>${subject.trim()}</h3>
        <p>${message.trim().replace(/\n/g, '<br />')}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send support email via Resend:", error);
  }

  res.json({ success: true, message: "Support message received. We'll get back to you within 24 hours at growflowhelp@gmail.com" });
});

export default router;
