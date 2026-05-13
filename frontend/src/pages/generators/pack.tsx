import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package2, Sparkles, Copy, Check, ChevronDown, Crown, Lock, Wand2, Activity,
  Clock, Music, Target, Image as ImageIcon, MessageSquare, Hash, Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useLocation } from "wouter";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useAuth } from "@clerk/react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";

const TONES = ["Professional", "Casual", "Aggressive", "Inspirational", "Educational"] as const;
const CONTENT_TYPES = ["Educational", "Story", "Viral", "Product/Service", "Opinion"] as const;

interface PackResult {
  idea: string;
  isPro: boolean;
  isCreator: boolean;
  instagram?: {
    caption: string;
    storyStrategy?: string[];
    visualDirection?: string;
    carouselSlides?: string[];
  };
  reel?: {
    script: string;
    pacingNotes?: string;
    trendingAudioDirection?: string;
  };
  twitter?: { 
    thread: string[];
    viralHooks?: string[];
  };
  linkedin?: { 
    post: string; 
    authorityHook?: string;
  };
  marketAnalysis?: {
    whyThisWorksNow: string;
    targetAudiencePsychology: string;
    competitorGap: string;
    painPointAddressed: string;
  };
  discovery?: {
    socialSEOKeywords: string[];
    viralHashtags: string[];
  };
  strategy?: {
    viralityScore: number;
    distributionPlan: string;
    coreMessage: string;
  };
}

function CopyBtn({ text, label, size = "default" }: { text: string; label?: string, size?: "default" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white/50 hover:text-white ${size === "xs" ? "text-[9px]" : "text-xs"} transition-all shrink-0`}>
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
      className={`rounded-2xl border ${locked ? "bg-white/[0.01] border-white/5" : "bg-white/[0.035] border-white/10 hover:border-white/15 transition-all shadow-xl"}`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${locked ? "border-white/5" : "border-white/8"}`}>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-sm font-bold tracking-tight ${locked ? "text-white/30" : "text-white/90"}`}>{title}</span>
        {badge && (
          <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-md border font-black tracking-widest uppercase ${locked ? "bg-white/4 text-white/20 border-white/8" : "bg-cyan-500/12 text-cyan-300 border-cyan-500/20"}`}>
            {badge}
          </span>
        )}
        {locked && <Lock className="w-3.5 h-3.5 text-white/20 ml-auto" />}
      </div>
      <div className={`p-5 ${locked ? "opacity-40" : ""}`}>
        {locked ? (
          <div className="text-center py-6">
            <Crown className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/20 text-xs font-medium">{lockedReason || "Unlock to access"}</p>
          </div>
        ) : children}
      </div>
    </motion.div>
  );
}

