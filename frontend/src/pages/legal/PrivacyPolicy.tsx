import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-foreground font-sans">
      <Helmet>
        <title>Privacy Policy | GrowFlow AI</title>
        <meta name="description" content="Read the Privacy Policy of using GrowFlow AI." />
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
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/40 text-sm mb-10">Last updated: May 2026</p>

          <div className="space-y-10 text-white/80 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
              <p>We collect information to provide a better experience to our users. This includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identity Information:</strong> Email address, name, and profile data provided through our authentication partner, <strong>Clerk</strong>.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our tools, including generation counts and feature usage.</li>
                <li><strong>Generated Content:</strong> We store the content you generate and the prompts you provide so you can access them later in your Vault and History.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Information</h2>
              <p>Your data is used for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Delivery:</strong> To power the AI generation tools and personalize your results.</li>
                <li><strong>Billing:</strong> To manage subscriptions and process payments through Razorpay.</li>
                <li><strong>Improvement:</strong> To analyze usage patterns and improve our AI engine's performance.</li>
                <li><strong>Communication:</strong> To send important service updates or support responses via Resend.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">3. Data Storage and Infrastructure</h2>
              <p>
                Our primary database is hosted on <strong>Supabase (PostgreSQL)</strong>. Our servers are located in the <strong>Asia-Pacific (AP)</strong> region to ensure low latency for our core user base. We implement industry-standard encryption and security protocols to protect your data at rest and in transit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
              <p>We integrate with several trusted partners to deliver our Service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Clerk:</strong> For secure authentication and user management.</li>
                <li><strong>Razorpay:</strong> For secure payment processing (we do not store your credit card details).</li>
                <li><strong>Resend:</strong> For transactional email delivery.</li>
                <li><strong>OpenRouter / Groq:</strong> For processing AI generation requests (your prompts are sent to these providers but are not used for model training by us).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">5. Data Retention</h2>
              <p>
                We retain your account data as long as your account is active. If you choose to delete your account, all personal data, generation history, and saved items will be permanently scrubbed from our active databases within <strong>30 days</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access all personal data we store about you.</li>
                <li>Request the deletion of your account and all associated data.</li>
                <li>Export your data in a portable format (available in your Account Settings).</li>
                <li>Opt-out of non-essential communications.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">7. Cookies</h2>
              <p>
                We use essential cookies strictly for maintaining your authenticated session via Clerk. We do not use third-party tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">8. Children's Privacy</h2>
              <p>
                GrowFlow AI is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">9. Contact and Data Protection</h2>
              <p>
                If you have any privacy concerns or wish to exercise your rights, please contact our Data Protection Officer at:
                <br />
                <a href="mailto:growflowhelp@gmail.com" className="text-[#8B91E3] font-medium hover:underline">growflowhelp@gmail.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">10. Updates to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date.
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
