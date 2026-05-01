import { Resend } from "resend";

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
    console.error("Error sending welcome email:", error);
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
    console.error("Error sending renewal email:", error);
  }
}
