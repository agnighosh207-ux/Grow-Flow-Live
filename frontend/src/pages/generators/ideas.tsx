import { useState } from "react";
import { PlanGate, useTrialAction } from "@/components/shared/PlanGate";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2, Wand2, ArrowRight, Zap, Target, TrendingUp, ChevronRight } from "lucide-react";

const NICHES = ["General", "Fitness", "Finance", "Tech", "Motivation", "Business", "Lifestyle"] as const;

const NICHE_COLORS: Record<string, string> = {
  General: "text-white/60",
  Fitness: "text-emerald-400",
  Finance: "text-yellow-400",
  Tech: "text-blue-400",
  Motivation: "text-orange-400",
  Business: "text-violet-400",
  Lifestyle: "text-pink-400",
};

const NICHE_BG: Record<string, string> = {
  General: "bg-white/5 border-white/10",
  Fitness: "bg-emerald-500/8 border-emerald-500/20",
  Finance: "bg-yellow-500/8 border-yellow-500/20",
  Tech: "bg-blue-500/8 border-blue-500/20",
  Motivation: "bg-orange-500/8 border-orange-500/20",
  Business: "bg-violet-500/8 border-violet-500/20",
  Lifestyle: "bg-pink-500/8 border-pink-500/20",
};

const PATTERN_COLORS: Record<string, string> = {
  "Do This Not That": "bg-blue-500/15 text-blue-300 border-blue-500/20",
  "Stop This Mistake": "bg-red-500/15 text-red-300 border-red-500/20",
  "The Truth About X": "bg-amber-500/15 text-amber-300 border-amber-500/20",
  "X vs Y Comparison": "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  "Story Arc (Before → After)": "bg-purple-500/15 text-purple-300 border-purple-500/20",
  "Step-by-Step Framework": "bg-green-500/15 text-green-300 border-green-500/20",
  "Specific Result Breakdown": "bg-teal-500/15 text-teal-300 border-teal-500/20",
  "Contrarian Opinion": "bg-orange-500/15 text-orange-300 border-orange-500/20",
  "Little-Known Secret": "bg-violet-500/15 text-violet-300 border-violet-500/20",
  "Common Myth Debunked": "bg-pink-500/15 text-pink-300 border-pink-500/20",
};

interface ContentIdea {
  idea: string;
  hook: string;
  angle: string;
  whyItWorks: string;
  pattern: string;
}

function IdeasGeneratorInner() {
  const [niche, setNiche] = useState<typeof NICHES[number]>("General");
  const [goal, setGoal] = useState("");
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { useOneTrial } = useTrialAction();

  const nicheColor = NICHE_COLORS[niche] || NICHE_COLORS.General;
  const nicheBg = NICHE_BG[niche] || NICHE_BG.General;

  async function generateIdeas() {
    if (!goal.trim()) {
      toast({ variant: "destructive", title: "Enter your content goal first" });
      return;
    }
    setLoading(true);
    setIdeas([]);
    setExpandedIndex(null);
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, goal }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setIdeas(data.ideas ?? []);
      useOneTrial();
    } catch {
      toast({ variant: "destructive", title: "Generation failed", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function useIdea(idea: ContentIdea) {
    navigate(`/generate?idea=${encodeURIComponent(idea.idea)}&contentType=Educational&tone=Casual`);
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
          <Lightbulb className="w-7 h-7 lg:w-9 lg:h-9 text-yellow-400" />
          Idea Generator
        </h1>
        <p className="text-white/50 text-sm md:text-base">Get 10 battle-tested content ideas with hooks, angles, and the psychology behind each one.</p>
      </div>

      <div
        className="rounded-2xl border border-white/8 p-5 md:p-6 lg:p-8 space-y-5"
        style={{
          background: "linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Your Niche</label>
            <Select value={niche} onValueChange={(v) => setNiche(v as any)}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-yellow-500/40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0a1e] border-white/10">
                {NICHES.map(n => (
                  <SelectItem key={n} value={n} className="text-white/80 focus:text-white focus:bg-yellow-600/20">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Your Goal</label>
            <Input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. grow my audience, establish authority..."
              className="bg-black/20 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-yellow-500/40 rounded-xl h-10"
              onKeyDown={e => e.key === "Enter" && generateIdeas()}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={generateIdeas}
            disabled={loading}
            className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-semibold shadow-lg shadow-yellow-900/40 rounded-xl px-6"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Lightbulb className="w-4 h-4 mr-2" /> Generate 10 Ideas</>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-3"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-white/3 border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </motion.div>
        )}

        {!loading && ideas.length > 0 && (
          <motion.div
            key="ideas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`w-4 h-4 ${nicheColor}`} />
              <span className="text-white/50 text-sm">10 ideas for <span className={`font-semibold ${nicheColor}`}>{niche}</span> creators</span>
            </div>

            {ideas.map((idea, i) => {
              const isExpanded = expandedIndex === i;
              const patternColor = PATTERN_COLORS[idea.pattern] || "bg-white/8 text-white/60 border-white/10";

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border ${nicheBg} overflow-hidden cursor-pointer`}
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  <div className="p-4 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 ${nicheBg} border`}>
                      <span className={nicheColor}>{i + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-sm font-semibold leading-snug">{idea.idea}</p>
                        <ChevronRight className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                      <span className={`inline-flex mt-2 items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${patternColor}`}>
                        {idea.pattern}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Hook</span>
                              </div>
                              <p className="text-white/80 text-xs leading-relaxed italic">"{idea.hook}"</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Target className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Angle</span>
                              </div>
                              <p className="text-white/80 text-xs leading-relaxed">{idea.angle}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Why It Works</span>
                              </div>
                              <p className="text-white/80 text-xs leading-relaxed">{idea.whyItWorks}</p>
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); useIdea(idea); }}
                              className="bg-white/8 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 text-xs rounded-lg font-medium"
                            >
                              <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                              Generate Content
                              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {!loading && ideas.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/15 flex items-center justify-center mx-auto">
              <Lightbulb className="w-7 h-7 text-yellow-400/60" />
            </div>
            <p className="text-white/40 text-sm">Select your niche, enter your goal, and hit Generate.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IdeasGenerator() {
  return (
    <PlanGate
      requiredPlan="starter"
      featureName="Idea Generator"
      toolKey="ideas"
      freeTrials={3}
      description="Generate 10 battle-tested content ideas with hooks, angles, and psychology."
    >
      <IdeasGeneratorInner />
    </PlanGate>
  );
}
