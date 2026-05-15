import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, animate } from "framer-motion";
import { BarChart3, TrendingUp, Zap, Star, Calendar } from "lucide-react";
import { PlanGate } from "@/components/shared/PlanGate";
import { Button } from "@/components/ui/button";
import { useGetContentHistory } from "@workspace/api-client-react";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

const CONTENT_TYPE_COLORS: Record<string, string> = {
  Educational: "bg-[#00F2FF]",
  Story: "bg-[#00F2FF] opacity-80",
  Viral: "bg-[#00F2FF] opacity-60",
};

function AnimatedCounter({ value }: { value: number | string }) {
  const [count, setCount] = useState(typeof value === "number" ? 0 : value);
  const [prevValue, setPrevValue] = useState(0);
  
  useEffect(() => {
    if (typeof value === "number") {
      const controls = animate(prevValue, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate: (v) => setCount(Math.floor(v)),
      });
      setPrevValue(value);
      return controls.stop;
    } else {
      setCount(value);
      return () => {};
    }
  }, [value]);
  
  return <>{count}</>;
}

function StatCard({ label, value, sub, icon, delta, delay = 0 }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; delta?: number; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ delay }}
      className="rounded-2xl border border-white/8 p-5 relative overflow-hidden bg-white/[0.02]"
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-xs text-white/40 font-medium uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between relative z-10">
        <div className="text-3xl font-bold text-white">
          <AnimatedCounter value={value} />
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${delta >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {delta >= 0 ? "+" : ""}{delta}%
          </div>
        )}
      </div>
      {sub && <div className="text-xs text-white/40 mt-1 relative z-10">{sub}</div>}
    </motion.div>
  );
}

export default function Insights() {
  const [, setLocation] = useLocation();
  const { data: sub } = useSubscriptionStatus();
  const { data: historyData, isLoading: historyLoading } = useGetContentHistory({ limit: 100, offset: 0 });

  const history = useMemo(() => historyData?.items ?? [], [historyData]);

  const chartData = useMemo(() => {
    if (!history.length) return [];
    
    const byDate: Record<string, number> = {};
    history.forEach((item: any) => {
      if (!item.createdAt) return;
      try {
        const date = new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        byDate[date] = (byDate[date] || 0) + 1;
      } catch (e) {
        console.error("Invalid date in history:", item.createdAt);
      }
    });
    
    return Object.entries(byDate)
      .slice(-14)
      .map(([date, count]) => ({ date, generations: count }));
  }, [history]);

  const stats = useMemo(() => {
    if (!history.length) return null;

    const streak = sub?.currentStreak || 0;

    const typeCount: Record<string, number> = {};
    history.forEach((item: any) => {
      const t = item.contentType || "Educational";
      typeCount[t] = (typeCount[t] || 0) + 1;
    });
    const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "Educational";

    const now = new Date();
    const thisWeek = history.filter((item: any) => {
        const d = new Date(item.createdAt);
        return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const lastWeek = history.filter((item: any) => {
        const d = new Date(item.createdAt);
        const age = now.getTime() - d.getTime();
        return age > 7 * 24 * 60 * 60 * 1000 && age <= 14 * 24 * 60 * 60 * 1000;
    }).length;

    const delta = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    return {
      streak,
      topType,
      typeCount,
      delta,
      thisWeek
    };
  }, [history, sub]);

  if (historyLoading) return <PageSkeleton />;

  if (!history.length) {
    return (
      <PlanGate requiredPlan="infinity" featureName="Performance Insights">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <BarChart3 className="w-10 h-10 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">No Analytics Yet</h2>
          <p className="text-white/40 max-w-sm">Generate your first AI content to unlock performance tracking and consistency metrics.</p>
          <Button onClick={() => setLocation("/generate")} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl px-8">
             Start Generating
          </Button>
        </div>
      </PlanGate>
    );
  }

  return (
    <PlanGate requiredPlan="infinity" featureName="Performance Insights">
      <div className="space-y-8 pb-16">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            Performance Insights
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
               PRO
            </span>
          </h1>
          <p className="text-white/50 text-sm">Visualize your growth and content consistency.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total generations" value={sub?.totalGenerationsUsed ?? 0} icon={<Zap className="w-4 h-4 text-cyan-400" />} />
          <StatCard label="Growth Momentum" value={stats?.thisWeek || 0} sub="Generations this week" icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} delta={stats?.delta} />
          <StatCard label="Top Format" value={stats?.topType || "—"} icon={<Star className="w-4 h-4 text-cyan-400" />} />
          <StatCard label="Current Streak" value={`${stats?.streak || 0} Days`} icon={<Calendar className="w-4 h-4 text-cyan-400" />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <h3 className="text-white/80 font-semibold text-sm mb-6">Style Breakdown</h3>
            <div className="space-y-5">
              {Object.entries(stats?.typeCount || {}).map(([type, count]) => {
                const pct = Math.round((count / history.length) * 100);
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/70">{type}</span>
                      <span className="text-xs text-white/40">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${pct}%` }} 
                        className={`h-full ${CONTENT_TYPE_COLORS[type] || "bg-cyan-500"}`} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <h3 className="text-white/80 font-semibold text-sm mb-6">Calendar Availability & Reach</h3>
            <div className="grid grid-cols-7 gap-2 h-40 items-end">
              {chartData.map((d, i) => {
                const max = Math.max(...chartData.map(day => day.generations), 1);
                const height = Math.round((d.generations / max) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: `${Math.max(height, 5)}%` }} 
                      className={`w-full rounded-t-lg ${i === chartData.length - 1 ? 'bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'bg-white/10'}`} 
                    />
                    <span className="text-[8px] text-white/20 font-bold uppercase">{d.date.split(' ')[1]}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </PlanGate>
  );
}
