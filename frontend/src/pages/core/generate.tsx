import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGenerateContent, useGenerateVariations } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, RefreshCw, Copy, History, Layout, Save, TrendingUp, MessageSquare, Target,
  Brain, Zap, CheckCircle2, ChevronRight, Share2, Layers, Smartphone, MousePointer2,
  Loader2, ArrowRightLeft, BarChart3, Flame, Activity, Check, Download, Hash, Wand2, X,
  ChevronDown, ChevronUp, Crown, Heart, Users, BarChart2, Lock, AlertCircle, Lightbulb,
  PenTool, CalendarDays, Package2, GitBranch, Info, Trophy, Twitter, Linkedin, MessageCircle
} from "lucide-react";
import { haptic } from "@/lib/utils";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import * as htmlToImage from "html-to-image";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { FeedbackModal, checkShouldShowRating, checkShouldShowFeedback, incrementGenCount } from "@/components/modals/FeedbackModal";
import { useAuth, useUser } from "@clerk/react";
import { WeeklyReportCard } from "@/components/shared/WeeklyReportCard";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { api } from "@/lib/api-client";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NPSModal, checkShouldShowNPS } from "@/components/modals/NPSModal";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { track, identify } from "@/lib/analytics";

const DISCOVERY_CARDS = [
  { id: "ghostwriter", title: "AI Ghostwriter", msg: "Train the AI to write in your exact authentic voice.", path: "/ghostwriter", icon: PenTool, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "predictor", title: "Performance Predictor", msg: "See how your post will perform before you hit publish.", path: "/predictor", icon: BarChart2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { id: "strategy", title: "7-Day Strategy", msg: "Get a full week of strategic content ideas mapped out.", path: "/strategy", icon: CalendarDays, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { id: "coach", title: "AI Content Coach", msg: "Get real-time feedback on your content strategy.", path: "/coach", icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
];

function CrossToolDiscoveryBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    // Session-based rotation
    const sessionIdx = sessionStorage.getItem("discovery_banner_idx");
    let nextIdx = 0;
    if (sessionIdx !== null) {
      nextIdx = (parseInt(sessionIdx) + 1) % DISCOVERY_CARDS.length;
    }
    sessionStorage.setItem("discovery_banner_idx", nextIdx.toString());
    setCurrentIndex(nextIdx);

    const isDismissed = localStorage.getItem(`discovery_dismissed_${DISCOVERY_CARDS[nextIdx].id}`);
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`discovery_dismissed_${DISCOVERY_CARDS[currentIndex].id}`, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const card = DISCOVERY_CARDS[currentIndex];
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border ${card.border} ${card.bg} p-4 mb-8 transition-all hover:border-white/20`}
      onClick={() => navigate(card.path)}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0 border border-white/5`}>
          <Icon className={`w-5 h-5 ${card.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{card.title}</h4>
            <span className="text-[8px] font-black bg-cyan-500 text-black px-1.5 py-0.5 rounded-sm uppercase">Try Now</span>
          </div>
          <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">{card.msg}</p>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
    </motion.div>
  );
}

// ─── Constants ───
const PLATFORMS = [
  { name: "Instagram", color: "text-pink-400" },
  { name: "Twitter", color: "text-blue-400" },
  { name: "LinkedIn", color: "text-sky-400" },
  { name: "YouTube", color: "text-red-400" }
] as const;




function AnimatedOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute -top-[10%] -right-[10%] w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)" }} />
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(20,184,166,0.03) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-[10%] right-[20%] w-[700px] h-[700px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.02) 0%, transparent 70%)" }} />
    </div>
  );
}

interface ContentAnalysis {
  viralityScore: number;
  hookStrength: number;
  engagementPotential: number;
  shareability: number;
  emotionalTrigger: string;
  curiosityGap: string;
  targetAudienceReaction: string;
  improvementTip: string;
}

function CopyBtn({ text, label, size = "default" }: { text: string; label?: string, size?: "default" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = () => { 
    navigator.clipboard.writeText(text); 
    setCopied(true); 
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000); 
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white ${size === "xs" ? "text-[9px]" : "text-xs"} transition-all shrink-0 border border-white/5`}>
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
  locked,
  lockedReason,
}: {
  icon: any;
  title: string;
  badge?: string;
  color: string;
  children?: React.ReactNode;
  locked?: boolean;
  lockedReason?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border ${locked ? "bg-white/[0.01] border-white/5" : "bg-white/[0.035] border-white/10 hover:border-white/15 transition-all shadow-xl"}`}
    >
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${locked ? "border-white/5" : "border-white/8"}`}>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-sm font-black tracking-tight uppercase ${locked ? "text-white/30" : "text-white/90"}`}>{title}</span>
        {badge && (
          <span className={`ml-auto text-[9px] px-2.5 py-1 rounded-lg border font-black tracking-widest uppercase ${locked ? "bg-white/4 text-white/20 border-white/8" : "bg-cyan-500/12 text-cyan-300 border-cyan-500/20"}`}>
            {badge}
          </span>
        )}
        {locked && <Lock className="w-4 h-4 text-white/20 ml-auto" />}
      </div>
      <div className={`p-6 ${locked ? "opacity-40" : ""}`}>
        {locked ? (
          <div className="text-center py-8">
            <Crown className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/20 text-xs font-black uppercase tracking-widest">{lockedReason || "Unlock to access"}</p>
          </div>
        ) : children}
      </div>
    </motion.div>
  );
}

function BatchResultView({ result, onSave }: { result: any; onSave: () => void }) {
  const [activeTab, setActiveTab] = useState<"blueprint" | "kit">("kit");
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-white/5 p-1 rounded-2xl w-full max-w-sm border border-white/5">
          {[
            { id: "kit", label: "The Kit", icon: Wand2 },
            { id: "blueprint", label: "The Blueprint", icon: Brain }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === tab.id 
                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onSave}
          className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
         >
          Save Ecosystem
        </button>
      </div>

      {activeTab === "blueprint" && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SectionCard icon={Activity} title="Strategic Context" color="bg-emerald-500/10 text-emerald-300">
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-2">Market Sentiment</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.whyThisWorksNow}</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-2">Audience Psychology</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.targetAudiencePsychology}</p>
                    </div>
                 </div>
              </SectionCard>
              <SectionCard icon={Target} title="Competitive Edge" color="bg-cyan-500/10 text-cyan-300">
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest mb-2">Unfair Advantage</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.competitorGap}</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest mb-2">Core Value Prop</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.painPointAddressed}</p>
                    </div>
                 </div>
              </SectionCard>
           </div>
        </motion.div>
      )}

      {activeTab === "kit" && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
           {result.instagram && (
            <SectionCard icon={() => <span className="text-xl">📸</span>} title="Instagram Ecosystem" color="bg-pink-500/10 text-pink-300">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-pink-400/60 uppercase tracking-widest mb-3">Conversion Caption</h4>
                  <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-black/20 border border-white/5">
                    <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.instagram.caption}</p>
                    <CopyBtn text={result.instagram.caption} />
                  </div>
                </div>
                {result.instagram.storyStrategy && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.instagram.storyStrategy.map((s: string, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/60">
                        <span className="font-black text-pink-400 block mb-1 uppercase tracking-tighter">Slide {i+1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
           )}
           {result.twitter && (
            <SectionCard icon={() => <span className="text-xl">🐦</span>} title="Viral X Thread" color="bg-sky-500/10 text-sky-300">
              <div className="space-y-4">
                {result.twitter.thread.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-black/20 border border-white/5 group">
                    <span className="text-[10px] text-white/20 font-black mt-1">{i + 1}</span>
                    <p className="text-white/85 text-sm flex-1 leading-relaxed">{t}</p>
                    <CopyBtn text={t} />
                  </div>
                ))}
              </div>
            </SectionCard>
           )}
        </motion.div>
      )}
    </div>
  );
}

function AbDuelView({ idea, niche, tone, onResult, result }: { idea: string; niche: string; tone: string; onResult: (r: any) => void; result: any }) {
  const [audienceA, setAudienceA] = useState("");
  const [audienceB, setAudienceB] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDuel = async () => {
    if (!audienceA || !audienceB) return;
    setLoading(true);
    try {
      const { data } = await api.post("/ab-test/generate", {
        idea, niche, tone, platform: "Instagram", audienceA, audienceB
      });
      onResult(data);
    } catch {
      toast({ variant: "destructive", title: "Duel failed" });
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-12">
        <div className={`p-10 rounded-[3rem] border shadow-2xl flex flex-col lg:flex-row items-center gap-12 ${
          result.prediction.winner === 'A' ? 'bg-indigo-950/20 border-indigo-500/30' : 
          result.prediction.winner === 'B' ? 'bg-cyan-950/20 border-cyan-500/30' : 
          'bg-zinc-900/40 border-white/10'
        }`}>
           <div className={`p-8 rounded-[2rem] ${
             result.prediction.winner === 'A' ? 'bg-indigo-500/20 text-indigo-400' :
             result.prediction.winner === 'B' ? 'bg-cyan-500/20 text-cyan-400' :
             'bg-zinc-500/20 text-zinc-400'
           }`}>
             {result.prediction.winner !== 'too_close' ? <Trophy className="w-16 h-16" /> : <GitBranch className="w-16 h-16" />}
           </div>
           <div className="flex-1 space-y-4 text-center lg:text-left">
              <h3 className="text-4xl font-black text-white tracking-tight">
                {result.prediction.winner === 'A' ? "Variant A Wins" : 
                 result.prediction.winner === 'B' ? "Variant B Wins" : "Statistical Deadlock"}
              </h3>
              <p className="text-lg font-medium text-white/60 leading-relaxed">{result.prediction.reasoning}</p>
              <Button variant="ghost" onClick={() => onResult(null)} className="text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest">
                New Duel
              </Button>
           </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <SectionCard icon={Users} title={`Variant A: ${result.versionA.audienceTarget}`} color="bg-indigo-500/10 text-indigo-400">
              <p className="text-xl font-black text-white leading-tight mb-6 italic">"{result.versionA.hook}"</p>
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Strength</span>
                 <span className="text-sm font-black text-indigo-400">{result.versionA.predictedStrength}</span>
              </div>
           </SectionCard>
           <SectionCard icon={Users} title={`Variant B: ${result.versionB.audienceTarget}`} color="bg-cyan-500/10 text-cyan-400">
              <p className="text-xl font-black text-white leading-tight mb-6 italic">"{result.versionB.hook}"</p>
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Strength</span>
                 <span className="text-sm font-black text-cyan-400">{result.versionB.predictedStrength}</span>
              </div>
           </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-white/[0.02] border-white/5 rounded-[3rem] p-10 max-w-4xl mx-auto text-center space-y-10">
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-white tracking-tight">The Audience Duel</h3>
        <p className="text-white/40 font-medium max-w-lg mx-auto">Test your hook against two different audiences to see which psychological angle hits hardest.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Audience A</Label>
          <Input placeholder="e.g. Agency owners" value={audienceA} onChange={(e) => setAudienceA(e.target.value)} className="h-14 rounded-2xl bg-black/40 border-white/10" />
        </div>
        <div className="space-y-3 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-cyan-400 ml-1">Audience B</Label>
          <Input placeholder="e.g. Freelance designers" value={audienceB} onChange={(e) => setAudienceB(e.target.value)} className="h-14 rounded-2xl bg-black/40 border-white/10" />
        </div>
      </div>
      <Button onClick={handleDuel} disabled={loading || !audienceA || !audienceB} className="h-16 px-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-lg w-full">
        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Run Duel Simulation"}
      </Button>
    </Card>
  );
}

function HookIntelligenceView({ content, niche }: { content: any; niche: string }) {
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const scoreHook = async (text: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/hook-scorer/score", {
        hook: text, niche, platform: "Instagram"
      });
      setScore(data);
    } catch {
      toast({ variant: "destructive", title: "Scoring failed" });
    } finally {
      setLoading(false);
    }
  };

  const getHook = () => {
    if (content.isBatch) return content.strategy?.coreMessage;
    return content.content?.instagram?.hook || content.content?.twitter?.hook || content.idea;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="bg-white/[0.02] border-white/5 rounded-[3rem] p-10 text-center space-y-8">
        <div className="space-y-2">
          <h3 className="text-3xl font-black text-white tracking-tight">Hook Intelligence</h3>
          <p className="text-white/40 font-medium">Psychological impact scoring for your main campaign hook.</p>
        </div>
        
        <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 text-xl font-black text-white italic">
          "{getHook()}"
        </div>

        {!score ? (
          <Button onClick={() => scoreHook(getHook())} disabled={loading} className="h-16 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-lg w-full">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Analyze Psychological Impact"}
          </Button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Psych Score</span>
                <span className="text-4xl font-black text-emerald-400">{score.score}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${score.score}%` }} className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Patterns Detected</span>
                <div className="flex flex-wrap gap-2">
                  {score.patternMatches.map((m: string) => (
                    <span key={m} className="px-2 py-1 rounded-lg bg-white/5 text-[9px] font-black text-white/60 uppercase">{m}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                 <div className="flex items-center gap-3 mb-3">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Main Issue</span>
                 </div>
                 <p className="text-sm font-medium text-amber-100/80 leading-relaxed">{score.mainIssue}</p>
              </div>
              {score.quickFix && (
                <div className="p-6 rounded-2xl bg-cyan-500/5 border border-cyan-500/10">
                  <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Quick Fix</span>
                  </div>
                  <p className="text-sm font-black text-white italic leading-relaxed">"{score.quickFix}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

interface ContentAnalysis {
  viralityScore: number;
  hookStrength: number;
  engagementPotential: number;
  shareability: number;
  emotionalTrigger: string;
  curiosityGap: string;
  targetAudienceReaction: string;
  improvementTip: string;
}

function ContentSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
      <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
      <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
      <div className="h-12 bg-white/5 rounded-xl animate-pulse w-2/3 mx-auto" />
    </div>
  );
}

function ContentScoreBadge({ score, label, color, delay = 0 }: { score: number; label: string; color: string; delay?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</span>
        <span className={`text-xs font-black ${color.replace('bg-', 'text-')}`}>{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.03]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.5, delay, ease: "circOut" }}
          className={`h-full rounded-full shadow-[0_0_12px_rgba(0,0,0,0.5)] ${color}`}
        />
      </div>
    </div>
  );
}

function CampaignScorePanel({ data, analysis, analysisLoading }: { data: any; analysis?: ContentAnalysis | null; analysisLoading?: boolean }) {
  const { toast } = useToast();
  const directViralScore = data?.content?.viral_score;
  const directFeedback = data?.content?.viral_feedback;
  const directSuggestion = data?.content?.viral_suggestion;

  const scores = useMemo(() => {
    const hookStrength = analysis?.hookStrength ?? data?.content?.hook_strength ?? 82;
    const engagementPotential = analysis?.engagementPotential ?? data?.content?.engagement_potential ?? 78;
    const shareability = analysis?.shareability ?? data?.content?.shareability ?? 74;
    const virality = analysis?.viralityScore ?? directViralScore ?? 80;

    return [
      { label: "Virality", score: virality, color: "bg-red-500" },
      { label: "Hook Strength", score: hookStrength, color: "bg-pink-500" },
      { label: "Engagement", score: engagementPotential, color: "bg-cyan-500" },
      { label: "Shareability", score: shareability, color: "bg-emerald-500" },
    ];
  }, [analysis, data, directViralScore]);

  const avg = useMemo(() => {
    return Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
  }, [scores]);

  const getExportItems = () => {
    if (!data) return [];
    const items = [];
    if (data.instagram) items.push({ platform: "Instagram", content: data.instagram.caption, idea: data.idea });
    if (data.linkedin) items.push({ platform: "LinkedIn", content: data.linkedin.post, idea: data.idea });
    if (data.twitter && data.twitter.tweets) items.push({ platform: "Twitter", content: data.twitter.tweets.join("\n\n"), idea: data.idea });
    if (data.youtube) items.push({ platform: "YouTube", content: data.youtube.script, idea: data.idea });
    return items;
  };

  const handleExportBuffer = () => {
    const items = getExportItems();
    const headers = ["Schedule Date", "Platform", "Content", "Status"];
    const rows = items.map((item, idx) => {
      const d = new Date(); d.setDate(d.getDate() + idx);
      return [`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`, item.platform, `"${item.content.replace(/"/g, '""')}"`, "draft"].join(",");
    });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "growflow-buffer.csv"; a.click();
    toast({ title: "Buffer CSV Ready", description: "Import this file into your Buffer dashboard." });
  };

  const handleExportGCal = () => {
    const items = getExportItems();
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", ...items.map((item, idx) => {
      const d = new Date(); d.setDate(d.getDate() + idx);
      return `BEGIN:VEVENT\nDTSTART:${formatDate(d)}\nSUMMARY:Post on ${item.platform}\nDESCRIPTION:${item.content.replace(/\n/g, "\\n")}\nEND:VEVENT`;
    }), "END:VCALENDAR"].join("\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "growflow-schedule.ics"; a.click();
    toast({ title: "Calendar Exported", description: "Import the .ics file to Google Calendar." });
  };

  const handleCopyNotion = () => {
    const items = getExportItems();
    const tsv = ["Platform\tContent\tStatus", ...items.map(item => `${item.platform}\t${item.content.replace(/\n/g, " ")}\tDraft`)].join("\n");
    navigator.clipboard.writeText(tsv);
    toast({ title: "Copied for Notion", description: "Paste this into any Notion database." });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Viral Potential Analytics</h4>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <Button variant="ghost" size="sm" onClick={handleExportBuffer} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            <Download className="w-3 h-3 mr-2" /> Buffer CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportGCal} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            <CalendarDays className="w-3 h-3 mr-2" /> GCal (.ics)
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyNotion} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
             <PenTool className="w-3 h-3 mr-2" /> Notion Table
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {scores.map((s, i) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
          >
             <ContentScoreBadge score={s.score} label={s.label} color={s.color} delay={0.2 + (i * 0.1)} />
          </motion.div>
        ))}
      </div>

      {avg < 80 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/5"
        >
          <p className="text-[10px] text-white/50 font-black uppercase tracking-widest flex items-center gap-2">
            <Lightbulb className="w-3 h-3 text-amber-400" /> Strategy to increase your score:
          </p>
          <ul className="text-xs text-white/40 mt-2 space-y-1.5 font-medium">
            {avg < 60 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-500" /> Add a stronger visceral hook in the first 5 words</li>}
            {avg < 75 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-cyan-500" /> Include a high-friction Call to Action (e.g. "Save this")</li>}
            {avg < 85 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-violet-500" /> Use more emotional, low-entropy language</li>}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

function ViralScoreMeter({ score }: { score: number }) {
  const level = score >= 80 ? { label: "🔥 Viral Potential", color: "text-emerald-400", ring: "ring-emerald-500/30" }
              : score >= 60 ? { label: "⚡ Strong Content",  color: "text-cyan-400",    ring: "ring-cyan-500/30" }
              : score >= 40 ? { label: "📈 Good Foundation", color: "text-amber-400",    ring: "ring-amber-500/30" }
              :               { label: "💡 Needs Polish",    color: "text-white/50",     ring: "ring-white/10" };
  return (
    <div className={`relative flex items-center justify-center w-20 h-20 rounded-full ring-4 ${level.ring} bg-black/40 shadow-glow-sm`}>
      <motion.span
        className={`text-2xl font-black ${level.color}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
      >
        {score}
      </motion.span>
      <span className="absolute -bottom-6 text-[10px] font-black text-center whitespace-nowrap tracking-widest uppercase opacity-60">{level.label}</span>
    </div>
  );
}

function PerformancePredictionCard({ viralScore, platform, niche }: { viralScore: number; platform: string; niche: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const baseReach = { instagram: 800, youtube: 1200, twitter: 2000, linkedin: 1500 };
  const multiplier = viralScore / 50; 
  const pKey = platform.toLowerCase() as keyof typeof baseReach;
  const reach = baseReach[pKey] || 1000;
  const estimatedReach = Math.floor(reach * multiplier * (1 + Math.random() * 0.2));
  const engagementRate = (3 + (viralScore / 100) * 5).toFixed(1);

  const handleShareCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { quality: 1.0, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `growflow-prediction-${platform}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Prediction card generated!", description: "Share this to your Stories to flex your content game." });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to generate card" });
    }
  };
  
  return (
    <div className="mt-8">
      <div ref={cardRef} className="p-8 rounded-[32px] border border-cyan-500/20 bg-[#0c0d12] relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl -mr-16 -mt-16" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-black fill-black" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">GrowFlow AI Intelligence</span>
          </div>
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{niche} • {platform}</span>
        </div>

        <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] mb-6 text-center">Projected Algorithmic Performance</p>
        
        <div className="grid grid-cols-3 gap-6 relative z-10">
          <div className="text-center space-y-1">
            <p className="text-2xl font-black text-white tracking-tighter">{estimatedReach.toLocaleString()}+</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Est. Reach</p>
          </div>
          <div className="text-center space-y-1 border-x border-white/5">
            <p className="text-2xl font-black text-cyan-400 tracking-tighter">{engagementRate}%</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Eng. Rate</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-2xl font-black text-violet-400 tracking-tighter">{viralScore}</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Viral Score™</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between opacity-40">
           <span className="text-[9px] font-bold text-white/30 italic">© 2026 GrowFlow Platform</span>
           <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <span className="text-[8px] font-black uppercase tracking-widest">Verified Logic</span>
           </div>
        </div>
      </div>
      
      <button 
        onClick={handleShareCard}
        className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-white/30 hover:text-cyan-400 transition-all uppercase tracking-[0.2em] group"
      >
        <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        Export Performance Prediction Card
      </button>
    </div>
  );
}

const NICHES = ["General", "Fitness", "Finance", "Tech", "Motivation", "Business", "Lifestyle"] as const;

const TEMPLATES = [
  { icon: "🔥", label: "Instagram Viral", idea: "5 psychological triggers that make people instantly share your content", contentType: "Viral" as const, tone: "Aggressive" as const, niche: "General" as const },
  { icon: "💼", label: "Business Authority", idea: "The one mindset shift that took my business from struggling to thriving", contentType: "Educational" as const, tone: "Professional" as const, niche: "Business" as const },
  { icon: "📖", label: "Personal Story", idea: "The biggest failure that changed everything I thought I knew", contentType: "Story" as const, tone: "Casual" as const, niche: "Motivation" as const },
  { icon: "⚡", label: "Daily Motivation", idea: "3 brutal truths about success that nobody talks about", contentType: "Viral" as const, tone: "Aggressive" as const, niche: "Motivation" as const },
] as const;

const LOADING_MESSAGES = [
  "Analyzing your idea...",
  "Crafting high-performing content...",
  "Crafting platform-native hooks...",
  "Generating high-converting content...",
  "Optimizing for each platform...",
  "Adding psychological triggers...",
  "Almost there...",
];

const ALL_LANGUAGE_VALUES = SUPPORTED_LANGUAGES.map(l => l.value) as [string, ...string[]];

const formSchema = z.object({
  idea: z.string().min(5, "Idea must be at least 5 characters"),
  contentType: z.enum(["Educational", "Story", "Viral"]),
  tone: z.enum(["Casual", "Professional", "Aggressive"]),
  niche: z.enum(NICHES).default("General"),
  language: z.enum(ALL_LANGUAGE_VALUES).default("English"),
  brandVoiceId: z.string().optional(),
});

type Platform = "instagram" | "youtube" | "twitter" | "linkedin";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "xs";
}