export default function ContentPack() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { data: sub } = useSubscriptionStatus();
  const prefill = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("idea") ?? "" : "";
  const [idea, setIdea] = useState(prefill);
  const [tone, setTone] = useState<string>("Professional");
  const [contentType, setContentType] = useState<string>("Educational");
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [result, setResult] = useState<PackResult | null>(null);
  const [activeTab, setActiveTab] = useState<"blueprint" | "scripts" | "visuals" | "strategy" | "kit">("blueprint");
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    fetch("/api/settings/preferences").then(async (r) => {
      if (!r.ok) return {};
      const text = await r.text();
      return text ? JSON.parse(text) : {};
    }).then(data => {
      if (data.languagePreference) setLanguage(data.languagePreference);
    }).catch(() => {});
  }, []);

  const isPro = sub?.planType === "infinity" && (sub?.plan === "active" || sub?.plan === "trial");
  const isCreator = ["starter", "creator", "infinity"].includes(sub?.planType ?? "") && (sub?.plan === "active" || sub?.plan === "trial");
  const isFree = !isCreator;

  const [saving, setSaving] = useState(false);

  const savePack = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/content-pack/save", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "omit",
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
      const token = await getToken();
      const res = await fetch("/api/content-pack/enhance", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "omit",
        body: JSON.stringify({ idea })
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
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
      const token = await getToken();
      const res = await fetch("/api/content-pack/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        credentials: "omit",
        body: JSON.stringify({ idea, tone, contentType, language }),
      });
      if (!res.ok) {
        const errText = await res.text();
        let errorMessage = "Generation failed";
        if (errText) {
          try {
            const errData = JSON.parse(errText);
            if (res.status === 402) {
              toast({ title: "Upgrade required", description: errData.message, variant: "destructive" });
              return;
            }
            errorMessage = errData.error || errorMessage;
          } catch (e) {
            errorMessage = errText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      const text = await res.text();
      if (!text) {
        throw new Error("Server returned an empty response.");
      }
      const data = JSON.parse(text);
      setResult(data);
      setActiveTab("blueprint");
      // --- P-3 FIX: Invalidate cache to sync credit counter ---
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper maxWidth="xl" className="pb-24 md:pb-8">
      <FeatureGuideBanner 
        toolKey="pack" 
        title="Viral Content Packs" 
        icon={<Package2 className="w-5 h-5 text-indigo-400" />}
        tagline="Turn one idea into a 30-day cross-platform content ecosystem. The ultimate growth machine."
        whatYouGet={["Reel scripts + Trending audio", "Instagram carousel blueprints", "X threads", "LinkedIn authority posts"]}
        whenToUse="Use this when you have a winning content pillar and want to dominate every platform for the next month."
        proTip="The 'Magic Enhance' button uses expert copywriting frameworks like AIDA to make your core idea 10x more provocative before generating the pack."
        planRequired="Infinity"
      />
      
      <PageHeader 
        icon={<Package2/>} 
        iconBg="bg-indigo-500/10" 
        iconColor="text-indigo-400" 
        title="Viral Content Packs" 
        subtitle="Bulk content for your entire month"
        badge="Infinity"
        badgeColor="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4 mb-8">
        {[
          { label: "Market", icon: "📊", locked: false },
          { label: "Reel Script", icon: "🎬", locked: !isPro },
          { label: "Carousel", icon: "🃏", locked: !isPro },
          { label: "Twitter Thread", icon: "🐦", locked: false },
          { label: "SEO Pack", icon: "🔍", locked: false },
        ].map(({ label, icon, locked }) => (
          <div key={label} className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border text-center transition-all ${locked ? "bg-white/2 border-white/5 opacity-40" : "bg-white/[0.04] border-white/10 hover:border-cyan-500/30"}`}>
            <span className="text-xl">{icon}</span>
            <span className="text-[9px] text-white/50 font-black uppercase tracking-tighter leading-tight">{label}</span>
            {locked && <Lock className="w-2.5 h-2.5 text-white/20" />}
          </div>
        ))}
      </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-3xl glass-panel-premium p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Your Strategic Idea *</label>
              <button 
                onClick={enhanceIdea} 
                disabled={enhancing || !idea.trim()}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-black text-cyan-400 hover:text-cyan-300 disabled:opacity-50 transition-colors"
               >
                <Wand2 className="w-3.5 h-3.5" /> {enhancing ? "Architecting..." : "Magic Enhance"}
              </button>
            </div>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. 5 productivity habits I stole from Navy SEALs..."
              className="w-full px-5 py-4 min-h-[100px] md:min-h-[150px] rounded-2xl bg-white/[0.02] border border-white/10 text-white placeholder-white/20 text-base md:text-lg focus:outline-none focus:border-cyan-500/50 resize-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Goal</label>
              <div className="relative">
                <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-base focus:outline-none appearance-none cursor-pointer">
                  {CONTENT_TYPES.map(t => <option key={t} value={t} className="bg-[#0B1215]">{t}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Tone</label>
              <div className="relative">
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-base focus:outline-none appearance-none cursor-pointer">
                  {TONES.map(t => <option key={t} value={t} className="bg-[#0B1215]">{t}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>

          <LanguageSelector
            value={language}
            onChange={setLanguage}
            isFreeUser={isFree}
            onUpgradeRequired={() => toast({ title: "\ud83d\udd12 Premium Languages", description: "Upgrade for regional language content kits!", variant: "destructive" })}
          />

          <button
            onClick={generate}
            disabled={loading || !idea.trim() || isFree}
            className="w-full flex items-center justify-center gap-2.5 h-14 md:h-16 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-cyan-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Building your ecosystem...</>
            ) : (
              <><Sparkles className="w-4 h-4 group-hover:scale-125 transition-transform" />Generate Content Ecosystem</>
            )}
          </button>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex bg-white/5 p-1 rounded-2xl w-full max-w-sm border border-white/5">
                  {[
                    { id: "kit", label: "The Kit", icon: Wand2 },
                    { id: "blueprint", label: "The Blueprint", icon: Brain }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        activeTab === tab.id 
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={savePack}
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all disabled:opacity-50"
                 >
                  {saving ? "Saving..." : "Save Ecosystem"}
                </button>
              </div>

               {activeTab === "blueprint" && (
                <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-6">
                   {/* Strategic Foundations */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SectionCard icon={Activity} title="Strategic Context" color="bg-emerald-500/10 text-emerald-300" delay={0}>
                         <div className="space-y-6">
                            <div>
                               <h4 className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider mb-2">Market Sentiment</h4>
                               <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.whyThisWorksNow}</p>
                            </div>
                            <div>
                               <h4 className="text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider mb-2">Audience Psychology</h4>
                               <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.targetAudiencePsychology}</p>
                            </div>
                         </div>
                      </SectionCard>
                      <SectionCard icon={Target} title="The Competitive Edge" color="bg-cyan-500/10 text-cyan-300" delay={0.05}>
                         <div className="space-y-6">
                            <div>
                               <h4 className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider mb-2">The Unfair Advantage</h4>
                               <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.competitorGap}</p>
                            </div>
                            <div>
                               <h4 className="text-[11px] font-bold text-cyan-400/80 uppercase tracking-wider mb-2">Core Value Proposition</h4>
                               <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.painPointAddressed}</p>
                            </div>
                         </div>
                      </SectionCard>
                   </div>

                   {/* Discovery & Growth */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2">
                        <SectionCard icon={Hash} title="Search & Discovery Engine" color="bg-indigo-500/10 text-indigo-300" delay={0.1}>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                              <div>
                                 <h4 className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-wider mb-3">High-Impact Keywords</h4>
                                 <div className="flex flex-wrap gap-2">
                                    {result.discovery?.socialSEOKeywords?.map((kw, i) => (
                                       <span key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/70 font-semibold">{kw}</span>
                                    ))}
                                 </div>
                              </div>
                              <div>
                                 <h4 className="text-[11px] font-bold text-indigo-400/80 uppercase tracking-wider mb-3">Viral Hashtag Stack</h4>
                                 <div className="flex flex-wrap gap-2">
                                    {result.discovery?.viralHashtags?.map((tag, i) => (
                                       <span key={i} className="text-sm font-black text-cyan-400 drop-shadow-sm">{tag}</span>
                                    ))}
                                 </div>
                              </div>
                           </div>
                        </SectionCard>
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Activity className="w-8 h-8 text-emerald-400 mb-4 relative z-10" />
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mb-2 relative z-10">Virality Score</p>
                        <p className="text-5xl font-black text-white relative z-10">{result.strategy?.viralityScore ?? 95}<span className="text-xl text-emerald-500 ml-1">/100</span></p>
                      </div>
                   </div>

                   {/* Final Strategy */}
                   <SectionCard icon={MessageSquare} title="The 'Golden Nugget' Message" color="bg-cyan-500/10 text-cyan-300" delay={0.15}>
                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                          <p className="text-2xl font-black text-white leading-tight italic border-l-4 border-cyan-500 pl-8 py-2 mb-4">
                             "{result.strategy?.coreMessage}"
                          </p>
                          <p className="text-xs text-white/40 font-medium leading-relaxed">
                             This is the singular emotional hook that binds the entire ecosystem together. Every piece of content in this kit reinforces this message.
                          </p>
                        </div>
                        <div className="shrink-0 glass-panel-premium border border-white/10 p-6 rounded-3xl w-full md:w-64">
                           <Target className="w-5 h-5 text-cyan-400 mb-3" />
                           <h4 className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mb-2">Distribution Focus</h4>
                           <p className="text-sm text-white/90 font-bold leading-relaxed">{result.strategy?.distributionPlan ?? "Multi-platform sync"}</p>
                        </div>
                      </div>
                   </SectionCard>
                </motion.div>
              )}
              
              {activeTab === "kit" && (
                <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
                   {/* 📸 Instagram Section */}
                   {result.instagram && (
                    <SectionCard icon={() => <span className="text-xl">📸</span>} title="Instagram Ecosystem" color="bg-pink-500/10 text-pink-300" delay={0}>
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black text-pink-400/60 uppercase tracking-widest mb-3">Conversion Caption</h4>
                          <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
                            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.instagram.caption}</p>
                            <CopyBtn text={result.instagram.caption} />
                          </div>
                        </div>

                        {result.instagram.storyStrategy && (
                          <div className="space-y-3">
                             <h4 className="text-[10px] font-black text-pink-400/60 uppercase tracking-widest">Story Engagement Sequence</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {result.instagram.storyStrategy.map((story, i) => (
                                   <div key={i} className="p-4 rounded-2xl bg-pink-500/5 border border-pink-500/10 text-xs text-white/70 leading-relaxed shadow-sm">
                                      <span className="font-bold text-pink-400 block mb-1">Slide {i+1}</span> {story}
                                   </div>
                                ))}
                             </div>
                          </div>
                        )}

                        {result.instagram.carouselSlides && (
                           <div className="space-y-4 pt-4 border-t border-white/5">
                             <h4 className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest flex items-center gap-2">
                               <Sparkles className="w-3 h-3" /> Educational Carousel Blueprint
                             </h4>
                             <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
                                {result.instagram.carouselSlides.map((slide, i) => (
                                  <div key={i} className="shrink-0 w-64 h-72 snap-center bg-white/[0.02] border border-white/10 rounded-3xl p-8 flex flex-col justify-center text-center relative group hover:border-cyan-500/30 transition-all shadow-xl">
                                    <span className="absolute top-6 left-6 w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-[10px] font-black text-cyan-400 border border-cyan-500/20">{i + 1}</span>
                                    <p className="text-white font-bold text-lg leading-tight">{slide}</p>
                                    <div className="absolute bottom-6 inset-x-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <CopyBtn text={slide} size="xs" />
                                    </div>
                                  </div>
                                ))}
                             </div>
                           </div>
                        )}
                      </div>
                    </SectionCard>
                   )}

                   {/* 🐦 Twitter/X Section */}
                   {result.twitter && (
                    <SectionCard icon={() => <span className="text-xl">🐦</span>} title="Viral X Thread" color="bg-sky-500/10 text-sky-300" delay={0.05}>
                      <div className="space-y-6">
                        {result.twitter.viralHooks && (
                           <div className="space-y-3">
                              <h4 className="text-[10px] font-black text-sky-400/60 uppercase tracking-widest">Hook Variations</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 {result.twitter.viralHooks.map((hook, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 shadow-sm">
                                       <p className="text-sm text-white/80 italic font-medium">"{hook}"</p>
                                       <CopyBtn text={hook} label="Copy" />
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                        <div className="space-y-4 pt-2">
                          <h4 className="text-[10px] font-black text-sky-400/60 uppercase tracking-widest">Complete Thread Sequence</h4>
                          <div className="space-y-3">
                            {result.twitter.thread.map((tweet, i) => (
                              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-all">
                                <span className="text-[10px] text-white/20 font-black mt-1 w-6 shrink-0">{i + 1}</span>
                                <p className="text-white/85 text-sm flex-1 leading-relaxed font-medium">{tweet}</p>
                                <CopyBtn text={tweet} label="Copy" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SectionCard>
                   )}

                   {/* 💼 Professional & Cinematic Section (High Tier) */}
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {result.linkedin ? (
                        <SectionCard icon={() => <span className="text-xl">💼</span>} title="LinkedIn Authority" badge="Infinity" color="bg-blue-500/10 text-blue-300" delay={0.1}>
                          <div className="space-y-5">
                            {result.linkedin.authorityHook && (
                               <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-inner">
                                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Authority Hook</h4>
                                  <p className="text-base text-white font-black leading-tight">{result.linkedin.authorityHook}</p>
                               </div>
                            )}
                            <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                              <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.linkedin.post}</p>
                              <CopyBtn text={result.linkedin.post} />
                            </div>
                          </div>
                        </SectionCard>
                      ) : (
                        <SectionCard icon={() => <span className="text-xl">💼</span>} title="LinkedIn Authority" badge="Infinity" color="bg-blue-500/10 text-blue-300" delay={0.1} locked lockedReason="Unlock Authority Posts with Infinity" />
                      )}

                      {result.reel ? (
                        <SectionCard icon={() => <span className="text-xl">🎬</span>} title="Cinematic Reel" badge="Infinity" color="bg-red-500/10 text-red-300" delay={0.15}>
                          <div className="space-y-5">
                            <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-red-500/5 border border-red-500/10 shadow-inner">
                              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap flex-1 font-mono">{result.reel.script}</p>
                              <CopyBtn text={result.reel.script} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Pacing</h4>
                                  <p className="text-xs text-white/70 font-medium">{result.reel.pacingNotes}</p>
                               </div>
                               <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Audio Direction</h4>
                                  <p className="text-xs text-white/70 font-medium">{result.reel.trendingAudioDirection}</p>
                               </div>
                            </div>
                          </div>
                        </SectionCard>
                      ) : (
                        <SectionCard icon={() => <span className="text-xl">🎬</span>} title="Cinematic Script" badge="Infinity" color="bg-red-500/10 text-red-300" delay={0.15} locked lockedReason="Unlock Cinematic Scripts with Infinity" />
                      )}
                   </div>

                   {/* Visual Direction Prompt */}
                   {result.instagram?.visualDirection && (
                    <SectionCard icon={ImageIcon} title="Midjourney Visual Architecture" color="bg-indigo-500/10 text-indigo-300" delay={0.2}>
                      <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Advanced Visual Prompt</h4>
                          <p className="text-white/80 text-sm font-mono leading-relaxed italic">"{result.instagram.visualDirection}"</p>
                        </div>
                        <CopyBtn text={result.instagram.visualDirection} label="Copy Prompt" />
                      </div>
                    </SectionCard>
                   )}
                </motion.div>
              )}

              {!isPro && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="rounded-2xl bg-gradient-to-r from-cyan-600/20 to-teal-600/10 border border-cyan-500/30 p-5 flex items-center gap-4 shadow-2xl">
                  <Crown className="w-6 h-6 text-cyan-400 shrink-0 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-black text-white uppercase tracking-tight">Unlock the Full Ecosystem</p>
                    <p className="text-xs text-white/40 mt-0.5 font-medium">Reel Scripts, LinkedIn Authority & Visual Blueprints are reserved for Infinity.</p>
                  </div>
                  <button onClick={() => setLocation("/pricing")}
                    className="shrink-0 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 transition-all">
                    Upgrade
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
    </PageWrapper>
  );
}
