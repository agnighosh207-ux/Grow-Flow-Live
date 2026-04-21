import React, { useState } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, Copy, Check, ChevronDown, Info, ArrowRight, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = ["Instagram", "Twitter", "LinkedIn", "YouTube"] as const;
const TONES = ["Professional", "Casual", "Witty", "Inspirational", "Bold"] as const;
const NICHES = [
  "Fitness & Health",
  "Finance & Investing",
  "Tech & AI",
  "Business & Entrepreneurship",
  "Lifestyle & Travel",
  "Motivation & Mindset",
  "Food & Recipes",
  "Fashion & Beauty",
  "Education",
  "Entertainment",
  "Personal Brand",
  "Other",
] as const;

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸",
  Twitter: "🐦",
  LinkedIn: "💼",
  YouTube: "▶️",
};

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 150,
  Twitter: 160,
  LinkedIn: 220,
  YouTube: 1000,
};

interface BioVariation {
  label: string;
  bio: string;
  charCount: number;
  strategy: string;
}

interface BioResult {
  platform: string;
  niche: string;
  variations: BioVariation[];
  proTip: string;
}

function CharBar({ count, limit }: { count: number; limit: number }) {
  const pct = Math.min(100, (count / limit) * 100);
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono ${pct > 90 ? "text-red-400" : "text-white/40"}`}>
        {count}/{limit}
      </span>
    </div>
  );
}

function VariationCard({ v, platform, idx }: { v: BioVariation; platform: string; idx: number }) {
  const [copied, setCopied] = useState(false);
  const limit = CHAR_LIMITS[platform] || 150;

  const labelColors: Record<string, string> = {
    Authority: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
    Story: "bg-blue-500/15 text-blue-300 border-blue-500/20",
    Bold: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  };

  const copy = () => {
    navigator.clipboard.writeText(v.bio);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.12 }}
      className="rounded-2xl bg-white/4 border border-white/8 p-4 hover:border-white/14 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${labelColors[v.label] || "bg-white/8 text-white/50 border-white/10"}`}>
          {v.label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-all"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </button>
      </div>

      <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-medium mb-2">
        {v.bio}
      </p>

      <CharBar count={v.charCount || v.bio.length} limit={limit} />

      {v.strategy && (
        <p className="mt-3 text-white/40 text-xs flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400/70" />
          {v.strategy}
        </p>
      )}
    </motion.div>
  );
}

export default function BioGenerator() {
  const { toast } = useToast();
  const sub = useSubscriptionStatus();

  const [platform, setPlatform] = useState<string>("Instagram");
  const [niche, setNiche] = useState<string>("Personal Brand");
  const [role, setRole] = useState("");
  const [expertise, setExpertise] = useState("");
  const [tone, setTone] = useState<string>("Professional");
  const [cta, setCta] = useState("");
  const [achievements, setAchievements] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BioResult | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  const LOADING_MESSAGES = [
    "Analyzing your profile...",
    "Crafting perfect hooks...",
    "Optimizing character limits...",
    "Polishing the final bio...",
  ];

  React.useEffect(() => {
    if (!loading) { setLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const generate = async () => {
    if (!role.trim()) {
      toast({ title: "Enter your role or title", description: "e.g. Fitness Coach, Indie Developer, Travel Blogger", variant: "destructive" });
      return;
    }
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ platform, niche, role, expertise, tone, cta, achievements }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/25 to-teal-500/25 border border-cyan-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Bio Generator</h1>
              <p className="text-white/40 text-sm">AI-crafted bios that convert profile visitors to followers</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white/[0.03] border border-white/8 p-5 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                    platform === p
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                      : "bg-white/3 border-white/8 text-white/40 hover:bg-white/6 hover:text-white/60"
                  }`}
                >
                  <span className="text-lg">{PLATFORM_ICONS[p]}</span>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Your Role / Title *</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Fitness Coach, SaaS Founder"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/7"
                style={{ color: "#ffffff" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Niche</label>
              <div className="relative">
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                  style={{ color: "#ffffff" }}
                >
                  {NICHES.map((n) => <option key={n} value={n} className="bg-[#1a1a2e]">{n}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Key Expertise / Skills</label>
            <input
              type="text"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="e.g. strength training, keto nutrition, injury rehab"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/7"
              style={{ color: "#ffffff" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Tone</label>
              <div className="relative">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
                  style={{ color: "#ffffff" }}
                >
                  {TONES.map((t) => <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Call-to-Action</label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g. DM me 'START'"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/7"
                style={{ color: "#ffffff" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Achievements / Credentials <span className="text-white/20 normal-case">(optional)</span></label>
            <input
              type="text"
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="e.g. Helped 500+ clients, 100K followers, Forbes 30 Under 30"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-white/7"
              style={{ color: "#ffffff" }}
            />
          </div>

          <button
            onClick={generate}
            disabled={loading || !role.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Crafting your bio...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate 3 Bio Variations
              </>
            )}
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {loading && !result && (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-center gap-2.5 justify-center mb-6">
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-cyan-300 font-medium whitespace-nowrap"
                  >
                     {LOADING_MESSAGES[loadingMsgIdx]}
                  </motion.span>
                </AnimatePresence>
              </div>

              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-white/4 border border-white/8 p-5 animate-pulse">
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-6 w-24 bg-white/10 rounded-full" />
                    <div className="h-8 w-20 bg-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2.5 mb-4">
                    <div className="h-4 w-full bg-white/10 rounded-md" />
                    <div className="h-4 w-5/6 bg-white/10 rounded-md" />
                    <div className="h-4 w-4/6 bg-white/10 rounded-md" />
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full mt-4" />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!loading && result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/70">
                  {PLATFORM_ICONS[result.platform]} {result.platform} Bios
                </h2>
                <span className="text-xs text-white/30">{result.niche}</span>
              </div>

              {Array.isArray(result.variations) && result.variations.map((v, i) => (
                <VariationCard key={i} v={v} platform={result.platform} idx={i} />
              ))}

              {result.proTip && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl bg-cyan-500/8 border border-cyan-500/15 p-3.5 flex items-start gap-2.5"
                >
                  <Zap className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-cyan-300 mb-0.5">Pro Tip</p>
                    <p className="text-xs text-white/60">{result.proTip}</p>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={generate}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-white/60 hover:text-white text-xs font-medium transition-all border border-white/8"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Try Different Angle
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
