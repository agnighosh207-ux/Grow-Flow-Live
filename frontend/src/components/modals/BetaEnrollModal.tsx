import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2, Zap, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBetaActivate } from "@/hooks/useSubscription";

export interface BetaEnrollPlan {
  name: string;
  planType: "starter" | "creator" | "infinity";
  color: "emerald" | "violet" | "purple";
  price: string;
  highlights: string[];
}

interface BetaEnrollModalProps {
  open: boolean;
  onClose: () => void;
  plan: BetaEnrollPlan | null;
}

const PLAN_ICON = {
  starter: Star,
  creator: Zap,
  infinity: Sparkles,
};

const COLOR_MAP = {
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    icon: "bg-emerald-500/15 border-emerald-500/25 text-emerald-300",
    button: "bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/35 text-emerald-200 hover:text-white",
    glow: "shadow-emerald-500/20",
    border: "rgba(16,185,129,0.3)",
    ring: "rgba(16,185,129,0.08)",
    highlight: "text-emerald-300",
    check: "text-emerald-400",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    icon: "bg-violet-500/15 border-violet-500/25 text-violet-300",
    button: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30",
    glow: "shadow-violet-500/20",
    border: "rgba(124,58,237,0.35)",
    ring: "rgba(124,58,237,0.08)",
    highlight: "text-violet-300",
    check: "text-violet-400",
  },
  purple: {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    icon: "bg-purple-500/15 border-purple-500/25 text-purple-300",
    button: "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/30",
    glow: "shadow-purple-500/20",
    border: "rgba(168,85,247,0.35)",
    ring: "rgba(168,85,247,0.08)",
    highlight: "text-purple-300",
    check: "text-violet-400",
  },
};

export function BetaEnrollModal({ open, onClose, plan }: BetaEnrollModalProps) {
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { mutate: activate, isPending } = useBetaActivate();

  const handleActivate = () => {
    if (!plan) return;
    setErrorMsg(null);
    
    const timeoutId = setTimeout(() => {
      setErrorMsg("Request timed out - check your connection");
    }, 12000);

    activate(
      { planType: plan.planType },
      {
        onSuccess: () => {
          clearTimeout(timeoutId);
          setSuccess(true);
        },
        onError: (err: any) => {
          clearTimeout(timeoutId);
          setErrorMsg(err?.message || "Failed to activate plan");
        },
      }
    );
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSuccess(false);
      setErrorMsg(null);
    }, 300);
  };

  const colors = plan ? COLOR_MAP[plan.color] : COLOR_MAP.violet;
  const PlanIcon = plan ? PLAN_ICON[plan.planType] : Sparkles;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,10,40,0.98) 0%, rgba(20,10,50,0.98) 100%)",
              border: `1px solid ${colors.border}`,
              boxShadow: `0 0 80px ${colors.ring}`,
            }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              {!success ? (
                <>
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors.icon}`}>
                      <PlanIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{plan?.name ?? ""} Plan</h2>
                        <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 ${colors.badge}`}>
                          Beta Access
                        </span>
                      </div>
                      <p className="text-white/45 text-xs">{plan?.price ?? ""} / mo · Free during beta</p>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-4 mb-5"
                    style={{ background: colors.ring, border: `1px solid ${colors.border}` }}
                  >
                    <p className="text-sm text-white/80 leading-relaxed">
                      You're in <strong className={colors.highlight}>beta</strong> — activate this plan right now at{" "}
                      <strong className="text-white">no charge</strong>. No payment needed, no credit card required.
                    </p>
                  </div>

                  {plan && plan.highlights.length > 0 && (
                    <div className="space-y-2 mb-6">
                      {plan.highlights.map((h) => (
                        <div key={h} className="flex items-start gap-2.5">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${colors.check}`} />
                          <span className="text-white/70 text-sm">{h}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 mb-3">
                      <p className="text-red-300 text-xs font-medium">Error</p>
                      <p className="text-red-200 text-xs mt-1 break-words">{errorMsg}</p>
                    </div>
                  )}

                  <Button
                    className={`w-full h-11 font-semibold ${colors.button}`}
                    onClick={handleActivate}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                    ) : (
                      "Activate Plan — Free During Beta"
                    )}
                  </Button>

                  <p className="text-center text-white/25 text-xs mt-4">
                    Beta access · No payment required
                  </p>
                </>
              ) : (
                <motion.div
                  className="text-center py-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {plan?.name ?? ""} Plan Activated!
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed mb-6">
                    Your <strong className={colors.highlight}>{plan?.name ?? ""}</strong> plan is now active — completely free during beta. Enjoy all the features!
                  </p>
                  <Button
                    onClick={handleClose}
                    className="bg-white/10 hover:bg-white/15 border border-white/15 text-white/80"
                  >
                    Start Creating
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
