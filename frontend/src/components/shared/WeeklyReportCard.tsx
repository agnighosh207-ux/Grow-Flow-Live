import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BarChart3, CalendarDays, Lightbulb, TrendingUp } from "lucide-react";

interface WeeklyStats {
  totalGenerations: number;
  consistencyScore: number;
  consistencyLabel: string;
  suggestedImprovement: string;
  weekStart: string;
  weekEnd: string;
}

function getStorageKey(userId: string) {
  return `weekly_report_shown_${userId}`;
}

function shouldShowReport(userId: string): boolean {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return true;
    const ts = Number.parseInt(raw, 10);
    if (Number.isNaN(ts)) return true;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - ts >= sevenDays;
  } catch {
    return true;
  }
}

function markShown(userId: string) {
  try {
    localStorage.setItem(getStorageKey(userId), String(Date.now()));
  } catch {}
}

export function WeeklyReportCard() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [visible, setVisible] = useState(false);

  const { data: stats, isLoading } = useQuery<WeeklyStats>({
    queryKey: ["weekly-stats"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/stats/weekly", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch weekly stats");
      const data = await res.json();
      return data;
    },
    enabled: isLoaded && !!user && shouldShowReport(user.id),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep for 24 hours in cache
  });

  useEffect(() => {
    if (stats && user && !visible) {
      setVisible(true);
      markShown(user.id);
    }
  }, [stats, user]);

  function handleDismiss() {
    setVisible(false);
  }

  if (!isLoaded || isLoading || !visible || !stats) return null;

  const consistencyPct = Math.round((stats.consistencyScore / 7) * 100);
  const getConsistencyColor = (score: number) => {
    if (score >= 5) return "text-emerald-400";
    if (score >= 3) return "text-amber-400";
    return "text-red-400";
  };
  const consistencyColor = getConsistencyColor(stats.consistencyScore);

  const getBarColor = (score: number) => {
    if (score >= 5) return "from-emerald-500 to-emerald-400";
    if (score >= 3) return "from-amber-500 to-amber-400";
    return "from-red-500 to-red-400";
  };
  const barColor = getBarColor(stats.consistencyScore);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="weekly-report-card"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.3 }}
          className="relative z-10 overflow-hidden"
        >
          <div
            className="relative rounded-2xl border border-[rgba(94,106,210,0.4)]/25 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(94,106,210,0.15) 0%, rgba(139,145,227,0.04) 50%, rgba(11,18,21,0.95) 100%)",
            }}
          >
            <div className="h-0.5 w-full bg-gradient-to-r from-[#5E6AD2] via-[#8B91E3] to-[#4A52B8]" />

            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#5E6AD2]/15 border border-[rgba(94,106,210,0.4)]/25 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-[#8B91E3]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">Your Weekly Performance Report</p>
                    <p className="text-[11px] text-white/40 mt-0.5">Last 7 days · auto-calculated from your activity</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-white/40 hover:text-white transition-colors p-1 shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl border border-white/8 px-4 py-3 bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#8B91E3]" />
                    <span className="text-[11px] text-white/40 font-medium uppercase tracking-wide">Content Generated</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.totalGenerations}</p>
                  <p className="text-[11px] text-white/35 mt-0.5">pieces this week</p>
                </div>

                <div className="rounded-xl border border-white/8 px-4 py-3 bg-white/[0.02]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CalendarDays className="w-3.5 h-3.5 text-[#8B91E3]" />
                    <span className="text-[11px] text-white/40 font-medium uppercase tracking-wide">Consistency Score</span>
                  </div>
                  <p className={`text-2xl font-bold ${consistencyColor}`}>{stats.consistencyLabel}</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${consistencyPct}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/6 px-4 py-3 mb-3">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-amber-300/70 font-semibold uppercase tracking-wide mb-1">AI Suggestion</p>
                    <p className="text-sm text-white/75 leading-relaxed">{stats.suggestedImprovement}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-white/40 font-medium italic">
                Top creators post more consistently. Keep going!
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
