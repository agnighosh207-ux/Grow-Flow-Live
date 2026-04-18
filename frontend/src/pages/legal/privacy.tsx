import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function Privacy() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: April 2026</p>

        <div className="space-y-8 text-white/70 leading-relaxed font-normal">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">1. Introduction</h2>
            <p className="text-[15px]">
              GrowFlow AI ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy informs you as to how we look after your personal data when you visit our platform and tells you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">2. Information We Collect</h2>
            <p className="text-[15px] mb-3">We collect the minimum amount of data required to provide a seamless generative AI experience:</p>
            <ul className="list-disc list-inside space-y-2 text-[15px] ml-1">
              <li><strong className="text-white/85">Identity Data:</strong> First name, last name, email address, and profile picture (via Clerk Auth).</li>
              <li><strong className="text-white/85">Content Data:</strong> The raw text inputs, prompts, and brand details you type into the generator to create content.</li>
              <li><strong className="text-white/85">Financial Data:</strong> Processed securely by Razorpay. <strong className="text-red-300">We do not capture or store your credit card numbers.</strong></li>
              <li><strong className="text-white/85">Technical Data:</strong> IP addresses, browser types, and usage analytics to optimize our systems.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">3. Artificial Intelligence & Your Data</h2>
            <p className="text-[15px] mb-3">Our core service involves routing your text inputs (prompts) to Large Language Models (LLMs) such as Groq, Cerebras, and OpenAI.</p>
            <ul className="list-disc list-inside space-y-2 text-[15px] ml-1">
              <li><strong className="text-white/85">No Model Training:</strong> Your inputs and generated content are passed securely via API to our LLM providers. We strictly use commercial APIs that explicitly prohibit the use of your private prompts to train their foundational models.</li>
              <li><strong className="text-white/85">Data Masking:</strong> You are responsible for not inputting highly sensitive, classified, or Personally Identifiable Information (PII) into the generator prompts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">4. Payment Processing via Razorpay</h2>
            <p className="text-[15px]">
              All subscription upgrades and payments are handled exclusively by <strong>Razorpay</strong>. When you initialize a checkout, your session data is encrypted and transferred to Razorpay's secure servers. Razorpay processes your payment according to PCI-DSS compliance standards. GrowFlow AI only receives a webhook notification containing a status code (e.g., "payment.captured") and an obfuscated token so we can activate your Pro tier. For more details, you must review Razorpay's independent Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">5. Data Retention & Deletion</h2>
            <p className="text-[15px]">
              We retain your account data and generation history for as long as your account exists so you can access the "History" tab. You maintain the right to delete your data at any time. If you delete your account from the user settings, your generation history and identity tokens will be permanently scrubbed from our PostgreSQL databases within 30 days. Financial audit logs (webhooks) may be retained longer as legally mandated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">6. Security Measures</h2>
            <p className="text-[15px]">
              We have put in place appropriate security measures (including SSL/TLS encryption, JWT authorization, and row-level database security) to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. However, no data transmission over the internet is completely invincible. Standard assumption of risk applies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">7. Cookies and Tracking</h2>
            <p className="text-[15px]">
              We use strictly necessary cookies to maintain your login session via Clerk. We do not use intrusive third-party ad-tracking cookies across our authenticated application space.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3 tracking-tight">8. Contact Us</h2>
            <p className="text-[15px]">
              If you wish to exercise your data rights or have any questions about this Privacy Policy, please contact our privacy officer at <a href="mailto:growflowhelp@gmail.com" className="text-violet-400 hover:text-violet-300">growflowhelp@gmail.com</a>.
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
