import { Helmet } from "react-helmet-async";

export default function TermsAndConditions() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-white/80">
      <Helmet>
        <title>Terms and Conditions | Grow Flow AI</title>
        <meta name="description" content="Read the Terms and Conditions of using Grow Flow AI." />
      </Helmet>
      
      <h1 className="text-3xl font-extrabold text-white mb-8">Terms and Conditions</h1>
      <p className="mb-4 text-sm text-white/50">Last Updated: October 2026</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-bold text-cyan-300 mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using the Grow Flow AI platform ("Service"), you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-300 mb-2">2. Subscriptions & Billing</h2>
          <p>Grow Flow AI offers Monthly Subscriptions billed via Razorpay. Due to the high variable costs associated with AI GPU compute, you agree that your payment grants immediately available credits upon confirmation.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-300 mb-2">3. Fair Use Policy & Rate Limits</h2>
          <p>To ensure 100% uptime, our "Unlimited" plans operate under a strict Human-Speed limitation cap set at 60 generations per hour. Any user attempting to utilize bot-nets, scripts, or rapid-fire scraping to bypass these limits will immediately trigger our Account Guardian algorithm resulting in a suspension.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-cyan-300 mb-2">4. Account Suspension & Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that actively violate the Fair Use Policy or exhibit malicious exploitation of our APIs. Suspended accounts may appeal their status via the Support Contact page, but remaining credits will not be refunded.</p>
        </section>
      </div>
    </div>
  );
}