function CopyButton({ text, label, size = "sm" }: CopyButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (label) toast({ title: `${label} copied!` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded-md transition-all duration-200 font-medium hover:scale-[1.03] active:scale-[0.98]
        ${size === "xs"
          ? "px-2 py-0.5 text-[10px] gap-1"
          : "px-2.5 py-1 text-xs gap-1.5"
        }
        ${isMobile ? "w-full justify-center py-2" : "w-auto"}
        ${copied
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20"
        }`}
    >
      {copied
        ? <><Check className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} /> Copied</>
        : <><Copy className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} /> {label || t("copy")}</>
      }
    </button>
  );
}

interface SectionProps {
  label: string;
  labelColor?: string;
  content: string;
  copyLabel?: string;
  isCode?: boolean;
  isHashtags?: boolean;
  isTweet?: boolean;
  tweetIndex?: number;
  tweetTotal?: number;
}

function ContentSection({ label, labelColor = "text-cyan-400/50", content, copyLabel, isHashtags, isTweet, tweetIndex, tweetTotal }: SectionProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-1.5 group/section"
    >
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>
          {isTweet ? (
            <span className="flex items-center gap-1.5">
              {label}
              <span className="text-white/20 font-mono">{tweetIndex}/{tweetTotal}</span>
            </span>
          ) : label}
        </span>
        <CopyButton text={content} label={copyLabel || label} size="xs" />
      </div>
        <motion.div 
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]
        ${isHashtags ? "text-cyan-400/90 font-medium text-xs leading-loose flex flex-wrap gap-x-2" : "text-white/85"}
      `}>
        {content}
      </motion.div>
    </motion.div>
  );
}

