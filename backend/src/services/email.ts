import { Resend } from "resend";
import { logger } from "../lib/logger";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "GrowFlow AI <noreply@growflowai.space>";

const emailLayout = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { background-color: #050111; margin: 0; padding: 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #ffffff; }
  .container { max-width: 600px; margin: 0 auto; background-color: #0a051d; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
  .header { padding: 30px; text-align: center; border-bottom: 1px solid #1e293b; }
  .header h1 { margin: 0; color: #00F2FF; font-size: 24px; font-weight: 800; }
  .content { padding: 40px 30px; line-height: 1.6; color: #cbd5e1; }
  .content h2 { color: #ffffff; margin-top: 0; font-size: 20px; }
  .footer { padding: 20px; text-align: center; font-size: 12px; color: #475569; background-color: #050111; }
  .btn { display: inline-block; padding: 12px 24px; background-color: #00F2FF; color: #050111 !important; text-decoration: none; border-radius: 6px; font-weight: 700; margin-top: 20px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>GrowFlow AI</h1></div>
    <div class="content">
      <h2>${title}</h2>
      ${content}
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} GrowFlow AI. All rights reserved.</div>
  </div>
</body>
</html>
`;

export async function sendWelcomeEmail(email: string, planName: string) {
  if (!resend) return;
  try {
    const html = emailLayout(
      `Welcome to ${planName}!`,
      `
        <p>Your subscription is active. Start generating unlimited content and growing your audience today!</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Start Generating</a></div>
        <p>Thank you,<br/>The GrowFlow AI Team</p>
      `
    );
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to GrowFlow AI ${planName}!`,
      html,
    });
  } catch (error) {
    logger.error({ email, error: String(error) }, "Email send failure");
  }
}

export async function sendCreditWarningEmail(email: string, creditsLeft: number, isInfinity: boolean) {
  if (!resend) return;
  try {
    const message = isInfinity 
      ? "You are approaching your Fair Usage Policy (FUP) limits. Please slow down to avoid temporary rate limits." 
      : "You only have 2 generations left this month. Upgrade your plan to keep creating!";
      
    const html = emailLayout(
      "Low Credits Alert",
      `
        <p>You have <strong>${creditsLeft}</strong> credits remaining.</p>
        <p>${message}</p>
        <div style="text-align: center;"><a href="https://growflowai.space/pricing" class="btn">Upgrade Plan</a></div>
        <p>GrowFlow AI Team</p>
      `
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Action Required: Low Credits Alert",
      html,
    });
  } catch (error) {
    console.error("Error sending credit warning email:", error);
  }
}

export async function sendPaymentFailedEmail(email: string) {
  if (!resend) return;
  try {
    const html = emailLayout(
      "Payment Failed",
      `
        <p>Your recent payment attempt for your GrowFlow AI subscription could not be processed.</p>
        <p>Please update your payment method or retry the transaction to maintain uninterrupted access to your tools.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/settings" class="btn">Update Payment Method</a></div>
        <p>GrowFlow AI Team</p>
      `
    );
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Action Required: Payment Failed",
      html,
    });
  } catch (error) {
    console.error("Error sending payment failed email:", error);
  }
}
export async function sendRenewalEmail(email: string, planName: string) {
  if (!resend) return;
  try {
    const html = emailLayout(
      `Your ${planName} Subscription Renewed!`,
      `
        <p>Your subscription has successfully renewed. Your monthly credits have been refilled and are ready to use!</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Generate Content</a></div>
        <p>GrowFlow AI Team</p>
      `
    );
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Success: Your GrowFlow AI ${planName} subscription renewed`,
      html,
    });
  } catch (error) {
    logger.error({ email, error: String(error) }, "Email send failure");
  }
}

export async function sendPaymentFailedReminder3Days(email: string, planType: string) {
  if (!resend) return;
  try {
    const html = emailLayout(
      "Payment Update Required",
      `
        <p>Your payment for the <strong>${planType}</strong> plan failed 3 days ago.</p>
        <p>You have <strong>4 days left</strong> before your account is automatically downgraded to the Free plan. To avoid any service interruption, please update your billing information now.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/settings" class="btn">Update Billing</a></div>
        <p>GrowFlow AI Team</p>
      `
    );
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "⚠️ Action needed: Your GrowFlow AI subscription",
      html,
    });
  } catch (error) {
    logger.error({ email, error: String(error) }, "Email send failure");
  }
}

export async function sendPaymentFailedReminder7Days(email: string, planType: string) {
  if (!resend) return;
  try {
    const html = emailLayout(
      "Account Downgraded",
      `
        <p>Your GrowFlow AI account has been downgraded to the Free plan because we were unable to process your payment for the ${planType} plan.</p>
        <p>Don't worry, your content is safe! However, your credits have been reset to the Free tier limits. To reactivate your premium features, you can upgrade again at any time.</p>
        <div style="text-align: center;"><a href="https://growflowai.space/pricing" class="btn">Reactivate Subscription</a></div>
        <p>GrowFlow AI Team</p>
      `
    );
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your GrowFlow AI account has been downgraded",
      html,
    });
  } catch (error) {
    logger.error({ email, error: String(error) }, "Email send failure");
  }
}

export async function sendStreakRewardEmail(email: string, streak: number, rewardCredits: number) {
  if (!resend) return;
  try {
    const title = streak === 30 ? "👑 Elite Streak Unlocked!" : "🔥 You're on Fire!";
    const html = emailLayout(
      title,
      `
        <p>Congratulations! You've reached a <strong>${streak}-day streak</strong> on GrowFlow AI.</p>
        <p>To celebrate your consistency, we've added <strong>${rewardCredits} bonus credits</strong> to your account.</p>
        <p>Keep up the great work and continue growing your audience every day!</p>
        <div style="text-align: center;"><a href="https://growflowai.space/generate" class="btn">Generate Content</a></div>
        <p>GrowFlow AI Team</p>
      `
    );
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Congrats on your ${streak}-day streak! 🎁`,
      html,
    });
  } catch (error) {
    logger.error({ email, error: String(error) }, "Email send failure");
  }
}

