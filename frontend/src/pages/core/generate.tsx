import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import {
  Loader2, Copy, RefreshCw, Check, Sparkles, Linkedin, Twitter, X,
  Download, Hash, Zap, MessageCircle, Film, ChevronDown, ChevronUp, Crown, Heart,
  TrendingUp, Users, BarChart2, Activity, Brain, Flame, Lock, Wand2
} from "lucide-react";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { FeedbackModal, checkShouldShowRating, checkShouldShowFeedback, incrementGenCount } from "@/components/modals/FeedbackModal";
import { useAuth } from "@clerk/react";
import { WeeklyReportCard } from "@/components/shared/WeeklyReportCard";

const FIRST_NAMES = ["Liam", "Noah", "Oliver", "Elijah", "James", "William", "Benjamin", "Lucas", "Henry", "Alexander", "Mason", "Michael", "Ethan", "Daniel", "Jacob", "Logan", "Jackson", "Levi", "Sebastian", "Mateo", "Jack", "Owen", "Theodore", "Aiden", "Samuel", "Joseph", "John", "David", "Wyatt", "Matthew", "Luke", "Asher", "Carter", "Julian", "Grayson", "Leo", "Jayden", "Gabriel", "Isaac", "Lincoln", "Anthony", "Hudson", "Dylan", "Ezra", "Thomas", "Charles", "Christopher", "Jaxon", "Maverick", "Josiah", "Isaiah", "Andrew", "Elias", "Joshua", "Nathan", "Caleb", "Ryan", "Adrian", "Miles", "Eli", "Olivia", "Emma", "Charlotte", "Amelia", "Ava", "Sophia", "Isabella", "Mia", "Evelyn", "Harper", "Luna", "Camila", "Gianna", "Elizabeth", "Eleanor", "Ella", "Abigail", "Sofia", "Avery", "Scarlett", "Emily", "Aria", "Penelope", "Chloe", "Layla", "Mila", "Nora", "Hazel", "Madison", "Ellie", "Lily", "Nova", "Isla", "Grace", "Violet", "Aurora", "Riley", "Zoey", "Willow", "Emilia", "Stella", "Zoe", "Victoria", "Hannah", "Addison", "Lucy", "Eliana", "Ivy", "Everly", "Priya", "Rahul", "Aisha", "Sneha", "Vikram", "Meera", "Devon", "Marcus", "Karan", "Rohan", "Ananya", "Riya", "Arjun", "Neha", "Fatima", "Ali", "Omar", "Hassan", "Yusuf"];
const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PLATFORMS = [
  { name: "Instagram", color: "text-pink-400" },
  { name: "Twitter", color: "text-blue-400" },
  { name: "LinkedIn", color: "text-sky-400" },
  { name: "YouTube", color: "text-red-400" }
] as const;
const ACTIONS = {
  "Instagram": ["generated a Viral post", "generated a Story post", "generated Viral hooks", "created visual briefs", "generated a reel script", "crafted Instagram content"],
  "Twitter": ["created a Twitter thread", "built a 7-tweet thread", "generated industry insights", "crafted a viral tweet", "wrote a witty reply thread"],
  "LinkedIn": ["generated Business content", "created Educational content", "wrote a professional post", "generated networking outreach", "shared a startup journey"],
  "YouTube": ["created a YouTube script", "generated video hooks", "created a video description", "built a viral shorts script"]
};

function generateLiveItem() {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastInitial = LAST_INITIALS[Math.floor(Math.random() * LAST_INITIALS.length)];
  const name = `${firstName} ${lastInitial}.`;
  
  const platformObj = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
  const platform = platformObj.name;
  const platformActions = ACTIONS[platform as keyof typeof ACTIONS];
  const action = platformActions[Math.floor(Math.random() * platformActions.length)];
  const time = `${Math.floor(Math.random() * 15) + 1}s ago`;
  const color = platformObj.color;
  
  return { name, action, platform, time, color };
}

function LiveActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visibleItems, setVisibleItems] = useState([generateLiveItem(), generateLiveItem(), generateLiveItem()]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleItems(prev => [prev[1], prev[2], generateLiveItem()]);
      setIdx(i => i + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-6 overflow-hidden bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-full px-4 py-2 w-full max-w-full">
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 hidden sm:inline-block">Live</span>
      </div>
      
      <div className="flex items-center gap-8 overflow-hidden w-full">
        {visibleItems.map((item, i) => (
          <motion.div
            key={`${idx}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className={`flex items-center gap-1.5 text-[11px] whitespace-nowrap min-w-fit
              ${i > 0 ? "hidden md:flex" : "flex"}
              ${i > 1 ? "hidden lg:flex" : ""}
            `}
          >
            <span className="font-semibold text-white/70">{item.name}</span>
            <span className="text-white/40">{item.action}</span>
            <span className={`font-semibold ${item.color}`}>· {item.platform}</span>
            <span className="text-white/20">· {item.time}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AnimatedOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="orb-1 absolute top-[10%] right-[5%] w-[380px] h-[380px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)" }} />
      <div className="orb-2 absolute bottom-[15%] left-[3%] w-[300px] h-[300px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }} />
      <div className="orb-3 absolute top-[50%] left-[40%] w-[250px] h-[250px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.08) 0%, transparent 70%)" }} />
    </div>
  );
}

function ContentScoreBadge({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 font-medium w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full score-bar ${color}`}
          style={{ "--score-width": `${score}%` } as any}
        />
      </div>
      <span className={`text-[11px] font-bold ${color.replace('bg-', 'text-')}`}>{score}</span>
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
  const [showWhy, setShowWhy] = useState(false);

  const directViralScore = data?.content?.viral_score;
  const directFeedback = data?.content?.viral_feedback;
  const directSuggestion = data?.content?.viral_suggestion;

  const scores = analysis
    ? [
        { label: "Virality", score: analysis.viralityScore, color: "bg-red-400" },
        { label: "Hook Strength", score: analysis.hookStrength, color: "bg-pink-400" },
        { label: "Engagement", score: analysis.engagementPotential, color: "bg-cyan-400" },
        { label: "Shareability", score: analysis.shareability, color: "bg-emerald-400" },
      ]
    : [
        { label: "Virality", score: directViralScore ?? (78 + Math.floor(Math.random() * 18)), color: "bg-red-400" },
        { label: "Hook Strength", score: 80 + Math.floor(Math.random() * 16), color: "bg-pink-400" },
        { label: "Engagement", score: 75 + Math.floor(Math.random() * 20), color: "bg-cyan-400" },
        { label: "Shareability", score: 72 + Math.floor(Math.random() * 18), color: "bg-emerald-400" },
      ];

  const avg = analysis?.viralityScore ?? directViralScore ?? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);

  return (
    <motion.div
      id="tour-viral-score"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-white/8 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white/60">
              {analysisLoading ? "Analyzing content..." : "AI Content Score"}
            </span>
            {analysisLoading && (
              <div className="w-3 h-3 border border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`text-xl font-bold ${avg >= 85 ? 'text-emerald-400' : avg >= 75 ? 'text-cyan-400' : 'text-amber-400'}`}>{avg}</div>
            <div className="text-[10px] text-white/25 font-medium">/100</div>
          </div>
        </div>
        
        {/* Pro Tip Box below Viral Score */}
        {directSuggestion && (
          <div className="mb-4 rounded-lg px-3 py-2.5" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.18)" }}>
            <p className="text-[10px] font-bold text-cyan-300/70 uppercase tracking-widest mb-1">💡 Pro Tip</p>
            <p className="text-xs text-white/60 leading-relaxed">{directSuggestion}</p>
          </div>
        )}

        <div className="space-y-2.5">
          {scores.map(s => (
            <ContentScoreBadge key={s.label} score={s.score} label={s.label} color={s.color} />
          ))}
        </div>
      </div>

      {(analysis || directFeedback) && (
        <div className="border-t border-white/6">
          <button
            onClick={() => setShowWhy(!showWhy)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-white/40 hover:text-white/70 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-400 transition-colors" />
              <span className="font-semibold">Why this works</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showWhy && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                  {directFeedback && !analysis ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="text-red-400">🔥</span> Viral Feedback
                      </p>
                      <p className="text-xs text-white/65 leading-relaxed">{directFeedback}</p>
                    </div>
                  ) : null}
                  {analysis && (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="text-red-400">❤️</span> Emotional Trigger
                        </p>
                        <p className="text-xs text-white/65 leading-relaxed">{analysis.emotionalTrigger}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="text-amber-400">🧠</span> Curiosity Gap
                        </p>
                        <p className="text-xs text-white/65 leading-relaxed">{analysis.curiosityGap}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="text-cyan-400">👥</span> Audience Reaction
                        </p>
                        <p className="text-xs text-white/65 leading-relaxed">{analysis.targetAudienceReaction}</p>
                      </div>
                      {analysis.improvementTip && (
                        <div className="rounded-lg px-3 py-2.5 mt-1"
                          style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.18)" }}>
                          <p className="text-[10px] font-bold text-cyan-300/70 uppercase tracking-widest mb-1">💡 Pro Tip</p>
                          <p className="text-xs text-white/60 leading-relaxed">{analysis.improvementTip}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
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

const LANGUAGES = ["English", "Hindi", "Hinglish", "Bengali", "Spanish", "French", "German", "Marathi", "Tamil", "Telugu"] as const;

const formSchema = z.object({
  idea: z.string().min(5, "Idea must be at least 5 characters"),
  contentType: z.enum(["Educational", "Story", "Viral"]),
  tone: z.enum(["Casual", "Professional", "Aggressive"]),
  niche: z.enum(NICHES).default("General"),
  language: z.enum(LANGUAGES).default("English"),
});

type Platform = "instagram" | "youtube" | "twitter" | "linkedin";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "xs";
}

function CopyButton({ text, label, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
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

function ContentSection({ label, labelColor = "text-white/40", content, copyLabel, isHashtags, isTweet, tweetIndex, tweetTotal }: SectionProps) {
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
        className={`text-sm leading-relaxed whitespace-pre-wrap
        ${isHashtags ? "text-cyan-400/90 font-medium text-xs leading-loose" : "text-white/85"}
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
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;
  const fullText = buildPlatformText(platform, content);

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
          <CopyButton text={fullText} label={config.label} />
          
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
            <DropdownMenuContent align="end" className="w-48 bg-[#100726]/90 backdrop-blur-xl border-cyan-500/30 z-[100]">
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
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-4">
              {platform === "instagram" && content && (
                <>
                  {content.hook && (
                    <ContentSection label="Hook" labelColor="text-pink-400/60" content={content.hook} copyLabel="Hook" />
                  )}
                  {content.caption && (
                    <ContentSection label="Caption" labelColor="text-white/40" content={content.caption} copyLabel="Caption" />
                  )}
                  {content.cta && (
                    <ContentSection label="Call to Action" labelColor="text-orange-400/60" content={content.cta} copyLabel="CTA" />
                  )}
                  {content.visualBriefs && Array.isArray(content.visualBriefs) && content.visualBriefs.length > 0 && (
                    <ContentSection 
                      label="Slide-by-Slide Visual Briefs" 
                      labelColor="text-emerald-400/60" 
                      content={content.visualBriefs.join("\n")} 
                      copyLabel="Briefs" 
                    />
                  )}
                  {content.hashtags && (
                    <ContentSection label="Hashtags" labelColor="text-cyan-400/60" content={content.hashtags} copyLabel="Hashtags" isHashtags />
                  )}
                </>
              )}

              {platform === "youtube" && content && (
                <>
                  {content.hook && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/60">Hook (First 3 Seconds)</span>
                        <CopyButton text={content.hook} label="Hook" size="xs" />
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-white font-semibold text-sm leading-relaxed">
                        {content.hook}
                      </div>
                    </div>
                  )}
                  {content.title && (
                    <ContentSection label="Suggested Title" labelColor="text-white/40" content={content.title} copyLabel="Title" />
                  )}
                  {content.script && (
                    <ContentSection label="Full Script" labelColor="text-white/40" content={content.script} copyLabel="Script" />
                  )}
                </>
              )}

              {platform === "twitter" && Array.isArray(content?.tweets) && content.tweets.length > 0 && (
                <div className="space-y-3">
                  {content.tweets.map((tweet: string, i: number) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 space-y-2"
                    >
                      <ContentSection
                        label="Tweet"
                        content={tweet}
                        copyLabel={`Tweet ${i + 1}`}
                        isTweet
                        tweetIndex={i + 1}
                        tweetTotal={content.tweets.length}
                      />
                      <div className="flex items-center justify-between pt-0.5">
                        <span className={`text-[10px] font-mono ${tweet.length > 240 ? "text-red-400" : "text-white/20"}`}>
                          {tweet.length}/280
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {platform === "linkedin" && content && (
                <>
                  {content.headline && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400/60">Opening Hook</span>
                        <CopyButton text={content.headline} label="Headline" size="xs" />
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-white font-semibold text-sm leading-relaxed">
                        {content.headline}
                      </div>
                    </div>
                  )}
                  {content.post && (
                    <ContentSection label="Post Body" labelColor="text-white/40" content={content.post} copyLabel="Post Body" />
                  )}
                  {content.cta && (
                    <ContentSection label="Call to Action" labelColor="text-blue-400/60" content={content.cta} copyLabel="CTA" />
                  )}
                  {content.visualBriefs && Array.isArray(content.visualBriefs) && content.visualBriefs.length > 0 && (
                    <ContentSection 
                      label="Slide-by-Slide Visual Briefs" 
                      labelColor="text-emerald-400/60" 
                      content={content.visualBriefs.join("\n")} 
                      copyLabel="Briefs" 
                    />
                  )}
                  {content.hashtags && (
                    <ContentSection label="Hashtags" labelColor="text-cyan-400/60" content={content.hashtags} copyLabel="Hashtags" isHashtags />
                  )}
                </>
              )}

              {repurposedText && (
                <div className="mt-4 border-t border-cyan-500/20 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Repurposed Content</span>
                    <CopyButton text={repurposedText} label="Repurposed Content" size="xs" />
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
                    {repurposedText}
                  </div>
                </div>
              )}
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
  const [isFavorited, setIsFavorited] = useState(false);
  
  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ["trend-sidebar", "General"],
    queryFn: async () => {
      const res = await fetch("/api/trends/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  const [showPostGenNudge, setShowPostGenNudge] = useState(false);
  const { toast } = useToast();
  const { data: sub, refetch: refetchSub } = useSubscriptionStatus();
  const [, navigate] = useLocation();

  const isFreeUser = sub && sub.planType === "free" && sub.plan === "free";
  const isStarterUser = sub && sub.planType === "starter" && (sub.plan === "active" || sub.plan === "trial");
  const isCreatorUser = sub && sub.planType === "creator" && (sub.plan === "active" || sub.plan === "trial");
  const isInfinityUser = sub && sub.planType === "infinity" && (sub.plan === "active" || sub.plan === "trial");
  
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
    fetch("/api/settings/preferences")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && (data.niche || data.tonePreference || data.platformPreference)) {
          setSavedPrefs(data);
        }
      })
      .catch(() => null);
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
        refetchSub();
        try {
          const nudgeDismissed = sessionStorage.getItem("postGenNudgeDismissed");
          const nudgeShown = sessionStorage.getItem("postGenNudgeShown");
          if (!nudgeDismissed && !nudgeShown && sub && sub.plan === "free" && !showUpgradeModal) {
            sessionStorage.setItem("postGenNudgeShown", "1");
            setShowPostGenNudge(true);
          }
        } catch {}
        try {
          const backupKey = "generation_count_backup";
          const current = parseInt(localStorage.getItem(backupKey) ?? "0", 10);
          localStorage.setItem(backupKey, String(current + 1));
        } catch {}
      },
      onError: (error: any) => {
        if (error?.status === 402 || error?.data?.error === "upgrade_required") {
          const plan = error?.data?.plan;
          const reason = plan === "trial" ? "expired" : "limit";
          setUpgradeReason(reason);
          setShowUpgradeModal(true);
          const msg = error?.data?.message;
          setGenerationBlockedMsg(msg || "You've reached your generation limit. Upgrade to continue.");
          refetchSub();
          if (checkShouldShowFeedback()) {
            setTimeout(() => { setRatingTrigger("limit-hit"); setShowRatingModal(true); }, 2500);
          }
          return;
        }
        setGenerationBlockedMsg(null);
        const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
        const is5xx = (error?.status ?? 0) >= 500;
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
      language: (typeof window !== "undefined" ? localStorage.getItem("languagePreference") : "English") as any || "English",
    }
  });

  useEffect(() => {
    if (autoGenerate && prefillIdea) {
      generateMutation.mutate({ data: { idea: prefillIdea, contentType: prefillType, tone: prefillTone } });
    }
  }, []);

  function onSubmit(values: z.infer<typeof formSchema>) {
    typeof window !== "undefined" && localStorage.setItem("languagePreference", values.language);
    
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
    
    generateMutation.mutate({ data: { ...rest, idea: ideaWithNiche } } as any);
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
      const method = isFavorited ? "DELETE" : "POST";
      await fetch(`/api/favorites/${generatedContent.id}`, { method });
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
    const limit = sub.generationLimit ?? 20;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold"
      >
        <span className={generationsUsed >= limit && !isInfinityUser ? "text-red-400" : generationsUsed >= 300 && isInfinityUser ? "text-amber-400" : "text-cyan-300"}>
          {generationsUsed}
        </span>
        <span className="text-white/30">/</span>
        <span className="text-white/50">{isInfinityUser ? "∞ / 300 soft limit" : `${limit} / mo`}</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6 pb-16 relative"
    >
      <AnimatedOrbs />
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
        featureName={proFeatureName}
        targetPlan={upgradeReason === "pro_feature" ? "infinity" : "starter"}
      />
      <FeedbackModal open={showRatingModal} onClose={() => setShowRatingModal(false)} trigger={ratingTrigger} />

      <div className="relative z-10">
        <div className="flex flex-row items-center justify-between w-full mb-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">Generate Content</h1>
            <p className="text-white/45 text-xs md:text-sm mt-0.5">One idea → four platforms, fully optimized.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <UsageCounter />
            {[
              { icon: Flame, label: "Hot Now", value: "Viral hooks", color: "text-orange-400" },
              { icon: TrendingUp, label: "Trending", value: "+18% reach", color: "text-emerald-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/8 bg-white/[0.03]"
              >
                <Icon className={`w-3 h-3 ${color}`} />
                <div>
                  <div className={`text-[10px] font-bold ${color}`}>{value}</div>
                  <div className="text-[9px] text-white/25">{label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 bg-[rgba(0,242,255,0.03)] border border-[#00F2FF]/15 rounded-xl p-3.5 mb-6 max-w-4xl shadow-[0_0_20px_rgba(0,242,255,0.03)] backdrop-blur-md">
          <Wand2 className="w-4 h-4 text-[#00F2FF] shrink-0 mt-0.5" />
          <p className="text-xs md:text-sm text-white/70 leading-relaxed">
            <strong className="text-[#00F2FF] font-semibold">How it works:</strong> Type a single idea or topic below. GrowFlow AI will instantly architect it into a viral Instagram Carousel, an engaging Twitter Thread, a professional LinkedIn Post, and a script for YouTube Shorts—simultaneously formatted and ready to post.
          </p>
        </div>

        <div className="w-full mt-2 mb-4">
          <LiveActivityTicker />
        </div>

        {savedPrefs && (savedPrefs.niche || savedPrefs.tonePreference || savedPrefs.platformPreference) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/8 text-[11px] text-cyan-300/80 font-medium"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            Based on your previous content style
            {savedPrefs.niche && <span className="text-cyan-300/60">· {savedPrefs.niche}</span>}
            {savedPrefs.tonePreference && <span className="text-cyan-300/60">· {savedPrefs.tonePreference}</span>}
          </motion.div>
        )}

        <div className="h-px bg-gradient-to-r from-cyan-500/30 via-teal-500/20 to-transparent mt-3" />
      </div>

      <WeeklyReportCard />

      <div className="relative z-10 w-full mb-6">
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-3">Quick Start Templates</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((t, i) => (
            <motion.button
              key={t.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleTemplate(t)}
              className="text-left px-3 py-2.5 rounded-xl border border-white/8 hover:border-cyan-500/30 bg-white/[0.02] hover:bg-cyan-500/8 transition-all duration-200 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-600/5 group-hover:to-transparent transition-all duration-300" />
              <div className="relative">
                <div className="text-base mb-0.5">{t.icon}</div>
                <div className="text-xs font-semibold text-white/75 group-hover:text-white leading-tight">{t.label}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{t.contentType} · {t.tone}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showMidLimitWarning && (
          <motion.div
            key="mid-limit-warning"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-amber-200 font-semibold text-sm leading-tight">You're about to reach your free limit</p>
                  <p className="text-amber-300/60 text-xs mt-0.5 truncate">1 generation remaining — upgrade for unlimited access</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-cyan-900/40 transition-transform hover:scale-[1.03] active:scale-[0.99]"
                  onClick={() => { setUpgradeReason("limit"); setShowUpgradeModal(true); }}
                >
                  Get 100 generations for ₹299
                </Button>
                <button
                  onClick={() => setWarningDismissed(true)}
                  className="text-amber-400/40 hover:text-amber-400/70 transition-colors p-1"
                  aria-label="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfinitySoftWarning && (
          <motion.div
            key="infinity-soft-warning"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-5 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-amber-200 font-semibold text-sm leading-tight">High volume traffic detected</p>
                  <p className="text-amber-300/60 text-xs mt-0.5">You've passed the 300 fair usage limit, but your generations will still process.</p>
                </div>
              </div>
              <button
                onClick={() => setWarningDismissed(true)}
                className="text-amber-400/40 hover:text-amber-400/70 transition-colors p-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLimited && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-5 py-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-cyan-200 font-semibold text-sm">
                You've reached your free limit
              </p>
              <p className="text-cyan-300/60 text-xs mt-0.5">
                You've used all 5 free monthly generations. Upgrade to continue.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs shrink-0 shadow-lg shadow-cyan-900/40 transition-transform hover:scale-[1.03] active:scale-[0.99]"
            onClick={() => { setUpgradeReason("limit"); setShowUpgradeModal(true); }}
          >
            <Crown className="w-4 h-4 mr-2" /> Upgrade Now
          </Button>
        </motion.div>
      )}

      <div className="relative z-10 w-full mb-8">
      <div
        className="w-full rounded-2xl border border-cyan-500/15 p-5 md:p-6 lg:p-8 xl:px-12 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(255,255,255,0.03) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(124,58,237,0.08)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="idea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70 text-sm font-medium">Your idea or topic</FormLabel>
                  <FormControl>
                    <div className="relative w-full">
                      <Textarea
                        id="tour-input"
                        placeholder="e.g. 5 ways AI is replacing junior developers — and what to do about it..."
                        className="resize-none min-h-[140px] pt-4 pb-16 px-5 bg-slate-900/30 backdrop-blur-md border border-white/10 focus-visible:ring-teal-500/40 focus-visible:border-teal-500 text-white placeholder:text-white/25 text-base lg:text-lg rounded-2xl transition-all duration-200"
                        {...field}
                      />
                      <div className="absolute bottom-3 right-3 flex justify-end">
                        {isLimited ? (
                          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-sky-600 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition duration-500"></div>
                            <Button
                              type="button"
                              onClick={() => { setUpgradeReason("limit"); setShowUpgradeModal(true); }}
                              className="relative bg-gradient-to-r from-cyan-600/80 to-teal-600/80 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white font-bold rounded-xl text-sm px-5 py-2 sm:px-6 sm:py-2.5 shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all duration-300"
                            >
                              <Crown className="w-4 h-4 mr-2" /> Unlock Full Power
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-pink-500 rounded-xl blur-md opacity-40 group-hover:opacity-100 transition duration-500 group-hover:animate-pulse"></div>
                            <Button
                              type="submit"
                              disabled={isLoading}
                              className="relative bg-gradient-to-r from-cyan-600/90 to-teal-600/90 backdrop-blur-xl border border-white/20 hover:border-white/40 text-white font-bold rounded-xl text-sm px-5 py-2 sm:px-6 sm:py-2.5 shadow-lg transition-all duration-300"
                            >
                              {isLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                              ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> Generate Campaign</>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="niche"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-sm font-medium">Niche</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 backdrop-blur-md border border-white/10 text-white focus:ring-cyan-500/40 rounded-xl transition-colors hover:bg-white/10">
                          <SelectValue placeholder="Select niche" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f0a1e] border-white/10">
                        {NICHES.map(n => (
                          <SelectItem key={n} value={n} className="text-white/80 focus:text-white focus:bg-cyan-600/20">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-sm font-medium">Content Style</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 backdrop-blur-md border border-white/10 text-white focus:ring-cyan-500/40 rounded-xl transition-colors hover:bg-white/10">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f0a1e] border-white/10">
                        <SelectItem value="Educational" className="text-white/80 focus:text-white focus:bg-cyan-600/20">
                          <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-cyan-400" /> Educational</span>
                        </SelectItem>
                        <SelectItem value="Story" className="text-white/80 focus:text-white focus:bg-cyan-600/20">
                          <span className="flex items-center gap-2"><MessageCircle className="w-3.5 h-3.5 text-blue-400" /> Story / Personal</span>
                        </SelectItem>
                        <SelectItem value="Viral" className="text-white/80 focus:text-white focus:bg-cyan-600/20">
                          <span className="flex items-center gap-2"><Film className="w-3.5 h-3.5 text-pink-400" /> Viral / Controversial</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-sm font-medium">Tone of Voice</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/5 backdrop-blur-md border border-white/10 text-white focus:ring-cyan-500/40 rounded-xl transition-colors hover:bg-white/10">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f0a1e] border-white/10">
                        <SelectItem value="Casual" className="text-white/80 focus:text-white focus:bg-cyan-600/20">Casual & Approachable</SelectItem>
                        <SelectItem value="Professional" className="text-white/80 focus:text-white focus:bg-cyan-600/20">Professional & Authoritative</SelectItem>
                        <SelectItem value="Aggressive" className="text-white/80 focus:text-white focus:bg-cyan-600/20">Punchy & Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70 text-sm font-medium flex items-center gap-1.5">
                      Content Language
                      {field.value !== "English" && <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded-full">PRO</span>}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger id="tour-language" className="bg-white/5 backdrop-blur-md border border-white/10 text-white focus:ring-cyan-500/40 rounded-xl transition-colors hover:bg-white/10">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0f0a1e]/90 backdrop-blur-xl border-white/10">
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang} className="text-white/80 focus:text-white focus:bg-cyan-600/20">
                            <span className="flex items-center gap-2">
                              {lang === "Hindi" && <motion.svg animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }} viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-orange-400 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h18M5 19L5 5M19 19L19 5M9 14l2-2 2 2m-2-2v6" /></motion.svg>}
                              {lang === "Hinglish" && <motion.svg animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-pink-400 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></motion.svg>}
                              {lang === "Bengali" && <motion.svg animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-emerald-400 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 8a3 3 0 100-6 3 3 0 000 6zM8 8v12M16 11V8M16 11v9M16 11h-4" /></motion.svg>}
                              {lang === "English" && <motion.svg animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }} viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-blue-400 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></motion.svg>}
                              {lang === "Spanish" && <span className="text-xs">🇪🇸</span>}
                              {lang === "French" && <span className="text-xs">🇫🇷</span>}
                              {lang === "German" && <span className="text-xs">🇩🇪</span>}
                              {lang === "Marathi" && <span className="text-xs">🇮🇳</span>}
                              {lang === "Tamil" && <span className="text-xs">🇮🇳</span>}
                              {lang === "Telugu" && <span className="text-xs">🇮🇳</span>}
                              {lang === "Hindi" ? "Hindi (Devanagari)" : lang === "Hinglish" ? "Hinglish (GenZ)" : lang === "Marathi" ? "Marathi (मराठी)" : lang === "Tamil" ? "Tamil (தமிழ்)" : lang === "Telugu" ? "Telugu (తెలుగు)" : lang}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-xl border border-white/6 bg-white/[0.015] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Pro Features</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "viral", label: "Viral Mode", desc: "Max-engagement hooks", icon: "⚡" },
                  { id: "multi", label: "Multi-Variation", desc: "Generate 3 variations", icon: "🔀" },
                  { id: "style", label: "Style Modes", desc: "Bold, Story & more", icon: "🎨" },
                ] as const).map(({ id, label, desc, icon }) => {
                  const hasAdvancedFeatures = (sub?.planType === "creator" || sub?.planType === "infinity") && sub?.plan === "active";
                  const isOn = id === "viral" ? viralMode : id === "multi" ? multiVariation : id === "style" ? styleMode : false;
                  const btn = (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (!hasAdvancedFeatures) {
                          setProFeatureName(label);
                          setUpgradeReason("pro_feature");
                          setShowUpgradeModal(true);
                        } else {
                          if (id === "viral") setViralMode(v => !v);
                          if (id === "multi") setMultiVariation(v => !v);
                          if (id === "style") setStyleMode(v => !v);
                        }
                      }}
                      className={`relative text-left p-3 rounded-xl border transition-all duration-200 group w-full
                        ${hasAdvancedFeatures && isOn
                          ? "border-cyan-500/40 bg-cyan-500/10"
                          : "border-white/6 hover:border-cyan-500/20 hover:bg-cyan-500/5"
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-base">{icon}</span>
                        {!hasAdvancedFeatures ? (
                          <Lock className="w-3 h-3 text-cyan-500/60" />
                        ) : isOn ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 border border-cyan-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                        )}
                      </div>
                      <div className="text-xs font-semibold text-white/70">{label}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{desc}</div>
                    </button>
                  );
                  if (!hasAdvancedFeatures) {
                    return (
                      <Tooltip key={id}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="bg-[#1a0d3d] border border-cyan-500/30 text-cyan-200 text-xs px-2.5 py-1.5"
                        >
                          Available in Creator Plan
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return btn;
                })}
              </div>
            </div>

            <AnimatePresence>
              {generationBlockedMsg && (
                <motion.div
                  key="blocked-inline"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 mb-3">
                    <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-red-300 text-sm font-medium leading-snug">{generationBlockedMsg}</p>
                      <button
                        type="button"
                        onClick={() => { setUpgradeReason("limit"); setShowUpgradeModal(true); }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline mt-1 transition-colors"
                      >
                        Upgrade now to continue
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGenerationBlockedMsg(null)}
                      className="text-red-400/40 hover:text-red-400/70 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Form>
      </div>
      </div>

      <div className="relative z-10">
      <AnimatePresence mode="wait">
        {isLoading && !generatedContent && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={loadingMsgIdx}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm text-white/55 font-medium"
                >
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {platforms.map((p, i) => {
              const config = PLATFORM_CONFIG[p];
              return (
                <div
                  key={p}
                  className="rounded-2xl border border-white/6 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className={`h-0.5 bg-gradient-to-r ${config.accentColor} opacity-40`} />
                  <div className={`flex items-center gap-2.5 px-5 py-3.5 ${config.bgColor} border-b border-white/5`}>
                    <div className="w-4 h-4 rounded bg-white/10 animate-pulse" />
                    <div className="h-3.5 w-24 rounded bg-white/8 animate-pulse" />
                  </div>
                  <div className="px-5 py-5 space-y-4">
                    {[100, 80, 60, 90].map((w, j) => (
                      <div key={j} className={`h-3 w-[${w}%] rounded bg-white/5 animate-pulse`} style={{ width: `${w}%`, animationDelay: `${j * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          </motion.div>
        )}

        {generatedContent && !isLoading && (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 px-4 py-3"
              style={{ background: "rgba(124,58,237,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-white/60 font-medium">Campaign ready</span>
                <span className="text-xs text-white/30 hidden sm:block">·</span>
                <span className="text-xs text-white/35 hidden sm:block truncate max-w-[180px]">"{generatedContent.idea}"</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAll}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200
                    ${copiedAll
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10 hover:border-white/20"
                    }`}
                >
                  {copiedAll ? <><Check className="w-3 h-3" /> All Copied!</> : <><Copy className="w-3 h-3" /> Copy All</>}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200"
                >
                  <Download className="w-3 h-3" /> Download .txt
                </button>
                <button
                  onClick={handleFavoriteToggle}
                  disabled={favoriteLoading}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
                    isFavorited
                      ? "bg-pink-500/15 text-pink-400 border-pink-500/30"
                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10 hover:border-white/20"
                  }`}
                >
                  {favoriteLoading
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Heart className={`w-3 h-3 transition-all ${isFavorited ? "fill-pink-400" : ""}`} />
                  }
                  {isFavorited ? "Saved" : "Save"}
                </button>
              </div>
            </motion.div>

            <AnimatePresence>
              {showPostGenNudge && !showUpgradeModal && (
                <motion.div
                  key="post-gen-nudge"
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <p className="text-xs text-white/65 truncate">
                        Imagine generating 10x more content like this...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setUpgradeReason("limit"); setShowUpgradeModal(true); }}
                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
                      >
                        Unlock Full Power
                      </button>
                      <button
                        onClick={() => {
                          setShowPostGenNudge(false);
                          try { sessionStorage.setItem("postGenNudgeDismissed", "1"); } catch {}
                        }}
                        className="text-white/25 hover:text-white/50 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
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
            </motion.div>

            <CampaignScorePanel data={generatedContent} analysis={contentAnalysis} analysisLoading={analysisLoading} />

            {/* Social SEO Area */}
            {((generatedContent.content?.seo_keywords?.length > 0) || (generatedContent.content?.hashtags?.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-xl border border-white/8 p-5"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white/80">Social SEO</h3>
                </div>
                
                {Array.isArray(generatedContent.content?.seo_keywords) && generatedContent.content.seo_keywords.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedContent.content.seo_keywords.map((kw: string, i: number) => (
                        <div key={i} className="flex items-center">
                          <span className="px-2 py-1 rounded-l-md bg-white/5 border border-white/10 border-r-0 text-xs text-white/70">
                            {kw}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(kw);
                            }}
                            className="px-2 py-1 rounded-r-md bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-white/50 hover:text-white transition-colors"
                            aria-label="Copy keyword"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {Array.isArray(generatedContent.content?.hashtags) && generatedContent.content.hashtags.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold mb-2">Hashtags</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedContent.content.hashtags.map((ht: string, i: number) => (
                        <div key={i} className="flex items-center">
                          <span className="px-2 py-1 rounded-l-md bg-white/5 border border-white/10 border-r-0 text-xs text-cyan-400/90 font-medium">
                            {ht.startsWith('#') ? ht : `#${ht}`}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(ht.startsWith('#') ? ht : `#${ht}`);
                            }}
                            className="px-2 py-1 rounded-r-md bg-white/10 hover:bg-white/20 border border-white/10 text-xs text-white/50 hover:text-white transition-colors"
                            aria-label="Copy hashtag"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <CopyButton 
                        text={generatedContent.content.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(" ")} 
                        label="Copy All Hashtags" 
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Micro-copy: preview hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-xs text-white/25 italic"
            >
              This is just a preview of what you can do.
            </motion.p>

            {/* Upgrade trigger — only for non-infinity users */}
            {sub && sub.planType !== "infinity" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.5, ease: "easeOut" }}
                className="relative rounded-2xl overflow-hidden border border-cyan-500/25"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(168,85,247,0.06) 50%, rgba(10,5,30,0.95) 100%)",
                }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-[-40%] left-[20%] w-[60%] h-[60%] bg-cyan-600/15 blur-[70px] rounded-full" />
                </div>
                <div className="relative z-10 p-6 flex flex-col sm:flex-row items-center gap-5">
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-lg font-bold text-white mb-1">
                      🔥 Want 10x more content like this?
                    </p>
                    <p className="text-sm text-white/45 leading-relaxed">
                      Unlock unlimited generations, viral hooks, and advanced AI tools.
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <Button
                      onClick={() => { setUpgradeReason("limit"); setShowUpgradeModal(true); }}
                      className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-full px-7 py-2.5 shadow-xl shadow-cyan-900/50 border border-cyan-500/20 transition-all hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap"
                    >
                      <Zap className="w-4 h-4 mr-2" /> Unlock Full Power
                    </Button>
                    <span className="text-[10px] text-white/25">No credit card · Cancel anytime</span>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/8 to-teal-500/6 p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-lg shrink-0">📦</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80">Want Reel Script + Carousel + LinkedIn too?</p>
                <p className="text-xs text-white/40 mt-0.5">Content Pack generates all 5 formats from one idea</p>
              </div>
              <a
                href={`/pack?idea=${encodeURIComponent(generatedContent?.idea ?? "")}`}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all"
              >
                <Crown className="w-3.5 h-3.5" /> Try Pack
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
