import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Lightbulb, Zap, Target, CheckCircle2,
  RefreshCw, Copy, Check, Sparkles, CalendarDays, Trophy, X
} from "lucide-react";
import confetti from 'canvas-confetti';
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";

interface DailyPlan {
  id: number;
  userId: string;
  date: string;
  idea: string;
  hook: string;
  cta: string;
  completedAt: string | null;
}

interface DailyResponse {
  plan: DailyPlan;
  streak: number;
  completedToday: boolean;
  challenge?: {
    joined: boolean;
    completedDays: number;
    challengeId: string;
  };
}



function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[11px] transition-all"
    >
      {copied ? <><Check className="w-3 h-3 text-emerald-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;

  const milestones = [3, 7, 14, 21, 30, 60, 100];
  const nextMilestone = milestones.find(m => m > streak) ?? streak + 1;
  const progress = ((streak % (nextMilestone - (milestones[milestones.indexOf(nextMilestone) - 1] || 0))) / (nextMilestone - (milestones[milestones.indexOf(nextMilestone) - 1] || 0))) * 100;

  const streakColor = streak >= 30 ? "from-amber-500 to-orange-500" :
    streak >= 14 ? "from-orange-500 to-red-500" :
    streak >= 7 ? "from-violet-500 to-indigo-500" :
    "from-indigo-500 to-violet-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${streak >= 7 ? "from-orange-500/15 to-amber-500/10 border-orange-500/25" : "from-violet-500/10 to-indigo-500/8 border-violet-500/20"} border p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br ${streakColor} flex items-center justify-center text-2xl md:text-3xl shadow-lg`}>
            🔥
          </div>
          <div>
            <p className="text-white font-bold text-2xl leading-none">{streak}<span className="text-base font-normal text-white/50 ml-1">days</span></p>
            <p className="text-white/60 text-xs mt-0.5">
              {streak >= 30 ? "You're unstoppable 🏆" :
               streak >= 14 ? "Incredible consistency!" :
               streak >= 7 ? "One week strong! 💪" :
               streak >= 3 ? "Building momentum!" :
               "Great start!"}
            </p>
          </div>
        </div>
        {streak >= 7 && (
          <div className="text-right">
            <Trophy className="w-5 h-5 text-amber-400 ml-auto mb-1" />
            <p className="text-[10px] text-white/30">Top Creator</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-white/40 mb-1">
          <span>Next milestone: {nextMilestone} days</span>
          <span>{nextMilestone - streak} to go</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (streak / nextMilestone) * 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${streakColor}`}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function DailyActionMode() {
  const { toast } = useToast();
  const [data, setData] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);
  const [reward, setReward] = useState<{ credits: number; message: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [completing, setCompleting] = useState(false);
  const queryClient = useQueryClient();



  const fetchToday = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/daily/today");
      setData(data);
      setJustCompleted(false);
    } catch (err: any) {
      toast({ title: "Couldn't load today's plan", description: "Try refreshing", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchToday(); }, []);

  const markAsPosted = async () => {
    if (!data?.plan || data.completedToday) return;
    
    // Optimistic Update
    const oldData = data;
    setData(prev => prev ? { ...prev, completedToday: true, streak: (prev.streak || 0) + 1 } : prev);
    setJustCompleted(true);
    setCompleting(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });

    try {
      const { data: json } = await api.patch("/daily/today/complete");
      setData(prev => prev ? { ...prev, streak: json.newStreak, completedToday: true } : prev);
      
      if (json.reward) {
        setReward(json.reward);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#7c3aed', '#8b5cf6', '#f59e0b'] });
      }
      
      setShowCelebration(true);
      toast({ title: `🔥 ${json.newStreak}-day streak!`, description: "Amazing! You posted today's content. Keep the momentum going!" });
    } catch (err: any) {
      console.error("Completion error:", err);
      setData(oldData); // Rollback
      setJustCompleted(false);
      toast({ title: "Couldn't mark as posted", variant: "destructive" });
    } finally {
      setCompleting(false);
      queryClient.invalidateQueries({ queryKey: ["daily-streak"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    }
  };

  const CelebrationOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative max-w-md w-full bg-zinc-900 border border-white/10 rounded-[40px] p-10 text-center shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent opacity-50" />
        
        <button 
          onClick={() => setShowCelebration(false)}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 space-y-6">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 0.5, repeat: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-xl shadow-orange-500/20"
          >
            🔥
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white italic tracking-tight">
              Day {data?.streak} Complete!
            </h2>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[10px]">
              Streak Momentum Building
            </p>
          </div>

          {reward && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-3xl bg-violet-500/10 border border-violet-500/20 space-y-3"
            >
              <p className="text-lg font-black text-white leading-tight">
                {reward.message}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-black uppercase tracking-widest border border-violet-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                +{reward.credits} Credits Added!
              </div>
            </motion.div>
          )}

          {data?.challenge?.completedDays === 30 && (
            <Button 
              onClick={() => window.open("/api/challenge/certificate", "_blank")}
              className="w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black transition-all active:scale-95"
            >
              Download Creator Certificate 🏆
            </Button>
          )}

          <Button 
            onClick={() => setShowCelebration(false)}
            className="w-full h-14 rounded-2xl bg-white text-black font-black hover:bg-zinc-200 transition-all active:scale-95"
          >
            Continue Growth →
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex w-full min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-sm">Loading today's plan...</p>
        </div>
      </div>
    );
  }

  const plan = data?.plan;
  const streak = typeof data?.streak === 'number' && !isNaN(data.streak) ? data.streak : 0;
  const completed = data?.completedToday ?? false;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });

  const [showGuide, setShowGuide] = useState(false);

  return (
    <PageWrapper maxWidth="sm" className="py-6 space-y-5">
        <FeatureGuideBanner
          toolKey="daily"
          title="Daily Growth Plan"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          tagline="One daily task. Consistent growth. Build your creator streak and unlock massive rewards."
          whatYouGet={["1 curated content idea daily", "Pre-written hook & CTA", "Streak tracking & milestones", "Bonus credit rewards"]}
          whenToUse="Use this every morning to get your high-impact post out of the way in under 5 minutes."
          proTip="Don't break the streak! Reaching 30 days unlocks a Creator Certificate and 50 bonus credits."
          planRequired="Free"
          forceOpen={showGuide}
        />
        <AnimatePresence>
          {showCelebration && <CelebrationOverlay />}
        </AnimatePresence>
        
        <PageHeader 
          icon={<Flame/>} 
          iconBg="bg-orange-500/10" 
          iconColor="text-orange-400" 
          title="Daily Growth Plan" 
          subtitle="One daily task. Consistent growth."
          onInfoClick={() => setShowGuide(prev => !prev)}
        />

        {streak > 0 && <StreakBadge streak={streak} />}

        {data?.challenge?.joined && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-violet-500/30 rounded-[32px] p-6 bg-violet-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center gap-4 mb-5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center text-3xl shadow-glow-sm">🏆</div>
              <div>
                <p className="font-black text-white uppercase tracking-tight">30-Day Creator Challenge</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Architecting Consistency</p>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1.5 mb-5 relative z-10">
              {Array.from({ length: 30 }, (_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${i < (data.challenge?.completedDays || 0) ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-white/5'}`} />
              ))}
            </div>
            <div className="flex items-center justify-between relative z-10">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.1em]">
                {data.challenge?.completedDays === 30 ? "Challenge Completed! 🎉" : `${30 - (data.challenge?.completedDays || 0)} Days Remaining`}
              </p>
              {data.challenge?.completedDays === 30 ? (
                <button 
                  onClick={() => window.open("/api/challenge/certificate", "_blank")}
                  className="text-[10px] text-violet-400 font-black uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded-md hover:bg-violet-500/20 transition-colors"
                >
                  Download Certificate 🏆
                </button>
              ) : (
                <p className="text-[10px] text-violet-400 font-black uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded-md">
                  +50 Bonus Credits at Finish
                </p>
              )}
            </div>
          </motion.div>
        )}

        {!data?.challenge?.joined && !loading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-violet-500/20 rounded-[32px] p-6 bg-violet-500/5 flex flex-col md:flex-row items-center gap-5"
          >
             <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center text-3xl shrink-0">🚀</div>
             <div className="flex-1 text-center md:text-left">
                <p className="font-black text-white uppercase tracking-tight">Accept the 30-Day Challenge</p>
                <p className="text-xs text-white/40 font-medium mt-1">Generate content for 30 days straight to unlock the Creator Certificate + 50 Credits.</p>
             </div>
             <Button 
               onClick={async () => {
                 try {
                   await api.post("/challenge/join");
                   fetchToday();
                   toast({ title: "Challenge Accepted! 🚀", description: "Good luck, Creator. Let's make history." });
                 } catch (err) {
                   toast({ variant: "destructive", title: "Failed to join challenge" });
                 }
               }}
               className="bg-violet-600 hover:bg-violet-500 text-white font-black px-6 rounded-xl shadow-glow-sm"
             >
               JOIN NOW
             </Button>
          </motion.div>
        )}

        {streak === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/[0.03] border border-white/8 p-4 flex items-center gap-3">
            <Flame className="w-5 h-5 text-white/20 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white/60">Start your streak today</p>
              <p className="text-xs text-white/30 mt-0.5">Post today's content and mark it as done to start a streak</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {justCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border border-emerald-500/25 p-5 text-center"
            >
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-white font-bold text-lg">Posted! You're crushing it.</p>
              <p className="text-emerald-300/70 text-sm mt-1">
                {streak}-day streak — come back tomorrow to keep it alive.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {plan ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-white/30" />
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Today's Growth Action</span>
              {completed && (
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Done
                </span>
              )}
            </div>

            <motion.div
              className={`rounded-2xl border p-4 space-y-0.5 ${completed ? "bg-white/[0.02] border-white/6 opacity-80" : "bg-white/[0.04] border-white/10"}`}
              whileHover={!completed ? { borderColor: "rgba(139,92,246,0.3)" } : {}}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start gap-3 py-2.5 border-b border-white/6">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1">Today's Idea</p>
                  <p className="text-white/90 text-sm font-medium leading-snug">{plan.idea}</p>
                </div>
                <CopyButton text={plan.idea} />
              </div>

              <div className="flex items-start gap-3 py-2.5 border-b border-white/6">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1">Opening Hook</p>
                  <p className="text-white/90 text-sm italic leading-snug">"{plan.hook}"</p>
                </div>
                <CopyButton text={plan.hook} />
              </div>

              <div className="flex items-start gap-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1">Call-to-Action</p>
                  <p className="text-white/90 text-sm leading-snug">{plan.cta}</p>
                </div>
                <CopyButton text={plan.cta} />
              </div>
            </motion.div>

            {!completed ? (
              <motion.button
                onClick={markAsPosted}
                disabled={completing}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-base transition-all disabled:opacity-60 shadow-lg shadow-violet-900/30"
              >
                {completing ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Marking...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" />Mark as Posted ✓</>
                )}
              </motion.button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Posted Today — Come Back Tomorrow
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = `💡 Today's Idea: ${plan.idea}\n\n🎣 Hook: "${plan.hook}"\n\n🎯 CTA: ${plan.cta}`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Copied full plan!" });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/4 hover:bg-white/7 text-white/50 hover:text-white/70 text-xs font-medium transition-all border border-white/8"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Full Plan
              </button>
              <button
                onClick={fetchToday}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/4 hover:bg-white/7 text-white/50 hover:text-white/70 text-xs font-medium transition-all border border-white/8"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-violet-400/50 mx-auto" />
            <p className="text-white/50 text-sm">Couldn't load today's plan.</p>
            <button onClick={fetchToday} className="px-4 py-2 rounded-xl bg-violet-500/15 text-violet-300 text-xs font-medium hover:bg-violet-500/25 transition-all">
              Try Again
            </button>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="rounded-xl bg-white/[0.02] border border-white/6 p-4">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2">How it works</p>
          <div className="space-y-2">
            {[
              { icon: "📋", text: "Each day you get 1 fresh idea, hook, and CTA to post" },
              { icon: "✅", text: "Mark it as posted after you publish the content" },
              { icon: "🔥", text: "Build a streak — skip a day and it resets" },
              { icon: "🏆", text: "Reach milestones: 7, 14, 30, 100 days" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2 text-xs text-white/35">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
    </PageWrapper>
  );
}
