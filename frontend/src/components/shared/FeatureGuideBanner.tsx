import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HelpCircle, Lightbulb } from "lucide-react";
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
  forceOpen?: boolean;      // NEW: allow external trigger to show the banner
}

const FeatureGuideBanner: React.FC<FeatureGuideBannerProps> = ({
  toolKey,
  icon,
  title,
  tagline,
  whatYouGet,
  whenToUse,
  proTip,
  planRequired,
  forceOpen
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `guide_dismissed_${toolKey}`;

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed !== "true") {
      setIsVisible(true);
    }
  }, [storageKey]);

  // Sync with external trigger
  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  };

  const handleShow = () => {
    localStorage.removeItem(storageKey);
    setIsVisible(true);
  };

  return (
    <div key={toolKey}>
      {/* Reshow Toggle - Floating in top-right when dismissed */}
      {/* Reshow Toggle - Floating in bottom-right for better reach on mobile */}
      <AnimatePresence>
        {!isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="fixed bottom-28 right-6 z-[120] md:right-8"
          >
            <Button
              variant="default"
              size="icon"
              onClick={handleShow}
              className="w-12 h-12 rounded-full bg-[#5E6AD2] text-white shadow-[0_0_20px_rgba(94,106,210,0.4)] border border-[rgba(94,106,210,0.50)] hover:bg-[#5E6AD2] hover:scale-110 transition-all active:scale-90"
              title="Show tool guide"
            >
              <HelpCircle className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8B91E3] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#5E6AD2]"></span>
              </span>
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
            <div 
              className="relative group border border-[rgba(94,106,210,0.30)] border-l-[6px] border-l-[#5E6AD2] rounded-2xl p-6 sm:p-7 shadow-2xl shadow-[rgba(94,106,210,0.40)] backdrop-blur-xl"
              style={{ background: 'var(--surface-1)' }}
            >
              
              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                title="Got it"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left Side: Info */}
                <div className="flex items-start gap-5 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(94,106,210,0.10)] border border-[rgba(94,106,210,0.30)] flex items-center justify-center text-[#8B91E3] shrink-0 shadow-[inset_0_0_20px_rgba(94,106,210,0.1)]">
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-7 h-7" })}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-white tracking-tight uppercase italic">{title}</h3>
                      {planRequired && (
                        <span className="text-[10px] font-black text-black bg-[#8B91E3] rounded-full px-3 py-0.5 uppercase tracking-widest shadow-lg shadow-[rgba(94,106,210,0.20)]">
                          {planRequired}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed font-medium max-w-2xl">{tagline}</p>
                  </div>
                </div>

                {/* Right Side: What you get pills */}
                <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
                  <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 w-full lg:w-auto lg:mr-3 mb-1 lg:mb-0">You'll Get:</span>
                  {whatYouGet.map((item) => (
                    <span 
                      key={`${toolKey}-${item}`}
                      className="text-[11px] font-black uppercase tracking-wider text-[#8B91E3] bg-[rgba(94,106,210,0.10)] border border-[rgba(94,106,210,0.20)] rounded-xl px-3.5 py-1.5 backdrop-blur-md shadow-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Section: Best for + Pro Tip */}
              <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-center gap-3 text-white/50">
                  <div className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-black uppercase tracking-widest">Best For</div>
                  <p className="text-xs font-bold text-white/80">{whenToUse}</p>
                </div>

                {proTip && (
                  <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 shadow-lg shadow-amber-900/10">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </div>
                    <span className="text-[12px] font-bold leading-tight">
                      <span className="text-amber-400 uppercase text-[10px] tracking-widest mr-1.5">Pro tip:</span> {proTip}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeatureGuideBanner;
