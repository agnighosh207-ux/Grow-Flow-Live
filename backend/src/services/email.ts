import { Resend } from "resend";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "GrowFlow AI <noreply@growflowai.space>";

export async function sendWelcomeEmail(email: string, planName: string) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to GrowFlow AI ${planName}!`,
      html: `
        <h1>Welcome to ${planName}</h1>
        <p>Your subscription is active. Start generating unlimited content and growing your audience today!</p>
        <p>Thank you,<br/>The GrowFlow AI Team</p>
      `,
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
      
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Action Required: Low Credits Alert",
      html: `
        <h2>Low Credits Alert</h2>
        <p>You have ${creditsLeft} credits remaining.</p>
        <p>${message}</p>
        <p>GrowFlow AI Team</p>
      `,
    });
  } catch (error) {
    console.error("Error sending credit warning email:", error);
  }
}

export async function sendPaymentFailedEmail(email: string) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Action Required: Payment Failed",
      html: `
        <h2>Payment Failed</h2>
        <p>Your recent payment attempt for your GrowFlow AI subscription could not be processed.</p>
        <p>Please update your payment method or retry the transaction to maintain uninterrupted access to your tools.</p>
        <p>GrowFlow AI Team</p>
      `,
    });
  } catch (error) {
    console.error("Error sending payment failed email:", error);
  }
}
