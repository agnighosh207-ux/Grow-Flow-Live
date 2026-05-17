import React, { useEffect, useState, useMemo } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useLocation, Link } from "wouter";
import { motion, animate } from "framer-motion";
import { BarChart3, TrendingUp, Zap, Star, Calendar, PieChart as PieIcon } from "lucide-react";
import { PlanGate } from "@/components/shared/PlanGate";
import { Button } from "@/components/ui/button";
import { useGetContentHistory } from "@workspace/api-client-react";
import { PageSkeleton } from "@/components/shared/Skeleton";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { PageHeader } from "@/components/shared/PageHeader";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";

const CONTENT_TYPE_COLORS: Record<string, string> = {
  Educational: "bg-[#5E6AD2]",
  Story: "bg-[#8B91E3]",
  Viral: "bg-[#5E6AD2]",
};

const CHART_COLORS = ['#5E6AD2', '#8B91E3', '#4A52B8', '#16A34A', '#D97706'];

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
        <div className="w-8 h-8 rounded-lg bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.20)] flex items-center justify-center">
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
  usePageTitle("My Analytics");
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

  const languageData = useMemo(() => {
    if (!history.length) return [];
    const counts: Record<string, number> = {};
    history.forEach((item: any) => {
      const lang = item.promptLanguage || "English";
      counts[lang] = (counts[lang] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
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

  const [showGuide, setShowGuide] = useState(false);

  const stableTotalGenerations = useMemo(() => 
    sub?.totalGenerations ?? 0, 
    [sub?.totalGenerations]
  );

  if (historyLoading) return <PageSkeleton />;

  if (!historyLoading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <BarChart3 className="w-8 h-8" style={{ color: 'var(--text-disabled)' }} />
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
          No data yet
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          Generate some content to see your analytics
        </p>
        <Link href="/generate">
          <button className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: '#5E6AD2' }}>
            Start creating →
          </button>
        </Link>
      </div>
    );
  }

  return (
    <PlanGate requiredPlan="infinity" featureName="Performance Insights">
      <div className="space-y-8 pb-16">
        <FeatureGuideBanner
          toolKey="insights"
          title="Performance Insights"
          icon={<BarChart3 className="w-5 h-5 text-[#8B91E3]" />}
          tagline="Visualize your growth trajectory. Data-driven decisions for your content strategy."
          whatYouGet={["Growth momentum tracking", "Top content format analysis", "Consistency streak monitoring", "Style breakdown charts"]}
          whenToUse="Use this every weekend to review your output and see which content styles are dominating your schedule."
          proTip="Aim for a 'Viral' style percentage of at least 30% if your main goal is rapid reach expansion."
          planRequired="Infinity"
          forceOpen={showGuide}
        />
        
        <PageHeader
          icon={<BarChart3 />}
          iconBg="bg-[rgba(94,106,210,0.10)]"
          iconColor="text-[#8B91E3]"
          title="Performance Insights"
          subtitle="Visualize your growth and content consistency."
          badge="PRO"
          onInfoClick={() => setShowGuide(prev => !prev)}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total generations" value={stableTotalGenerations} icon={<Zap className="w-4 h-4 text-[#8B91E3]" />} />
          <StatCard label="Growth Momentum" value={stats?.thisWeek || 0} sub="Generations this week" icon={<TrendingUp className="w-4 h-4 text-[#8B91E3]" />} delta={stats?.delta} />
          <StatCard label="Top Format" value={stats?.topType || "—"} icon={<Star className="w-4 h-4 text-[#8B91E3]" />} />
          <StatCard label="Current Streak" value={`${stats?.streak || 0} Days`} icon={<Calendar className="w-4 h-4 text-[#8B91E3]" />} />
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
                        className={`h-full ${CONTENT_TYPE_COLORS[type] || "bg-[#5E6AD2]"}`} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
            <h3 className="text-white/80 font-semibold text-sm mb-6 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#8B91E3]" /> Platform & Language Breakdown
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height={200} minHeight={160}>
                <PieChart>
                  <Pie 
                    data={languageData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={40} 
                    outerRadius={60} 
                    paddingAngle={8} 
                    dataKey="value"
                  >
                    {languageData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#0e0e14', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {languageData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider">{item.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 md:col-span-2">
            <h3 className="text-white/80 font-semibold text-sm mb-6">Activity Timeline</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height={200} minHeight={160}>
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                    tickFormatter={(val) => val.split(' ')[1]}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#0e0e14', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff'
                    }} 
                  />
                  <Bar 
                    dataKey="generations" 
                    fill="#5E6AD2" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
    </PlanGate>
  );
}
