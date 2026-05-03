import { createContext, useContext, useState, useCallback } from "react";
import { Link } from "wouter";
import { Crown, Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { api } from "@/lib/api-client";

const PLAN_LEVEL: Record<string, number> = { free: 0, starter: 1, creator: 2, infinity: 3 };

function planLevel(planType?: string): number {
  return PLAN_LEVEL[planType ?? "free"] ?? 0;
}

interface TrialCtx {
  useOneTrial: () => void;
  trialsLeft: number;
}

const TrialContext = createContext<TrialCtx>({ useOneTrial: () => {}, trialsLeft: 0 });

export function useTrialAction() {
  return useContext(TrialContext);
}

interface PlanGateProps {
  requiredPlan: "starter" | "creator" | "infinity";
  featureName: string;
  description?: string;
  toolKey?: string;
  freeTrials?: number;
  children: React.ReactNode;
}

export function PlanGate({ requiredPlan, featureName, description, toolKey, freeTrials = 0, children }: PlanGateProps) {
  const { data: sub, isLoading: subLoading } = useSubscriptionStatus();
  const { user } = useUser();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Derive trial info directly from subscription status — no extra /api/trial/status call
  const trialsLeft = sub?.generationsRemaining ?? 0;
  const isPaid = sub?.plan === "active" || sub?.plan === "trial" || sub?.plan === "pending" || sub?.plan === "past_due";

  const useOneTrial = useCallback(async () => {
    if (!toolKey) return;
    try {
      await api.post("/trial/use", { toolKey });
    } catch (err) {
      console.error("[PlanGate] Error consuming trial:", err);
    }
  }, [toolKey]);

  // Don't block render — show content optimistically, overlay trial info when ready
  if (subLoading) {
    return <>{children}</>;
  }

  const userLevel = planLevel(sub?.planType);
  const required = PLAN_LEVEL[requiredPlan] ?? 1;
  const isAdmin = !!(sub as any)?.isAdmin;

  if (isAdmin || userLevel >= required || isPaid) {
    return (
      <TrialContext.Provider value={{ useOneTrial, trialsLeft: freeTrials }}>
        {children}
      </TrialContext.Provider>
    );
  }

  const hasFreeAccess = freeTrials > 0 && trialsLeft > 0;

  if (hasFreeAccess) {
    return (
      <TrialContext.Provider value={{ useOneTrial, trialsLeft }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-sm text-white/80 leading-tight">
              {trialsLeft === 1
                ? <><span className="text-cyan-300 font-semibold">Last free use</span> — upgrade to keep going</>
                : <><span className="text-cyan-300 font-semibold">{trialsLeft} free uses remaining</span> — explore before you decide</>
              }
            </p>
          </div>
          <Link href="/pricing">
            <Button
              size="sm"
              className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 h-auto rounded-lg"
            >
              Upgrade
            </Button>
          </Link>
        </motion.div>
        {children}
      </TrialContext.Provider>
    );
  }

  const planLabel = requiredPlan === "infinity" ? "Infinity" : requiredPlan === "creator" ? "Creator" : "Starter";

  return (
    <>
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="pro_feature"
        featureName={featureName}
        message="This feature can boost your content performance. Unlock with Infinity."
        targetPlan={requiredPlan}
      />

      <div className="relative min-h-[60vh] rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none select-none"
          style={{ filter: "blur(6px)", transform: "scale(1.02)" }}
          aria-hidden="true"
        >
          <div className="p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-16 bg-white/5 rounded-xl border border-white/5" />
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 flex items-center justify-center min-h-[60vh] p-6"
          onClick={() => setShowUpgradeModal(true)}
          style={{ cursor: "pointer" }}
        >
          <div
            className="text-center space-y-5 max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/30 cursor-pointer"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(109,40,217,0.08))" }}
              onClick={() => setShowUpgradeModal(true)}
            >
              <Lock className="w-8 h-8 text-cyan-400" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="space-y-2"
            >
              <h3 className="text-white font-bold text-xl">{featureName}</h3>
              <p className="text-white/45 text-sm leading-relaxed">
                {description || `This feature is part of the ${planLabel} Plan — unlock to generate better content`}
              </p>
              {freeTrials > 0 && (
                <p className="text-white/30 text-xs">
                  You've used all {freeTrials} free trials for this tool.
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="space-y-3"
            >
              <Button
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-900/40"
                onClick={() => setShowUpgradeModal(true)}
              >
                <Crown className="w-4 h-4 mr-2" />
                Unlock {planLabel} Plan
              </Button>
              <p className="text-white/20 text-xs">Easy payments · Cancel anytime</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
