import { useState } from "react";
import { PlanGate, useTrialAction } from "@/components/shared/PlanGate";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays, Loader2, Wand2, Instagram, Linkedin, Twitter,
  BookOpen, Flame, Repeat2, ChevronDown
} from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { ContentCalendar } from "@/components/shared/ContentCalendar";

const NICHES = ["General", "Fitness", "Finance", "Tech", "Motivation", "Business", "Lifestyle"] as const;

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="w-3.5 h-3.5" />,
  "YouTube Shorts": <SiYoutube className="w-3.5 h-3.5" />,
  Twitter: <Twitter className="w-3.5 h-3.5" />,
  LinkedIn: <Linkedin className="w-3.5 h-3.5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-500/15 text-pink-300 border-pink-500/25",
  "YouTube Shorts": "bg-red-500/15 text-red-300 border-red-500/25",
  Twitter: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  LinkedIn: "bg-blue-600/15 text-blue-300 border-blue-600/25",
};

const CONTENT_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  Educational: { icon: <BookOpen className="w-3.5 h-3.5" />, color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20", label: "Educational" },
  Story: { icon: <Repeat2 className="w-3.5 h-3.5" />, color: "bg-amber-500/15 text-amber-300 border-amber-500/20", label: "Story" },
  Viral: { icon: <Flame className="w-3.5 h-3.5" />, color: "bg-orange-500/15 text-orange-300 border-orange-500/20", label: "Viral" },
};

const DAY_ACCENT: string[] = [
  "from-cyan-600/30",
  "from-blue-600/30",
  "from-orange-600/30",
  "from-green-600/30",
  "from-pink-600/30",
  "from-amber-600/30",
  "from-sky-600/30",
];

interface DayPlan {
  day: number;
  dayLabel: string;
  platform: string;
  contentType: string;
  topic: string;
  angle: string;
  hook: string;
  reasoning: string;
}

function StrategyPlannerInner() {
  const [niche, setNiche] = useState<typeof NICHES[number]>("General");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState<"7" | "30">("7");
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { useOneTrial } = useTrialAction();

  async function generateStrategy() {
    if (!goal.trim()) {
      toast({ variant: "destructive", title: "Enter your content goal first" });
      return;
    }
    setLoading(true);
    setPlan([]);
    setExpandedDay(null);
    try {
      const res = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, goal, duration: parseInt(duration) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setPlan(data.plan ?? []);
      setExpandedDay(1);
      useOneTrial();
    } catch {
      toast({ variant: "destructive", title: "Generation failed", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function useDay(day: DayPlan) {
    navigate(`/generate?idea=${encodeURIComponent(day.topic)}&contentType=${encodeURIComponent(day.contentType)}&tone=Professional`);
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-cyan-400" />
          Content Strategy
        </h1>
        <p className="text-white/50 text-sm">A full week of content — platform-specific, psychologically sequenced, ready to execute.</p>
      </div>

      <div
        className="rounded-2xl border border-white/8 p-5 md:p-6 space-y-5"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Your Niche</label>
            <Select value={niche} onValueChange={(v) => setNiche(v as any)}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-cyan-500/40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0a1e] border-white/10">
                {NICHES.map(n => (
                  <SelectItem key={n} value={n} className="text-white/80 focus:text-white focus:bg-cyan-600/20">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Your Goal</label>
            <Input
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. establish authority..."
              className="bg-black/20 border-white/10 text-white placeholder:text-white/25 focus-visible:ring-cyan-500/40 rounded-xl h-10"
              onKeyDown={e => e.key === "Enter" && generateStrategy()}
            />
          </div>

          <div className="space-y-2">
            <label className="text-white/70 text-sm font-medium">Duration</label>
            <Select value={duration} onValueChange={(v) => setDuration(v as any)}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-cyan-500/40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0a1e] border-white/10">
                <SelectItem value="7" className="text-white/80 focus:text-white focus:bg-cyan-600/20">7 Days Blueprint</SelectItem>
                <SelectItem value="30" className="text-white/80 focus:text-white focus:bg-cyan-600/20">30 Days Calendar (PRO)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={generateStrategy}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-cyan-900/40 rounded-xl px-6"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><CalendarDays className="w-4 h-4 mr-2" /> Build My Plan</>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/3 border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.07}s` }} />
            ))}
          </motion.div>
        )}

        {!loading && plan.length > 0 && (
          <motion.div
            key="plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {duration === "30" && (
              <ContentCalendar plan={plan} onSelectDay={(day) => {
                setExpandedDay(day.day);
                // Scroll to the item
                setTimeout(() => {
                  document.getElementById(`day-${day.day}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }} />
            )}
            
            <div className="space-y-2">
              {Array.isArray(plan) && plan.map((day, i) => {
                const isExpanded = expandedDay === day.day;
                const accentGrad = DAY_ACCENT[i % DAY_ACCENT.length] || DAY_ACCENT[0];
                const platformColor = PLATFORM_COLORS[day.platform] || "bg-white/8 text-white/60 border-white/10";
                const ctConfig = CONTENT_TYPE_CONFIG[day.contentType];

                return (
                  <motion.div
                    key={day.day}
                    id={`day-${day.day}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4) }}
                    className={`rounded-xl border transition-colors overflow-hidden ${isExpanded ? "border-cyan-500/40 shadow-lg shadow-cyan-500/10" : "border-white/8"}`}
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                    >
                      <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${accentGrad} to-transparent`}>
                        <div className="w-10 h-10 rounded-lg bg-black/30 border border-white/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-white/30 text-[9px] font-medium uppercase tracking-wider leading-none">Day</span>
                          <span className="text-white font-bold text-base leading-none">{day.day}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/50 text-xs font-medium">{day.dayLabel}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${platformColor}`}>
                              {PLATFORM_ICONS[day.platform]}
                              {day.platform}
                            </span>
                            {ctConfig && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${ctConfig.color}`}>
                                {ctConfig.icon}
                                {ctConfig.label}
                              </span>
                            )}
                          </div>
                          <p className="text-white text-sm font-semibold mt-1 truncate">{day.topic}</p>
                        </div>

                        <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-black/40"
                        >
                          <div className="px-4 pb-4 pt-4 border-t border-white/5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Angle</span>
                                <p className="text-white/75 text-xs leading-relaxed">{day.angle}</p>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-semibold text-white/35 uppercase tracking-wider">Why Today</span>
                                <p className="text-white/75 text-xs leading-relaxed">{day.reasoning}</p>
                              </div>
                            </div>

                            <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-1.5 border-l-2 border-l-cyan-500">
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">
                                <Flame className="w-3 h-3" />
                                Suggested Hook
                              </span>
                              <p className="text-white text-sm font-medium italic">"{day.hook}"</p>
                            </div>

                            <div className="flex justify-end pt-2">
                              <Button
                                size="sm"
                                onClick={() => useDay(day)}
                                className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-cyan-900/40 rounded-xl px-4 transition-transform hover:scale-[1.03] active:scale-[0.98]"
                              >
                                <Wand2 className="w-4 h-4 mr-2" />
                                Generate This Content
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {!loading && plan.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center mx-auto">
              <CalendarDays className="w-7 h-7 text-cyan-400/60" />
            </div>
            <p className="text-white/40 text-sm">Select your niche, define your goal, and build your week.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StrategyPlanner() {
  return (
    <PlanGate
      requiredPlan="starter"
      featureName="7-Day Strategy Planner"
      toolKey="strategy"
      freeTrials={3}
      description="Plan a full week of platform-specific, psychologically sequenced content."
    >
      <StrategyPlannerInner />
    </PlanGate>
  );
}
