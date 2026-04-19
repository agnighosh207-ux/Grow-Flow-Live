import { Helmet } from "react-helmet-async";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-white/80">
      <Helmet>
        <title>Privacy Policy | Grow Flow AI</title>
      </Helmet>
      
      <h1 className="text-3xl font-extrabold text-white mb-8">Privacy Policy</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-bold text-violet-300 mb-2">Data Collection & Handlers</h2>
          <p>We process authentication events securely using Clerk. Authentication tokens and primary email addresses are securely managed.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-violet-300 mb-2">Supabase Storage</h2>
          <p>User-generated data and content history are securely stored in a private Supabase bucket. Your proprietary niches and custom prompts belong entirely to you.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-violet-300 mb-2">AI Generation Logs</h2>
          <p>In accordance with anti-abuse compliance, we temporarily securely log IP addresses and Generation Timestamps tracking strictly for our Fair Use Guardian to prevent bot-net exhaustion.</p>
        </section>
      </div>
    </div>
  );
}
