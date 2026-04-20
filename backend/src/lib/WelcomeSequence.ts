import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY;
const resend = new Resend(key && key.trim() !== '' ? key : 're_mock_key');
const FROM_EMAIL = 'Grow Flow Team <onboarding@resend.dev>'; // Using resend sandbox verified domain for guaranteed delivery until fully verified

const premiumHtmlWrapper = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { background-color: #0b0416; margin: 0; padding: 30px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; }
  .container { max-width: 600px; margin: 0 auto; background-color: #100726; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .header { padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #1e0b4a 0%, #2f1373 100%); border-bottom: 2px solid #8b5cf6; }
  .header h1 { margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -1px; text-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
  .content { padding: 40px 30px; text-align: left; background: #100726; }
  .content p { font-size: 16px; line-height: 1.7; color: #e9d5ff; margin-bottom: 20px; }
  .accent { color: #4ade80; font-weight: bold; }
  .btn { display: inline-block; padding: 14px 28px; background: linear-gradient(to right, #8b5cf6, #7c3aed); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin-top: 10px; text-align: center; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); }
  .footer { padding: 25px 30px; text-align: center; font-size: 13px; color: #a78bfa; background: #0b0416; }
  .plan-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(139, 92, 246, 0.4); padding: 25px; border-radius: 12px; margin: 30px 0; }
  .plan-row { display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(139, 92, 246, 0.3); padding: 15px 0; font-size: 15px; }
  .plan-row:last-child { border-bottom: none; }
  .plan-key { color: #c4b5fd; font-weight: 500; }
  .plan-value { color: #ffffff; font-weight: 700; text-align: right; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Grow Flow AI</h1>
    </div>
    <div class="content">
      <h2 style="color: #ffffff; margin-top: 0;">${title}</h2>
      ${bodyContent}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Grow Flow AI. All rights reserved.<br>
      You are receiving this because you registered at growflow.ai
    </div>
  </div>
</body>
</html>
`;

export class WelcomeSequence {
  static async sendWelcomeToBeta(email: string, name: string) {
    if (!email) return;
    try {
      const content = `
        <p>Hey <b>${name || 'Creator'}</b>,</p>
        <p>We're thrilled to welcome you to the <b>Grow Flow AI</b> family.</p>
        <p>Our platform is built to skyrocket your productivity and content creation speed.</p>
        <p>Your workspace is fully ready, and we’ve unlocked advanced modules for you to try immediately. Experience dynamic content generation, audience tailoring, and deep platform analytics.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://growflow.ai" class="btn">Launch Dashboard</a>
        </div>
      `;
      
      const html = premiumHtmlWrapper('Welcome to Grow Flow AI! 🚀', content);
      
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email, // If using sandbox key, email must match registered resend email otherwise delivery fails silently or throws error
        subject: 'Welcome to Grow Flow AI! 🚀',
        html,
      });
      console.log(`Premium Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  static async sendPaymentSuccess(email: string, name: string, planType: string, validityRange: string, amountPaid: string = '₹0') {
    if (!email) return;
    try {
      const isTrial = amountPaid === '₹0';
      const headingText = isTrial ? 'Trial Successfully Activated! ⚡' : 'Payment Confirmed! ⚡';
      const mainText = isTrial
        ? `We've successfully activated your 7-day free trial of the <span class="accent">${planType.toUpperCase()}</span> plan. You now have full access to our premium suite limit-free for the next week!`
        : `Thank you for upgrading! Your seamless transition to the <span class="accent">${planType.toUpperCase()}</span> plan is complete. Everything is unlocked and ready to accelerate your growth.`;

      const content = `
        <p>Hey <b>${name || 'Creator'}</b>,</p>
        <p>${mainText}</p>
        
        <div class="plan-card">
          <div class="plan-row">
            <span class="plan-key">Plan Tier</span>
            <span class="plan-value">${planType.toUpperCase()} Access</span>
          </div>
          <div class="plan-row">
            <span class="plan-key">Status</span>
            <span class="plan-value" style="color: #4ade80;">Active</span>
          </div>
          <div class="plan-row">
            <span class="plan-key">Access Validity</span>
            <span class="plan-value">${validityRange}</span>
          </div>
          <div class="plan-row">
            <span class="plan-key">Amount</span>
            <span class="plan-value">${amountPaid}</span>
          </div>
        </div>

        <p>If you have any questions or need tactical advice on how to use your new features, just reply to this email.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://growflow.ai" class="btn">Start Creating Now</a>
        </div>
      `;
      
      const html = premiumHtmlWrapper(headingText, content);
      
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: isTrial ? 'Your Pro Trial is Active! 🎉' : 'Payment Successful! Upgrade Complete 🎉',
        html,
      });
      console.log(`Payment Success email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send Payment Success email:', error);
    }
  }

  static async sendPowerUserGuide(email: string, planType: string) {
    if (!email) return;
    try {
      const content = `
        <p>You just successfully unlocked the <b>${planType.toUpperCase()} Beta Mode</b>!</p>
        <p>Since you're an early adopter, we've entirely bypassed the payment system. You now have unlimited generations.</p>
        
        <div class="plan-card" style="border-color: #4ade80;">
          <h3 style="margin-top: 0; color: #4ade80;">Pro Tip: Gen-Z Mode</h3>
          <p style="margin-bottom: 0;">We use state-of-the-art context injection. When you set your language strictly to "Hinglish", our AI writes identical to a top-tier Indian Gen-Z content creator.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://growflow.ai/generate" class="btn">Try It Out Now</a>
        </div>
      `;
      
      const html = premiumHtmlWrapper('Your Power User Guide is here ⚡', content);
      
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'You\'re Upgraded! Here is your Power User Guide ⚡',
        html,
      });
      console.log(`Power User Guide sent to ${email}`);
    } catch (error) {
      console.error('Failed to send power user guide:', error);
    }
  }
}