interface PlatformConfig {
  icon: any;
  label: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
  bgColor: string;
  iconColor: string;
}

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  instagram: {
    icon: SiInstagram,
    label: "Instagram",
    accentColor: "from-pink-500 via-rose-500 to-orange-400",
    borderColor: "border-pink-500/20",
    glowColor: "rgba(236,72,153,0.15)",
    bgColor: "bg-pink-500/5",
    iconColor: "text-pink-400",
  },
  youtube: {
    icon: SiYoutube,
    label: "YouTube Shorts",
    accentColor: "from-red-500 to-red-600",
    borderColor: "border-red-500/20",
    glowColor: "rgba(239,68,68,0.15)",
    bgColor: "bg-red-500/5",
    iconColor: "text-red-400",
  },
  twitter: {
    icon: Twitter,
    label: "X / Twitter Thread",
    accentColor: "from-slate-300 to-slate-400",
    borderColor: "border-slate-500/20",
    glowColor: "rgba(148,163,184,0.12)",
    bgColor: "bg-slate-400/5",
    iconColor: "text-slate-300",
  },
  linkedin: {
    icon: Linkedin,
    label: "LinkedIn",
    accentColor: "from-blue-500 to-blue-600",
    borderColor: "border-blue-500/20",
    glowColor: "rgba(59,130,246,0.15)",
    bgColor: "bg-blue-500/5",
    iconColor: "text-blue-400",
  },
};

interface PlatformCardProps {
  platform: Platform;
  content: any;
  onRegenerate: () => void;
  isRegenerating: boolean;
  index: number;
}

function buildPlatformText(platform: Platform, content: any): string {
  if (!content) return "";
  switch (platform) {
    case "instagram":
      return [
        content.hook && `HOOK:\n${content.hook}`,
        content.caption && `\nCAPTION:\n${content.caption}`,
        content.cta && `\nCTA:\n${content.cta}`,
        content.hashtags && `\nHASHTAGS:\n${content.hashtags}`,
      ].filter(Boolean).join("\n");
    case "youtube":
      return [
        content.hook && `HOOK:\n${content.hook}`,
        content.title && `\nTITLE:\n${content.title}`,
        content.script && `\nSCRIPT:\n${content.script}`,
      ].filter(Boolean).join("\n");
    case "twitter":
      return Array.isArray(content.tweets) ? content.tweets.map((t: string, i: number) => `[${i + 1}/${content.tweets.length}] ${t}`).join("\n\n") : "";
    case "linkedin":
      return [
        content.headline && `${content.headline}`,
        content.post && `\n${content.post}`,
        content.cta && `\n${content.cta}`,
        content.hashtags && `\n${content.hashtags}`,
      ].filter(Boolean).join("\n");
    default:
      return "";
  }
}

