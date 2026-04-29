import sys
import re

# 1. Update backend/src/routes/subscription/index.ts
# - Fix computePlan to use generationsRemaining and real trial math
# - Add subscription.updated support to webhook
file_path = 'backend/src/routes/subscription/index.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix computePlan
target_compute = """function computePlan(user: any, totalGenerations: number, monthlyGenerations: number) {
  const status = user.subscriptionStatus;
  const planType = user.planType || "free";
  
  if ((status === "active" || status === "trial") && planType !== "free") {
    const limits: Record<string, number> = { starter: 20, creator: 100, infinity: 9999 };
    const limit = limits[planType] || 5;
    return {
      plan: planType, planType,
      canGenerate: monthlyGenerations < limit,
      trialDaysLeft: status === "trial" ? 7 : null, // Mocked trial days
      generationLimit: limit,
      monthlyGenerationsUsed: monthlyGenerations,
      totalGenerationsUsed: totalGenerations,
    };
  }
  
  // Free tier
  return {
    plan: "free" as const, planType: "free" as const,
    canGenerate: monthlyGenerations < 5,
    trialDaysLeft: null, generationLimit: 5,
    monthlyGenerationsUsed: monthlyGenerations,
    totalGenerationsUsed: totalGenerations,
  };
}"""

replacement_compute = """function computePlan(user: any, totalGenerations: number, monthlyGenerations: number) {
  const status = user.subscriptionStatus;
  const planType = user.planType || "free";
  const generationsRemaining = Number(user.generationsRemaining ?? 0);
  
  let trialDaysLeft = null;
  if (status === "trial" && user.trialEndsAt) {
    const diff = new Date(user.trialEndsAt).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  if ((status === "active" || status === "trial") && planType !== "free") {
    const limits: Record<string, number> = { starter: 20, creator: 100, infinity: 9999 };
    const limit = limits[planType] || 5;
    return {
      plan: planType, planType,
      canGenerate: generationsRemaining > 0,
      trialDaysLeft,
      generationLimit: limit,
      generationsRemaining,
      monthlyGenerationsUsed: monthlyGenerations,
      totalGenerationsUsed: totalGenerations,
    };
  }
  
  // Free tier
  return {
    plan: "free" as const, planType: "free" as const,
    canGenerate: generationsRemaining > 0,
    trialDaysLeft,
    generationLimit: 5,
    generationsRemaining,
    monthlyGenerationsUsed: monthlyGenerations,
    totalGenerationsUsed: totalGenerations,
  };
}"""

# Fix Webhook statusMap
target_status_map = """  const statusMap: Record<string, string> = {
    "subscription.activated": "active",
    "subscription.charged": "active",
    "subscription.halted": "past_due",
    "subscription.cancelled": "canceled",
    "subscription.expired": "canceled",
  };"""

replacement_status_map = """  const statusMap: Record<string, string> = {
    "subscription.activated": "active",
    "subscription.charged": "active",
    "subscription.updated": "active",
    "subscription.halted": "past_due",
    "subscription.cancelled": "canceled",
    "subscription.expired": "canceled",
  };"""

# Fix Webhook update check
target_webhook_activation = 'else if (newStatus === "active" || event.event === "subscription.activated") {'
replacement_webhook_activation = 'else if (newStatus === "active" || event.event === "subscription.activated" || event.event === "subscription.updated") {'

content = content.replace('\r\n', '\n')
content = content.replace(target_compute, replacement_compute)
content = content.replace(target_status_map, replacement_status_map)
content = content.replace(target_webhook_activation, replacement_webhook_activation)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update backend/src/routes/referral/index.ts
# - Remove credit granting from /referral/claim
ref_path = 'backend/src/routes/referral/index.ts'
with open(ref_path, 'r', encoding='utf-8') as f:
    ref_content = f.read()

target_claim_logic = """      // 3. Mark the code as used by current user
      await tx.update(usersTable)
        .set({ referralUsedCode: normalizedCode })
        .where(eq(usersTable.id, req.userId));

      // 4. Grant +10 generations to Referrer and +5 to Current User (Referral logic from prompt)
      // "Invite 1 friend, get 10 generations."
      await tx.update(usersTable)
        .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 10` })
        .where(eq(usersTable.id, referrer.id));
        
      await tx.update(usersTable)
        .set({ generationsRemaining: sql`${usersTable.generationsRemaining} + 5` })
        .where(eq(usersTable.id, req.userId));

      // 5. Log the referral
      await tx.insert(referralsTable).values({
        id: crypto.randomUUID(),
        referrerUserId: referrer.id,
        referredUserId: req.userId,
        rewardGranted: true,
        rewardSeen: false,
      }).onConflictDoNothing();
    });

    res.json({ success: true, message: "Referral code applied successfully. +5 generations granted!" });"""

replacement_claim_logic = """      // 3. Mark the code as used by current user
      await tx.update(usersTable)
        .set({ referralUsedCode: normalizedCode })
        .where(eq(usersTable.id, req.userId));

      // 4. Log the referral (Pending Reward)
      await tx.insert(referralsTable).values({
        id: crypto.randomUUID(),
        referrerUserId: referrer.id,
        referredUserId: req.userId,
        rewardGranted: false, // Wait for payment
        rewardSeen: false,
      }).onConflictDoNothing();
    });

    res.json({ success: true, message: "Referral code applied! Your bonus credits will be granted after your first successful subscription." });"""

ref_content = ref_content.replace('\r\n', '\n')
ref_content = ref_content.replace(target_claim_logic, replacement_claim_logic)

with open(ref_path, 'w', encoding='utf-8') as f:
    f.write(ref_content)
