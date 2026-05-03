import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../../middlewares/planMiddleware";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";

const router: IRouter = Router();

router.post("/login", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceId, email } = req.body as { deviceId?: string; email?: string };
    const updates: any = { lastLoginAt: new Date() };
    if (deviceId) updates.deviceId = deviceId;
    if (email) updates.email = email;

    await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update login info." });
  }
});

export default router;
