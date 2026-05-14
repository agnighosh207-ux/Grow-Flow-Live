import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#060312] text-foreground font-sans">
      <Helmet>
        <title>Refund Policy | GrowFlow AI</title>
        <meta name="description" content="Read our refund policy and money-back guarantee." />
      </Helmet>
      
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/">
            <div className="cursor-pointer"><Logo size="md" /></div>
          </Link>
        </div>

        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </span>
        </Link>

        <div className="prose prose-invert max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
          <p className="text-white/40 text-sm mb-10">Last updated: May 2026</p>

          <div className="space-y-10 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7-Day Money-Back Guarantee</h2>
              <p>
                We stand by the quality of GrowFlow AI. We offer a <strong>7-day money-back guarantee</strong> for all first-time paid subscribers. If you find that the Service does not meet your needs within the first 7 days of your initial purchase, you are eligible for a full refund.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Eligibility for Refund</h2>
              <p>To be eligible for a refund under our guarantee, you must meet the following criteria:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be a first-time subscriber to a GrowFlow AI paid plan.</li>
                <li>Your refund request must be submitted within 7 calendar days of your initial payment.</li>
                <li>You must have used <strong>fewer than 50 generations</strong> (total content creations across all tools) since subscribing.</li>
              </ul>
              <p className="mt-4 italic">Note: Credit Top-Up packs are strictly non-refundable due to the immediate allocation of AI compute resources.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Non-Refundable Circumstances</h2>
              <p>Refunds will not be issued in the following cases:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Requests made after the 7-day guarantee period.</li>
                <li>Accounts with more than 50 total generations.</li>
                <li>Renewal payments for existing subscriptions.</li>
                <li>Accounts that have been suspended due to violations of our Terms of Service (e.g., spamming or prohibited content).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Refund Process</h2>
              <p>
                To request a refund, please email our support team at 
                <a href="mailto:growflowhelp@gmail.com" className="text-cyan-400 font-medium hover:underline ml-1">growflowhelp@gmail.com</a> 
                with the subject line "Refund Request" and include your account email address.
              </p>
              <p>
                Once approved, refunds are processed within <strong>5-7 business days</strong> and will be credited back to your original payment method via Razorpay.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Subscription Cancellation</h2>
              <p>
                You can cancel your subscription at any time through your Account Settings. Upon cancellation, your premium access will continue until the end of your current billing period. We do not provide partial refunds for the remaining days in a billing cycle after cancellation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Contact Support</h2>
              <p>
                If you have any questions regarding our refund policy, please reach out to us:
                <br />
                <a href="mailto:growflowhelp@gmail.com" className="text-cyan-400 font-medium hover:underline">growflowhelp@gmail.com</a>
              </p>
            </section>
          </div>

          <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-[13px] text-white/30 gap-4">
            <span>© 2026 GrowFlow AI. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <Link href="/terms-and-conditions"><span className="hover:text-white/60 transition-colors cursor-pointer">Terms of Service</span></Link>
              <Link href="/privacy-policy"><span className="hover:text-white/60 transition-colors cursor-pointer">Privacy Policy</span></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