function PlatformCard({ platform, content, onRegenerate, isRegenerating, index }: PlatformCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [repurposedText, setRepurposedText] = useState<string | null>(null);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const { toast } = useToast();
  const { data: sub } = useSubscriptionStatus();
  
  const isFreeUser = !sub || (sub.planType === "free" && sub.plan === "free") || sub.plan === "blocked";
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;
  const fullText = buildPlatformText(platform, content);

  const handleShareTwitter = () => {
    const text = fullText.substring(0, 240);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://growflowai.space")}`, "_blank");
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `growflow-${platform}-${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Content downloaded!" });
  };

  const repurposeAbortController = useRef<AbortController | null>(null);

  const handleRepurpose = async (targetFormat: string) => {
    // Abort existing call if any
    if (repurposeAbortController.current) {
      repurposeAbortController.current.abort();
    }
    
    repurposeAbortController.current = new AbortController();
    setIsRepurposing(true);
    setRepurposedText(null);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content: fullText, targetFormat }),
        signal: repurposeAbortController.current.signal
      });
      if (!res.ok) throw new Error("Failed to repurpose content");
      const data = await res.json();
      setRepurposedText(data.result);
      toast({ title: "Repurposed successfully!" });
      setExpanded(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast({ variant: "destructive", title: "Repurposing failed", description: err.message });
    } finally {
      setIsRepurposing(false);
      repurposeAbortController.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (repurposeAbortController.current) {
        repurposeAbortController.current.abort();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
      className={`relative rounded-[32px] border ${config.borderColor} overflow-hidden flex flex-col glass-panel-premium shadow-2xl group`}
      style={{
        boxShadow: `0 20px 60px -12px ${config.glowColor}, inset 0 0 40px rgba(255,255,255,0.01)`,
      }}
    >
      {isRegenerating && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-20 flex flex-col items-center justify-center rounded-[32px]">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
            <div className="absolute inset-0 blur-xl bg-cyan-400/20 animate-pulse" />
          </div>
          <span className="text-[11px] text-white/40 font-black uppercase tracking-[0.4em] animate-pulse">Recalibrating Intelligence...</span>
        </div>
      )}

      <div className={`h-1.5 w-full bg-gradient-to-r ${config.accentColor} opacity-40`} />

      <div className={`flex flex-col md:flex-row items-start md:items-center justify-between px-6 md:px-8 py-5 md:py-6 ${config.bgColor} border-b border-white/5 gap-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-2xl ${config.bgColor} border ${config.borderColor} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div>
            <span className="font-black text-sm text-white uppercase tracking-[0.1em]">{config.label}</span>
            <div className="flex items-center gap-2 mt-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] text-white/30 font-black uppercase tracking-widest">Optimized for Conversion</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {content?.viralScores?.[platform] && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/5 border border-white/10 shadow-inner">
               <div className={`w-2 h-2 rounded-full animate-pulse ${content.viralScores[platform] >= 85 ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
               <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Viral Score:</span>
               <span className={`text-xs font-black ${content.viralScores[platform] >= 85 ? 'text-emerald-400' : 'text-cyan-400'}`}>{content.viralScores[platform]}%</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 px-4 text-xs font-black text-white/60 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 rounded-xl transition-all">
                  <Share2 className="w-4 h-4 mr-2" /> SHARE
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass-panel-premium border-white/10 z-[100] p-2 shadow-2xl">
                {platform === "twitter" && (
                  <DropdownMenuItem onClick={handleShareTwitter} className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-white/5 p-3 rounded-xl">
                    <X className="w-4 h-4 mr-3 text-white" /> Post to X / Twitter
                  </DropdownMenuItem>
                )}
                {platform === "linkedin" && (
                  <DropdownMenuItem onClick={handleShareLinkedIn} className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-white/5 p-3 rounded-xl">
                    <Linkedin className="w-4 h-4 mr-3 text-blue-400" /> Share on LinkedIn
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(fullText + "\n\n—\nGenerated with GrowFlow AI"); toast({ title: "Copied with attribution!" }); }} className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer focus:bg-emerald-500/10 p-3 rounded-xl">
                  <Copy className="w-4 h-4 mr-3" /> Copy with Attribution
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadTxt} className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-white/5 p-3 rounded-xl">
                  <Download className="w-4 h-4 mr-3" /> Download Source (.txt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 px-4 text-xs font-black text-cyan-400/80 hover:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl transition-all shadow-glow-sm">
                  <Wand2 className="w-4 h-4 mr-2" /> REPURPOSE
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 glass-panel-premium border-cyan-500/20 z-[100] p-2 shadow-2xl">
                {["Convert to Thread", "Convert to LinkedIn", "Convert to Script"].map((format) => (
                  <DropdownMenuItem 
                    key={format}
                    onClick={() => handleRepurpose(format)} 
                    className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-cyan-500/20 p-3 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 mr-3 text-cyan-400" /> {format}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-px bg-white/10 mx-1" />

            <Button onClick={onRegenerate} variant="ghost" size="sm" className="h-10 px-4 text-xs font-black text-white/30 hover:text-white/60 bg-white/5 border border-white/5 rounded-xl transition-all">
              <RefreshCw className="w-4 h-4 mr-2" /> NEW
            </Button>
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 border border-white/5 transition-all"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="p-8 md:p-12 space-y-12 bg-white/[0.01]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
                {/* Primary Narrative Column */}
                <div className="space-y-10">
                  {platform === "instagram" && content && (
                    <>
                      {content.hook && (
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-400">Tactical Hook</span>
                              <CopyButton text={content.hook} label="Hook" size="xs" />
                           </div>
                           <div className="p-6 md:p-8 rounded-3xl bg-pink-500/5 border border-pink-500/10 text-white font-black text-xl md:text-2xl leading-tight shadow-xl relative overflow-hidden group/hook break-words [overflow-wrap:anywhere]">
                              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover/hook:opacity-100 transition-opacity duration-700" />
                              <span className="relative z-10">"{content.hook}"</span>
                           </div>
                        </div>
                      )}
                      {content.caption && (
                        <ContentSection label="Platform Narrative" content={content.caption} copyLabel="Caption" labelColor="text-pink-400/40" />
                      )}
                    </>
                  )}

                  {platform === "youtube" && content && (
                    <>
                      {content.hook && (
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Retention Hook</span>
                              <CopyButton text={content.hook} label="Hook" size="xs" />
                           </div>
                           <div className="p-6 md:p-8 rounded-3xl bg-red-500/5 border border-red-500/10 text-white font-black text-xl md:text-2xl leading-tight shadow-xl relative overflow-hidden group/hook break-words [overflow-wrap:anywhere]">
                              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover/hook:opacity-100 transition-opacity duration-700" />
                              <span className="relative z-10">"{content.hook}"</span>
                           </div>
                        </div>
                      )}
                      {content.script && (
                        <ContentSection label="Production Script" content={content.script} copyLabel="Script" labelColor="text-red-400/40" />
                      )}
                    </>
                  )}

                  {platform === "linkedin" && content && (
                    <>
                      {content.headline && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Authority Hook</span>
                            <CopyButton text={content.headline} label="Headline" size="xs" />
                          </div>
                          <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 md:p-8 text-white font-black text-xl md:text-2xl leading-tight shadow-xl relative overflow-hidden group/hook break-words [overflow-wrap:anywhere]">
                             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover/hook:opacity-100 transition-opacity duration-700" />
                             <span className="relative z-10">"{content.headline}"</span>
                           </div>
                        </div>
                      )}
                      {content.post && (
                        <ContentSection label="Thought Leadership Brief" content={content.post} copyLabel="Post Body" labelColor="text-blue-400/40" />
                      )}
                    </>
                  )}

                  {platform === "twitter" && Array.isArray(content?.tweets) && (
                    <div className="space-y-6">
                      {content.tweets.map((tweet: string, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 md:p-8 space-y-6 hover:border-white/10 transition-all shadow-xl group/tweet relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.02] rounded-full blur-3xl pointer-events-none" />
                          <ContentSection
                            label={`Signal Transmitted ${i + 1}`}
                            content={tweet}
                            copyLabel={`Tweet ${i + 1}`}
                            isTweet
                            tweetIndex={i + 1}
                            tweetTotal={content.tweets.length}
                            labelColor="text-slate-400/30"
                          />
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden mr-6 shadow-inner">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (tweet.length / 280) * 100)}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className={`h-full transition-colors duration-500 ${tweet.length > 240 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]"}`}
                              />
                            </div>
                            <span className={`text-[10px] font-black font-mono ${tweet.length > 240 ? "text-red-400" : "text-white/20"}`}>
                              {tweet.length}<span className="opacity-40"> / 280</span>
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Strategic Assets Column */}
                <div className="space-y-12">
                  {content.cta && (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 shadow-xl relative overflow-hidden group/cta"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/cta:opacity-100 transition-opacity duration-700" />
                      <div className="flex items-center justify-between relative z-10">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Final Conversion CTA</span>
                         <CopyButton text={content.cta} label="CTA" size="xs" />
                      </div>
                      <p className="text-base md:text-lg text-white/90 font-bold leading-relaxed italic relative z-10 break-words [overflow-wrap:anywhere]">"{content.cta}"</p>
                    </motion.div>
                  )}

                  {platform === "instagram" && content.hashtags && (
                    <ContentSection label="Viral Taxonomy" content={content.hashtags} copyLabel="Hashtags" isHashtags labelColor="text-pink-400/30" />
                  )}
                  
                  {platform === "youtube" && content.title && (
                    <ContentSection label="Algorithmic Title" content={content.title} copyLabel="Title" labelColor="text-red-400/30" />
                  )}

                  {platform === "linkedin" && content.visualBriefs && Array.isArray(content.visualBriefs) && (
                    <div className="space-y-6">
                       <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Visual Narrative Grid</span>
                         <div className="h-px flex-1 bg-white/5" />
                       </div>
                       <div className="grid grid-cols-1 gap-4">
                          {content.visualBriefs.map((brief: string, i: number) => (
                             <motion.div 
                               key={i} 
                               whileHover={{ x: 5 }}
                               className="flex gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-md group/brief"
                             >
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[11px] font-black text-emerald-400 shrink-0 border border-emerald-500/20 shadow-glow-sm">
                                   {String(i+1).padStart(2, '0')}
                                </div>
                                <p className="text-sm text-white/50 leading-relaxed font-medium group-hover:text-white/80 transition-colors">{brief}</p>
                             </motion.div>
                          ))}
                       </div>
                    </div>
                  )}

                  {repurposedText && (
                    <div className="p-8 rounded-3xl glass-panel-premium border-cyan-500/20 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">AI Adaptation</span>
                        <CopyButton text={repurposedText} label="Adaptation" size="xs" />
                      </div>
                      <div className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                        {repurposedText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


function buildAllPlatformsText(data: any): string {
  if (!data?.content) return "";
  const { idea, contentType, tone, content } = data;
  const lines: string[] = [
    `CONTENT CAMPAIGN`,
    `================`,
    `Idea: ${idea}`,
    `Type: ${contentType} | Tone: ${tone}`,
    ``,
    ``,
    `INSTAGRAM`,
    `---------`,
    buildPlatformText("instagram", content.instagram),
    ``,
    ``,
    `YOUTUBE SHORTS`,
    `--------------`,
    buildPlatformText("youtube", content.youtube),
    ``,
    ``,
    `X / TWITTER THREAD`,
    `------------------`,
    buildPlatformText("twitter", content.twitter),
    ``,
    ``,
    `LINKEDIN`,
    `--------`,
    buildPlatformText("linkedin", content.linkedin),
  ];
  return lines.join("\n");
}

export default function Generate() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const prefillIdea = searchParams.get("idea") ?? "";
  const prefillType = (searchParams.get("contentType") ?? "Educational") as "Educational" | "Story" | "Viral";
  const prefillTone = (searchParams.get("tone") ?? "Professional") as "Casual" | "Professional" | "Aggressive";
  const autoGenerate = searchParams.get("auto") === "1";

  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"limit" | "expired" | "blocked" | "pro_feature">("limit");
  const [proFeatureName, setProFeatureName] = useState("");
  const [viralMode, setViralMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [styleMode, setStyleMode] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState("campaign");
  const [abTestResult, setAbTestResult] = useState<any>(null);
  const [isRunningAbTest, setIsRunningAbTest] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const lastSubmittedValues = useRef<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      idea: prefillIdea,
      contentType: prefillType,
      tone: prefillTone,
      niche: "General",
      language: localStorage.getItem("preferred_language") || "English",
    }
  });
  
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["trend-sidebar", "General"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/trends/generate", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ niche: "General" }),
      });
      if (!res.ok) throw new Error("Failed to fetch trends");
      const text = await res.text();
      if (!text) return { success: true };
      try {
        return JSON.parse(text);
      } catch (e) {
        return { success: true };
      }
    },
    staleTime: 1000 * 60 * 60,
  });
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTrigger, setRatingTrigger] = useState("gen-3");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [sparkNudgeDismissed, setSparkNudgeDismissed] = useState(false);
  const [generationBlockedMsg, setGenerationBlockedMsg] = useState<string | null>(null);
  const [savedPrefs, setSavedPrefs] = useState<{ niche: string | null; tonePreference: string | null; platformPreference: string | null } | null>(null);
  const prefsLoadedRef = useRef(false);
  const [showPostGenUpsell, setShowPostGenUpsell] = useState(false);

  const [hookScore, setHookScore] = useState<any>(null);
  const [isScoringHook, setIsScoringHook] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { data: sub, refetch: refetchSub } = useSubscriptionStatus();
  const [, navigate] = useLocation();

  const isFreeUser = !sub || (sub.planType === "free" && sub.plan === "free") || sub.plan === "blocked";
  const paidStatuses = ["active", "trial", "pending", "past_due"];
  const isStarterUser = sub && sub.planType === "starter" && paidStatuses.includes(sub.plan);
  const isCreatorUser = sub && sub.planType === "creator" && paidStatuses.includes(sub.plan);
  const isInfinityUser = sub && sub.planType === "infinity" && paidStatuses.includes(sub.plan);
  
  const generationsUsed = sub?.monthlyGenerationsUsed ?? 0;
  const generationLimit = sub?.generationLimit ?? (isFreeUser ? 10 : 25);

  const isFirstTime = !sessionStorage.getItem("has_generated") && !localStorage.getItem("has_generated");

  useEffect(() => {
    if (isFirstTime && savedPrefs?.niche) {
      const DEMO_IDEAS: Record<string, string> = {
        "Fitness": "3 mistakes beginners make at the gym that slow their progress",
        "Finance": "The one money habit that changed how I think about saving forever",
        "Tech": "Why most people are using AI tools completely wrong in 2025",
        "Business": "The biggest lesson I learned from my first business failure",
        "Food": "5 restaurant-quality meals you can make in under 15 minutes",
        "Motivation": "The one thing that separates successful creators from everyone else",
        "General": "The one thing that separates successful creators from everyone else",
        "default": "The one thing that separates successful creators from everyone else"
      };
      
      const niche = (savedPrefs.niche as keyof typeof DEMO_IDEAS) || "default";
      if (!form.getValues("idea")) {
        form.setValue("idea", DEMO_IDEAS[niche] || DEMO_IDEAS.default);
        form.setValue("contentType", "Educational");
        form.setValue("tone", "Professional");
        form.setValue("niche", savedPrefs.niche as any);
      }
    }
  }, [isFirstTime, savedPrefs, form]);
  
  // Triggers
  const showMidLimitWarning = isFreeUser && !warningDismissed && generationsUsed === 2 && sub?.canGenerate;
  const showInfinitySoftWarning = isInfinityUser && !warningDismissed && generationsUsed >= 300;

  useEffect(() => {
    if (!sub) return;
    if (sub.planType === "free" && sub.plan === "free") {
      const used = sub.monthlyGenerationsUsed ?? 0;
      const backupKey = "generation_count_backup";
      try {
        const stored = parseInt(localStorage.getItem(backupKey) ?? "0", 10);
        if (used === 0 && stored > 0) {
          console.warn(`[GrowFlow] Generation count discrepancy: backend=0, localStorage=${stored}. Backend is authoritative.`);
        }
      } catch {}
    }
  }, [sub]);

  useEffect(() => {
    if (prefsLoadedRef.current) return;
    prefsLoadedRef.current = true;
    (async () => {
      const token = await getToken();
      fetch("/api/settings/preferences", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      })
      .then(async (r) => {
        if (!r.ok) return null;
        const text = await r.text();
        return text ? JSON.parse(text) : null;
      })
      .then(data => {
        if (data && (data.niche || data.tonePreference || data.platformPreference)) {
          setSavedPrefs(data);
        }
      })
      .catch(() => null);
    })();
  }, []);

  // Track user identify on mount
  useEffect(() => {
    if (user) {
      identify(user.id, user.primaryEmailAddress?.emailAddress, {
        plan: sub?.planType,
        totalGenerations: sub?.generationsUsed
      });
    }
  }, [user, sub]);

  const watchLanguage = form.watch("language");
  useEffect(() => {
    if (watchLanguage) {
      localStorage.setItem("preferred_language", watchLanguage);
    }
  }, [watchLanguage]);

  // Restore last used settings
  useEffect(() => {
    try {
      const last = localStorage.getItem("gf_last_settings");
      const templateFill = localStorage.getItem("gf_template_fill");
      
      if (last) {
        const s = JSON.parse(last);
        form.reset({ ...form.getValues(), ...s });
      }

      if (templateFill) {
        form.setValue("idea", templateFill);
        localStorage.removeItem("gf_template_fill");
      }
    } catch {}
  }, []);

  const generateMutation = useGenerateContent({
    mutation: {
      onSuccess: (data) => {
        track("generation_completed", {
          viralScore: (data as any).content?.viral_score,
          plan: sub?.planType,
          contentType: data.contentType
        });

        // Save preferences for next session
        try {
          localStorage.setItem("gf_last_settings", JSON.stringify({
            contentType: form.getValues("contentType"),
            tone: form.getValues("tone"),
            language: form.getValues("language"),
            niche: form.getValues("niche"),
          }));
        } catch {}

        setGeneratedContent(data);
        setIsFavorited(false);
        setGenerationBlockedMsg(null);
        const currentGenCount = incrementGenCount();
        if (checkShouldShowNPS(currentGenCount)) {
          setTimeout(() => {
            setNpsTrigger("10th_generation");
            setShowNPS(true);
          }, 3000);
        }
        if (checkShouldShowRating(currentGenCount)) {
          setRatingTrigger("gen-3");
          setTimeout(() => setShowRatingModal(true), 1500);
        }
        // --- FIX: Use invalidateQueries for cross-component state sync (High 5 fix) ---
        queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
        queryClient.invalidateQueries({ queryKey: ["content-history"] });
        try {
          const upsellShown = sessionStorage.getItem("shown_post_gen_upsell");
          if (!upsellShown && sub && sub.plan === "free" && (sub.generationsRemaining ?? 0) <= 1 && !showUpgradeModal) {
            setShowPostGenUpsell(true);
            try { sessionStorage.setItem("shown_post_gen_upsell", "true"); } catch {}
          }
        } catch {}
        try {
          const backupKey = "generation_count_backup";
          const current = parseInt(localStorage.getItem(backupKey) ?? "0", 10);
          localStorage.setItem(backupKey, String(current + 1));
        } catch {}
      },
      onError: (error: any) => {
        track("generation_failed", {
          error: error?.message || error?.data?.message,
          status: error?.status,
          plan: sub?.planType
        });

        if (error?.status === 403) {
          const errCode = error?.data?.error;
          if (errCode === "EMAIL_NOT_VERIFIED") {
            toast({
              variant: "destructive",
              title: "Please verify your email",
              description: "Check your inbox and click the verification link, then try again.",
            });
          } else if (errCode === "ACCESS_DENIED") {
            toast({
              variant: "destructive",
              title: "Account suspended",
              description: error?.data?.message || "Contact support at growflowai.space/support",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Access denied",
              description: error?.data?.message || "Something went wrong. Please refresh and try again.",
            });
          }
          return;
        }
        if (error?.status === 402 || error?.data?.error === "upgrade_required") {
          const plan = error?.data?.plan;
          const reason = plan === "trial" ? "expired" : "limit";
          setUpgradeReason(reason);
          setShowUpgradeModal(true);
          const msg = error?.data?.message;
          setGenerationBlockedMsg(msg || "You've reached your generation limit. Upgrade to continue.");
          if (checkShouldShowFeedback()) {
            setTimeout(() => { setRatingTrigger("limit-hit"); setShowRatingModal(true); }, 2500);
          }
          return;
        }
        setGenerationBlockedMsg(null);
        const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
        const errorMsg = (error?.message || error?.data?.message || "").toLowerCase();
        const is5xx = (error?.status ?? 0) >= 500 || error?.status === 429 || errorMsg.includes("503") || errorMsg.includes("ai temporarily unavailable") || errorMsg.includes("network");

        if (is5xx && retryCount < 3) {
          toast({
            variant: "destructive",
            title: "AI Overloaded",
            description: "The AI is currently experiencing high load. Would you like to retry?",
            action: (
              <ToastAction altText="Retry" onClick={() => {
                if (generateMutation.isPending) return;
                setRetryCount(prev => prev + 1);
                if (lastSubmittedValues.current) {
                  generateMutation.mutate(lastSubmittedValues.current);
                }
              }}>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </div>
              </ToastAction>
            )
          });
          return;
        }

        if (is5xx && retryCount >= 3) {
          toast({
            variant: "destructive",
            title: "High System Load",
            description: "AI is experiencing high load. Please try again in a few minutes.",
          });
          return;
        }

        toast({
          variant: "destructive",
          title: isOffline ? "No internet connection" : is5xx ? "AI temporarily unavailable" : "Generation failed",
          description: isOffline
            ? "Check your connection and try again."
            : is5xx
            ? (
              <div className="space-y-2">
                <p>Our AI is temporarily overloaded. Please try again in a moment.</p>
                <p className="text-[10px] text-white/40">
                  Check <a href="https://status.growflowai.space" target="_blank" rel="noreferrer" className="text-cyan-400 underline">status.growflowai.space</a> for real-time availability.
                </p>
              </div>
            )
            : "Something went wrong. Please try again.",
        });
      }
    }
  });

  const variationMutation = useGenerateVariations({
    mutation: {
      onSuccess: (data: any) => {
        // Only update the specific platform that was regenerated, not the whole content
        if (regeneratingPlatform && data?.variations?.length > 0) {
          const bestVariation = data.variations[0];
          setGeneratedContent((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              content: {
                ...prev.content,
                [regeneratingPlatform]: {
                  ...prev.content?.[regeneratingPlatform],
                  hook: bestVariation.hook ?? prev.content?.[regeneratingPlatform]?.hook,
                  caption: bestVariation.content ?? prev.content?.[regeneratingPlatform]?.caption,
                  post: bestVariation.content ?? prev.content?.[regeneratingPlatform]?.post,
                  script: bestVariation.content ?? prev.content?.[regeneratingPlatform]?.script,
                },
              },
            };
          });
        }
        queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
        setRegeneratingPlatform(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Regeneration failed" });
        setRegeneratingPlatform(null);
      }
    }
  });

  useEffect(() => {
    document.title = "Generate Content — GrowFlow AI";
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const values = form.getValues();
        if (values.idea.length >= 5 && !generateMutation.isPending) {
          form.handleSubmit(handleGenerate)();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, generateMutation.isPending]);

  useEffect(() => {
    if (!generateMutation.isPending) { setLoadingMsgIdx(0); return; }
    const interval = setInterval(() => {
      setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [generateMutation.isPending]);

  useEffect(() => {
    if (!generatedContent) return;
    setContentAnalysis(null);
    setAnalysisLoading(true);
    const { idea, niche, contentType } = generatedContent;
    const platforms = generatedContent.content ?? {};
    
    const controller = new AbortController();

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No token");
        
        const { data } = await api.post("/content/analyze", 
          { idea, niche, contentType, platforms }, 
          { 
            headers: { "Authorization": `Bearer ${token}` },
            signal: controller.signal
          }
        );
        if (data && typeof data.viralityScore === "number") {
          setContentAnalysis(data);
        } else {
          setContentAnalysis({ _error: "Failed to parse analysis" } as any);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("Analysis failed:", err);
        setContentAnalysis({ _error: "Failed to analyze content" } as any);
      } finally {
        if (!controller.signal.aborted) {
          setAnalysisLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [generatedContent?.id]);


  const currentIdea = form.watch("idea");
  const currentNiche = form.watch("niche");

  useEffect(() => {
    if (!currentIdea || currentIdea.length <= 20) {
      setHookScore(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const controller = new AbortController();

    debounceTimer.current = setTimeout(async () => {
      setIsScoringHook(true);
      try {
        const { data } = await api.post("/hook-scorer/score", 
          {
            hook: currentIdea,
            platform: "Instagram",
            niche: currentNiche || "General"
          },
          { signal: controller.signal }
        );
        setHookScore(data);
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.error("Hook score failed", e);
      } finally {
        if (!controller.signal.aborted) {
          setIsScoringHook(false);
        }
      }
    }, 1200);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      controller.abort();
    };
  }, [currentIdea, currentNiche]);

  // Load language from preferences API instead of localStorage
  useEffect(() => {
    (async () => {
      const token = await getToken();
      fetch("/api/settings/preferences", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }).then(async (r) => {
        if (!r.ok) throw new Error("Failed to load preferences");
        const text = await r.text();
        return text ? JSON.parse(text) : {};
      }).then(data => {
        if (data.languagePreference) form.setValue("language", data.languagePreference);
      }).catch((err) => {
        console.error("Failed to load language preferences:", err);
      });
    })();
  }, []);

  useEffect(() => {
    if (autoGenerate && prefillIdea) {
      generateMutation.mutate({ data: { idea: prefillIdea, contentType: prefillType, tone: prefillTone } });
    }
  }, []);

  const [showNPS, setShowNPS] = useState(false);
  const [npsTrigger, setNpsTrigger] = useState("10th_generation");

  const handleGenerate = async (values: z.infer<typeof formSchema>) => {
    if (generateMutation.isPending) return;
    // Save language preference via API instead of localStorage
    (async () => {
      const token = await getToken();
      fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ languagePreference: values.language }),
      }).catch((err) => {
        console.error("Failed to save language preference:", err);
        toast({ 
          variant: "destructive", 
          title: "Preference Sync Error", 
          description: "Your language choice couldn't be saved to your profile." 
        });
      });
    })();
    
    if (values.language !== "English" && isFreeUser) {
      setProFeatureName("Premium Languages");
      setGenerationBlockedMsg("🔥 Create content in 10 Premium Languages to reach a global audience!");
      setUpgradeReason("pro_feature");
      setShowUpgradeModal(true);
      return;
    }

    const { niche, ...rest } = values;
    let ideaWithNiche = niche && niche !== "General"
      ? `[Niche: ${niche}] ${rest.idea}`
      : rest.idea;
      
    if (viralMode) ideaWithNiche += "\n[VIRAL MODE ENABLED: Ignore regular constraints. Optimize this heavily for maximum viral reach and engagement. Use aggressive open loops.]";
    if (styleMode) ideaWithNiche += "\n[STYLE MODE ENABLED: Tell a bold, deeply personal story. Be very stylized.]";

    setGeneratedContent(null);
    setContentAnalysis(null);
    setAnalysisLoading(false);
    setRetryCount(0);
    
    const mutationData = { data: { ...rest, idea: ideaWithNiche, language: values.language } };
    lastSubmittedValues.current = mutationData;

    if (batchMode) {
      setBatchLoading(true);
      try {
        const token = await getToken();
        const res = await api.post("/content-pack/generate", {
          idea: ideaWithNiche,
          tone: rest.tone,
          contentType: rest.contentType,
          language: values.language
        }, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        setGeneratedContent({ ...res.data, isBatch: true, idea: values.idea });
        queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
        setActiveResultTab("campaign");
      } catch (err) {
        toast({ variant: "destructive", title: "Batch generation failed" });
      } finally {
        setBatchLoading(false);
      }
    } else {
      generateMutation.mutate(mutationData as any);
      setActiveResultTab("campaign");
    }
  }

  function handleTemplate(template: typeof TEMPLATES[number]) {
    form.setValue("idea", template.idea);
    form.setValue("contentType", template.contentType);
    form.setValue("tone", template.tone);
    form.setValue("niche", template.niche);
  }

  async function handleFavoriteToggle() {
    if (!generatedContent?.id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      const token = await getToken();
      const method = isFavorited ? "DELETE" : "POST";
      await fetch(`/api/favorites/${generatedContent.id}`, { 
        method,
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      setIsFavorited(!isFavorited);
      toast({ title: isFavorited ? "Removed from saved" : "Saved to favorites!" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setFavoriteLoading(false);
    }
  }

  function handleRegenerate(platform: Platform) {
    if (!generatedContent) return;
    setRegeneratingPlatform(platform);
    variationMutation.mutate({
      data: {
        idea: generatedContent.idea,
        contentType: generatedContent.contentType as "Educational" | "Story" | "Viral",
        tone: generatedContent.tone as "Casual" | "Professional" | "Aggressive",
        language: form.getValues().language,
        platform
      }
    } as any);
  }

  function handleCopyAll() {
    const text = buildAllPlatformsText(generatedContent);
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    toast({ title: "All content copied to clipboard!" });
    setTimeout(() => setCopiedAll(false), 2500);
  }

  function handleDownload() {
    const text = buildAllPlatformsText(generatedContent);
    const idea = generatedContent?.idea ?? "content";
    const slug = idea.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-campaign-${slug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!" });
  }

  const isLoading = generateMutation.isPending || variationMutation.isPending || batchLoading;
  const platforms: Platform[] = ["instagram", "youtube", "twitter", "linkedin"];

  const isLimited = sub && !sub.canGenerate;

  function UsageCounter() {
    if (!sub) return null;
    if (isFreeUser) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold"
        >
          <span className={generationsUsed >= generationLimit ? "text-red-400" : generationsUsed === generationLimit - 1 ? "text-amber-400" : "text-cyan-300"}>
            {generationsUsed}
          </span>
          <span className="text-white/30">/</span>
          <span className="text-white/50">{generationLimit} {t("credits")}</span>
        </motion.div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold"
      >
        <span className={generationsUsed >= (sub.generationLimit ?? 20) && !isInfinityUser ? "text-red-400" : generationsUsed >= 300 && isInfinityUser ? "text-amber-400" : "text-cyan-300"}>
          {generationsUsed}
        </span>
        <span className="text-white/30">/</span>
        <span className="text-white/50">{isInfinityUser ? "∞ / 300 soft limit" : `${sub.generationLimit ?? 20} / mo`}</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="pb-32 relative overflow-x-hidden min-h-screen"
    >
      <FeatureGuideBanner 
        toolKey="generate" 
        title="Content Generator" 
        icon={<Wand2 className="w-5 h-5" />}
        tagline="Turn one idea into ready-to-post content for Instagram, YouTube, Twitter, and LinkedIn simultaneously."
        whatYouGet={["Instagram caption + hashtags", "YouTube script", "Twitter thread", "LinkedIn post"]}
        whenToUse="Use this when you have a topic idea and need actual post-ready content for all 4 platforms."
        proTip="The more specific your idea, the better the output. Instead of 'fitness tips', try 'the one squat mistake beginners make'."
      />
      <AnimatedOrbs />
      
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        featureName={proFeatureName}
        targetPlan={upgradeReason === "pro_feature" ? "infinity" : "starter"}
      />
      
      <FeedbackModal open={showRatingModal} onClose={() => setShowRatingModal(false)} trigger={ratingTrigger} />

      {/* Main Studio Container */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 space-y-12">
        
        {/* Elite Header & Strategy Banner */}
        <div className="text-center space-y-10">
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-center gap-3 mb-2">
                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{t("generateBtn")}</h1>
              </div>
              <p className="text-white/40 font-medium max-w-lg mx-auto">Transform one idea into a high-authority content ecosystem across four platforms, instantly.</p>
           </motion.div>


        </div>

        {/* Studio Core Input Engine */}
        <div className="max-w-4xl mx-auto space-y-12">
          <CrossToolDiscoveryBanner />
          
          {/* Quick Start Templates Grid */}
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-4">
               <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/5" />
               <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] whitespace-nowrap">Quick Start Blueprints</h3>
               <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/5" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TEMPLATES.map((t, i) => (
                <motion.button
                  key={t.label}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleTemplate(t)}
                  className="group relative p-5 min-h-[72px] md:min-h-0 rounded-[32px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-500/30 transition-all duration-500 text-center flex flex-col items-center gap-4 overflow-hidden shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="text-3xl group-hover:scale-125 transition-transform duration-700 relative z-10">{t.icon}</div>
                  <div className="space-y-1.5 relative z-10 w-full overflow-hidden">
                    <h4 className="text-[10px] md:text-[11px] font-black text-white/90 uppercase tracking-widest leading-none overflow-hidden text-ellipsis whitespace-nowrap">{t.label}</h4>
                    <p className="text-[8px] text-white/20 font-black uppercase tracking-tighter">{t.contentType} · {t.tone}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Premium Content Engine */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-1.5 rounded-[48px] bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl relative overflow-visible"
          >
            <div className="bg-[#0c0d12]/90 backdrop-blur-3xl rounded-[44px] p-8 space-y-10 overflow-visible">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-600 border border-cyan-400/30 shadow-lg shadow-cyan-600/20">
                 <Sparkles className="w-3.5 h-3.5 text-white" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Growth Engine Active</span>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-10">
                  <FormField
                    control={form.control}
                    name="idea"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between px-2 mb-3">
                           <FormLabel className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">{t("your_idea")}</FormLabel>
                           <UsageCounter />
                        </div>
                        <FormControl>
                          <div className="relative group">
                            <Textarea
                              {...field}
                              placeholder={t("ideaPlaceholder")}
                              className="min-h-[80px] md:min-h-[120px] p-5 md:p-8 rounded-[24px] md:rounded-[32px] bg-black/40 border-white/5 focus:border-cyan-500/40 text-base md:text-xl font-medium text-white placeholder:text-white/10 resize-none transition-all shadow-inner ring-0 focus:ring-0 leading-relaxed"
                            />
                            
                            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl bg-white/5 text-[9px] md:text-[10px] text-white/20 font-black uppercase tracking-widest border border-white/5">
                               <Activity className="w-3 md:w-3.5 h-3 md:h-3.5 text-cyan-500/50" />
                               Trending
                            </div>
                            {isScoringHook && (
                               <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 text-[10px] md:text-xs font-bold text-white/40">
                                 <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin" /> Scoring...
                                </div>
                            )}
                          </div>
                        </FormControl>

                        {/* Brand Voice Toggle */}
                        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5 mt-4">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                 <MessageCircle size={16} />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-white uppercase tracking-wider">Write in my voice</p>
                                 <p className="text-[8px] text-white/30 font-bold uppercase">Use your analyzed linguistic DNA</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <FormField
                                control={form.control}
                                name="brandVoiceId"
                                render={({ field }) => (
                                  <div className="flex items-center gap-3">
                                    {/* Simplified: just using a toggle for now that picks the first voice */}
                                    <Switch 
                                      checked={!!field.value && field.value !== "none"}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          // --- FIX (HIGH-5): Must await getToken() before using as header ---
                                          (async () => {
                                            const token = await getToken();
                                            fetch("/api/brand-voice", { headers: { "Authorization": `Bearer ${token}` } })
                                              .then(r => r.json())
                                              .then(data => {
                                                if (data && data.length > 0) {
                                                  field.onChange(data[0].id);
                                                } else {
                                                  toast({ 
                                                    title: "Voice profile required", 
                                                    description: "Set up your brand voice first to use this feature.",
                                                    action: <ToastAction altText="Setup" onClick={() => navigate("/brand-voice")}>Setup →</ToastAction>
                                                  });
                                                  field.onChange("none");
                                                }
                                              })
                                              .catch(() => field.onChange("none"));
                                          })();
                                        } else {
                                          field.onChange("none");
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              />
                           </div>
                        </div>
                        <AnimatePresence mode="wait">
                          {hookScore && currentIdea && currentIdea.length > 20 && !isScoringHook && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="mt-6 overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] bg-zinc-900/80 border border-white/5 backdrop-blur-3xl shadow-2xl"
                            >
                              <div className="p-5 md:p-8 space-y-5 md:space-y-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                   <div className="flex items-center gap-4 md:gap-6">
                                      <div className={`relative group`}>
                                         <div className={`absolute -inset-1 rounded-2xl blur opacity-30 group-hover:opacity-50 transition ${
                                           hookScore.grade === 'S' ? 'bg-amber-500' :
                                           hookScore.grade === 'A' ? 'bg-emerald-500' :
                                           hookScore.grade === 'B' ? 'bg-cyan-500' :
                                           'bg-amber-400'
                                         }`} />
                                         <div className={`relative w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-2xl md:text-3xl italic shadow-2xl ${
                                           hookScore.grade === 'S' ? 'bg-amber-500 text-black' :
                                           hookScore.grade === 'A' ? 'bg-emerald-500 text-black' :
                                           hookScore.grade === 'B' ? 'bg-cyan-500 text-black' :
                                           'bg-zinc-800 text-white'
                                         }`}>
                                           {hookScore.grade}
                                         </div>
                                      </div>
                                      <div>
                                         <div className="flex items-center gap-2 md:gap-3">
                                            <span className="text-2xl md:text-3xl font-black text-white tracking-tighter">{hookScore.score}</span>
                                            <span className="text-zinc-500 font-bold text-xs md:text-sm">/ 100</span>
                                         </div>
                                         <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{hookScore.hookType}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                                      {hookScore.patternMatches?.map((m: string) => (
                                         <span key={m} className="px-2 md:px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[9px] md:text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">{m}</span>
                                      ))}
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                   {hookScore.mainIssue && (
                                      <div className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex gap-3 md:gap-4 items-start group/issue hover:bg-amber-500/10 transition-colors">
                                         <AlertCircle className="w-4 md:w-5 h-4 md:h-5 text-amber-500 shrink-0 mt-0.5" />
                                         <div className="space-y-0.5 md:space-y-1">
                                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-500/50">Intelligence Insight</p>
                                            <p className="text-xs md:text-sm font-bold text-amber-200/80 leading-relaxed">{hookScore.mainIssue}</p>
                                         </div>
                                      </div>
                                   )}
                                   {hookScore.quickFix && (
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(hookScore.quickFix);
                                          toast({ title: "Optimized hook copied!" });
                                        }}
                                        className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-cyan-500/5 border border-cyan-500/10 flex gap-3 md:gap-4 items-start text-left group/fix hover:bg-cyan-500/10 transition-all active:scale-95"
                                      >
                                         <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-cyan-400 shrink-0 mt-0.5 group-hover/fix:scale-125 transition-transform" />
                                         <div className="space-y-0.5 md:space-y-1">
                                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-cyan-400/50">Suggested Optimization</p>
                                            <p className="text-xs md:text-sm font-bold text-cyan-100 italic leading-relaxed">"{hookScore.quickFix}"</p>
                                            <p className="text-[8px] md:text-[9px] font-black text-cyan-400/30 uppercase mt-1 md:mt-2">Click to copy</p>
                                         </div>
                                      </button>
                                   )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3 md:space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-2">
                      <FormField
                        control={form.control}
                        name="niche"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">Niche</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                                  <SelectValue placeholder="Niche" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-panel-premium border-white/10 z-[100]">
                                {NICHES.map(n => <SelectItem key={n} value={n} className="text-white/80 font-bold">{n}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">Style</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                                  <SelectValue placeholder="Style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-panel-premium border-white/10 z-[100]">
                                {["Educational", "Story", "Viral"].map(t => <SelectItem key={t} value={t} className="text-white/80 font-bold">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">Tone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 md:h-14 rounded-xl md:rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                                  <SelectValue placeholder="Tone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-panel-premium border-white/10 z-[100]">
                                {["Casual", "Professional", "Aggressive"].map(t => <SelectItem key={t} value={t} className="text-white/80 font-bold">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">Language</FormLabel>
                            <LanguageSelector
                              value={field.value}
                              onChange={field.onChange}
                              isFreeUser={isFreeUser}
                              onUpgradeRequired={() => {
                                setUpgradeReason("pro_feature");
                                setProFeatureName("Regional Languages");
                                setShowUpgradeModal(true);
                              }}
                            />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                       <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                <Package2 className="w-4 h-4 text-cyan-400" />
                             </div>
                             <div className="space-y-0.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/80">Batch Mode</Label>
                                <p className="text-[9px] text-white/30 font-medium leading-none">Full Content Ecosystem</p>
                             </div>
                          </div>
                          <Switch 
                            checked={batchMode} 
                            onCheckedChange={(val) => {
                              if (val && isFreeUser) {
                                setUpgradeReason("pro_feature");
                                setProFeatureName("Batch Mode");
                                setShowUpgradeModal(true);
                                return;
                              }
                              setBatchMode(val);
                            }} 
                          />
                       </div>
                       <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <Flame className="w-4 h-4 text-orange-400" />
                             </div>
                             <div className="space-y-0.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-white/80">Viral Mode</Label>
                                <p className="text-[9px] text-white/30 font-medium leading-none">High-Aggression Open Loops</p>
                             </div>
                          </div>
                          <Switch 
                            checked={viralMode} 
                            onCheckedChange={(val) => {
                              if (val && isFreeUser) {
                                setUpgradeReason("pro_feature");
                                setProFeatureName("Viral Mode");
                                setShowUpgradeModal(true);
                                return;
                              }
                              setViralMode(val);
                            }} 
                          />
                       </div>
                    </div>

                    <div className="pt-4 sticky bottom-0 md:static bg-gradient-to-t from-[#060312] to-transparent z-20 pb-4">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          onClick={() => { haptic('medium'); }}
                          className={`w-full h-12 text-base font-bold rounded-[24px] bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-2xl shadow-cyan-500/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 group overflow-hidden relative ${isFirstTime ? 'animate-pulse scale-[1.02] shadow-[0_0_25px_rgba(6,182,212,0.4)]' : ''}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          {isLoading ? (
                            <div className="flex items-center gap-3">
                               <Loader2 className="w-6 h-6 animate-spin" />
                               <span>Architecting Campaign...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 relative z-10">
                               <Zap className="w-5 h-5 fill-white" />
                               <div className="flex flex-col items-center">
                                 <span className="tracking-widest uppercase">{isFirstTime ? t("get_started") : t("generateBtn")}</span>
                                 <span className="text-[10px] text-white/30 font-black tracking-[0.2em] mt-1 hidden md:block">CTRL + ENTER</span>
                               </div>
                            </div>
                          )}
                        </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </motion.div>
        </div>

        {/* Results Workspace - Spaced Grid below the engine */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 pt-12"
            >
              <div className="flex items-center justify-center gap-4 p-6 rounded-3xl bg-cyan-500/5 border border-cyan-500/20 max-w-xl mx-auto">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm font-black text-cyan-100 uppercase tracking-widest"
                  >
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </motion.span>
                </AnimatePresence>
              </div>
              <ContentSkeleton />
            </motion.div>
          ) : generatedContent ? (
            <motion.div
              key="results-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <Tabs value={activeResultTab} onValueChange={setActiveResultTab} className="space-y-12 pt-12">
                <div className="flex justify-center mb-8">
                  <TabsList className="bg-white/5 border border-white/5 p-1 rounded-2xl md:rounded-[2rem] h-auto flex-wrap justify-center">
                    <TabsTrigger value="campaign" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white rounded-xl md:rounded-[1.5rem] px-4 md:px-8 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all">
                       <Sparkles className="w-3.5 h-3.5 md:mr-2" /> <span className="hidden md:inline">The Campaign</span>
                    </TabsTrigger>
                    <TabsTrigger value="duel" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl md:rounded-[1.5rem] px-4 md:px-8 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all">
                       <ArrowRightLeft className="w-3.5 h-3.5 md:mr-2" /> <span className="hidden md:inline">Hook Duel</span>
                    </TabsTrigger>
                    <TabsTrigger value="intelligence" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-xl md:rounded-[1.5rem] px-4 md:px-8 py-2 md:py-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all">
                       <BarChart3 className="w-3.5 h-3.5 md:mr-2" /> <span className="hidden md:inline">Intelligence</span>
                    </TabsTrigger>
                  </TabsList>
               </div>

               <TabsContent value="campaign" className="space-y-12 outline-none">
                {generatedContent.isBatch ? (
                  <BatchResultView result={generatedContent} onSave={() => toast({ title: "Saved to Bank" })} />
                ) : (
                  <motion.div
                    key="generated-content"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-12"
                  >
                    <AnimatePresence>
                      {generatedContent?.content?.viralScores?.overall && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
                        >
                          <div className="space-y-2">
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                              Your High-Performance <br/>
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Content Campaign</span>
                            </h2>
                            <p className="text-white/40 font-medium flex items-center gap-2">
                              <Flame className="w-4 h-4 text-orange-500" /> Topic: {generatedContent.idea}
                            </p>
                          </div>

                          <div className="flex flex-col items-center md:items-end gap-2">
                            <ViralScoreMeter score={generatedContent.content.viralScores.overall} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Campaign Strategy Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-6 p-8 rounded-[40px] glass-panel-premium border-cyan-500/20 relative overflow-hidden group shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                           <Activity className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-white leading-none tracking-tight">Campaign Fully Architected</h4>
                          <p className="text-[10px] text-emerald-400/80 uppercase font-black tracking-[0.2em] mt-2">All Platform Nodes Synchronized</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                        <button
                          onClick={handleCopyAll}
                          className={`h-12 px-8 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                            copiedAll 
                              ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/30" 
                              : "bg-white/5 hover:bg-white/10 text-white/80 border border-white/10"
                          }`}
                        >
                          {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedAll ? "Campaign Copied" : "Copy Full Campaign"}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="h-12 px-8 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 flex items-center gap-3 transition-all"
                        >
                          <Download className="w-4 h-4" />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    {/* Platform Results Grid */}
                    <div className="grid grid-cols-1 gap-12">
                      {platforms.map((platform, i) => (
                        <div key={platform} className="space-y-4">
                          <PlatformCard
                            platform={platform}
                            content={generatedContent.content?.[platform]}
                            onRegenerate={() => handleRegenerate(platform)}
                            isRegenerating={regeneratingPlatform === platform}
                            index={i}
                          />
                          <PerformancePredictionCard 
                            viralScore={generatedContent.content?.[platform]?.viral_score || generatedContent.content.viralScores?.[platform] || 80}
                            platform={platform}
                            niche={generatedContent.niche || "General"}
                          />
                          {isFreeUser && (
                            <p className="text-[10px] text-white/30 px-6 font-medium">
                              Free plan includes GrowFlow watermark. <button className="text-cyan-400 underline font-black" onClick={() => setShowUpgradeModal(true)}>Upgrade to remove it →</button>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
               </TabsContent>

               <TabsContent value="duel" className="outline-none">
                  <AbDuelView 
                    idea={generatedContent.idea} 
                    niche={generatedContent.niche || "General"}
                    tone={generatedContent.tone}
                    onResult={setAbTestResult}
                    result={abTestResult}
                  />
               </TabsContent>

               <TabsContent value="intelligence" className="outline-none">
                  <HookIntelligenceView 
                    content={generatedContent}
                    niche={generatedContent.niche || "General"}
                  />
               </TabsContent>
            </Tabs>

              <CampaignScorePanel data={generatedContent} analysis={contentAnalysis} analysisLoading={analysisLoading} />

              {/* Intelligence & SEO Footer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {((generatedContent.content?.seo_keywords?.length > 0) || (generatedContent.content?.hashtags?.length > 0)) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-[40px] border border-white/5 p-10 bg-white/[0.01] backdrop-blur-xl relative overflow-hidden"
                  >
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 blur-3xl rounded-full" />
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                         <Hash className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-black text-white/80 uppercase tracking-[0.3em]">SEO Intelligence</h3>
                    </div>
                    
                    <div className="space-y-8">
                      {generatedContent.content?.seo_keywords?.length > 0 && (
                        <div className="space-y-4">
                          <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em]">High-Volume Keywords</p>
                          <div className="flex flex-wrap gap-2.5">
                            {generatedContent.content.seo_keywords.map((kw: string, i: number) => (
                              <div key={i} className="flex items-center group">
                                <span className="px-4 py-2 rounded-l-2xl bg-white/5 border border-white/5 text-[11px] text-white/60 font-bold">
                                  {kw}
                                </span>
                                <button
                                  onClick={() => navigator.clipboard.writeText(kw)}
                                  className="px-3 py-2 rounded-r-2xl bg-white/10 hover:bg-white/20 border border-white/5 text-white/40 group-hover:text-white transition-all"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-32 flex flex-col items-center text-center space-y-10"
            >
               <div className="w-32 h-32 rounded-full bg-cyan-500/5 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" />
                  <div className="absolute inset-4 rounded-full border border-cyan-500/30 animate-pulse" />
                  <Wand2 className="w-12 h-12 text-cyan-400/40 relative z-10" />
               </div>
               <div className="space-y-4">
                  <h3 className="text-3xl font-black text-white/60 tracking-tight">Your Digital Studio is Ready.</h3>
                  <p className="text-lg text-white/20 max-w-md mx-auto font-medium leading-relaxed">
                    Enter a vision above to architect a multi-platform content ecosystem.
                  </p>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Warnings & Overlay Modals */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence>
            {showMidLimitWarning && !warningDismissed && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="rounded-3xl border border-amber-500/30 bg-amber-500/90 text-amber-50 backdrop-blur-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Crucial: 1 Generation Left</p>
                    <p className="text-xs opacity-80 font-medium">Upgrade to Infinity for unlimited architecture.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="secondary" className="font-black px-6 rounded-xl" onClick={() => setShowUpgradeModal(true)}>Upgrade</Button>
                  <button onClick={() => setWarningDismissed(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
