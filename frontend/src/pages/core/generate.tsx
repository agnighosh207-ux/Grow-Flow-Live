import { useState, useEffect, useRef, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGenerateContent, useGenerateVariations } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2, Copy, RefreshCw, Check, Sparkles, Linkedin, Twitter, X,
  Download, Hash, Zap, MessageCircle, Film, ChevronDown, ChevronUp, Crown, Heart,
  TrendingUp, Users, BarChart2, Activity, Brain, Flame, Lock, Wand2, AlertCircle, Lightbulb, Share2
} from "lucide-react";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { FeedbackModal, checkShouldShowRating, checkShouldShowFeedback, incrementGenCount } from "@/components/modals/FeedbackModal";
import { useAuth } from "@clerk/react";
import { WeeklyReportCard } from "@/components/shared/WeeklyReportCard";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { api } from "@/lib/api-client";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";

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

function ContentScoreBadge({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40 font-medium w-16 md:w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full score-bar ${color}`}
          style={{ "--score-width": `${score}%` } as any}
        />
      </div>
      <span className={`text-xs font-bold ${color.replace('bg-', 'text-')}`}>{score}</span>
    </div>
  );
}

function ContentSkeleton() {
  const platforms = ["Instagram", "YouTube Shorts", "X / Twitter Thread", "LinkedIn"];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {platforms.map((p) => (
        <div
          key={p}
          className="hyper-hover-card rounded-2xl border border-white/6 overflow-hidden bg-white/[0.02]"
        >
          <div className="h-0.5 bg-white/10" />
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-white/[0.03] border-b border-white/5">
            <Skeleton className="w-4 h-4 rounded bg-white/10" />
            <Skeleton className="h-4 w-24 bg-white/10" />
          </div>
          <div className="px-5 py-5 space-y-4">
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-[90%] bg-white/5" />
            <Skeleton className="h-3 w-[80%] bg-white/5" />
            <div className="pt-2">
              <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
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

function CampaignScorePanel({ data, analysis, analysisLoading }: { data: any; analysis?: ContentAnalysis | null; analysisLoading?: boolean }) {
  const isMobile = useIsMobile();
  const [showScoreOnMobile, setShowScoreOnMobile] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const directViralScore = data?.content?.viral_score;
  const directFeedback = data?.content?.viral_feedback;
  const directSuggestion = data?.content?.viral_suggestion;

  const scores = useMemo(() => {
    if (analysis) {
      return [
        { label: "Virality", score: analysis.viralityScore, color: "bg-red-400" },
        { label: "Hook Strength", score: analysis.hookStrength, color: "bg-pink-400" },
        { label: "Engagement", score: analysis.engagementPotential, color: "bg-cyan-400" },
        { label: "Shareability", score: analysis.shareability, color: "bg-emerald-400" },
      ];
    }
    
    // Use direct scores from AI content response if available (Bug 10 fix)
    const hookStrength = data?.content?.hook_strength ?? 80;
    const engagementPotential = data?.content?.engagement_potential ?? 75;
    const shareability = data?.content?.shareability ?? 72;
    const virality = directViralScore ?? 78;

    return [
      { label: "Virality", score: virality, color: "bg-red-400" },
      { label: "Hook Strength", score: hookStrength, color: "bg-pink-400" },
      { label: "Engagement", score: engagementPotential, color: "bg-cyan-400" },
      { label: "Shareability", score: shareability, color: "bg-emerald-400" },
    ];
  }, [analysis, data, directViralScore]);

  const avg = useMemo(() => {
    return analysis?.viralityScore ?? directViralScore ?? Math.round(scores.reduce((a: number, s: any) => a + s.score, 0) / scores.length);
  }, [analysis, directViralScore, scores]);

  return (
      <motion.div
        id="tour-viral-score"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="rounded-[32px] border border-white/5 overflow-hidden shadow-2xl relative group bg-white/[0.01]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="p-8 md:p-10">
        <div className="flex flex-col xl:flex-row gap-12">
          {/* Left Side: Score Overview */}
          <div className="xl:w-1/3 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                 <Brain className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                 <h3 className="text-lg font-black text-white/90 tracking-tight">Campaign Intelligence</h3>
                 <p className="text-xs text-white/30 font-medium uppercase tracking-widest">Powered by Growth AI</p>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-black ${avg >= 85 ? 'text-emerald-400' : avg >= 75 ? 'text-cyan-400' : 'text-amber-400'}`}>{avg}</span>
              <span className="text-xl font-bold text-white/20">/ 100</span>
              <div className="ml-auto px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-300 uppercase tracking-widest">
                 {avg >= 85 ? "Excellent" : avg >= 75 ? "Strong" : "Optimizing"}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              {scores.map((s: any) => (
                <ContentScoreBadge key={s.label} score={s.score} label={s.label} color={s.color} />
              ))}
            </div>
          </div>

          {/* Right Side: Deep Insights */}
          <div className="flex-1 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {(analysis || directFeedback) && (
                 <>
                   <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                        <Flame className="w-3 h-3" /> Emotional Trigger
                      </p>
                      <p className="text-sm text-white/70 leading-relaxed font-medium">
                        {analysis?.emotionalTrigger || "Deeply resonates with user pain points and aspirations."}
                      </p>
                   </div>
                   <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Curiosity Gap
                      </p>
                      <p className="text-sm text-white/70 leading-relaxed font-medium">
                        {analysis?.curiosityGap || "Strong open loop that demands attention and click-through."}
                      </p>
                   </div>
                 </>
               )}
            </div>

            {directSuggestion && (
              <div className="p-6 rounded-3xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                   <Sparkles className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-cyan-300 uppercase tracking-widest mb-1">Growth Architect Tip</p>
                  <p className="text-sm text-white/80 leading-relaxed font-medium italic">"{directSuggestion}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
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
});

