import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, Zap, ChevronDown, ChevronRight,
  Loader2, Flame, Target, Brain, RefreshCw, Copy, Check, ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";

const NICHES = [
  { value: "General", emoji: "🌐", label: "General" },
  { value: "Fitness", emoji: "💪", label: "Fitness" },
  { value: "Finance", emoji: "💰", label: "Finance" },
  { value: "Tech", emoji: "⚡", label: "Tech" },
  { value: "Motivation", emoji: "🔥", label: "Motivation" },
  { value: "Business", emoji: "📈", label: "Business" },
  { value: "Lifestyle", emoji: "✨", label: "Lifestyle" },
  { value: "Fashion", emoji: "👗", label: "Fashion" },
  { value: "Food", emoji: "🍕", label: "Food" },
  { value: "Parenting", emoji: "👨‍👩‍👧", label: "Parenting" },
  { value: "Education", emoji: "📚", label: "Education" },
];

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  YouTube: "text-red-400 bg-red-500/10 border-red-500/20",
  Twitter: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  LinkedIn: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  All: "text-violet-400 bg-violet-500/10 border-violet-500/20",
};

function TrendScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-red-400" : score >= 80 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-white/6 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${
        score >= 90 ? "text-red-400" : score >= 80 ? "text-amber-400" : "text-emerald-400"
      }`}>{score}</span>
    </div>
  );
}

function TrendCard({ idea, index, onUseIdea }: { idea: any; index: number; onUseIdea: (idea: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const platformStyle = PLATFORM_COLORS[idea.platform] ?? PLATFORM_COLORS["All"];

  function copyHook() {
    navigator.clipboard.writeText(idea.hook);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 24 }}
      className="rounded-2xl border border-white/8 overflow-hidden group"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${platformStyle}`}>
              {idea.platform}
            </span>
            <div className="flex items-center gap-1">
              <Flame className={`w-3 h-3 ${idea.trendScore >= 90 ? "text-red-400" : idea.trendScore >= 80 ? "text-amber-400" : "text-emerald-400"}`} />
              <span className="text-[10px] text-white/40 font-medium">Trend Score</span>
            </div>
          </div>
          <span className="text-[10px] text-white/25 font-mono shrink-0">#{index + 1}</span>
        </div>

        <div className="mb-2">
          <TrendScoreBar score={idea.trendScore ?? 80} />
        </div>

        <h3 className="text-sm font-semibold text-white leading-snug mb-3 mt-3">
          {idea.title}
        </h3>

        <div className="rounded-xl px-3 py-2.5 mb-3"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.14)" }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-violet-200/80 leading-relaxed italic flex-1">
              "{idea.hook}"
            </p>
            <button
              onClick={copyHook}
              className="shrink-0 p-1 rounded-md text-white/25 hover:text-violet-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition-colors mb-1"
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? "Hide details" : "See angle & why it works"}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2">
                <div>
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Content Angle
                  </p>
                  <p className="text-xs text-white/65 leading-relaxed">{idea.angle}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Why It Works
                  </p>
                  <p className="text-xs text-white/65 leading-relaxed">{idea.whyItWorks}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between">
        <span className="text-[10px] text-white/25">Use this idea →</span>
        <Button
          size="sm"
          onClick={() => onUseIdea(idea.title)}
          className="h-7 text-xs px-3 bg-violet-600/70 hover:bg-violet-600 text-white rounded-lg"
        >
          <Zap className="w-3 h-3 mr-1" /> Generate Content
        </Button>
      </div>
    </motion.div>
  );
}

export default function TrendEngine() {
  const [niche, setNiche] = useState("General");
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastNiche, setLastNiche] = useState<string | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  async function fetchTrends() {
    setLoading(true);
    try {
      const res = await fetch("/api/trends/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      });
      if (res.status === 402) {
        toast({
          title: "Upgrade Required",
          description: "You've used your free trend engine tries. Get unlimited access to continue.",
          variant: "destructive",
        });
        navigate("/pricing");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch trends");
      const data = await res.json();
      setTrends(data.trends ?? []);
      setLastNiche(niche);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load trending ideas. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleUseIdea(idea: string) {
    navigate(`/generate?idea=${encodeURIComponent(idea)}&contentType=Viral&tone=Casual`);
  }

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
          <TrendingUp className="w-7 h-7 lg:w-9 lg:h-9 text-red-400" />
          Trend Engine
        </h1>
        <p className="text-white/50 text-sm md:text-base">
          Discover what's trending in your niche. Get AI-powered ideas that are working right now.
        </p>
      </div>

      <div
        className="rounded-2xl border border-white/8 p-5 md:p-6 lg:p-8"
        style={{
          background: "linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="mb-5">
          <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-3">
            Select Your Niche
          </p>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((n) => (
              <button
                key={n.value}
                onClick={() => setNiche(n.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                  niche === n.value
                    ? "bg-red-500/20 text-red-300 border-red-500/30 shadow-sm"
                    : "bg-white/4 text-white/50 border-white/8 hover:bg-white/7 hover:text-white/70"
                }`}
              >
                <span>{n.emoji}</span>
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={fetchTrends}
          disabled={loading}
          className="w-full sm:w-auto h-11 px-8 font-semibold rounded-xl text-sm"
          style={{
            background: loading ? undefined : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            boxShadow: loading ? undefined : "0 4px 20px rgba(239,68,68,0.25)",
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing trends...
            </>
          ) : trends.length > 0 ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Trends
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 mr-2" />
              Discover Trending Ideas
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {trends.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-white/70">
                  Trending in <span className="text-white">{lastNiche}</span>
                </h2>
              </div>
              <span className="text-xs text-white/25">{trends.length} ideas generated</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trends.map((idea: any, i: number) => (
                <TrendCard key={i} idea={idea} index={i} onUseIdea={handleUseIdea} />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 rounded-xl border border-violet-500/15 p-4 flex items-center justify-between gap-4"
              style={{ background: "rgba(124,58,237,0.06)" }}
            >
              <div>
                <p className="text-sm font-semibold text-white/70">Ready to create?</p>
                <p className="text-xs text-white/35 mt-0.5">Pick any idea and generate full content for all platforms instantly.</p>
              </div>
              <Button
                onClick={() => navigate("/generate")}
                size="sm"
                className="shrink-0 bg-violet-600/70 hover:bg-violet-600 text-white rounded-xl text-xs h-8 px-4"
              >
                Go to Generator <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && trends.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/5 p-12 text-center"
          style={{ background: "rgba(255,255,255,0.01)" }}
        >
          <TrendingUp className="w-10 h-10 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-1">No trends loaded yet</p>
          <p className="text-white/20 text-xs">Select your niche above and click Discover to see what's trending</p>
        </motion.div>
      )}
    </div>
  );
}
