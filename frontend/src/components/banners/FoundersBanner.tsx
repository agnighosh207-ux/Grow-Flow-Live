import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Rocket } from "lucide-react";
import { useLocation } from "wouter";
const STORAGE_KEY = "founders_banner_dismissed";

export function FoundersBanner() {
  const [visible, setVisible] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const text = { title: "🚀 Founders Offer: Early users get special discounted pricing", sub: "Limited-time access for early adopters" };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative rounded-xl overflow-hidden mb-5 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(168,85,247,0.12) 50%, rgba(217,70,239,0.1) 100%)",
            border: "1px solid rgba(124,58,237,0.28)",
          }}
          onClick={() => navigate("/pricing")}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(90deg, rgba(124,58,237,0.08) 0%, transparent 60%)",
          }} />
          <div className="relative flex items-center gap-3 px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0">
              <Rocket className="w-3.5 h-3.5 text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90">{text.title}</p>
              <p className="text-xs text-white/45 mt-0.5">{text.sub}</p>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
