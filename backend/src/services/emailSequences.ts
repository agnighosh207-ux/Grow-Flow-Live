import { Resend } from "resend";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { emailLayout, FROM_EMAIL } from "./email";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function sendSequenceEmail(userId: string, sequence: string, day: number) {
  if (!resend) return;
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || !user.email) return;

  logger.info({ userId, sequence, day }, "[EMAIL_SEQUENCE] Sending sequence email");

  let subject = "";
  let title = "";
  let content = "";

  if (sequence === "activation") {
    if (day === 0) {
      const niche = user.niche || "Content Creator";
      subject = "Welcome! Here's your first content idea 💡";
      title = `Ready to grow, ${user.firstName || 'Creator'}?`;
      content = `
        <p>Welcome to GrowFlow AI! Here's a viral idea to get you started in the ${niche} niche:</p>
        <div style="background-color: rgba(255,255,255,0.02); border: 1px solid #00F2FF; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="font-size: 16px; font-weight: bold; color: #ffffff; margin: 0;">"The one mistake that's holding back your growth in ${niche}"</p>
        </div>
        <p>Click below to turn this into a full campaign across all platforms.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Generate Now →</a></div>
      `;
    } else if (day === 1) {
      subject = "A quick tip for your growth 🚀";
      title = "Get ahead of the curve";
      content = `
        <p>Did you know? Creators who generate their first piece of content within 24 hours are <strong>8× more likely</strong> to reach 10k followers using GrowFlow.</p>
        <p>Don't let your ideas go to waste. Start creating today.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Start Your First Post</a></div>
      `;
    } else if (day === 3) {
      subject = "Your free credits are waiting ⏳";
      title = "Use them or lose them";
      content = `
        <p>Your 10 free credits are waiting for you, but they'll expire soon if you don't use them.</p>
        <p>Don't miss out on the tools used by the top 1% of creators.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Use My Credits Now</a></div>
      `;
    }
  } else if (sequence === "re-engagement") {
    if (day === 7) {
      subject = "Your content calendar is empty this week 😢";
      title = "Stay consistent, stay ahead";
      content = `
        <p>We noticed you haven't planned any content for this week. Consistency is the only way to beat the algorithm.</p>
        <p>Here's a preview of what your weekly plan could look like if you generate now:</p>
        <div style="background-color: rgba(255,255,255,0.02); border: 1px solid #1e293b; border-radius: 12px; padding: 15px; margin: 20px 0;">
          <p style="color: #00F2FF; font-size: 12px; font-weight: bold; margin-bottom: 5px;">MONDAY</p>
          <p style="margin: 0; font-size: 14px;">Educational Reel + LinkedIn Insights</p>
        </div>
        <div style="text-align: center;"><a href="https://growflowai.space/calendar" class="btn">Fill My Calendar</a></div>
      `;
    } else if (day === 14) {
      subject = "Look what's going viral in your niche 🔥";
      title = "Don't miss the trends";
      content = `
        <p>Other creators in your niche are seeing massive growth this week. Here's what's working for them right now.</p>
        <p>Upgrade to the Creator plan to unlock our <strong>Trend Engine</strong> and see the exact hooks they're using.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/trends" class="btn">See Trending Topics</a></div>
      `;
    } else if (day === 30) {
      subject = "We miss you (and have a gift for you) 🎁";
      title = "Come back to GrowFlow";
      content = `
        <p>It's been a month! We want to help you get back into your rhythm. Come back today and we'll add <strong>5 bonus credits</strong> to your account automatically.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Claim My Bonus Credits</a></div>
      `;
    }
  } else if (sequence === "upgrade") {
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
  } else if (sequence === "churn") {
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
    } catch (err) {
      logger.error({ userId, sequence, day, err: String(err) }, "Failed to send sequence email");
    }
  }
}