export async function sendWeeklyTrendDigest(email: string, niche: string, trends: any[], weekSummary: string) {
  if (!resend) return;
  try {
    let trendsHtml = trends.map(t => `
      <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="background-color: rgba(0, 242, 255, 0.1); color: #00F2FF; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${t.type}</span>
          <span style="font-size: 12px; color: #94a3b8;">${t.platform}</span>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500; color: #ffffff;">${t.description}</p>
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; color: #94a3b8;">
            <span>Opportunity Score</span>
            <span style="font-weight: bold; color: ${t.opportunityScore >= 80 ? '#10b981' : t.opportunityScore >= 60 ? '#f59e0b' : '#ef4444'}">${t.opportunityScore}/100</span>
          </div>
          <div style="height: 4px; background-color: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; width: ${t.opportunityScore}%; background-color: ${t.opportunityScore >= 80 ? '#10b981' : t.opportunityScore >= 60 ? '#f59e0b' : '#ef4444'};"></div>
          </div>
        </div>
        <div style="background-color: rgba(0, 242, 255, 0.05); border-left: 3px solid #00F2FF; padding: 12px; border-radius: 0 4px 4px 0;">
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #00F2FF;">💡 Actionable Idea</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">${t.actionableIdea}</p>
        </div>
      </div>
    `).join('');

    const html = emailLayout(
      `🔥 Your Weekly ${niche} Trend Report`,
      `
        <p style="font-size: 15px; color: #cbd5e1; margin-bottom: 24px;">${weekSummary}</p>
        <h3 style="color: #ffffff; font-size: 18px; margin-bottom: 16px;">Top Opportunities This Week:</h3>
        ${trendsHtml}
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://growflowai.space/trends" class="btn">Explore in GrowFlow</a>
        </div>
      `
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🔥 Your Weekly GrowFlow Trend Report`,
      html,
    });
  } catch (error) {
    logger.error({ email, error: String(error) }, "Trend digest email send failure");
  }
}
