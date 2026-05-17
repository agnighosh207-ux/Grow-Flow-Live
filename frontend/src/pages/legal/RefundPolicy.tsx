import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

const sections = [
  {
    title: "7-Day Free Trial",
    content: "All new subscriptions start with a 7-day free trial. Your card is saved for autopay but you are NOT charged until day 8. You can cancel anytime before day 7 with zero charge."
  },
  {
    title: "Cancellation During Trial",
    content: "Cancel anytime from Settings → Plans & Billing before your trial ends. No charge will be made. Access continues until the trial period ends."
  },
  {
    title: "Refunds After Trial",
    content: "After your trial ends and the first payment is processed, you may request a full refund within 7 days of the charge. Email support with your registered email and reason. Refunds are processed within 5-7 business days to your original payment method."
  },
  {
    title: "Credit Top-Up Non-Refundable",
    content: "One-time credit top-up purchases are non-refundable once the credits have been added to your account and used."
  },
  {
    title: "How to Request a Refund",
    content: "Email growflowhelp@gmail.com with subject 'Refund Request' and include your registered email and reason. We respond within 24 hours."
  },
];

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-foreground font-sans">
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

          <div className="space-y-6">
            {sections.map((section, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/8 p-6 transition-all duration-200 hover:border-white/12 hover:scale-[1.01]"
                style={{
                  background: "linear-gradient(135deg, rgba(94,106,210,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                <h3 className="text-lg font-bold text-white mb-2.5">{section.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{section.content}</p>
              </div>
            ))}
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
