import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Lightbulb, Zap, Target, CheckCircle2,
  RefreshCw, Copy, Check, Sparkles, CalendarDays, Trophy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    streak >= 7 ? "from-cyan-500 to-teal-500" :
    "from-emerald-500 to-teal-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${streak >= 7 ? "from-orange-500/15 to-amber-500/10 border-orange-500/25" : "from-emerald-500/10 to-teal-500/8 border-emerald-500/20"} border p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${streakColor} flex items-center justify-center text-2xl shadow-lg`}>
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
  const [completing, setCompleting] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const fetchToday = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily/today", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
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
    setCompleting(true);
    try {
      const res = await fetch("/api/daily/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(prev => prev ? { ...prev, streak: json.streak, completedToday: true } : prev);
      setJustCompleted(true);
      toast({ title: `🔥 ${json.streak}-day streak!`, description: "Amazing! You posted today's content. Keep the momentum going!" });
    } catch {
      toast({ title: "Couldn't mark as posted", variant: "destructive" });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full min-h-[50vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-sm">Loading today's plan...</p>
        </div>
      </div>
    );
  }

  const plan = data?.plan;
  const streak = data?.streak ?? 0;
  const completed = data?.completedToday ?? false;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="w-full">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/25 to-amber-500/25 border border-orange-500/20 flex items-center justify-center text-lg">
              🔥
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Daily Growth Plan</h1>
              <p className="text-white/40 text-sm">{today}</p>
            </div>
          </div>
        </motion.div>

        {streak > 0 && <StreakBadge streak={streak} />}

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
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1">Today's Idea</p>
                  <p className="text-white/90 text-sm font-medium leading-snug">{plan.idea}</p>
                </div>
                <CopyButton text={plan.idea} />
              </div>

              <div className="flex items-start gap-3 py-2.5 border-b border-white/6">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
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
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base transition-all disabled:opacity-60 shadow-lg shadow-emerald-900/30"
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
            <Sparkles className="w-8 h-8 text-cyan-400/50 mx-auto" />
            <p className="text-white/50 text-sm">Couldn't load today's plan.</p>
            <button onClick={fetchToday} className="px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-300 text-xs font-medium hover:bg-cyan-500/25 transition-all">
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
      </div>
    </div>
  );
}
