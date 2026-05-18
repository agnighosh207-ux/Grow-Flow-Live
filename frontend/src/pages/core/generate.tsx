import React, { useState, useEffect, useRef, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

import {
  Sparkles, RefreshCw, Copy, Zap, Share2, Loader2, Flame, Activity, Check, Download,
  Hash, Wand2, X, ChevronDown, ChevronUp, Crown, Users, Info, Lock, 
  GitBranch, Trophy, CalendarDays, PenTool, Linkedin, Lightbulb, 
  Target, Rocket, Brain, BarChart3, PieChart, Shield, ShieldCheck, 
  ExternalLink, Zap as ZapIcon, Menu, Plus, Minus, Search, 
  Filter, Play, Settings, Save, MoreHorizontal, MoreVertical, Edit2, 
  Eye, EyeOff, Send, Mail, Github, Twitter, Facebook, ArrowLeft,
  ArrowRight as ArrowRightIcon
} from "lucide-react";
import { haptic } from "@/lib/utils";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { FeedbackModal, checkShouldShowRating, checkShouldShowFeedback, incrementGenCount } from "@/components/modals/FeedbackModal";
import { CreditWallet } from "@/components/shared/CreditWallet";
import { useAuth, useUser } from "@clerk/react";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { api } from "@/lib/api-client";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkShouldShowNPS } from "@/components/modals/NPSModal";
import { ContentPackCard } from "@/components/generate/ContentPackCard";
import { FeatureDiscoveryBanner } from "@/components/generate/FeatureDiscoveryBanner";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { track, identify } from "@/lib/analytics";
import DOMPurify from 'dompurify';

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
        style={{ background: "radial-gradient(circle, rgba(94,106,210,0.05) 0%, transparent 70%)" }} />
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.03) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-[10%] right-[20%] w-[700px] h-[700px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(94,106,210,0.02) 0%, transparent 70%)" }} />
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

function CopyBtn({ text, label, size = "default" }: Readonly<{ text: string; label?: string; size?: "default" | "xs" }>) {
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
}: Readonly<{
  icon: any;
  title: string;
  badge?: string;
  color: string;
  children?: React.ReactNode;
  locked?: boolean;
  lockedReason?: string;
}>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-3xl border ${locked ? "bg-white/[0.01] border-white/5" : "bg-white/[0.035] border-white/10 hover:border-white/15 transition-all shadow-xl"}`}
    >
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${locked ? "border-white/5" : "border-white/8"}`}>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-sm font-black tracking-tight uppercase ${locked ? "text-white/30" : "text-white/90"}`}>{title}</span>
        {badge && (
          <span className={`ml-auto text-[9px] px-2.5 py-1 rounded-lg border font-black tracking-widest uppercase ${locked ? "bg-white/4 text-white/20 border-white/8" : "bg-[#5E6AD2]/12 text-[#8B91E3] border-[rgba(94,106,210,0.2)]"}`}>
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

function ABTestResults({ result }: Readonly<{ result: any }>) {
  if (!result) return null;
  const getWinnerConfig = (winner: string) => {
    if (winner === 'A') return { 
      bg: 'bg-indigo-950/20 border-indigo-500/30', 
      iconBg: 'bg-indigo-500/20 text-indigo-400', 
      label: "Variant A Wins" 
    };
    if (winner === 'B') return { 
      bg: 'bg-[rgba(94,106,210,0.20)] border-[rgba(94,106,210,0.3)]', 
      iconBg: 'bg-[rgba(94,106,210,0.15)] text-[#8B91E3]', 
      label: "Variant B Wins" 
    };
    return { 
      bg: 'bg-zinc-900/40 border-white/10', 
      iconBg: 'bg-zinc-500/20 text-zinc-400', 
      label: "Statistical Deadlock" 
    };
  };
  const config = getWinnerConfig(result.prediction.winner);

  return (
    <div className="space-y-12">
      <div className={`p-10 rounded-[3rem] border shadow-2xl flex flex-col lg:flex-row items-center gap-12 ${config.bg}`}>
         <div className={`p-8 rounded-[2rem] ${config.iconBg}`}>
           {result.prediction.winner === 'too_close' ? <GitBranch className="w-16 h-16" /> : <Trophy className="w-16 h-16" />}
         </div>
         <div className="flex-1 space-y-4 text-center lg:text-left">
            <h3 className="text-4xl font-black text-white tracking-tight">
              {config.label}
            </h3>
            <p className="text-lg font-medium text-white/60 leading-relaxed">{result.prediction.reasoning}</p>
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
         <SectionCard icon={Users} title={`Variant B: ${result.versionB.audienceTarget}`} color="bg-[rgba(94,106,210,0.1)] text-[#8B91E3]">
            <p className="text-xl font-black text-white leading-tight mb-6 italic">"{result.versionB.hook}"</p>
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
               <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Strength</span>
               <span className="text-sm font-black text-[#8B91E3]">{result.versionB.predictedStrength}</span>
            </div>
         </SectionCard>
      </div>
    </div>
  );
}

function AbDuelView({ idea, niche, tone, onResult, result }: Readonly<{ idea: string; niche: string; tone: string; onResult: (r: any) => void; result: any }>) {
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
      <div className="space-y-6">
        <ABTestResults result={result} />
        <Button variant="ghost" onClick={() => onResult(null)} className="text-white/40 hover:text-white uppercase text-[10px] font-black tracking-widest w-full">
           New Duel
        </Button>
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
          <Input placeholder="e.g. Agency owners" value={audienceA} onChange={(e) => setAudienceA(e.target.value)} className="h-14 rounded-2xl bg-black/40 border-white/10 text-white" />
        </div>
        <div className="space-y-3 text-left">
          <Label className="text-[10px] font-black uppercase tracking-widest text-[#8B91E3] ml-1">Audience B</Label>
          <Input placeholder="e.g. Freelance designers" value={audienceB} onChange={(e) => setAudienceB(e.target.value)} className="h-14 rounded-2xl bg-black/40 border-white/10 text-white" />
        </div>
      </div>
      <Button onClick={handleDuel} disabled={loading || !audienceA || !audienceB} style={{ background: '#5E6AD2', height: '64px' }} className="px-12 text-white font-black rounded-2xl text-lg w-full transition-all hover:opacity-90">
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
    if (content?.isBatch) return content.strategy?.coreMessage;
    return content?.content?.instagram?.hook || content?.content?.twitter?.hook || content?.idea;
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
          <Button onClick={() => scoreHook(getHook())} disabled={loading} style={{ background: '#5E6AD2', height: '64px' }}
            className="px-12 text-white font-black rounded-2xl text-lg w-full transition-all hover:opacity-90">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Analyze Psychological Impact"}
          </Button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Psych Score</span>
                <span className="text-4xl font-black text-[#8B91E3]">{score.score}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${score.score}%` }} className="h-full" style={{ background: '#5E6AD2', boxShadow: '0 0 12px rgba(94,106,210,0.4)' }} />
              </div>
              <div className="p-5 rounded-2xl bg-[rgba(94,106,210,0.05)] border border-[rgba(94,106,210,0.1)]">
                <span className="text-[10px] font-black text-[#8B91E3] uppercase tracking-widest block mb-2">Patterns Detected</span>
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
                <div className="p-6 rounded-2xl bg-[rgba(94,106,210,0.05)] border border-[rgba(94,106,210,0.1)]">
                  <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-4 h-4 text-[#8B91E3]" />
                      <span className="text-[10px] font-black text-[#8B91E3] uppercase tracking-widest">Quick Fix</span>
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

const ContentScoreBadge = React.memo(function ContentScoreBadge({ score, label, color, delay = 0 }: { score: number; label: string; color: string; delay?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 overflow-hidden w-full">
      <span className="text-[10px] font-black uppercase tracking-widest truncate flex-shrink-0 max-w-[45%]"
        style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.5, delay, ease: "circOut" }}
            className={`h-full rounded-full ${color}`}
          />
        </div>
        <span className="text-xs font-black flex-shrink-0" style={{ color: '#8B91E3' }}>
          {score}%
        </span>
      </div>
    </div>
  );
});

