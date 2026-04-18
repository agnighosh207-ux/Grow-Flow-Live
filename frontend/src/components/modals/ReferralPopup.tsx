import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferralInfo, useMarkReferralPopupSeen } from "@/hooks/useReferral";
import { useToast } from "@/hooks/use-toast";

export function ReferralPopup() {
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: referral, isSuccess } = useReferralInfo();
  const markSeen = useMarkReferralPopupSeen();
  const { toast } = useToast();

  useEffect(() => {
    if (!isSuccess) return;
    if (referral?.hasSeenReferralPopup) return;
    const timer = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(timer);
  }, [isSuccess, referral?.hasSeenReferralPopup]);

  function dismiss() {
    setVisible(false);
    markSeen.mutate();
  }

  async function handleSubmit() {
    if (!code) { dismiss(); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/complete-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: "Welcome!", description: "If the code is valid, 15 Infinity days have been granted." });
      dismiss();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Oops!", description: e.message || "Failed to apply code" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-8 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm"
          >
            <div
              className="relative rounded-2xl overflow-hidden p-6"
              style={{
                background:
                  "linear-gradient(145deg, rgba(16,6,40,0.98) 0%, rgba(10,3,28,0.98) 100%)",
                border: "1px solid rgba(124,58,237,0.3)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.7), 0 0 80px rgba(124,58,237,0.12)",
              }}
            >
              <button
                onClick={dismiss}
                className="absolute top-3.5 right-3.5 text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.2))",
                    border: "1px solid rgba(124,58,237,0.3)",
                  }}
                >
                  <Gift className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    🎁 Welcome to GrowFlow AI
                  </h3>
                  <p className="text-[11px] text-white/40 mt-0.5">Let's get you set up</p>
                </div>
              </div>

              <p className="text-sm text-white/80 leading-relaxed mb-1.5">
                Got a <span className="font-semibold text-violet-300">Referral Code</span>?
              </p>
              <p className="text-xs text-white/40 mb-5">
                Enter it below to instantly unlock 15 days of Infinity Access for free!
              </p>

              <div className="mb-4">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  className="w-full h-11 bg-black/20 border border-white/10 rounded-xl px-4 text-center font-mono text-white text-lg tracking-widest placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-11 font-semibold text-sm rounded-xl mb-2.5 relative overflow-hidden bg-violet-600 hover:bg-violet-500 text-white"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : code ? "Claim Free Days" : "Continue to App"}
              </Button>

              <button
                onClick={dismiss}
                className="w-full text-center text-xs text-white/30 hover:text-white/55 transition-colors py-1"
              >
                Skip
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
