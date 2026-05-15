import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { X, PenTool, BarChart2, CalendarDays, Brain } from "lucide-react";

const DISCOVERY_CARDS = [
  { id: "ghostwriter", title: "AI Ghostwriter", msg: "Train the AI to write in your exact authentic voice.", path: "/ghostwriter", icon: PenTool, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
  { id: "predictor", title: "Performance Predictor", msg: "See how your post will perform before you hit publish.", path: "/predictor", icon: BarChart2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { id: "strategy", title: "7-Day Strategy", msg: "Get a full week of strategic content ideas mapped out.", path: "/strategy", icon: CalendarDays, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
  { id: "coach", title: "AI Content Coach", msg: "Get real-time feedback on your content strategy.", path: "/coach", icon: Brain, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
];

export function FeatureDiscoveryBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const sessionIdx = sessionStorage.getItem("discovery_banner_idx");
    let nextIdx = 0;
    if (sessionIdx !== null) {
      nextIdx = (parseInt(sessionIdx) + 1) % DISCOVERY_CARDS.length;
    }
    sessionStorage.setItem("discovery_banner_idx", nextIdx.toString());
    setCurrentIndex(nextIdx);

    const isDismissed = localStorage.getItem(`discovery_dismissed_${DISCOVERY_CARDS[nextIdx].id}`);
    if (isDismissed) setDismissed(true);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(`discovery_dismissed_${DISCOVERY_CARDS[currentIndex].id}`, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  const card = DISCOVERY_CARDS[currentIndex];
  const Icon = card.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border ${card.border} ${card.bg} p-4 mb-8 transition-all hover:border-white/20`}
      onClick={() => navigate(card.path)}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0 border border-white/5`}>
          <Icon className={`w-5 h-5 ${card.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">{card.title}</h4>
            <span className="text-[8px] font-black bg-cyan-500 text-black px-1.5 py-0.5 rounded-sm uppercase">Try Now</span>
          </div>
          <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">{card.msg}</p>
        </div>
        <button 
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/10 transition-all duration-700" />
    </motion.div>
  );
}
