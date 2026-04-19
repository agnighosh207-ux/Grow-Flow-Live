import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package2, Sparkles, Copy, Check, ChevronDown, Crown, Lock, Wand2, Activity,
  Clock, Music, Target, Image as ImageIcon, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useLocation } from "wouter";

const TONES = ["Professional", "Casual", "Aggressive", "Inspirational", "Educational"] as const;
const CONTENT_TYPES = ["Educational", "Story", "Viral", "Product/Service", "Opinion"] as const;

interface PackResult {
  idea: string;
  isPro: boolean;
  isCreator: boolean;
  instagram?: {
    caption: string;
    imagePrompt?: string;
    carouselSlides?: string[];
  };
  reel?: {
    script: string;
    audioSuggestion?: string;
  };
  twitter?: { thread: string[] };
  linkedin?: { post: string; bestTimeToPost?: string };
  strategy?: {
    viralityScore: number;
    targetAudience: string;
    coreMessage: string;
  };
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs transition-all shrink-0">
      {copied ? <><Check className="w-3 h-3 text-emerald-400" />{label || "Copied!"}</> : <><Copy className="w-3 h-3" />{label || "Copy"}</>}
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  color,
  children,
  delay,
  locked,
  lockedReason,
}: {
  icon: any;
  title: string;
  badge?: string;
  color: string;
  children?: React.ReactNode;
  delay: number;
  locked?: boolean;
  lockedReason?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border ${locked ? "bg-white/[0.01] border-white/5" : "bg-white/[0.035] border-white/10 hover:border-white/15 transition-all"}`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${locked ? "border-white/5" : "border-white/8"}`}>
        <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className={`text-sm font-semibold ${locked ? "text-white/30" : "text-white/80"}`}>{title}</span>
        {badge && (
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-semibold ${locked ? "bg-white/4 text-white/20 border-white/8" : "bg-violet-500/12 text-violet-300 border-violet-500/20"}`}>
            {badge}
          </span>
        )}
        {locked && <Lock className="w-3.5 h-3.5 text-white/20 ml-auto" />}
      </div>
      <div className={`p-4 ${locked ? "opacity-40" : ""}`}>
        {locked ? (
          <div className="text-center py-4">
            <Crown className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-white/25 text-xs">{lockedReason || "Unlock to access"}</p>
          </div>
        ) : children}
      </div>
    </motion.div>
  );
}

export default function ContentPack() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: sub } = useSubscriptionStatus();
  const prefill = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("idea") ?? "" : "";
  const [idea, setIdea] = useState(prefill);
  const [tone, setTone] = useState<string>("Professional");
  const [contentType, setContentType] = useState<string>("Educational");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [result, setResult] = useState<PackResult | null>(null);
  const [activeTab, setActiveTab] = useState<"scripts" | "visuals" | "strategy">("scripts");

  const isPro = sub?.planType === "infinity" && (sub?.plan === "active" || sub?.plan === "trial");
  const isCreator = ["starter", "creator", "infinity"].includes(sub?.planType ?? "") && (sub?.plan === "active" || sub?.plan === "trial");
  const isFree = !isCreator;

  const [saving, setSaving] = useState(false);

  const savePack = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch("/api/content/pack/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, tone, contentType, result })
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Saved to History!", description: "You can view this pack later." });
    } catch (e) {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const enhanceIdea = async () => {
    if (!idea.trim()) return;
    setEnhancing(true);
    try {
      const res = await fetch("/api/content/pack/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhancedIdea) setIdea(data.enhancedIdea);
        toast({ title: "Idea Enhanced!", description: "Applied expert copywriting.", variant: "default" });
      }
    } catch (err) {
      toast({ title: "Enhance failed", variant: "destructive" });
    } finally {
      setEnhancing(false);
    }
  };

  const generate = async () => {
    if (!idea.trim()) {
      toast({ title: "Enter your idea first", variant: "destructive" });
      return;
    }
    if (isFree) {
      toast({ title: "Creator plan required", description: "Get unlimited access with Creator or Infinity", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/content/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idea, tone, contentType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 402) {
          toast({ title: "Upgrade required", description: err.message, variant: "destructive" });
          return;
        }
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      setResult(data);
      setActiveTab("scripts");
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/25 to-purple-500/25 border border-violet-500/20 flex items-center justify-center">
              <Package2 className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Content Kit Pro</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-semibold">BETA</span>
              </div>
              <p className="text-white/40 text-sm">One idea → Complete cross-platform ecosystem</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {[
              { label: "Instagram", icon: "📸", locked: false },
              { label: "Reel Script", icon: "🎬", locked: !isPro },
              { label: "Carousel", icon: "🃏", locked: !isPro },
              { label: "Twitter", icon: "🐦", locked: false },
              { label: "LinkedIn", icon: "💼", locked: !isPro },
            ].map(({ label, icon, locked }) => (
              <div key={label} className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-center ${locked ? "bg-white/2 border-white/5 opacity-40" : "bg-white/[0.03] border-white/8"}`}>
                <span className="text-base">{icon}</span>
                <span className="text-[9px] text-white/50 font-medium leading-tight">{label}</span>
                {locked && <Lock className="w-2.5 h-2.5 text-white/20" />}
              </div>
            ))}
          </div>
          {!isPro && isCreator && (
            <p className="text-[10px] text-white/30 mt-2 text-center">
              Creator plan: Instagram + Twitter · <button onClick={() => setLocation("/pricing")} className="text-violet-400 hover:underline">Unlock all 5 formats + Strategy with Infinity</button>
            </p>
          )}
          {isFree && (
            <div className="mt-3 rounded-xl bg-amber-500/8 border border-amber-500/20 p-3 flex items-center gap-2.5">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200/70">Content Kit requires Creator plan (₹249/mo). <button onClick={() => setLocation("/pricing")} className="text-amber-300 font-semibold hover:underline">View plans →</button></p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white/[0.03] border border-white/8 p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">Your Idea *</label>
              <button 
                onClick={enhanceIdea} 
                disabled={enhancing || !idea.trim()}
                className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
               >
                <Wand2 className="w-3 h-3" /> {enhancing ? "Enhancing..." : "Magic Enhance"}
              </button>
            </div>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. 5 productivity habits I stole from Navy SEALs..."
              rows={3}
              className="w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-violet-500/50 resize-none"
              style={{ color: "#ffffff" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Content Type</label>
              <div className="relative">
                <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none cursor-pointer"
                  style={{ color: "#ffffff" }}>
                  {CONTENT_TYPES.map(t => <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Tone</label>
              <div className="relative">
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none cursor-pointer"
                  style={{ color: "#ffffff" }}>
                  {TONES.map(t => <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading || !idea.trim() || isFree}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Building your kit...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate Content Kit</>
            )}
          </button>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex bg-white/5 p-1 rounded-xl w-full max-w-sm">
                  {(["scripts", "visuals", "strategy"] as const).map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 flex items-center justify-center py-2 text-xs font-semibold capitalize rounded-lg transition-all ${
                        activeTab === tab 
                          ? "bg-violet-600 text-white shadow-lg" 
                          : "text-white/40 hover:text-white/80"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={savePack}
                  disabled={saving}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-white text-xs font-semibold transition-colors disabled:opacity-50"
                 >
                  {saving ? "Saving..." : "Save Pack"}
                </button>
              </div>

              {activeTab === "scripts" && (
                <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-3">
                  {result.instagram && (
                    <SectionCard icon={() => <span className="text-sm">📸</span>} title="Instagram Caption" color="bg-pink-500/20 text-pink-300" delay={0}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.instagram.caption}</p>
                        <CopyBtn text={result.instagram.caption} />
                      </div>
                    </SectionCard>
                  )}
                  {result.twitter && (
                    <SectionCard icon={() => <span className="text-sm">🐦</span>} title="Twitter Thread" color="bg-sky-500/20 text-sky-300" delay={0.05}>
                      <div className="space-y-2">
                        {result.twitter.thread.map((tweet, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/4 border border-white/6">
                            <span className="text-[10px] text-white/30 font-mono mt-0.5 w-4 shrink-0">{i + 1}/</span>
                            <p className="text-white/80 text-sm flex-1 leading-snug">{tweet}</p>
                            <CopyBtn text={tweet} label="Copy" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-end"><CopyBtn text={result.twitter.thread.join("\n\n")} label="Copy Thread" /></div>
                    </SectionCard>
                  )}
                  {result.linkedin ? (
                    <SectionCard icon={() => <span className="text-sm">💼</span>} title="LinkedIn Post" badge="Infinity" color="bg-blue-500/20 text-blue-300" delay={0.1}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.linkedin.post}</p>
                        <CopyBtn text={result.linkedin.post} />
                      </div>
                    </SectionCard>
                  ) : (
                    <SectionCard icon={() => <span className="text-sm">💼</span>} title="LinkedIn Post" badge="Infinity" color="bg-blue-500/20 text-blue-300" delay={0.1} locked lockedReason="Unlock LinkedIn with Infinity" />
                  )}
                  {result.reel ? (
                    <SectionCard icon={() => <span className="text-sm">🎬</span>} title="Reel Script" badge="Infinity" color="bg-red-500/20 text-red-300" delay={0.15}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.reel.script}</p>
                        <CopyBtn text={result.reel.script} />
                      </div>
                    </SectionCard>
                  ) : (
                    <SectionCard icon={() => <span className="text-sm">🎬</span>} title="Reel Script" badge="Infinity" color="bg-red-500/20 text-red-300" delay={0.15} locked lockedReason="Unlock Reels with Infinity" />
                  )}
                </motion.div>
              )}

              {activeTab === "visuals" && (
                <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-3">
                  {result.instagram?.imagePrompt && (
                    <SectionCard icon={ImageIcon} title="AI Image Prompt (Thumbnail)" color="bg-indigo-500/20 text-indigo-300" delay={0}>
                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
                        <p className="text-white/80 text-sm font-mono leading-relaxed">{result.instagram.imagePrompt}</p>
                        <div className="flex justify-end"><CopyBtn text={result.instagram.imagePrompt} label="Copy Prompt" /></div>
                      </div>
                      <p className="text-[10px] text-white/30 mt-2 text-center">Paste this into Midjourney, DALL-E, or Grok to generate your cover photo.</p>
                    </SectionCard>
                  )}
                  
                  {result.instagram?.carouselSlides ? (
                    <SectionCard icon={() => <span className="text-sm">🃏</span>} title="Interactive Carousel Preview" badge="Infinity" color="bg-amber-500/20 text-amber-300" delay={0.05}>
                      <div className="flex overflow-x-auto gap-3 pb-4 snap-x no-scrollbar">
                        {result.instagram.carouselSlides.map((slide, i) => (
                          <div key={i} className="shrink-0 w-64 h-64 snap-center bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] border border-white/10 rounded-2xl p-6 flex flex-col justify-center text-center relative group">
                            <span className="absolute top-4 left-4 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/50">{i + 1}</span>
                            <p className="text-white font-bold text-lg leading-snug">{slide}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                         <p className="text-[10px] text-white/30">Swipe to view slides</p>
                         <CopyBtn text={result.instagram.carouselSlides.join("\n\n")} label="Copy All Texts" />
                      </div>
                    </SectionCard>
                  ) : (
                    <SectionCard icon={() => <span className="text-sm">🃏</span>} title="Carousel Visuals" badge="Infinity" color="bg-amber-500/20 text-amber-300" delay={0.05} locked lockedReason="Unlock Carousel formats with Infinity" />
                  )}
                </motion.div>
              )}

              {activeTab === "strategy" && (
                <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                       <Activity className="w-5 h-5 text-emerald-400 mb-2" />
                       <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">Virality Score</p>
                       <p className="text-3xl font-bold text-white">{result.strategy?.viralityScore ?? 85}<span className="text-lg text-emerald-500">/100</span></p>
                    </div>
                    <div className="bg-white/[0.03] border border-white/8 p-4 rounded-2xl flex flex-col justify-center">
                       <Target className="w-4 h-4 text-violet-400 mb-1.5" />
                       <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Target Audience</p>
                       <p className="text-sm text-white/90 leading-snug">{result.strategy?.targetAudience ?? "Broad audience"}</p>
                    </div>
                  </div>

                  <SectionCard icon={MessageSquare} title="Core Message" color="bg-violet-500/20 text-violet-300" delay={0.05}>
                     <p className="text-lg font-semibold text-white/95 italic border-l-2 border-violet-500 pl-4 py-1">"{result.strategy?.coreMessage}"</p>
                  </SectionCard>

                  {result.linkedin?.bestTimeToPost && (
                    <SectionCard icon={Clock} title="Publishing Metadata" color="bg-blue-500/20 text-blue-300" delay={0.1}>
                      <div className="flex items-center justify-between p-3 bg-white/4 rounded-xl border border-white/8">
                         <span className="text-sm text-white/60">LinkedIn Best Time:</span>
                         <span className="text-sm font-semibold text-white">{result.linkedin.bestTimeToPost}</span>
                      </div>
                    </SectionCard>
                  )}

                  {result.reel?.audioSuggestion && (
                    <SectionCard icon={Music} title="Audio Strategy" color="bg-red-500/20 text-red-300" delay={0.15}>
                      <div className="flex items-center gap-3 p-3 bg-white/4 rounded-xl border border-white/8">
                         <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                           <Music className="w-4 h-4 text-red-400" />
                         </div>
                         <div>
                           <p className="text-xs text-white/50">Trending audio recommendation</p>
                           <p className="text-sm font-semibold text-white">{result.reel.audioSuggestion}</p>
                         </div>
                      </div>
                    </SectionCard>
                  )}
                </motion.div>
              )}

              {!isPro && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/8 border border-violet-500/20 p-4 flex items-center gap-3">
                  <Crown className="w-5 h-5 text-violet-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white/80">Get Full Strategy, Carousel Previews & Reels</p>
                    <p className="text-xs text-white/40 mt-0.5">Unlock all tools with Infinity plan</p>
                  </div>
                  <button onClick={() => setLocation("/pricing")}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all">
                    Upgrade
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
