import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, FREE_TRIALS_PER_TOOL, isPaidOrTrial, consumeToolTrial } from "../../middlewares/planMiddleware";
import { AuthenticatedRequest } from "../../types";
import { Response } from "express";

const router: IRouter = Router();

router.get("/status", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = (req as any).user;
  if (!user) {
    res.json({ ideas: 0, strategy: 0, hooks: 0, limit: 0, isPaid: false });
    return;
  }
  res.json({
    ideas: 0,
    strategy: 0,
    hooks: 0,
    limit: user.generationsRemaining,
    isPaid: isPaidOrTrial(user),
  });
});

router.post("/use", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { toolKey } = req.body as { toolKey?: string };
  if (!toolKey || !["ideas", "strategy", "hooks"].includes(toolKey)) {
    res.status(400).json({ error: "Invalid tool key." });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    if (!user) { res.status(404).json({ error: "User not found." }); return; }

    if (isPaidOrTrial(user)) {
      res.json({ used: FREE_TRIALS_PER_TOOL, limit: FREE_TRIALS_PER_TOOL, isPaid: true });
      return;
    }

    const newCount = await consumeToolTrial(req.userId, toolKey);
    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    res.json({ used: 0, limit: updatedUser?.generationsRemaining ?? 0, isPaid: false });
  } catch {
    res.status(500).json({ error: "Failed to record trial usage." });
  }
});

export default router;
