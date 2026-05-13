import React from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Target, Flame } from "lucide-react";
import { useLocation } from "wouter";

interface ToolConfig {
  title: string;
  description: string;
  toolPath: string;
  features: string[];
}

const TOOL_DATA: Record<string, ToolConfig> = {
  "instagram-caption-generator": {
    title: "Free AI Instagram Caption Generator for Indian Creators",
    description: "Generate viral Instagram captions in seconds. Supports Hindi, English, and Hinglish. Used by 10,000+ Indian creators.",
    toolPath: "/generate",
    features: ["Platform-optimized captions", "Hinglish & Hindi support", "Built-in hashtag suggestions", "Multiple tone options"],
  },
  "youtube-hook-generator": {
    title: "AI YouTube Hook Generator — Get More Views in 2026",
    description: "Generate scroll-stopping YouTube hooks that get clicks. Trained on viral Indian YouTube content.",
    toolPath: "/hooks",
    features: ["Tested hook formulas", "Platform-specific optimization", "A/B test multiple hooks", "Hindi & English hooks"],
  },
  "linkedin-post-generator": {
    title: "AI LinkedIn Post Generator for Indian Professionals",
    description: "Generate professional LinkedIn posts that build authority and drive profile visits.",
    toolPath: "/generate",
    features: ["Professional tone calibration", "Thought leadership templates", "Industry-specific content", "CTA optimization"],
  },
  "viral-hook-generator-india": {
    title: "Viral Hook Generator for Indian Social Media Creators",
    description: "Create hooks that stop the scroll on Instagram, YouTube, and Twitter. Designed for Indian content styles.",
    toolPath: "/hooks",
    features: ["Bollywood-style emotional hooks", "Hinglish hooks", "Cricket & pop culture references", "Regional content support"],
  }
};

export default function ToolLandingPage({ tool }: { tool: string }) {
  const config = TOOL_DATA[tool as keyof typeof TOOL_DATA];
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (config) {
      document.title = config.title;
    }
  }, [config]);

  if (!config) return <div>Tool not found</div>;

  return (
    <PageWrapper maxWidth="lg" className="py-20 space-y-24">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em]"
          >
            <Sparkles className="w-3 h-3" />
            Free AI Creator Tools
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-white italic tracking-tight leading-[0.95]"
          >
            {config.title}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/50 font-medium"
          >
            {config.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
          >
            <Button 
              size="lg" 
              onClick={() => navigate(config.toolPath)}
              className="h-14 px-10 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-lg shadow-glow transition-all"
            >
              USE THE TOOL FREE →
            </Button>
            <span className="text-white/30 text-xs font-bold">No Login Required</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 w-full max-w-md aspect-square rounded-[40px] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          <div className="relative z-10 text-cyan-400">
            <Zap size={120} className="animate-pulse" />
          </div>
          <div className="absolute bottom-8 left-8 right-8 p-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 space-y-2">
             <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Live Result</p>
             <p className="text-sm text-white/80 font-medium">"Wait until you see how this AI hook doubles your watch time..."</p>
          </div>
        </motion.div>
      </div>

      {/* SEO Content Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-white italic">Why use GrowFlow?</h2>
          <p className="text-white/40 leading-relaxed">
            Most AI tools are built for US-based audiences. GrowFlow is the first AI content generator designed specifically for the Indian creator economy. We understand context, slang, and cultural nuances that make content go viral in India.
          </p>
          <ul className="space-y-4">
            {config.features.map(item => (
              <li key={item} className="flex items-center gap-3 text-white/70 font-medium">
                <Target className="w-5 h-5 text-cyan-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-white italic">How it works</h2>
          <div className="space-y-4">
            {[
              { step: "1", text: "Enter your topic or a rough idea of what you want to share." },
              { step: "2", text: "Choose your tone — from Professional to Aggressive/Viral." },
              { step: "3", text: "Our AI analyzes 10k+ viral posts to generate your result." },
              { step: "4", text: "Copy, paste, and watch your engagement grow." }
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center font-black text-white shrink-0">{s.step}</span>
                <p className="text-white/60 text-sm font-medium">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="text-center py-20 border-t border-white/5">
        <h2 className="text-4xl font-black text-white italic mb-8">Ready to grow your reach?</h2>
        <Button 
          size="lg" 
          onClick={() => navigate("/sign-up")}
          className="h-14 px-12 rounded-2xl bg-white text-cyan-900 font-black text-lg hover:scale-105 transition-all shadow-xl"
        >
          JOIN 10,000+ CREATORS →
        </Button>
      </div>
    </PageWrapper>
  );
}
