import React from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, Zap, Globe } from "lucide-react";
import { useLocation } from "wouter";

interface CompConfig {
  competitor: string;
  title: string;
  description: string;
  ourAdvantages: string[];
  theirAdvantages: string[];
  verdict: string;
}

const COMP_DATA: Record<string, CompConfig> = {
  "jasper-ai-india": {
    competitor: "Jasper AI",
    title: "GrowFlow AI vs Jasper AI — Best AI Writing Tool for India (2026)",
    description: "Detailed comparison of GrowFlow AI and Jasper AI for Indian creators and marketers.",
    ourAdvantages: ["5x cheaper (₹149/mo vs $49/mo)", "Hindi & Hinglish support", "Built for Indian social media platforms", "Razorpay payments (no international card needed)", "Indian creator templates"],
    theirAdvantages: ["More templates for Western markets", "Better for long-form blog writing", "Larger template library"],
    verdict: "For Indian creators and small businesses, GrowFlow AI wins on price, language support, and platform relevance."
  },
  "copy-ai-india": {
    competitor: "Copy.ai",
    title: "GrowFlow AI vs Copy.ai — Which is Better for Indian Creators?",
    description: "Compare GrowFlow AI and Copy.ai features, pricing, and Indian market support.",
    ourAdvantages: ["INR pricing (₹149/mo vs $49/mo)", "Regional Indian language support", "Social media first design", "Indian payment methods", "Faster generation with Groq"],
    theirAdvantages: ["More marketing copy templates", "Workflow automation", "Team collaboration tools"],
    verdict: "Copy.ai is great for global marketers. GrowFlow AI is built specifically for Indian social media creators."
  }
};

export default function ComparisonPage({ slug }: { slug: string }) {
  const config = COMP_DATA[slug as keyof typeof COMP_DATA];
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (config) {
      document.title = `${config.title} — GrowFlow AI`;
    }
  }, [config]);

  if (!config) return <div>Comparison not found</div>;

  const features = [
    { name: "Hinglish Support", gf: true, comp: false },
    { name: "Indian Trend Analysis", gf: true, comp: false },
    { name: "Affordable INR Pricing", gf: true, comp: false },
    { name: "Creator 30-Day Challenges", gf: true, comp: false },
    { name: "Viral Hook Algorithm", gf: true, comp: "Basic" },
    { name: "WhatsApp Support", gf: true, comp: false },
  ];

  return (
    <PageWrapper maxWidth="lg" className="py-20 space-y-24">
      <div className="text-center space-y-6 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tight leading-tight">
          {config.title}
        </h1>
        <p className="text-lg text-white/50 font-medium">
          {config.description}
        </p>
      </div>

      <div className="rounded-[40px] border border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.03]">
              <th className="p-8 text-white font-black italic text-xl">Feature</th>
              <th className="p-8 text-cyan-400 font-black italic text-xl text-center bg-cyan-500/5">GrowFlow AI</th>
              <th className="p-8 text-white/40 font-black italic text-xl text-center">{config.competitor}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {features.map((f) => (
              <tr key={f.name} className="hover:bg-white/[0.01] transition-colors">
                <td className="p-8 text-white/70 font-medium">{f.name}</td>
                <td className="p-8 text-center bg-cyan-500/5">
                   {f.gf === true ? <Check className="w-6 h-6 text-cyan-400 mx-auto" /> : <span className="text-cyan-400 font-bold">{f.gf}</span>}
                </td>
                <td className="p-8 text-center">
                   {f.comp === true ? <Check className="w-6 h-6 text-white/20 mx-auto" /> : f.comp === false ? <X className="w-6 h-6 text-red-500/40 mx-auto" /> : <span className="text-white/40 font-medium">{f.comp}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="p-8 rounded-3xl bg-cyan-500/5 border border-cyan-500/10 space-y-6">
          <h3 className="text-2xl font-black text-white italic">Why GrowFlow Wins</h3>
          <ul className="space-y-4">
            {config.ourAdvantages.map(adv => (
              <li key={adv} className="flex items-center gap-3 text-white/70">
                <Check className="w-5 h-5 text-cyan-400 shrink-0" />
                {adv}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
          <h3 className="text-2xl font-black text-white italic">The Alternative</h3>
          <ul className="space-y-4">
            {config.theirAdvantages.map(adv => (
              <li key={adv} className="flex items-center gap-3 text-white/40">
                <div className="w-5 h-px bg-white/20 shrink-0" />
                {adv}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-10 rounded-3xl bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 text-center space-y-4">
        <h3 className="text-2xl font-black text-white italic">The Verdict</h3>
        <p className="text-xl text-white/80 leading-relaxed font-medium">{config.verdict}</p>
      </div>

      <div className="text-center p-16 rounded-[40px] bg-gradient-to-r from-zinc-900 to-black border border-white/5 space-y-8">
        <h2 className="text-3xl font-black text-white italic">Switch to the creator-first AI today.</h2>
        <Button 
          size="lg"
          onClick={() => navigate("/sign-up")}
          className="h-16 px-12 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xl shadow-glow transition-all"
        >
          START FOR FREE
        </Button>
      </div>
    </PageWrapper>
  );
}
