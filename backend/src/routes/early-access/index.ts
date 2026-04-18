import { Router, type IRouter } from "express";
import { db, earlyAccessEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/early-access/register", async (req: any, res): Promise<void> => {
  const { email, source = "pricing" } = req.body ?? {};

  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [existing] = await db
      .select()
      .from(earlyAccessEmailsTable)
      .where(eq(earlyAccessEmailsTable.email, normalizedEmail));

    if (existing) {
      res.json({ success: true, alreadyRegistered: true });
      return;
    }

    await db.insert(earlyAccessEmailsTable).values({
      email: normalizedEmail,
      source: typeof source === "string" ? source : "pricing",
    });

    res.json({ success: true, alreadyRegistered: false });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to save your email. Please try again." });
  }
});

export default router;
