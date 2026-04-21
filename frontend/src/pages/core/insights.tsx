import React, { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { BarChart3, Crown, TrendingUp, Zap, Linkedin, Twitter, Star } from "lucide-react";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { PlanGate } from "@/components/shared/PlanGate";
import { useGetContentStats, useGetContentHistory } from "@workspace/api-client-react";

const PLATFORM_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bar: string }> = {
  instagram: { icon: <SiInstagram className="w-4 h-4 text-pink-400" />, label: "Instagram", color: "text-pink-400", bar: "bg-pink-500" },
  youtube: { icon: <SiYoutube className="w-4 h-4 text-red-400" />, label: "YouTube Shorts", color: "text-red-400", bar: "bg-red-500" },
  twitter: { icon: <Twitter className="w-4 h-4 text-sky-400" />, label: "Twitter / X", color: "text-sky-400", bar: "bg-sky-500" },
  linkedin: { icon: <Linkedin className="w-4 h-4 text-blue-400" />, label: "LinkedIn", color: "text-blue-400", bar: "bg-blue-500" },
};

const CONTENT_TYPE_COLORS: Record<string, string> = {
  Educational: "bg-[#00F2FF]",
  Story: "bg-[#00F2FF] opacity-80",
  Viral: "bg-[#00F2FF] opacity-60",
};

function AnimatedCounter({ value }: { value: number | string }) {
  const [count, setCount] = useState(typeof value === "number" ? 0 : value);
  
  useEffect(() => {
    if (typeof value === "number") {
      const controls = animate(0, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate: (v) => setCount(Math.floor(v)),
      });
      return controls.stop;
    } else {
      setCount(value);
    }
  }, [value]);
  
  return <>{count}</>;
}

function StatCard({ label, value, sub, icon, delay = 0 }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ delay }}
      className="hyper-hover-card rounded-2xl border border-white/8 p-5"
      style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40 font-medium uppercase tracking-widest">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white">
        <AnimatedCounter value={value} />
      </div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </motion.div>
  );
}

export default function Insights() {
  const { data: stats } = useGetContentStats();
  const { data: historyData } = useGetContentHistory({ limit: 50, offset: 0 });

  const history = historyData?.items ?? [];
  const totalGenerations = stats?.totalGenerations ?? history.length;

  const typeCount: Record<string, number> = {};
  history.forEach((item: any) => {
    const t = item.contentType ?? "Educational";
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  });

  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Educational";

  const platformCopies: Record<string, number> = { instagram: 0, youtube: 0, twitter: 0, linkedin: 0 };
  const typeEntries = Object.entries(typeCount);
  const typeTotal = typeEntries.reduce((s, [, v]) => s + v, 0);

  const thisMonthGenerations = history.filter((item: any) => {
    const created = new Date(item.createdAt);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const groupedByDate: Record<string, number> = {};
  history.forEach((item: any) => {
    const d = new Date(item.createdAt);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    groupedByDate[dateStr] = (groupedByDate[dateStr] || 0) + 1;
  });

  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    if (groupedByDate[dateStr]) {
      streak++;
    } else {
      if (i === 0) continue; 
      break; 
    }
  }

  // Calculate dynamic heights for the last 7 days ending today
  const weeklyHeights = [0, 0, 0, 0, 0, 0, 0];
  const weeklyDays = ["", "", "", "", "", "", ""];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
  
  let maxDaily = 1; 
  for (let i = 0; i < 7; i++) {
     const d = new Date(today);
     d.setDate(today.getDate() - (6 - i));
     const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
     const val = groupedByDate[dateStr] || 0;
     if (val > maxDaily) maxDaily = val;
     weeklyDays[i] = dayNames[d.getDay()];
  }
  
  for (let i = 0; i < 7; i++) {
     const d = new Date(today);
     d.setDate(today.getDate() - (6 - i));
     const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
     const val = groupedByDate[dateStr] || 0;
     weeklyHeights[i] = val === 0 ? 5 : Math.round((val / maxDaily) * 100); // 5% minimum height just for visibility
  }

  return (
    <PlanGate requiredPlan="infinity" featureName="Performance Insights" description="Track your content output, consistency streaks, and style breakdown — available on the Infinity plan (₹499/month).">
      <div className="space-y-8 pb-16">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-1.5 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            Performance Insights
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-cyan-600/20 to-teal-600/20 border border-cyan-500/25 text-cyan-300">
              <Crown className="w-2.5 h-2.5" /> PRO
            </span>
          </h1>
          <p className="text-white/50 text-sm">Track your momentum and double down on what's working.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total generations" value={totalGenerations} sub="All time" icon={<Zap className="w-4 h-4 text-cyan-400" />} delay={0} />
          <StatCard label="This month" value={thisMonthGenerations} sub="Content pieces" icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} delay={0.05} />
          <StatCard label="Best style" value={topType} sub="Most used format" icon={<Star className="w-4 h-4 text-cyan-400" />} delay={0.1} />
          <StatCard label="Current streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} sub="Keep it going" icon={<Crown className="w-4 h-4 text-cyan-400" />} delay={0.15} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/8 p-5"
            style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(16px)" }}
          >
            <h3 className="font-semibold text-white/90 mb-5 text-sm">Content style breakdown</h3>
            <div className="space-y-4">
              {(typeTotal > 0 ? typeEntries : [["Educational", 1], ["Story", 1], ["Viral", 1]]).map(([type, count]) => {
                const pct = typeTotal > 0 ? Math.round(((count as number) / typeTotal) * 100) : 33;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-white/70">{type}</span>
                      <span className="text-xs text-white/40">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-petrol)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${CONTENT_TYPE_COLORS[type] ?? "bg-cyan-500"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-white/8 p-5"
            style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(16px)" }}
          >
            <h3 className="font-semibold text-white/90 mb-5 text-sm">Weekly activity</h3>
            <div className="flex items-end gap-1.5 h-20">
              {weeklyHeights.map((height, i) => {
                const isToday = i === 6; // The last item in the array is always today based on our loop
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                        className={`w-full rounded-t-md ${isToday ? "bg-[#00F2FF] shadow-[0_0_12px_#00F2FF]" : ""}`}
                        style={{ minHeight: 2, backgroundColor: isToday ? '#00F2FF' : 'var(--surface-petrol)' }}
                      />
                      <span className={`text-[9px] font-medium ${isToday ? "text-[#00F2FF]" : "text-[var(--text-muted)]"}`}>{weeklyDays[i]}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-white/30 mt-4">Based on your generation activity this week.</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/8 p-6"
          style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(16px)" }}
        >
          <h3 className="font-semibold text-white/90 mb-5 text-sm">Platform coverage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => (
              <div key={key} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-2">
                  {cfg.icon}
                </div>
                <div className="text-xs font-semibold text-white/70">{cfg.label}</div>
                <div className={`text-xs mt-0.5 ${cfg.color}`}>Active</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/25 mt-5 text-center">Every generation covers all 4 platforms simultaneously.</p>
        </motion.div>
      </div>
    </PlanGate>
  );
}
