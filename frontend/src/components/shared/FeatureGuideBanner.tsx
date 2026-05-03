import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeatureGuideBannerProps {
  toolKey: string;          // unique key for localStorage, e.g. "generate", "hooks"
  icon: React.ReactNode;    // lucide icon
  title: string;            // tool name
  tagline: string;          // one sentence what it does
  whatYouGet: string[];     // 2-4 bullet points of outputs
  whenToUse: string;        // one sentence on when to use this
  proTip?: string;          // optional power user tip
  planRequired?: string;    // "Starter" | "Creator" | "Infinity" | undefined (free)
}

const FeatureGuideBanner: React.FC<FeatureGuideBannerProps> = ({
  toolKey,
  icon,
  title,
  tagline,
  whatYouGet,
  whenToUse,
  proTip,
  planRequired
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `guide_dismissed_${toolKey}`;

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed !== "true") {
      setIsVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  };

  const handleShow = () => {
    localStorage.removeItem(storageKey);
    setIsVisible(true);
  };

  return (
    <>
      {/* Reshow Toggle - Floating in top-right when dismissed */}
      <AnimatePresence>
        {!isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-24 right-4 z-[40] md:right-8"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShow}
              className="w-8 h-8 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white/40 hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-lg"
              title="Show tool guide"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="relative group bg-gradient-to-br from-cyan-500/10 via-cyan-500/[0.02] to-transparent border border-white/5 border-l-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-xl shadow-cyan-950/20 backdrop-blur-sm">
              
              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
                title="Got it"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Side: Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                    {icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                      {planRequired && (
                        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
                          {planRequired}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed max-w-2xl">{tagline}</p>
                  </div>
                </div>

                {/* Right Side: What you get pills */}
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="text-[10px] uppercase tracking-widest text-white/20 font-bold w-full lg:w-auto lg:mr-2 mb-1 lg:mb-0">Yields:</span>
                  {whatYouGet.map((item, idx) => (
                    <span 
                      key={idx}
                      className="text-[11px] font-semibold text-cyan-300/80 bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-2.5 py-1 backdrop-blur-md"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Section: Best for + Pro Tip */}
              <div className="mt-5 pt-4 border-t border-white/[0.04] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-white/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Best for:</span>
                  <p className="text-xs font-medium text-white/60">{whenToUse}</p>
                </div>

                {proTip && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-amber-200/70">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-medium leading-none">
                      <span className="text-amber-400 font-bold mr-1">Pro tip:</span> {proTip}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeatureGuideBanner;
