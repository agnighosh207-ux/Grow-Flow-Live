import { Resend } from "resend";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emailLayout, FROM_EMAIL } from "./email";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

/**
 * GrowFlow AI - Automated Email Sequences
 * Handles onboarding, activation, retention, and churn recovery.
 */
export async function sendSequenceEmail(userId: string, sequence: string, day: number) {
  if (!resend) return;
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !user.email) return;

  logger.info({ userId, sequence, day }, "[EMAIL_SEQUENCE] Processing sequence email");

  let subject = "";
  let title = "";
  let content = "";

  // ─── 1. ACTIVATION SEQUENCE ───────────────────────────────────────────────
  // Target: New signups who haven't generated content yet
  if (sequence === "activation") {
    if (day === 1) {
      subject = "Quick question about your GrowFlow account?";
      title = "Everything okay?";
      content = `
        <p>Hi ${user.firstName || "there"},</p>
        <p>I noticed you signed up yesterday but haven't generated your first content campaign yet. Did you get stuck anywhere or have any questions?</p>
        <p>Growth only happens when you start. I've added <strong>5 bonus credits</strong> to your account just to help you get the ball rolling today.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Generate My First Campaign →</a></div>
        <p>Reply to this email if you need a hand!</p>
        <p>Best,<br/>Agnish, Founder</p>
      `;
    } else if (day === 3) {
      subject = "3 days in: Still waiting for your first viral post?";
      title = "Don't let your ideas gather dust";
      content = `
        <p>Consistency is the difference between a dreamer and a creator.</p>
        <p>It's been 3 days since you joined, and the world is waiting for your content. Use our <strong>Viral Predictor</strong> to find your best idea and turn it into 4 platform-ready posts in 60 seconds.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Start Your Growth Engine</a></div>
      `;
    }
  } 

  // ─── 2. RE-ENGAGEMENT SEQUENCE ─────────────────────────────────────────────
  // Target: Existing users who stopped generating
  else if (sequence === "re-engagement" || sequence === "reengagement") {
    if (day === 7) {
      subject = "You haven't posted in a week — here's a fresh start 🚀";
      title = "We miss your voice!";
      content = `
        <p>It's been 7 days since your last generation. We know life gets busy, but your audience is waiting.</p>
        <p>To help you get back on track, I've curated some <strong>fresh viral trends</strong> for you in the Trends tab.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/trends" class="btn">View Live Trends →</a></div>
      `;
    } else if (day === 30) {
      subject = "We miss you (and have a gift for you) 🎁";
      title = "Come back to GrowFlow";
      content = `
        <p>It's been a month! We want to help you get back into your rhythm. Come back today and we'll add <strong>5 bonus credits</strong> to your account automatically.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Claim My Bonus Credits</a></div>
      `;
    }
  }

  // ─── 3. UPSELL SEQUENCE ───────────────────────────────────────────────────
  // Target: High-usage users on lower plans
  else if (sequence === "upgrade") {
    subject = "You're scaling fast! 🚀";
    title = "Don't hit a wall";
    content = `
      <p>You've used 80% of your credits. You're on a roll!</p>
      <p>Upgrade to Creator now to avoid running out of steam. Plus, you'll unlock:</p>
      <ul style="color: #cbd5e1;">
        <li>Performance Predictor (Pre-post score)</li>
        <li>Trend Engine (Live search)</li>
        <li>Hashtag Intelligence</li>
      </ul>
      <div style="text-align: center;"><a href="https://growflowai.space/pricing" class="btn">Upgrade Now</a></div>
    `;
  }

  // ─── 4. CHURN RECOVERY SEQUENCE ───────────────────────────────────────────
  // Target: Users who just cancelled
  else if (sequence === "churn") {
    if (day === 1) {
      subject = "Before you go... 50% off? 🎁";
      title = "We'd love to keep you";
      content = `
        <p>We're sorry to see you go. As a thank you for being a part of GrowFlow, here's 50% off for the next 3 months.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/pricing?coupon=STAY50" class="btn">Claim 50% Discount</a></div>
      `;
    } else if (day === 7) {
      subject = "One last thing... ⚠️";
      title = "Your data will be archived";
      content = `
        <p>Your subscription ended a week ago. In 7 days, your content history and saved favorites will be archived to save space.</p>
        <p>Reactivate now to keep all your hard work accessible.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/pricing" class="btn">Reactivate Account</a></div>
      `;
    }
  }

  if (subject && content) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject,
        html: emailLayout(title, content),
      });
      logger.info({ userId, sequence, day }, "Sequence email sent successfully");
    } catch (err) {
      logger.error({ userId, sequence, day, err: String(err) }, "Failed to send sequence email");
    }
  }
}
