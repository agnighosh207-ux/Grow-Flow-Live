import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Target, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight, Sparkles, TrendingUp, Search, Info, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageWrapper } from "@/components/shared/PageWrapper";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { useQueryClient } from "@tanstack/react-query";

interface ScoreResult {
  score: number;
  grade: string;
  hookType: string;
  patternMatches: string[];
  mainIssue: string | null;
  quickFix: string | null;
}

export default function HookScorerPage() {
  const [hook, setHook] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [niche, setNiche] = useState("Business");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [debouncing, setDebouncing] = useState(false);
  const { data: sub } = useSubscriptionStatus();
  const queryClient = useQueryClient();
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const performScore = async (val: string, plat: string, nic: string) => {
    if (val.length < 5) {
      setResult(null);
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await api.post("/hook-scorer/score", {
        hook: val,
        platform: plat,
        niche: nic
      });
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    } catch (err) {
      console.error("Scoring error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (hook.length >= 5) {
      setDebouncing(true);
      debounceTimer.current = setTimeout(() => {
        performScore(hook, platform, niche);
        setDebouncing(false);
      }, 800);
    } else {
      setDebouncing(false);
      setResult(null);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [hook, platform, niche]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]';
      case 'A': return 'text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]';
      case 'B': return 'text-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.4)]';
      case 'C': return 'text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]';
      default: return 'text-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.4)]';
    }
  };

  return (
    <PageWrapper maxWidth="xl" className="space-y-12 pb-32">
      <FeatureGuideBanner 
        toolKey="hook-scorer" 
        title="Hook Intelligence Scorer" 
        icon={<BarChart3 className="w-5 h-5 text-teal-400" />}
        tagline="Upload your hooks and get an instant psychological impact score before you post."
        whatYouGet={["Psychological score (1-100)", "Why it works/fails", "3 AI-suggested improvements"]}
        whenToUse="Use this when you have a hook idea but aren't sure if it will actually perform."
        proTip="Higher scores don't always mean more views, but they mean more resonance. Aim for 80+."
        planRequired="Creator"
      />
      
      <PageHeader 
        icon={<BarChart3/>} 
        iconBg="bg-teal-500/10" 
        iconColor="text-teal-400" 
        title="Hook Intelligence" 
        subtitle="Data-backed scoring for your openings."
        badge="Creator"
        action={
          <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/5 backdrop-blur-xl">
             <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
             <span className="text-xs font-black text-cyan-300 uppercase tracking-widest">Live Engine Active</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input Section */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-2xl rounded-[2rem] overflow-hidden">
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Your Hook
                  </label>
                  <span className="text-[10px] font-black text-zinc-600 tracking-tighter uppercase">{hook.length} / 280 Characters</span>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-[1.5rem] blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
                  <Input 
                    placeholder="Paste your hook here (e.g. Stop scrolling if you want to scale...)" 
                    value={hook} 
                    onChange={(e) => setHook(e.target.value)}
                    className="relative bg-black/40 border-white/5 h-16 md:h-20 rounded-2xl text-base md:text-xl font-bold px-6 focus-visible:ring-cyan-500/50 placeholder:text-white/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Platform</label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-black/40 border-white/5 h-14 rounded-xl font-bold text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10">
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Twitter">Twitter (X)</SelectItem>
                      <SelectItem value="YouTube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Niche</label>
                  <Input 
                    placeholder="e.g. SaaS" 
                    value={niche} 
                    onChange={(e) => setNiche(e.target.value)}
                    className="bg-black/40 border-white/5 h-14 rounded-xl font-bold text-base"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Patterns Detected */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {result.patternMatches.map((p, i) => (
                     <div key={i} className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-black text-emerald-100 uppercase tracking-tight">{p}</span>
                     </div>
                   ))}
                </div>

                {/* AI Advice */}
                <Card className="bg-indigo-500/5 border-indigo-500/10 rounded-2xl overflow-hidden">
                   <CardContent className="p-6 flex gap-5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                         <Zap className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="space-y-2">
                         <h4 className="text-sm font-black text-white uppercase tracking-widest">AI Refinement</h4>
                         <p className="text-zinc-400 text-sm leading-relaxed italic">"{result.mainIssue || "Looking strong! Minor tweaks could push this to S-Tier."}"</p>
                         {result.quickFix && (
                           <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/5">
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Quick Fix:</span>
                              <p className="text-white text-sm font-bold mt-1">{result.quickFix}</p>
                           </div>
                         )}
                      </div>
                   </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Score Sidebar */}
        <div className="lg:col-span-5">
           <div className="sticky top-8 space-y-6">
              <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden shadow-2xl">
                 <CardContent className="p-10 text-center space-y-8">
                    <div className="relative inline-block">
                       <svg className="w-48 h-48 transform -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-white/5"
                          />
                          <motion.circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={553}
                            initial={{ strokeDashoffset: 553 }}
                            animate={{ strokeDashoffset: 553 - (553 * (result?.score || 0)) / 100 }}
                            transition={{ type: "spring", bounce: 0, duration: 1.5 }}
                            className={`${result ? getGradeColor(result.grade).split(' ')[0] : 'text-zinc-800'}`}
                            strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center space-y-1">
                          <AnimatePresence mode="wait">
                            <motion.span 
                              key={result?.grade || 'none'}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`text-7xl font-black tracking-tighter ${result ? getGradeColor(result.grade) : 'text-zinc-800'}`}
                            >
                               {result?.grade || '-'}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Efficiency</span>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-end px-2">
                          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Growth Potential</span>
                          <span className="text-2xl font-black text-white">{result?.score || 0}%</span>
                       </div>
                       <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${result?.score || 0}%` }}
                            className={`h-full bg-gradient-to-r ${result ? 'from-cyan-500 to-indigo-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'from-zinc-800 to-zinc-900'}`}
                          />
                       </div>
                    </div>

                    <div className="pt-4 grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Hook Type</span>
                          <span className="text-xs font-black text-white">{result?.hookType || 'Pending'}</span>
                       </div>
                       <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                          <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</span>
                          <div className="flex items-center justify-center gap-2">
                             {loading || debouncing ? (
                               <>
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                <span className="text-xs font-black text-cyan-400">ANALYZING</span>
                               </>
                             ) : (
                               <>
                                <ShieldCheck className={`w-3.5 h-3.5 ${result ? 'text-emerald-400' : 'text-zinc-700'}`} />
                                <span className={`text-xs font-black ${result ? 'text-emerald-400' : 'text-zinc-700'}`}>SECURED</span>
                               </>
                             )}
                          </div>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Pro Tip */}
              <div className="p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 flex gap-4">
                 <div className="shrink-0">
                    <Info className="w-5 h-5 text-amber-500" />
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Growth Tip</p>
                    <p className="text-[13px] text-amber-200/60 leading-relaxed">The best hooks combine <span className="text-amber-200 font-bold">Negative Framing</span> with <span className="text-amber-200 font-bold">Curiosity Gaps</span>. Try adding "Stop" or "Never" to your first sentence.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
