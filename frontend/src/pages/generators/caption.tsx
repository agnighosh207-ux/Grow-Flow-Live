import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Copy, Check, ChevronDown, TrendingUp, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useAuth } from "@clerk/react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";

const PLATFORMS = ["Instagram", "Twitter", "LinkedIn", "YouTube", "Blog/Article", "General"] as const;

const IMPROVEMENT_FOCUS_OPTIONS = [
  { value: "all", label: "Everything — full transformation" },
  { value: "hook", label: "Hook — make first line impossible to scroll past" },
  { value: "cta", label: "CTA — drive more comments/saves/clicks" },
  { value: "formatting", label: "Formatting — readability and structure" },
  { value: "storytelling", label: "Storytelling — emotional connection" },
  { value: "hashtags", label: "Hashtags — discoverability" },
];

const GOALS = [
  "increase engagement",
  "drive more profile visits",
  "get more saves",
  "generate leads",
  "grow followers",
  "sell a product/service",
  "build authority",
  "start conversations",
];

interface Diagnosis {
  mainIssue: string;
  strengths: string[];
  weaknesses: string[];
}

interface Rewrite {
  caption: string;
  changesMade: string[];
  whyItWorks?: string;
}

interface HookScore {
  original: number;
  rewrite: number;
  explanation: string;
}

interface EnhanceResult {
  diagnosis: Diagnosis;
  fullRewrite: Rewrite;
  microEdit: Rewrite;
  hookScore: HookScore;
}

function ScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${color.replace("bg-", "text-")}`}>{score}</span>
    </div>
  );
}

function CaptionCard({ title, subtitle, caption, changes, accent, delay }: {
  title: string;
  subtitle?: string;
  caption: string;
  changes?: string[];
  accent: string;
  delay: number;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 hover:border-white/12 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${accent} mb-1`}>{title}</span>
          {subtitle && <p className="text-[11px] text-white/40">{subtitle}</p>}
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/6 hover:bg-white/10 text-white/60 hover:text-white text-xs font-medium transition-all shrink-0 ml-2"
        >
          {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
        </button>
      </div>

      <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>

      {changes && changes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/6 space-y-1">
          {changes.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-white/40">
              <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-violet-400/60" />
              {c}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function CaptionEnhancer() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<string>("Instagram");
  const [goal, setGoal] = useState("increase engagement");
  const [focus, setFocus] = useState("all");
  const [niche, setNiche] = useState("General");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [activeTab, setActiveTab] = useState<"full" | "micro">("full");
  const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    localStorage.setItem("preferred_language", language);
  }, [language]);
  const { data: sub } = useSubscriptionStatus();
  const isFreeUser = !sub?.planType || sub.planType === "free";

  const enhance = async () => {
    if (!caption.trim()) {
      toast({ title: "Paste a caption first", description: "Enter the caption you want to improve", variant: "destructive" });
      return;
    }
    if (caption.trim().length < 20) {
      toast({ title: "Caption too short", description: "Paste a longer caption for meaningful improvements", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/caption/enhance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "omit",
        body: JSON.stringify({ originalCaption: caption, platform, goal, niche, improvementFocus: focus, language }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Enhancement failed");
      }
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      toast({ title: "Enhancement failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper maxWidth="sm" className="pb-24 md:pb-8 space-y-8">
        <FeatureGuideBanner 
          toolKey="caption" 
          title="Caption Enhancer" 
          icon={<Wand2 className="w-5 h-5 text-violet-400" />}
          tagline="Surgically improve your existing captions to maximize engagement, clicks, and followers."
          whatYouGet={["Viral rewrite variations", "Surgical micro-edits", "Hook score analysis", "Diagnosis of issues"]}
          whenToUse="Use this when you have a good idea but the caption feels 'flat' or isn't performing as expected."
          proTip="Try the 'Micro-Edit' if you want to keep your original voice but just need better formatting and a stronger CTA."
          forceOpen={showGuide}
        />
        <PageHeader 
          icon={<Wand2/>} 
          iconBg="bg-violet-500/10" 
          iconColor="text-violet-400" 
          title="Caption Enhancer" 
          subtitle="Paste any caption — get a viral rewrite + surgical micro-edit"
          onInfoClick={() => setShowGuide(prev => !prev)}
        />


        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white/[0.03] border border-white/8 p-5 space-y-4">

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Your Caption *</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Paste any caption here — Instagram, LinkedIn, YouTube description, tweet, anything. The worse it is, the more dramatic the transformation."
              rows={5}
              className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/7 resize-none leading-relaxed"
              style={{ color: "#ffffff" }}
            />
            <div className="flex justify-between mt-1">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold ${
                  platform === "Twitter" 
                    ? ((() => {
                        const urlRegex = /https?:\/\/[^\s]+/g;
                        const urls = caption.match(urlRegex) || [];
                        let effectiveLength = caption.length;
                        urls.forEach((url: string) => {
                          effectiveLength = effectiveLength - url.length + 23;
                        });
                        return effectiveLength > 280 ? "text-red-400" : "text-white/25";
                      })())
                    : "text-white/25"
                }`}>
                  {(() => {
                    if (platform !== "Twitter") return `${caption.length} characters`;
                    const urlRegex = /https?:\/\/[^\s]+/g;
                    const urls = caption.match(urlRegex) || [];
                    let effectiveLength = caption.length;
                    urls.forEach((url: string) => {
                      effectiveLength = effectiveLength - url.length + 23;
                    });
                    return `${effectiveLength} / 280 chars`;
                  })()}
                </span>
                {platform === "Twitter" && caption.match(/https?:\/\/[^\s]+/) && (
                  <span className="text-[9px] text-violet-400/50 font-medium tracking-tight">
                    (Links auto-shortened to 23 chars)
                  </span>
                )}
              </div>
              {caption.length > 0 && caption.length < 20 && (
                <span className="text-[10px] text-amber-400/70">Paste more content for better results</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Platform</label>
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
                  style={{ color: "#ffffff" }}
                >
                  {PLATFORMS.map((p) => <option key={p} value={p} className="bg-[#1a1a2e]">{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Goal</label>
              <div className="relative">
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer"
                  style={{ color: "#ffffff" }}
                >
                  {GOALS.map((g) => <option key={g} value={g} className="bg-[#1a1a2e]">{g}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Improvement Focus</label>
            <div className="grid grid-cols-2 gap-1.5">
              {IMPROVEMENT_FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFocus(opt.value)}
                  className={`text-left px-3 py-2 rounded-xl border text-xs transition-all leading-snug ${
                    focus === opt.value
                      ? "bg-violet-500/15 border-violet-500/40 text-violet-200"
                      : "bg-white/3 border-white/8 text-white/40 hover:bg-white/5 hover:text-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <LanguageSelector
            value={language}
            onChange={setLanguage}
            isFreeUser={isFreeUser}
            label="Output Language"
            onUpgradeRequired={() => toast({ title: "\ud83d\udd12 Premium Languages", description: "Upgrade to enhance captions in regional languages!", variant: "destructive" })}
          />

          <button
            onClick={enhance}
            disabled={loading || !caption.trim() || caption.trim().length < 20}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing & enhancing...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Enhance Caption</>
            )}
          </button>
        </motion.div>

        {!loading && !result && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center py-12 px-6 text-center min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-white/25 text-sm font-medium">Your enhanced caption will appear here</p>
            <p className="text-white/15 text-xs mt-1">Paste your caption above and hit Enhance</p>
          </motion.div>
        )}
        {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {result.diagnosis && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white/80">Diagnosis</span>
                  </div>
                  <p className="text-sm text-amber-300/80 mb-3 leading-relaxed">{result.diagnosis.mainIssue}</p>
                  {Array.isArray(result.diagnosis.weaknesses) && result.diagnosis.weaknesses.length > 0 && (
                    <div className="space-y-1">
                      {result.diagnosis.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-white/40">
                          <span className="text-red-400 mt-0.5">✕</span> {w}
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(result.diagnosis.strengths) && result.diagnosis.strengths.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.diagnosis.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-white/40">
                          <span className="text-emerald-400 mt-0.5">✓</span> {s}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {result.hookScore && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="rounded-2xl bg-white/[0.03] border border-white/8 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-white/80">Hook Score</span>
                    <span className="ml-auto text-xs text-white/30">out of 10</span>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar score={result.hookScore.original} label="Original" color="bg-red-500" />
                    <ScoreBar score={result.hookScore.rewrite} label="Rewrite" color="bg-emerald-500" />
                  </div>
                  {result.hookScore.explanation && (
                    <p className="mt-3 text-[11px] text-white/35 leading-relaxed">{result.hookScore.explanation}</p>
                  )}
                </motion.div>
              )}

              <div className="flex gap-1.5 p-1 bg-white/4 rounded-xl">
                <button
                  onClick={() => setActiveTab("full")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "full" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
                >
                  Full Rewrite
                </button>
                <button
                  onClick={() => setActiveTab("micro")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === "micro" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
                >
                  Micro-Edit
                </button>
              </div>

              {activeTab === "full" && result.fullRewrite && (
                <CaptionCard
                  title="Full Rewrite"
                  subtitle={result.fullRewrite.whyItWorks}
                  caption={result.fullRewrite.caption}
                  changes={result.fullRewrite.changesMade}
                  accent="bg-violet-500/12 text-violet-300 border-violet-500/20"
                  delay={0.2}
                />
              )}

              {activeTab === "micro" && result.microEdit && (
                <CaptionCard
                  title="Micro-Edit"
                  subtitle="80% original, surgically improved"
                  caption={result.microEdit.caption}
                  changes={result.microEdit.changesMade}
                  accent="bg-blue-500/12 text-blue-300 border-blue-500/20"
                  delay={0.2}
                />
              )}

              <button
                onClick={enhance}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-white/50 hover:text-white text-xs font-medium transition-all border border-white/8"
              >
                Try Another Angle
              </button>
            </motion.div>
          )}
    </PageWrapper>
  );
}
