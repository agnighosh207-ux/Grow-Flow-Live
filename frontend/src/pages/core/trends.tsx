import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, Zap, ChevronDown, ChevronRight,
  Loader2, Flame, Target, Brain, RefreshCw, Copy, Check, ArrowRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { UpgradeModal } from "@/components/modals/UpgradeModal";

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
  All: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
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
            <p className="text-xs text-cyan-200/80 leading-relaxed italic flex-1">
              "{idea.hook}"
            </p>
            <button
              onClick={copyHook}
              className="shrink-0 p-1 rounded-md text-white/25 hover:text-cyan-300 transition-colors"
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
          className="h-7 text-xs px-3 bg-cyan-600/70 hover:bg-cyan-600 text-white rounded-lg transition-all duration-300 hover:shadow-[0_0_12px_rgba(8,145,178,0.4)]"
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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsSummary, setAlertsSummary] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"limit" | "pro_feature">("limit");

  async function fetchAlerts() {
    setAlertsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/trend-alerts/latest", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.trends || []);
        setAlertsSummary(data.weekSummary || "");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAlertsLoading(false);
    }
  }

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchTrends() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/trends/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ niche }),
      });
      if (res.status === 402) {
        setUpgradeReason("limit");
        setShowUpgradeModal(true);
        return;
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to fetch trends");
      }
      const data = await res.json();
      setTrends(data.trends ?? []);
      setLastNiche(niche);
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Failed to load trending ideas. Try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    }
  }

  function handleUseIdea(idea: string) {
    navigate(`/generate?idea=${encodeURIComponent(idea)}&contentType=Viral&tone=Casual`);
  }

  return (
    <div className="space-y-12 pb-24">
      <FeatureGuideBanner 
        toolKey="trends" 
        title="Trend Engine" 
        icon={<TrendingUp className="w-5 h-5 text-red-400" />}
        tagline="Discover what's trending RIGHT NOW in your niche using live AI-powered web search."
        whatYouGet={["5 trending topics", "Why each is trending", "Suggested content angle"]}
        whenToUse="Use this when you want to create timely content that rides a current wave."
        proTip="Trends are live-searched through Perplexity AI — results are always fresh, not from outdated training data."
        planRequired="Creator"
      />
      {/* Premium Weekly Trend Alerts */}
      <section className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
        <div className="relative p-10 rounded-[3rem] bg-zinc-950/40 backdrop-blur-3xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
            <div className="flex items-center gap-6">
               <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[1.5rem] shadow-[0_0_30px_rgba(79,70,229,0.3)] transform rotate-3">
                 <Flame className="w-8 h-8" />
               </div>
               <div>
                 <h2 className="text-4xl font-black text-white tracking-tighter">Weekly Intelligence Brief</h2>
                 <p className="text-indigo-400 font-bold tracking-widest text-xs uppercase mt-1">Niche-Specific Trend Analysis</p>
               </div>
            </div>
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit max-w-full overflow-x-auto no-scrollbar">
              <Button 
                variant="ghost" 
                onClick={fetchAlerts} 
                disabled={alertsLoading} 
                className="rounded-xl h-12 px-6 text-indigo-300 font-black tracking-widest text-xs hover:bg-indigo-500/10 transition-all"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} /> RELOAD REPORT
              </Button>
            </div>
          </div>

          {alertsSummary && (
            <div className="mb-12 p-8 rounded-[2rem] bg-indigo-500/5 border-l-4 border-indigo-500/50 italic">
               <p className="text-indigo-100/80 text-xl font-medium leading-relaxed">"{alertsSummary}"</p>
            </div>
          )}

          {alertsLoading && alerts.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[1,2,3].map(i => <div key={i} className="h-[400px] rounded-[2.5rem] bg-white/5 animate-pulse" />)}
            </div>
          ) : alerts.length > 0 ? (
            <div className="flex gap-8 overflow-x-auto pb-10 snap-x scrollbar-hide px-2">
               {alerts.map((a: any, i: number) => (
                 <motion.div 
                   key={i} 
                   whileHover={{ y: -10 }}
                   className="min-w-[380px] max-w-[380px] shrink-0 snap-center p-10 rounded-[3rem] bg-zinc-900/50 border border-white/5 hover:border-indigo-500/40 hover:shadow-[0_20px_80px_rgba(79,70,229,0.15)] transition-all flex flex-col group/card"
                 >
                   <div className="flex justify-between items-center mb-8">
                     <div className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/20">{a.type}</div>
                     <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{a.platform}</span>
                   </div>

                   <h3 className="text-2xl font-black text-white leading-tight mb-8 group-hover/card:text-indigo-400 transition-colors italic">
                    {a.description}
                   </h3>

                   <div className="mb-8 space-y-4">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Growth Potential</span>
                         <span className={`text-xl font-black ${a.opportunityScore >= 80 ? 'text-emerald-400' : a.opportunityScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{a.opportunityScore}%</span>
                      </div>
                      <div className="h-2.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${a.opportunityScore}%` }} 
                          className={`h-full rounded-full ${a.opportunityScore >= 80 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : a.opportunityScore >= 60 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-red-500'}`} 
                        />
                      </div>
                   </div>

                   <div className="flex-1 p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-8 relative group/idea">
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-zinc-950 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-widest">Actionable Path</div>
                      <p className="text-indigo-100 font-bold leading-relaxed">{a.actionableIdea}</p>
                   </div>

                   <Button 
                    onClick={() => handleUseIdea(a.actionableIdea)} 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl h-14 shadow-xl shadow-indigo-500/20 group-hover/card:scale-105 transition-transform"
                   >
                    EXECUTE STRATEGY <Zap className="w-4 h-4 ml-2" />
                   </Button>
                 </motion.div>
               ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-black/40 rounded-[2.5rem] border border-dashed border-white/10">
               <TrendingUp className="w-16 h-16 text-white/10 mx-auto mb-4" />
               <p className="text-white/30 font-black uppercase tracking-widest italic text-xl">No Intelligence Found for {niche}</p>
            </div>
          )}
        </div>
      </section>

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
              <motion.button
                key={n.value}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setNiche(n.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border ${
                  niche === n.value
                    ? "bg-red-500/20 text-red-300 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    : "bg-white/4 text-white/50 border-white/8 hover:bg-white/7 hover:text-white/70 hover:border-white/20"
                }`}
              >
                <span>{n.emoji}</span>
                {n.label}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto inline-block"
        >
          <Button
            onClick={fetchTrends}
            disabled={loading}
            className={`w-full sm:w-auto h-11 px-8 font-bold rounded-xl text-sm transition-all duration-300 ${
              loading 
                ? "bg-white/10 text-white/30 cursor-not-allowed" 
                : "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_35px_rgba(239,68,68,0.6)]"
            }`}
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
        </motion.div>
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
              className="mt-6 rounded-xl border border-cyan-500/15 p-4 flex items-center justify-between gap-4"
              style={{ background: "rgba(124,58,237,0.06)" }}
            >
              <div>
                <p className="text-sm font-semibold text-white/70">Ready to create?</p>
                <p className="text-xs text-white/35 mt-0.5">Pick any idea and generate full content for all platforms instantly.</p>
              </div>
              <Button
                onClick={() => navigate("/generate")}
                size="sm"
                className="shrink-0 bg-cyan-600/70 hover:bg-cyan-600 text-white rounded-xl text-xs h-8 px-4"
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
