import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#060312] text-foreground font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/">
            <div><Logo size="md" /></div>
          </Link>
        </div>

        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </span>
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Terms & Conditions</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed font-normal">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">1. Acceptance of Terms</h2>
            <p className="text-[15px]">
              By creating an account, accessing, or using GrowFlow AI ("Platform", "we", "us", or "our"), you agree to be bound by these Terms & Conditions. If you do not agree out of your own free will, you must cease use of the service immediately. These terms govern your access to our AI-powered SaaS solutions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">2. Use of Artificial Intelligence & Disclaimers</h2>
            <p className="text-[15px] mb-3">GrowFlow AI utilizes large language models (LLMs) and generative artificial intelligence to produce content. By using the Platform, you acknowledge and agree that:</p>
            <ul className="list-disc list-inside space-y-2 text-[15px] ml-1">
              <li><strong className="text-white/85">AI Hallucinations:</strong> The AI may occasionally generate inaccurate, incomplete, or misleading information ("hallucinations").</li>
              <li><strong className="text-white/85">User Verification:</strong> You are strictly responsible for reviewing, verifying, and editing any AI-generated outputs before publishing them on public domains, social networks, or using them in business operations.</li>
              <li><strong className="text-white/85">No Liability for Content:</strong> GrowFlow AI assumes ZERO liability for the consequences of publishing generated text. Any defamation, copyright infringement, or harm caused by unverified AI outputs lies solely with the user.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">3. Payment & Billing Processing (Razorpay)</h2>
            <p className="text-[15px] mb-3">All premium subscriptions, transactions, and payment authorizations are securely captured and processed by <strong>Razorpay</strong>, our official payment gateway partner. You agree to the following:</p>
            <ul className="list-disc list-inside space-y-2 text-[15px] ml-1">
              <li>You agree to provide current, complete, and accurate purchase and account information for all purchases made via Razorpay.</li>
              <li><strong className="text-white/85">Recurring Billing:</strong> By subscribing to a Pro/Creator tier, you authorize Razorpay to charge your selected payment method on a recurring monthly equivalent basis until cancelled.</li>
              <li>GrowFlow AI does not store, process, or directly transmit your credit card data. All compliance related to PCI-DSS is handled entirely by Razorpay.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">4. Cancellation & Refund Policy</h2>
            <ul className="list-disc list-inside space-y-2 text-[15px] ml-1">
              <li>You may cancel your subscription at any time via your Account Settings. Your premium access will continue until the end of your current billing cycle.</li>
              <li><strong className="text-white/85">No Refunds:</strong> Due to the high computational costs of AI generation, we do not offer refunds (partial or full) for unused time or accidental renewals once the payment has been successfully captured by Razorpay.</li>
              <li>If you believe your card was charged fraudulently, you must contact Razorpay support and your bank immediately.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">5. Acceptable Use Policy</h2>
            <p className="text-[15px] mb-3">You agree not to use the GrowFlow AI platform to generate:</p>
            <ul className="list-disc list-inside space-y-2 text-[15px] ml-1">
              <li>Illegal, highly regulated, or hazardous content.</li>
              <li>Spam, automated bot architectures without authorization, phishing, or malware execution payloads.</li>
              <li>Content intended to harass, threaten, or discriminate against individuals or protected classes.</li>
              <li>Misinformation designed to deceive the general public, including deepfakes or fake news articles.</li>
            </ul>
            <p className="mt-4 text-[15px]">Violation of this policy will result in immediate termination of your account without refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">6. Content Ownership & Licensing</h2>
            <p className="text-[15px]">
              You retain all ownership rights over the raw input ideas you provide to the platform. Likewise, you own the final AI-generated outputs delivered to you, subject to the inherent limitations of copyright law regarding AI generations in your jurisdiction. By using the platform, you grant GrowFlow AI a temporary, limited license strictly necessary to process your data through the AI models to serve you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">7. Legal Jurisdiction</h2>
            <p className="text-[15px]">
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which GrowFlow AI operates, without regard to its conflict of law provisions. Any legal disputes arising from the use of the platform or Razorpay transactions shall be settled in the designated courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">8. Contact Information</h2>
            <p className="text-[15px]">
              For legal inquiries or disputes regarding these terms, please contact us at <a href="mailto:growflowhelp@gmail.com" className="text-cyan-400 hover:text-cyan-300">growflowhelp@gmail.com</a>.
            </p>
          </section>
        </div>

        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-[13px] text-white/30 gap-4">
          <span>© 2026 GrowFlow AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/terms"><span className="hover:text-white/60 transition-colors cursor-pointer">Terms of Service</span></Link>
            <Link href="/privacy"><span className="hover:text-white/60 transition-colors cursor-pointer">Privacy Policy</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
