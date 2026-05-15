import React from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2, Zap, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface NicheConfig {
  name: string;
  slug: string;
  description: string;
  examples: string[];
  features: string[];
}

const NICHE_DATA: Record<string, NicheConfig> = {
  fitness: {
    name: "Fitness",
    slug: "fitness-creators",
    description: "Generate 30 days of high-protein, high-engagement fitness content in minutes. From workout hooks to nutrition threads.",
    examples: ["3 mistakes beginners make at the gym", "5 restaurant-quality high-protein meals", "How I dropped 5kg in 30 days without starving"],
    features: ["Viral Workout Hooks", "Nutrition Thread Templates", "Form Correction Reel Scripts"],
  },
  finance: {
    name: "Finance",
    slug: "finance-creators",
    description: "The AI content partner for FinTech and Personal Finance creators. Simplify complex money concepts into viral gems.",
    examples: ["Why your savings account is losing you money", "How to retire by 40: The 4% rule", "3 stocks I'm watching in 2026"],
    features: ["Complex Concept Simplifier", "Market Update Templates", "Wealth-Building Hooks"],
  },
  tech: {
    name: "Tech",
    slug: "tech-creators",
    description: "Scale your tech influence with AI. Generate tutorials, code breakdowns, and AI news threads that actually get shared.",
    examples: ["Why Next.js 16 is a game changer", "How to build a SaaS in 24 hours", "The secret AI tools nobody is telling you about"],
    features: ["Developer Advocacy Templates", "Tool Review Scripts", "Coding Tip Thread Generator"],
  },
  food: {
    name: "Food",
    slug: "food-bloggers",
    description: "Turn your recipes into viral sensations. Generate mouth-watering captions and hooks for foodies and home cooks.",
    examples: ["The secret to the perfect 5-minute pasta", "3 kitchen gadgets you actually need", "What I eat in a day for energy"],
    features: ["Recipe Hook Generator", "Kitchen Tip Templates", "Foodie Community CTAs"],
  }
};

export default function NicheLandingPage({ niche }: { niche: string }) {
  const config = NICHE_DATA[niche as keyof typeof NICHE_DATA];
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (config) {
      document.title = `AI Content Generator for ${config.name} Creators — GrowFlow AI`;
    }
  }, [config]);

  if (!config) return <div>Niche not found</div>;

  return (
    <PageWrapper maxWidth="lg" className="py-20 space-y-24">
      {/* Hero Section */}
      <div className="text-center space-y-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-black uppercase tracking-widest"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Content for {config.name} Creators
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-white italic tracking-tight leading-none"
        >
          Generate 30 Days of <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">{config.name}</span> Content in Minutes
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-white/50 font-medium"
        >
          {config.description} Built specifically for {config.name.toLowerCase()} creators who want to scale their audience without burning out.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Button 
            size="lg" 
            onClick={() => navigate("/sign-up")}
            className="h-14 px-10 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-lg shadow-glow transition-all"
          >
            START GROWING NOW →
          </Button>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest">No credit card required</p>
        </motion.div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {config.features.map((f, i) => (
          <motion.div
            key={f}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4 hover:bg-white/[0.04] transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400">
              {i === 0 ? <Zap /> : i === 1 ? <TrendingUp /> : <CheckCircle2 />}
            </div>
            <h3 className="text-xl font-black text-white italic">{f}</h3>
            <p className="text-sm text-white/40 leading-relaxed">
              Engineered using thousands of high-performing {config.name.toLowerCase()} posts to ensure your content actually converts.
            </p>
          </motion.div>
        ))}
      </div>

      {/* Examples Section */}
      <div className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white italic">Proven Examples</h2>
          <p className="text-white/40">Viral {config.name.toLowerCase()} content ideas ready for you to remix</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {config.examples.map((ex, i) => (
            <div key={i} className="p-6 rounded-2xl bg-black/40 border border-white/5 italic text-white/70 text-sm">
              "{ex}"
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="p-12 rounded-[40px] bg-gradient-to-br from-violet-600 to-indigo-700 text-center space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -mr-32 -mt-32 rounded-full" />
        <h2 className="text-4xl font-black text-white italic leading-tight">Ready to become the #1 <br/> {config.name} creator?</h2>
        <Button 
          size="lg" 
          variant="secondary"
          onClick={() => navigate("/sign-up")}
          className="h-16 px-12 rounded-2xl bg-white text-violet-900 font-black text-xl hover:bg-zinc-100 transition-all shadow-xl"
        >
          CLAIM YOUR FREE CREDITS
        </Button>
      </div>
    </PageWrapper>
  );
}
