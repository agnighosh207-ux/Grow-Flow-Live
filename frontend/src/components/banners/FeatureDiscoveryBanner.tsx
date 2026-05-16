import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight, Wand2, Zap, Brain } from "lucide-react";
import { Link } from "wouter";

export function FeatureDiscoveryBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [feature, setFeature] = useState({
    title: "AI Ghostwriter",
    desc: "Train AI on your voice for authentic posts.",
    path: "/ghostwriter",
    icon: Wand2,
    color: "from-[#5E6AD2]-500 to-blue-500"
  });

  const FEATURES = [
    {
      title: "AI Ghostwriter",
      desc: "Train AI on your voice for authentic posts.",
      path: "/ghostwriter",
      icon: Wand2,
      color: "from-[#5E6AD2]-500 to-blue-500"
    },
    {
      title: "Performance Predictor",
      desc: "Score your posts before you hit publish.",
      path: "/predictor",
      icon: Zap,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "AI Content Coach",
      desc: "Get personalized feedback on your strategy.",
      path: "/coach",
      icon: Brain,
      color: "from-[#5E6AD2] to-indigo-900"
    }
  ];

  useEffect(() => {
    const isDismissed = localStorage.getItem("feature_discovery_dismissed");
    if (isDismissed) return;

    // Rotate feature every session
    const idx = Math.floor(Math.random() * FEATURES.length);
    setFeature(FEATURES[idx]);
    
    // Delay visibility for better UX
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("feature_discovery_dismissed", "true");
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-[#0f0720] border-b border-[rgba(94,106,210,0.4)]/20 overflow-hidden relative group"
        >
          <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <Link href={feature.path} className="flex-1 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${feature.color} shadow-lg shadow-[rgba(94,106,210,0.20)]`}>
                <feature.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#8B91E3] animate-pulse" />
                  New Tool: {feature.title}
                </span>
                <span className="text-[10px] sm:text-xs text-white/40 font-medium">
                  {feature.desc}
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href={feature.path} className="hidden sm:flex items-center gap-1 text-[10px] font-black text-[#8B91E3] uppercase tracking-widest hover:text-[#8B91E3] transition-colors">
                Try Now <ChevronRight className="w-3 h-3" />
              </Link>
              <button 
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/5 rounded-full text-white/20 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#8B91E3]/50 to-transparent w-full" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