const CampaignScorePanel = React.memo(function CampaignScorePanel({ data, analysis, analysisLoading }: Readonly<{ data: any; analysis?: ContentAnalysis | null; analysisLoading?: boolean }>) {
  const { toast } = useToast();
  const directViralScore = data?.content?.viral_score;

  const scores = useMemo(() => {
    const normalizeScore = (val: number): number => {
      if (!val || isNaN(val)) return 0;
      // If score is between 0-1, convert to 0-100
      return val <= 1 ? Math.round(val * 100) : Math.round(val);
    };

    const hookStrengthRaw = analysis?.hookStrength ?? data?.content?.hook_strength ?? 82;
    const engagementRaw = analysis?.engagementPotential ?? data?.content?.engagement_potential ?? 78;
    const shareabilityRaw = analysis?.shareability ?? data?.content?.shareability ?? 74;
    const viralityRaw = analysis?.viralityScore ?? directViralScore ?? 80;

    return [
      { label: "Virality", score: normalizeScore(viralityRaw), color: "bg-rose-500" },
      { label: "Hook Strength", score: normalizeScore(hookStrengthRaw), color: "bg-[#5E6AD2]" },
      { label: "Engagement", score: normalizeScore(engagementRaw), color: "bg-indigo-500" },
      { label: "Shareability", score: normalizeScore(shareabilityRaw), color: "bg-indigo-600" },
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
    if (data.twitter?.tweets) items.push({ platform: "Twitter", content: data.twitter.tweets.join("\n\n"), idea: data.idea });
    if (data.youtube) items.push({ platform: "YouTube", content: data.youtube.script, idea: data.idea });
    return items;
  };

  const handleExportBuffer = () => {
    const items = getExportItems();
    const headers = ["Schedule Date", "Platform", "Content", "Status"];
    const rows = items.map((item, idx) => {
      const d = new Date(); d.setDate(d.getDate() + idx);
      return [`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`, item.platform, `"${item.content.replaceAll('"', '""')}"`, "draft"].join(",");
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
      return `BEGIN:VEVENT\nDTSTART:${formatDate(d)}\nSUMMARY:Post on ${item.platform}\nDESCRIPTION:${item.content.replaceAll("\n", "\\n")}\nEND:VEVENT`;
    }), "END:VCALENDAR"].join("\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "growflow-schedule.ics"; a.click();
    toast({ title: "Calendar Exported", description: "Import the .ics file to Google Calendar." });
  };

  const handleCopyNotion = () => {
    const items = getExportItems();
    const tsv = ["Platform\tContent\tStatus", ...items.map(item => `${item.platform}\t${item.content.replaceAll("\n", " ")}\tDraft`)].join("\n");
    navigator.clipboard.writeText(tsv);
    toast({ title: "Copied for Notion", description: "Paste this into any Notion database." });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Viral Potential Analytics</h4>
        
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-none pb-2 md:pb-0">
          <Button variant="ghost" size="sm" onClick={handleExportBuffer} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white flex-shrink-0 whitespace-nowrap">
            <Download className="w-3 h-3 mr-2" /> Buffer CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportGCal} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white flex-shrink-0 whitespace-nowrap">
            <CalendarDays className="w-3 h-3 mr-2" /> GCal (.ics)
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyNotion} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white flex-shrink-0 whitespace-nowrap">
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
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden"
        >
          <p className="text-[10px] text-white/50 font-black uppercase tracking-widest flex items-center gap-2 break-words leading-relaxed">
            <Lightbulb className="w-3 h-3 text-amber-400" /> Strategy to increase your score:
          </p>
          <ul className="text-xs text-white/40 mt-2 space-y-1.5 font-medium">
            {avg < 60 && <li className="flex items-start gap-2 text-sm" style={{ wordBreak: 'break-word' }}><span className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0" /> Add a stronger visceral hook in the first 5 words</li>}
            {avg < 75 && <li className="flex items-start gap-2 text-sm" style={{ wordBreak: 'break-word' }}><span className="w-1 h-1 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Include a high-friction Call to Action (e.g. "Save this")</li>}
            {avg < 85 && <li className="flex items-start gap-2 text-sm" style={{ wordBreak: 'break-word' }}><span className="w-1 h-1 rounded-full bg-[#5E6AD2] mt-1.5 shrink-0" /> Use more emotional, low-entropy language</li>}
          </ul>
        </motion.div>
      )}
    </div>
  );
});