type Platform = "instagram" | "youtube" | "twitter" | "linkedin";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "xs";
}

function CopyButton({ text, label, size = "sm" }: CopyButtonProps) {
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
        : <><Copy className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} /> {label || "Copy"}</>
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
        className={`text-xs md:text-sm leading-relaxed whitespace-pre-wrap
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
    const text = fullText.substring(0, 280);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleShareLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://growflowai.space")}`, "_blank");
  };

  const handleCopyWithAttribution = () => {
    const attribution = "\n\n—\nGenerated with GrowFlow AI: https://growflowai.space";
    navigator.clipboard.writeText(fullText + attribution);
    toast({ title: "Copied with attribution!", description: "Thanks for supporting GrowFlow AI! 🚀" });
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

  const handleRepurpose = async (targetFormat: string) => {
    setIsRepurposing(true);
    setRepurposedText(null);
    try {
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullText, targetFormat }),
      });
      if (!res.ok) throw new Error("Failed to repurpose content");
      const data = await res.json();
      setRepurposedText(data.result);
      toast({ title: "Repurposed successfully!" });
      setExpanded(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Repurposing failed", description: err.message });
    } finally {
      setIsRepurposing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      className={`relative rounded-2xl border ${config.borderColor} overflow-hidden flex flex-col`}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`,
        boxShadow: `0 0 40px 0 ${config.glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {isRegenerating && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-xs text-white/60 font-medium">Regenerating...</span>
          </div>
        </div>
      )}

      <div className={`h-0.5 w-full bg-gradient-to-r ${config.accentColor} opacity-70`} />

      <div className={`flex items-center justify-between px-5 py-3.5 ${config.bgColor} border-b border-white/5`}>
        <div className="flex items-center gap-2.5">
          <motion.div animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
            <Icon className={`w-4 h-4 ${config.iconColor} flex-shrink-0`} />
          </motion.div>
          <span className="font-semibold text-sm text-white/90 tracking-tight">{config.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <CopyButton 
            text={isFreeUser ? (fullText + "\n\n—\nGenerated with GrowFlow AI: https://growflowai.space") : fullText} 
            label={isFreeUser ? "Copy (Attributed)" : config.label} 
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all font-medium"
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 glass-panel-premium border-white/10 z-[100] p-1.5 shadow-2xl">
              {platform === "twitter" && (
                <DropdownMenuItem onClick={handleShareTwitter} className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-white/5">
                  <X className="w-3.5 h-3.5 mr-2 text-white" /> Post to Twitter/X
                </DropdownMenuItem>
              )}
              {platform === "linkedin" && (
                <DropdownMenuItem onClick={handleShareLinkedIn} className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-white/5">
                  <Linkedin className="w-3.5 h-3.5 mr-2 text-blue-400" /> Share on LinkedIn
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem onClick={handleCopyWithAttribution} className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer focus:bg-emerald-500/10">
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy with Attribution
              </DropdownMenuItem>

              <DropdownMenuItem 
                onClick={() => !isFreeUser && navigator.clipboard.writeText(fullText).then(() => toast({ title: "Copied without attribution" }))} 
                disabled={isFreeUser}
                className={`text-xs flex items-center justify-between cursor-pointer ${isFreeUser ? "opacity-50 grayscale pointer-events-none" : "text-white/70 hover:text-white focus:bg-white/5"}`}
              >
                <div className="flex items-center">
                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy without attribution
                </div>
                {isFreeUser && <Lock className="w-3 h-3 text-amber-400" />}
              </DropdownMenuItem>

              <div className="h-px bg-white/5 my-1" />

              <DropdownMenuItem onClick={handleDownloadTxt} className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-white/5">
                <Download className="w-3.5 h-3.5 mr-2" /> Download as .txt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={isRepurposing}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 hover:text-cyan-200 border border-white/10 hover:border-cyan-500/30 transition-all font-medium disabled:opacity-50"
              >
                {isRepurposing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Repurpose
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-panel-premium border-cyan-500/20 z-[100] p-1.5 shadow-2xl">
              <DropdownMenuItem 
                onClick={() => handleRepurpose("Convert to Twitter Thread")}
                className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-cyan-500/20"
              >
                <Twitter className="w-3.5 h-3.5 mr-2 text-sky-400" /> Convert to Thread
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleRepurpose("Convert to LinkedIn Post")}
                className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-blue-500/20"
              >
                <Linkedin className="w-3.5 h-3.5 mr-2 text-blue-400" /> Convert to LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleRepurpose("Convert to Reel Script")}
                className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-pink-500/20"
              >
                <Film className="w-3.5 h-3.5 mr-2 text-pink-400" /> Convert to Reel Script
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-all font-medium disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" />
            New
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-4 md:p-8 border-t border-white/5 space-y-8 bg-white/[0.01]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Primary Content Column */}
                <div className="space-y-6">
                  {platform === "instagram" && content && (
                    <>
                      {content.hook && (
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">Opening Hook</span>
                              <CopyButton text={content.hook} label="Hook" size="xs" />
                           </div>
                           <div className="p-4 rounded-2xl bg-pink-500/5 border border-pink-500/10 text-white font-bold text-lg leading-snug">
                              {content.hook}
                           </div>
                        </div>
                      )}
                      {content.caption && (
                        <ContentSection label="Main Caption" content={content.caption} copyLabel="Caption" />
                      )}
                    </>
                  )}

                  {platform === "youtube" && content && (
                    <>
                      {content.hook && (
                        <div className="space-y-2">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Viral Hook</span>
                              <CopyButton text={content.hook} label="Hook" size="xs" />
                           </div>
                           <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-white font-bold text-lg leading-snug">
                              {content.hook}
                           </div>
                        </div>
                      )}
                      {content.script && (
                        <ContentSection label="Production Script" content={content.script} copyLabel="Script" />
                      )}
                    </>
                  )}

                  {platform === "linkedin" && content && (
                    <>
                      {content.headline && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Authority Hook</span>
                            <CopyButton text={content.headline} label="Headline" size="xs" />
                          </div>
                          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 text-white font-bold text-lg leading-relaxed shadow-lg">
                            {content.headline}
                          </div>
                        </div>
                      )}
                      {content.post && (
                        <ContentSection label="Post Body" content={content.post} copyLabel="Post Body" />
                      )}
                    </>
                  )}

                  {platform === "twitter" && Array.isArray(content?.tweets) && content.tweets.length > 0 && (
                    <div className="space-y-4">
                      {content.tweets.map((tweet: string, i: number) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 space-y-3 hover:bg-white/[0.04] transition-all"
                        >
                          <ContentSection
                            label={`Tweet ${i + 1}`}
                            content={tweet}
                            copyLabel={`Tweet ${i + 1}`}
                            isTweet
                            tweetIndex={i + 1}
                            tweetTotal={content.tweets.length}
                          />
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <span className={`text-[10px] font-black ${tweet.length > 240 ? "text-red-400" : "text-white/20"}`}>
                              {tweet.length} / 280 Characters
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Strategy & Support Column */}
                <div className="space-y-8">
                  {content.cta && (
                    <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Call to Action</span>
                         <CopyButton text={content.cta} label="CTA" size="xs" />
                      </div>
                      <p className="text-sm text-white/90 font-medium leading-relaxed italic">"{content.cta}"</p>
                    </div>
                  )}

                  {platform === "instagram" && content.hashtags && (
                    <ContentSection label="Viral Hashtags" content={content.hashtags} copyLabel="Hashtags" isHashtags />
                  )}
                  
                  {platform === "youtube" && content.title && (
                    <ContentSection label="Optimized Video Title" content={content.title} copyLabel="Title" />
                  )}

                  {platform === "linkedin" && content.visualBriefs && Array.isArray(content.visualBriefs) && content.visualBriefs.length > 0 && (
                    <div className="space-y-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Visual Storytelling Outline</span>
                       <div className="space-y-2">
                          {content.visualBriefs.map((brief: string, i: number) => (
                             <div key={i} className="flex gap-3 text-xs text-white/60 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                                <span className="font-bold text-emerald-400">Slide {i+1}</span>
                                <p>{brief}</p>
                             </div>
                          ))}
                       </div>
                    </div>
                  )}

                  {repurposedText && (
                    <div className="p-5 rounded-2xl glass-panel-premium border-cyan-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">AI Adaptation</span>
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
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
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
  const [multiVariation, setMultiVariation] = useState(false);
  const [styleMode, setStyleMode] = useState(false);
  const lastSubmittedValues = useRef<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  
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
      return res.json();
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
  
  const generationsUsed = isFreeUser ? (sub?.generationsUsed ?? 0) : (sub?.monthlyGenerationsUsed ?? 0);
  const generationLimit = sub?.generationLimit ?? 3;
  
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
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && (data.niche || data.tonePreference || data.platformPreference)) {
          setSavedPrefs(data);
        }
      })
      .catch(() => null);
    })();
  }, []);

  const generateMutation = useGenerateContent({
    mutation: {
      onSuccess: (data) => {
        setGeneratedContent(data);
        setIsFavorited(false);
        setGenerationBlockedMsg(null);
        const count = incrementGenCount();
        if (checkShouldShowRating(count)) {
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
          }
        } catch {}
        try {
          const backupKey = "generation_count_backup";
          const current = parseInt(localStorage.getItem(backupKey) ?? "0", 10);
          localStorage.setItem(backupKey, String(current + 1));
        } catch {}
      },
      onError: (error: any) => {
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
        const is5xx = (error?.status ?? 0) >= 500 || errorMsg.includes("503") || errorMsg.includes("ai temporarily unavailable") || errorMsg.includes("network");

        if (is5xx && retryCount < 3) {
          toast({
            variant: "destructive",
            title: "AI Overloaded",
            description: "The AI is currently experiencing high load. Would you like to retry?",
            action: (
              <ToastAction altText="Retry" onClick={() => {
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
            ? "Our AI is temporarily overloaded. Please try again in a moment."
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
        setRegeneratingPlatform(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Regeneration failed" });
        setRegeneratingPlatform(null);
      }
    }
  });

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
    
    (async () => {
      try {
        const token = await getToken();
        const r = await fetch("/api/content/analyze", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
          },
          body: JSON.stringify({ idea, niche, contentType, platforms }),
        });
        const data = r.ok ? await r.json() : null;
        if (data && typeof data.viralityScore === "number") {
          setContentAnalysis(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setAnalysisLoading(false);
      }
    })();
  }, [generatedContent?.id]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      idea: prefillIdea,
      contentType: prefillType,
      tone: prefillTone,
      niche: "General",
      language: "English",
    }
  });

  const currentIdea = form.watch("idea");
  const currentNiche = form.watch("niche");

  useEffect(() => {
    if (!currentIdea || currentIdea.length <= 20) {
      setHookScore(null);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setIsScoringHook(true);
      try {
        const { data } = await api.post("/hook-scorer/score", {
          hook: currentIdea,
          platform: "Instagram",
          niche: currentNiche || "General"
        });
        setHookScore(data);
      } catch (e) {
        console.error("Hook score failed", e);
      } finally {
        setIsScoringHook(false);
      }
    }, 1200);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [currentIdea, currentNiche]);

  // Load language from preferences API instead of localStorage
  useEffect(() => {
    (async () => {
      const token = await getToken();
      fetch("/api/settings/preferences", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }).then(r => r.json()).then(data => {
        if (data.languagePreference) form.setValue("language", data.languagePreference);
      }).catch(() => {});
    })();
  }, []);

  useEffect(() => {
    if (autoGenerate && prefillIdea) {
      generateMutation.mutate({ data: { idea: prefillIdea, contentType: prefillType, tone: prefillTone } });
    }
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
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
      }).catch(() => {});
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
    
    const mutationData = { data: { ...rest, idea: ideaWithNiche } } as any;
    lastSubmittedValues.current = mutationData;
    generateMutation.mutate(mutationData);
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
        contentType: generatedContent.contentType as any,
        tone: generatedContent.tone as any,
        language: form.getValues().language as any,
        platform
      }
    });
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

  const isLoading = generateMutation.isPending;
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
          <span className="text-white/50">{generationLimit} monthly</span>
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
      className="pb-24 relative overflow-x-hidden min-h-screen"
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
                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Generate Content</h1>
              </div>
              <p className="text-white/40 font-medium max-w-lg mx-auto">Transform one idea into a high-authority content ecosystem across four platforms, instantly.</p>
           </motion.div>


        </div>

        {/* Studio Core Input Engine */}
        <div className="max-w-4xl mx-auto space-y-12">
          
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
            className="p-1.5 rounded-[48px] bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl relative"
          >
            <div className="bg-[#0c0d12]/90 backdrop-blur-3xl rounded-[44px] p-8 space-y-10">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-600 border border-cyan-400/30 shadow-lg shadow-cyan-600/20">
                 <Sparkles className="w-3.5 h-3.5 text-white" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">Growth Engine Active</span>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                  <FormField
                    control={form.control}
                    name="idea"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between px-2 mb-4">
                           <FormLabel className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Your Content Vision</FormLabel>
                           <UsageCounter />
                        </div>
                        <FormControl>
                          <div className="relative group">
                            <Textarea
                              {...field}
                              placeholder="e.g. 5 ways AI is replacing junior developers — and what to do about it..."
                              className="min-h-[120px] md:min-h-[180px] p-6 md:p-8 rounded-[32px] bg-black/40 border-white/5 focus:border-cyan-500/40 text-base md:text-xl font-medium text-white placeholder:text-white/10 resize-none transition-all shadow-inner ring-0 focus:ring-0 leading-relaxed"
                            />
                            <div className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 text-[10px] text-white/20 font-black uppercase tracking-widest border border-white/5">
                               <Activity className="w-3.5 h-3.5 text-cyan-500/50" />
                               Trending
                            </div>
                            {isScoringHook && (
                               <div className="absolute top-6 right-6 flex items-center gap-2 text-xs font-bold text-white/40">
                                 <Loader2 className="w-4 h-4 animate-spin" /> Scoring...
                               </div>
                            )}
                          </div>
                        </FormControl>
                        <AnimatePresence mode="wait">
                          {hookScore && currentIdea && currentIdea.length > 20 && !isScoringHook && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="mt-6 overflow-hidden rounded-[2.5rem] bg-zinc-900/80 border border-white/5 backdrop-blur-3xl shadow-2xl"
                            >
                              <div className="p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-6">
                                      <div className={`relative group`}>
                                         <div className={`absolute -inset-1 rounded-2xl blur opacity-30 group-hover:opacity-50 transition ${
                                           hookScore.grade === 'S' ? 'bg-amber-500' :
                                           hookScore.grade === 'A' ? 'bg-emerald-500' :
                                           hookScore.grade === 'B' ? 'bg-cyan-500' :
                                           'bg-amber-400'
                                         }`} />
                                         <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center font-black text-3xl italic shadow-2xl ${
                                           hookScore.grade === 'S' ? 'bg-amber-500 text-black' :
                                           hookScore.grade === 'A' ? 'bg-emerald-500 text-black' :
                                           hookScore.grade === 'B' ? 'bg-cyan-500 text-black' :
                                           'bg-zinc-800 text-white'
                                         }`}>
                                           {hookScore.grade}
                                         </div>
                                      </div>
                                      <div>
                                         <div className="flex items-center gap-3">
                                            <span className="text-3xl font-black text-white tracking-tighter">{hookScore.score}</span>
                                            <span className="text-zinc-500 font-bold text-sm">/ 100</span>
                                         </div>
                                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{hookScore.hookType}</p>
                                      </div>
                                   </div>
                                   
                                   <div className="flex gap-2">
                                      {hookScore.patternMatches?.map((m: string) => (
                                         <span key={m} className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">{m}</span>
                                      ))}
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {hookScore.mainIssue && (
                                      <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex gap-4 items-start group/issue hover:bg-amber-500/10 transition-colors">
                                         <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                         <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/50">Intelligence Insight</p>
                                            <p className="text-sm font-bold text-amber-200/80 leading-relaxed">{hookScore.mainIssue}</p>
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
                                        className="p-6 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/10 flex gap-4 items-start text-left group/fix hover:bg-cyan-500/10 transition-all active:scale-95"
                                      >
                                         <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 group-hover/fix:scale-125 transition-transform" />
                                         <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/50">Suggested Optimization</p>
                                            <p className="text-sm font-bold text-cyan-100 italic leading-relaxed">"{hookScore.quickFix}"</p>
                                            <p className="text-[9px] font-black text-cyan-400/30 uppercase mt-2">Click to copy</p>
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

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                      <FormField
                        control={form.control}
                        name="niche"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Niche</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                                  <SelectValue placeholder="Niche" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-panel-premium border-white/10">
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
                            <FormLabel className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Style</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                                  <SelectValue placeholder="Style" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-panel-premium border-white/10">
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
                            <FormLabel className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Tone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                                  <SelectValue placeholder="Tone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="glass-panel-premium border-white/10">
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
                            <FormLabel className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Language</FormLabel>
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

                    <div className="pt-4">
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 md:h-16 rounded-[24px] bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-base shadow-2xl shadow-cyan-500/30 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 group overflow-hidden relative"
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
                             <span className="tracking-widest uppercase">Generate High-Authority Campaign</span>
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
              key="generated-content"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12 pt-12"
            >
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
                  <PlatformCard
                    key={platform}
                    platform={platform}
                    content={generatedContent.content?.[platform]}
                    onRegenerate={() => handleRegenerate(platform)}
                    isRegenerating={regeneratingPlatform === platform}
                    index={i}
                  />
                ))}
              </div>

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

                {/* Viral Pack Upsell */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-[40px] border border-cyan-500/20 p-10 relative overflow-hidden group shadow-2xl"
                  style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(124,58,237,0.05) 100%)" }}
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-[120px] rounded-full group-hover:bg-cyan-500/15 transition-all duration-1000" />
                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 h-full">
                     <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-2xl backdrop-blur-md">📦</div>
                     <div className="flex-1 text-center md:text-left space-y-3">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none">Unlock Content Pack</h3>
                        <p className="text-sm text-white/45 leading-relaxed font-medium">
                          Convert this vision into Reel Scripts, Cinematic prompts, and LinkedIn Authority slides in one click.
                        </p>
                        <a
                          href={`/pack?idea=${encodeURIComponent(generatedContent?.idea ?? "")}`}
                          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm transition-all shadow-xl shadow-cyan-600/30 group-hover:scale-105 active:scale-95"
                        >
                          <Crown className="w-4 h-4 fill-white" />
                          Generate Media Pack
                        </a>
                     </div>
                  </div>
                </motion.div>
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
