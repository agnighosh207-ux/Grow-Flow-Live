import React from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Check, X, Shield, Zap, Globe } from "lucide-react";
import { useLocation } from "wouter";

interface CompConfig {
  competitor: string;
  slug: string;
  h1: string;
}

const COMP_DATA: Record<string, CompConfig> = {
  "jasper-ai-india": { competitor: "Jasper AI", slug: "jasper-ai-india", h1: "GrowFlow vs Jasper AI: Which is better for Indian Creators?" },
  "copy-ai-india": { competitor: "Copy.ai", slug: "copy-ai-india", h1: "GrowFlow vs Copy.ai: The Best Content AI for India 2026" },
};

export default function ComparisonPage({ slug }: { slug: string }) {
  const config = COMP_DATA[slug as keyof typeof COMP_DATA];
  const [, navigate] = useLocation();

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
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-black text-white italic tracking-tight leading-tight">
          {config.h1}
        </h1>
        <p className="text-lg text-white/50 font-medium">
          Jasper and Copy.ai are built for the US market. GrowFlow was built from the ground up for the next 100M creators in India.
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><Globe /></div>
          <h3 className="text-xl font-black text-white italic">Localized Context</h3>
          <p className="text-white/40 text-sm">GrowFlow understands Indian cultural nuances, festivals, and trending topics in real-time. Jasper doesn't know who CarryMinati or Flying Beast is—we do.</p>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><Shield /></div>
          <h3 className="text-xl font-black text-white italic">Localized Pricing</h3>
          <p className="text-white/40 text-sm">Don't pay in USD with heavy conversion fees. GrowFlow offers plans starting at ₹149/month, making it accessible for every aspiring creator.</p>
        </div>
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400"><Zap /></div>
          <h3 className="text-xl font-black text-white italic">Creator First</h3>
          <p className="text-white/40 text-sm">We are not a general "AI Writer." We are a growth platform for creators. We provide challenges, calendars, and viral scoring to help you actually grow.</p>
        </div>
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
