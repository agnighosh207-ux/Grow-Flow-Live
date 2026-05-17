import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { db, usersTable, teamsTable, agencySessionsTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getOrCreateUser } from "../../middlewares/planMiddleware";

const router = Router();

// Create team
router.post("/create", requireAuth, async (req: any, res: any) => {
  const userId = req.auth.userId;
  
  // Check if user already has a team
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId)
  });

  if (user?.teamId) {
    res.status(400).json({ error: "User already belongs to a team" });
    return;
  }

  const teamId = nanoid();
  const teamCode = nanoid(10).toUpperCase();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(teamsTable).values({
        id: teamId,
        name: `${(user?.displayName || user?.firstName || "Owner")}'s Team`,
        ownerId: userId,
        planTier: "agency",
        maxSeats: 5,
        seatsUsed: 1,
        billingUserId: userId,
        teamCode: teamCode
      });

      await tx.update(usersTable)
        .set({ teamId, teamRole: "owner" })
        .where(eq(usersTable.id, userId));
    });

    res.json({ success: true, teamId, teamCode });
  } catch (error: any) {
    console.error("Team creation error:", error);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// Get team members
router.get("/members", requireAuth, async (req: any, res: any) => {
  const userId = req.auth.userId;
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId)
  });

  if (!user?.teamId) {
    res.json({ members: [], teamCode: null });
    return;
  }

  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.id, user.teamId)
  });

  const members = await db.query.usersTable.findMany({
    where: eq(usersTable.teamId, user.teamId)
  });

  res.json({ 
    members: members.map(m => ({
      id: m.id,
      name: m.displayName || m.firstName || "User",
      email: m.email,
      role: m.teamRole,
      generationsUsed: m.totalGenerations,
      joinedAt: m.createdAt
    })),
    teamCode: team?.teamCode 
  });
});

// Join team
router.post("/join", requireAuth, async (req: any, res: any) => {
  const { code } = req.body;
  const userId = req.auth.userId;

  if (!code) {
    res.status(400).json({ error: "Team code is required" });
    return;
  }

  const team = await db.query.teamsTable.findFirst({
    where: eq(teamsTable.teamCode, code)
  });

  if (!team) {
    res.status(404).json({ error: "Invalid team code" });
    return;
  }

  if (team.seatsUsed >= team.maxSeats) {
    res.status(400).json({ error: "Team is full" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(usersTable)
        .set({ teamId: team.id, teamRole: "member" })
        .where(eq(usersTable.id, userId));

      await tx.update(teamsTable)
        .set({ seatsUsed: team.seatsUsed + 1 })
        .where(eq(teamsTable.id, team.id));
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Join team error:", error);
    res.status(500).json({ error: "Failed to join team" });
  }
});

// Remove member
router.delete("/member/:id", requireAuth, async (req: any, res: any) => {
  const userId = req.auth.userId;
  const memberIdToRemove = req.params.id;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId)
  });

  if (user?.teamRole !== "owner") {
    res.status(403).json({ error: "Only team owners can remove members" });
    return;
  }

  const memberToRemove = await db.query.usersTable.findFirst({
    where: and(
      eq(usersTable.id, memberIdToRemove),
      eq(usersTable.teamId, user.teamId!)
    )
  });

  if (!memberToRemove) {
    res.status(404).json({ error: "Member not found in your team" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(usersTable)
        .set({ teamId: null, teamRole: null })
        .where(eq(usersTable.id, memberIdToRemove));

      const team = await tx.query.teamsTable.findFirst({
        where: eq(teamsTable.id, user.teamId!)
      });

      if (team) {
        await tx.update(teamsTable)
          .set({ seatsUsed: Math.max(1, team.seatsUsed - 1) })
          .where(eq(teamsTable.id, team.id));
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Remove member error:", error);
    res.status(500).json({ error: "Failed to remove member" });
  }
});

router.get("/sessions", requireAuth, async (req: any, res) => {
  try {
    const userId = req.userId || req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await getOrCreateUser(userId);
    if (user.planType !== "agency") {
      res.status(403).json({ error: "Agency plan required" });
      return;
    }
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessions = await db.select()
      .from(agencySessionsTable)
      .where(
        and(
          eq(agencySessionsTable.userId, userId),
          gte(agencySessionsTable.lastActiveAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(agencySessionsTable.lastActiveAt));
    
    res.json({ 
      sessions,
      maxSessions: 5,
      activeSessions: sessions.length
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

router.delete("/sessions/:deviceId", requireAuth, async (req: any, res) => {
  try {
    const userId = req.userId || req.auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { deviceId } = req.params;
    await db.delete(agencySessionsTable)
      .where(
        and(
          eq(agencySessionsTable.userId, userId),
          eq(agencySessionsTable.deviceId, deviceId)
        )
      );
    res.json({ success: true, message: "Device removed. That device will be signed out on next request." });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove session" });
  }
});

export default router;