const ViralScoreMeter = React.memo(function ViralScoreMeter({ score }: { score: number }) {
  const displayScore = score <= 1 ? Math.round(score * 100) : Math.round(score);
  const getLevelConfig = (s: number) => {
    if (s >= 80) return { label: "🔥 Viral Potential", color: "text-indigo-400", ring: "border-indigo-500/30" };
    if (s >= 60) return { label: "⚡ Strong Content",  color: "text-[#8B91E3]",    ring: "border-[rgba(94,106,210,0.3)]" };
    if (s >= 40) return { label: "📈 Good Foundation", color: "text-amber-400",    ring: "border-amber-500/30" };
    return { label: "💡 Needs Polish",    color: "text-white/50",     ring: "border-white/10" };
  };
  const level = getLevelConfig(displayScore);
  return (
    <div className={`relative flex items-center justify-center w-20 h-20 rounded-full border-4 ${level.ring} bg-black/40 shadow-lg`}>
      <motion.span
        className={`text-2xl font-bold ${level.color}`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
      >
        {displayScore}
      </motion.span>
      <span className="absolute -bottom-6 text-[10px] font-bold text-center whitespace-nowrap tracking-widest uppercase opacity-40">{level.label}</span>
    </div>
  );
});

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
          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
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

function ContentSection({ label, labelColor = "text-[#8B91E3]/60", content, copyLabel, isHashtags, isTweet, tweetIndex, tweetTotal }: Readonly<SectionProps>) {
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
        ${isHashtags ? "font-medium text-xs leading-loose flex flex-wrap gap-x-2" : "text-white/85"}
      `}
        style={isHashtags ? { color: "rgba(139,145,227,0.85)" } : {}}
      >
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
    icon: X,
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
  readonly platform: Platform;
  readonly content: any;
  readonly onRegenerate: () => void;
  readonly isRegenerating: boolean;
  readonly index: number;
  readonly tone?: string;
  readonly niche?: string;
  readonly language?: string;
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
        content.cta && `\nCTA:\n${content.cta}`,
        content.hashtags && `\n${content.hashtags}`,
      ].filter(Boolean).join("\n");
    default:
      return "";
  }
}

const PlatformCard = React.memo(function PlatformCard({ platform, content, onRegenerate, isRegenerating, index, tone, niche, language }: Readonly<PlatformCardProps>) {
  const [expanded, setExpanded] = useState(true);
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [repurposedText, setRepurposedText] = useState<string | null>(null);
  const { toast } = useToast();
  
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
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Content downloaded!" });
  };

  const repurposeAbortController = useRef<AbortController | null>(null);

  const handleRepurpose = async (targetFormat: string) => {
    let targetFormatName = "YouTube Script";
    if (targetFormat === "Convert to Thread") {
      targetFormatName = "Twitter Thread";
    } else if (targetFormat === "Convert to LinkedIn") {
      targetFormatName = "LinkedIn Post";
    } else if (targetFormat === "Convert to Script") {
      targetFormatName = "YouTube Script";
    }

    if (!fullText || fullText.length < 50) {
      toast({ variant: "destructive", title: "Content too short to repurpose. Minimum 50 characters required." });
      return;
    }

    if (repurposeAbortController.current) {
      repurposeAbortController.current.abort();
    }
    
    repurposeAbortController.current = new AbortController();
    setIsRepurposing(true);
    setRepurposedText(null);
    try {
      const token = await (globalThis as any).Clerk?.session?.getToken();
      const res = await fetch("/api/repurpose", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sourceContent: fullText,
          sourceFormat: platform,
          targetFormats: [targetFormatName],
          tone: tone || "Professional",
          niche: niche || "General",
          language: language || "English",
        }),
        signal: repurposeAbortController.current.signal
      });
      if (!res.ok) throw new Error("Failed to repurpose content");
      const data = await res.json();
      const repurposedContent = data.repurposed?.[targetFormatName]?.content || data.result;
      setRepurposedText(repurposedContent);
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
            <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#8B91E3' }} />
            <div className="absolute inset-0 blur-xl bg-[rgba(94,106,210,0.20)] animate-pulse" />
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
               <div className={`w-2 h-2 rounded-full animate-pulse ${content.viralScores[platform] >= 85 ? 'bg-emerald-400' : 'bg-[#5E6AD2]'}`} />
               <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Viral Score:</span>
               <span className={`text-xs font-black ${content.viralScores[platform] >= 85 ? 'text-emerald-400' : 'text-[#8B91E3]'}`}>{content.viralScores[platform]}%</span>
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
                <Button 
                  disabled={isRepurposing} 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 px-4 text-xs font-black text-[#8B91E3]/80 hover:text-[#8B91E3] bg-[#5E6AD2]/10 border border-[rgba(94,106,210,0.4)]/20 hover:border-[rgba(94,106,210,0.4)]/40 rounded-xl transition-all shadow-glow-sm"
                >
                  {isRepurposing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  {isRepurposing ? "CONVERTING..." : "REPURPOSE"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 glass-panel-premium border-[rgba(94,106,210,0.4)]/20 z-[100] p-2 shadow-2xl">
                {["Convert to Thread", "Convert to LinkedIn", "Convert to Script"].map((format) => (
                  <DropdownMenuItem 
                    key={format}
                    onClick={() => handleRepurpose(format)} 
                    className="text-xs text-white/70 hover:text-white cursor-pointer focus:bg-[#5E6AD2]/20 p-3 rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 mr-3 text-[#8B91E3]" /> {format}
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
                <div className="space-y-10">
                  {platform === "instagram" && content && (
                    <>
                      {content.hook && (
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-400">Tactical Hook</span>
                              <CopyButton text={content.hook} label="Hook" size="xs" />
                           </div>
                           <div className="p-6 md:p-8 rounded-3xl bg-pink-500/5 border border-pink-500/10 text-white font-black text-xl md:text-2xl leading-tight shadow-xl relative overflow-hidden group/hook break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                           <div className="p-6 md:p-8 rounded-3xl bg-red-500/5 border border-red-500/10 text-white font-black text-xl md:text-2xl leading-tight shadow-xl relative overflow-hidden group/hook break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                          <div className="bg-blue-500/5 border border-blue-500/10 rounded-3xl p-6 md:p-8 text-white font-black text-xl md:text-2xl leading-tight shadow-xl relative overflow-hidden group/hook break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
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
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5E6AD2]/[0.02] rounded-full blur-3xl pointer-events-none" />
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
                                className={`h-full transition-colors duration-500 ${tweet.length > 240 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-[#5E6AD2]/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]"}`}
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

                <div className="space-y-12">
                  {content.cta && (
                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      className="p-6 rounded-2xl space-y-3 border shadow-md relative overflow-hidden group/cta"
                      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between relative z-10">
                         <span className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: '#8B91E3' }}>Final Conversion CTA</span>
                         <CopyButton text={content.cta} label="CTA" size="xs" />
                      </div>
                      <p className="text-sm text-white/90 font-medium leading-relaxed italic relative z-10 break-words [overflow-wrap:anywhere]">"{content.cta}"</p>
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
                    <div className="p-8 rounded-3xl glass-panel-premium border-[rgba(94,106,210,0.4)]/20 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#8B91E3]">AI Adaptation</span>
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
});

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

function handleGenerateError(error: any, retryCount: number, setRetryCount: (v: any) => void, toast: any, mutation: any, lastValues: any) {
  const isOffline = typeof globalThis !== "undefined" && !globalThis.navigator.onLine;
  const errorMsg = (error?.message || error?.data?.message || "").toLowerCase();
  const is5xx = (error?.status ?? 0) >= 500 || error?.status === 429 || errorMsg.includes("503") || errorMsg.includes("ai_overloaded") || errorMsg.includes("ai temporarily unavailable") || errorMsg.includes("network");

  if (is5xx && retryCount < 3) {
    const nextAttempt = retryCount + 1;
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 2s, 4s, 8s

    toast({
      variant: "destructive",
      title: `AI Overloaded (Attempt ${nextAttempt}/3)`,
      description: `AI is temporarily under high load. Retrying automatically in ${delay / 1000} seconds...`,
      action: (
        <ToastAction altText="Retry Now" onClick={() => {
          if (mutation.isPending) return;
          setRetryCount((prev: number) => prev + 1);
          if (lastValues.current) {
            mutation.mutate(lastValues.current);
          }
        }}>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Now</span>
          </div>
        </ToastAction>
      )
    });

    setTimeout(() => {
      // Verify we aren't already pending or have started a new generation
      if (lastValues.current && !mutation.isPending) {
        setRetryCount(nextAttempt);
        mutation.mutate(lastValues.current);
      }
    }, delay);

    return;
  }

  if (is5xx && retryCount >= 3) {
    toast({
      variant: "destructive",
      title: "System Busy",
      description: "All retry attempts exhausted. Your credits have not been deducted. Please try again in a few minutes.",
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
            Check <a href="https://status.growflowai.space" target="_blank" rel="noreferrer" className="text-[#8B91E3] underline">status.growflowai.space</a> for real-time availability.
          </p>
        </div>
      )
      : "Something went wrong. Please try again.",
  });
}

export default function Generate() {
  usePageTitle("AI Content Studio");
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { prefillIdea, prefillType, prefillTone, autoGenerate } = useMemo(() => {
    const rawSearch = typeof globalThis !== "undefined" ? globalThis.location.search : "";
    const searchParams = new URLSearchParams(rawSearch);
    
    const sanitizeValue = (key: string) => {
      const val = searchParams.get(key);
      if (!val) return "";
      return DOMPurify.sanitize(val, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    };
    
    const pIdea = sanitizeValue("idea");
    const rType = sanitizeValue("contentType");
    const pType = (["Educational", "Story", "Viral"].includes(rType) ? rType : "Educational") as any;
    const rTone = sanitizeValue("tone");
    const pTone = (["Casual", "Professional", "Aggressive"].includes(rTone) ? rTone : "Professional") as any;
    const auto = searchParams.get("auto") === "1";
    
    return { prefillIdea: pIdea, prefillType: pType, prefillTone: pTone, autoGenerate: auto };
  }, []);

  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [regeneratingPlatform, setRegeneratingPlatform] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hookScore, setHookScore] = useState<any>(null);
  const [isScoringHook, setIsScoringHook] = useState(false);
  const [viralMode, setViralMode] = useState(false);
  const [styleMode, setStyleMode] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [generationBlockedMsg, setGenerationBlockedMsg] = useState<string>('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [npsTrigger, setNpsTrigger] = useState<string | null>(null);
  const [showNPS, setShowNPS] = useState(false);
  const [showPostGenUpsell, setShowPostGenUpsell] = useState(false);
  const [ratingTrigger, setRatingTrigger] = useState<string>("gen-3");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<"limit" | "expired" | "blocked" | "pro_feature" | "upgrade">("limit");
  const [proFeatureName, setProFeatureName] = useState("");
  const [activeResultTab, setActiveResultTab] = useState("campaign");
  const [abTestResult, setAbTestResult] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const lastSubmittedValues = useRef<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activePlatform, setActivePlatform] = useState<Platform>("instagram");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      idea: prefillIdea,
      contentType: prefillType,
      tone: prefillTone,
      niche: "General",
      language: typeof globalThis !== "undefined" ? DOMPurify.sanitize(localStorage.getItem("preferred_language") ?? "English") : "English",
    }
  });
  
  useQuery({
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
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState<{ niche: string | null; tonePreference: string | null; platformPreference: string | null } | null>(null);
  const prefsLoadedRef = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  
  useEffect(() => {
    if (generatedContent && !batchLoading) {
      globalThis.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [generatedContent, batchLoading]);
  const { toast } = useToast();
  const { data: sub } = useSubscriptionStatus();
  const [, setLocation] = useLocation();
  const cannotGenerate = sub?.plan === "free" && sub?.hasUsedTrial;

  const isFreeUser = !sub || (sub.planType === "free" && sub.plan === "free") || sub.plan === "blocked";

  const displayCredits = sub?.planType === "infinity" || sub?.isUnlimited
    ? "∞" 
    : (sub?.generationsRemaining ?? 0);
    
  const displayLimit = sub?.planType === "infinity" || sub?.isUnlimited
    ? "∞"
    : sub?.generationLimit ?? 5;

  const generationsUsed = sub?.monthlyGenerationsUsed ?? 0;
  const generationLimit = sub?.generationLimit ?? (isFreeUser ? 5 : 25);
  const showMidLimitWarning = isFreeUser && (generationLimit - generationsUsed) === 1;

  const isFirstTime = typeof sessionStorage !== "undefined" && !sessionStorage.getItem("has_generated") && !localStorage.getItem("has_generated");

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
  
  useEffect(() => {
    if (!sub) return;
    if (sub.planType === "free" && sub.plan === "free") {
      const used = sub.monthlyGenerationsUsed ?? 0;
      const backupKey = "generation_count_backup";
      try {
        const stored = Number.parseInt(localStorage.getItem(backupKey) ?? "0", 10);
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

  useEffect(() => {
    try {
      const last = localStorage.getItem("gf_last_settings");
      const templateFill = localStorage.getItem("gf_template_fill");
      const quickIdea = localStorage.getItem('quick_idea');
      
      if (last) {
        const s = JSON.parse(last);
        form.reset({ ...form.getValues(), ...s });
      }

      if (templateFill) {
        form.setValue("idea", templateFill);
        localStorage.removeItem("gf_template_fill");
      }

      if (quickIdea) {
        form.setValue('idea', quickIdea);
        localStorage.removeItem('quick_idea');
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
        setGenerationBlockedMsg('');
        
        // Auto-scroll to results
        setTimeout(() => {
          globalThis.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
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
          const current = Number.parseInt(localStorage.getItem(backupKey) ?? "0", 10);
          localStorage.setItem(backupKey, String(current + 1));
        } catch {}
      },
      onError: (error: any) => {
        track("generation_failed", {
          error: error?.message || error?.data?.message,
          status: error?.status,
          plan: sub?.planType
        });

        if (error?.status === 400 || error?.data?.error === "invalid_input") {
          toast({
            variant: "destructive",
            title: "Quality Filter Alert",
            description: error?.data?.message || "Please provide a more specific and constructive content idea (at least 5 characters).",
          });
          return;
        }

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
        setGenerationBlockedMsg('');
        handleGenerateError(error, retryCount, setRetryCount, toast, generateMutation, lastSubmittedValues);
      }
    }
  });

  const variationMutation = useGenerateVariations({
    mutation: {
      onSuccess: (data: any) => {
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

  useEffect(() => {
    (async () => {
      const token = await getToken();
      fetch("/api/settings/preferences", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      }).then(async (r) => {
        if (!r.ok) return;
        const text = await r.text();
        if (!text) return;
        const data = JSON.parse(text);
        if (data.languagePreference) form.setValue("language", data.languagePreference);
      }).catch(() => {
        // Silently fail preference loading
      });
    })();
  }, []);

  useEffect(() => {
    if (autoGenerate && prefillIdea) {
      generateMutation.mutate({ data: { idea: prefillIdea, contentType: prefillType, tone: prefillTone } });
    }
  }, []);

  const handleCopyAll = () => {
    if (!generatedContent) return;
    const txt = buildAllPlatformsText(generatedContent);
    navigator.clipboard.writeText(txt);
    setCopiedAll(true);
    toast({ title: "Campaign Copied!" });
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownload = async () => {
    if (!generatedContent) return;
    
    // Show loading
    toast({ title: "Preparing PDF...", description: "Opening print dialog..." });
    
    try {
      // Create a printable HTML document
      const campaignTitle = generatedContent.idea?.slice(0, 50) || 'Content Campaign';
      const date = new Date().toLocaleDateString('en-IN');
      
      const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>GrowFlow AI — ${campaignTitle}</title>
    <style>
      body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: white; max-width: 800px; margin: 0 auto; line-height: 1.6; }
      h1 { font-size: 26px; font-weight: 900; color: #0f172a; margin-bottom: 6px; }
      .brand { color: #5E6AD2; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 24px; display: flex; align-items: center; gap: 6px; }
      .meta { color: #64748b; font-size: 12px; margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
      .platform { margin-bottom: 40px; border-left: 4px solid #5E6AD2; padding-left: 20px; page-break-inside: avoid; }
      .platform-name { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #5E6AD2; margin-bottom: 12px; }
      .content { font-size: 14px; line-height: 1.7; white-space: pre-wrap; color: #334155; }
      .hashtags { font-size: 13px; color: #6366f1; margin-top: 12px; font-weight: 600; }
      .divider { border: none; border-top: 1px solid #f1f5f9; margin: 32px 0; }
      .footer { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      @media print { 
        body { padding: 20px; } 
        .platform { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="brand">✨ GrowFlow AI Content Campaign</div>
    <h1>${campaignTitle}</h1>
    <div class="meta">Generated on ${date} · Language: ${generatedContent.language || 'English'}</div>
    
    ${['instagram', 'youtube', 'twitter', 'linkedin'].map(platform => {
      const content = generatedContent.content?.[platform] || generatedContent.platforms?.[platform] || generatedContent[platform];
      if (!content) return '';
      const platformNames: Record<string, string> = {
        instagram: '📸 Instagram Caption',
        youtube: '▶️ YouTube Shorts Script',
        twitter: '𝕏 Twitter/X Thread',
        linkedin: '💼 LinkedIn Post'
      };
      
      let renderedContent = '';
      if (Array.isArray(content?.tweets)) {
        renderedContent = content.tweets.map((t: string, idx: number) => `[${idx + 1}/${content.tweets.length}] ${t}`).join('\n\n');
      } else {
        renderedContent = content?.caption || content?.script || content?.post || content?.thread || 
          (typeof content === 'string' ? content : JSON.stringify(content, null, 2));
      }

      return `
      <div class="platform">
        <div class="platform-name">${platformNames[platform] || platform}</div>
        <div class="content">${renderedContent}</div>
        ${content?.hashtags ? `<div class="hashtags">${typeof content.hashtags === 'string' ? content.hashtags : Array.isArray(content.hashtags) ? content.hashtags.join(' ') : ''}</div>` : ''}
      </div>
      <hr class="divider">`;
    }).join('')}
    
    <div class="footer">Created with GrowFlow AI · growflowai.space</div>
  </body>
  </html>`;
  
      // Open in a new window and print to PDF
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        // Fallback: download as HTML file (can be printed from browser)
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GrowFlow-Campaign-${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "HTML exported ✅", description: "Open the file and print to save as PDF" });
        return;
      }
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print();
        // Note: We can't close automatically as print dialog needs the window open
      }, 500);
      
      toast({ title: "PDF ready! ✅", description: "Use your browser's print dialog to save as PDF" });
      
    } catch (err) {
      // Fallback: plain text download
      const txt = buildAllPlatformsText(generatedContent);
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GrowFlow-Campaign.txt`;
      a.click();
      toast({ title: "Downloaded as text file" });
    }
  };

  const syncLanguagePreference = async (lang: string) => {
    const token = await getToken();
    try {
      await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ languagePreference: lang }),
      });
    } catch (err) {
      console.error("Failed to save language preference:", err);
      toast({ 
        variant: "destructive", 
        title: "Preference Sync Error", 
        description: "Your language choice couldn't be saved to your profile." 
      });
    }
  };

  const handleGenerate = async (values: z.infer<typeof formSchema>) => {
    if (generateMutation.isPending) return;
    
    await syncLanguagePreference(values.language);
    
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
      } catch (err) {
        toast({ variant: "destructive", title: "Batch generation failed" });
      } finally {
        setBatchLoading(false);
      }
    } else {
      generateMutation.mutate(mutationData as any);
    }
  }

  function handleTemplate(template: typeof TEMPLATES[number]) {
    form.setValue("idea", template.idea);
    form.setValue("contentType", template.contentType);
    form.setValue("tone", template.tone);
    form.setValue("niche", template.niche);
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

  const isLoading = generateMutation.isPending || variationMutation.isPending || batchLoading;
  const platforms: Platform[] = ["instagram", "youtube", "twitter", "linkedin"];

  function UsageCounter() {
    if (!sub) return null;
    const isExceeded = typeof displayCredits === "number" && typeof displayLimit === "number" && displayCredits <= 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold"
      >
        <span className={isExceeded ? "text-red-400" : "text-[#8B91E3]"}>
          {displayCredits}
        </span>
        <span className="text-white/30">/</span>
        <span className="text-white/50">{displayLimit} {t("credits")}</span>
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
        forceOpen={showGuide}
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

      {cannotGenerate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center 
          bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#0F0F1A] border border-red-500/20 rounded-3xl p-8 
            max-w-sm w-full text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-black text-white mb-2">Trial Ended</h2>
            <p className="text-white/50 text-sm mb-6">
              Your 3-day free trial has ended. Subscribe to continue generating 
              content. <strong className="text-white">No second trial</strong> — 
              payment is charged immediately.
            </p>
            <button onClick={() => setLocation("/pricing")}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 
                to-violet-500 text-white font-bold mb-3">
              Subscribe Now →
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 space-y-12">
        
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
            AI Content Studio
          </h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Turn one idea into high-performing content for every major platform in seconds.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          <FeatureDiscoveryBanner />
          
          {sub?.planType !== "infinity" && (
            <CreditWallet />
          )}
          
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-4">
               <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/5" />
               <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] whitespace-nowrap">Quick Start Blueprints</h3>
               <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/5" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEMPLATES.map((t, i) => (
                <motion.button
                  key={t.label}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTemplate(t)}
                  className="group relative p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col gap-3"
                  style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-500">{t.icon}</div>
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold text-white tracking-tight uppercase">{t.label}</h4>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(94,106,210,0.1)', color: '#8B91E3' }}>{t.contentType}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 md:p-8"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >

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
                              className="w-full resize-none text-sm leading-relaxed outline-none transition-all rounded-xl px-4 py-3"
                              style={{
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                minHeight: '80px',
                                maxHeight: '200px',
                              }}
                              onFocus={e => e.target.style.borderColor = '#5E6AD2'}
                              onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                          </div>
                        </FormControl>
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
                                <SelectTrigger className="h-11 rounded-xl transition-all" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
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
                                <SelectTrigger className="h-11 rounded-xl transition-all" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
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
                                <SelectTrigger className="h-11 rounded-xl transition-all" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
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
                              planType={sub?.planType}
                              regionalLanguageLock={sub?.regionalLanguageLock}
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
                    
                    <div className="sticky bottom-[72px] md:static z-20 pt-3 pb-2 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/95 to-transparent -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:pt-0 md:pb-0">
                        <Button
                          type="submit"
                          disabled={isLoading || !currentIdea?.trim()}
                          onClick={() => { haptic('medium'); }}
                          className="w-full h-12 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98] group relative overflow-hidden"
                          style={{ 
                            background: '#5E6AD2', 
                            color: 'white',
                            boxShadow: '0 4px 20px rgba(94,106,210,0.3)'
                          }}
                        >
                          {isLoading ? (
                            <div className="flex items-center gap-2">
                               <Loader2 className="w-4 h-4 animate-spin" />
                               <span>Architecting...</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                               <Zap className="w-4 h-4" />
                               <span className="tracking-wide uppercase">Generate Campaign</span>
                            </div>
                          )}
                        </Button>
                        {!currentIdea?.trim() && (
                          <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-disabled)' }}>
                            ↑ Enter your content idea to generate
                          </p>
                        )}
                    </div>
                  </div>
                </form>
              </Form>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 pt-12"
            >
              <div className="flex items-center justify-center gap-4 p-6 rounded-3xl bg-[#5E6AD2]/5 border border-[rgba(94,106,210,0.4)]/20 max-w-xl mx-auto">
                <Loader2 className="w-5 h-5 text-[#8B91E3] animate-spin" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMsgIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-sm font-black text-[#8B91E3] uppercase tracking-widest"
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
                <div className="sticky top-[64px] md:static bg-[#0A0A0F]/95 backdrop-blur-md z-30 -mx-4 px-4 py-2 md:mx-0 md:px-0 md:bg-transparent md:pt-0 md:pb-0">
                  <div className="flex justify-center w-full">
                    <TabsList className="p-1 rounded-xl w-full max-w-md" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <TabsTrigger value="campaign" className="flex-1 px-4 py-2 rounded-lg text-xs font-bold data-[state=active]:bg-[#5E6AD2] data-[state=active]:text-white">Full Campaign</TabsTrigger>
                      <TabsTrigger value="intelligence" className="flex-1 px-4 py-2 rounded-lg text-xs font-bold data-[state=active]:bg-[#5E6AD2] data-[state=active]:text-white">Hook Intel</TabsTrigger>
                      <TabsTrigger value="ab-test" className="flex-1 px-4 py-2 rounded-lg text-xs font-bold data-[state=active]:bg-[#5E6AD2] data-[state=active]:text-white">A/B Duel</TabsTrigger>
                    </TabsList>
                  </div>
                </div>

               <TabsContent value="campaign" className="space-y-12 outline-none">
                {generatedContent.isBatch ? (
                  <ContentPackCard result={generatedContent} onSave={() => toast({ title: "Saved to Bank" })} />
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
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2]-400 to-blue-500">Content Campaign</span>
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
                    <div className="flex flex-wrap items-center justify-between gap-6 p-6 rounded-2xl relative overflow-hidden group border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(94,106,210,0.1)', borderColor: 'rgba(94,106,210,0.2)' }}>
                           <Activity className="w-5 h-5 text-[#8B91E3]" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white leading-none tracking-tight">Campaign Fully Architected</h4>
                          <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-2" style={{ color: 'rgba(94,106,210,0.6)' }}>All Platforms Synchronized</p>
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
                          Export / Print
                        </button>
                      </div>
                    </div>

                    {/* Platform Results Tabs */}
                    <div id="generation-output" className="space-y-12">
                      <div className="relative group">
                        <div className="flex p-1 rounded-2xl border overflow-x-auto no-scrollbar" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                          {platforms.map((p) => {
                            const config = PLATFORM_CONFIG[p];
                            const Icon = config.icon;
                            const isActive = activePlatform === p;
                            return (
                              <button
                                key={p}
                                onClick={() => setActivePlatform(p)}
                                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-bold transition-all ${
                                  isActive 
                                    ? "bg-[#5E6AD2] text-white shadow-lg" 
                                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                                }`}
                              >
                                <Icon className={`w-4 h-4`} />
                                {config.label}
                              </button>
                            );
                          })}
                        </div>
                        {/* Mobile Scroll Indicators */}
                        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0A0A0F] to-transparent pointer-events-none md:hidden z-20" />
                        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0A0A0F] to-transparent pointer-events-none md:hidden z-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="space-y-12">
                        <PlatformCard
                          platform={activePlatform}
                          content={generatedContent.content?.[activePlatform]}
                          onRegenerate={() => handleRegenerate(activePlatform)}
                          isRegenerating={regeneratingPlatform === activePlatform}
                          index={0}
                          tone={generatedContent?.tone || form.watch("tone")}
                          niche={generatedContent?.niche || form.watch("niche")}
                          language={generatedContent?.language || form.watch("language")}
                        />

                        {isFreeUser && (
                          <p className="text-[10px] text-white/30 px-6 font-medium text-center">
                            Free plan includes GrowFlow watermark. <button className="text-[#8B91E3] underline font-black" onClick={() => { setUpgradeReason("upgrade"); setShowUpgradeModal(true); }}>Upgrade to remove it →</button>
                          </p>
                        )}
                      </div>
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
               <div className="w-32 h-32 rounded-full bg-[#5E6AD2]/5 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-2 border-[rgba(94,106,210,0.4)]/20 animate-ping" />
                  <div className="absolute inset-4 rounded-full border border-[rgba(94,106,210,0.4)]/30 animate-pulse" />
                  <Wand2 className="w-12 h-12 text-[#8B91E3]/40 relative z-10" />
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
                  <Button size="sm" variant="secondary" className="font-black px-6 rounded-xl" onClick={() => { setUpgradeReason("upgrade"); setShowUpgradeModal(true); }}>Upgrade</Button>
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
