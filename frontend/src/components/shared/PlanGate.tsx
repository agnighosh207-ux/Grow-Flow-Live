import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Crown, Lock, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { UpgradeModal } from "@/components/modals/UpgradeModal";

const PLAN_LEVEL: Record<string, number> = { free: 0, starter: 1, creator: 2, infinity: 3 };

function planLevel(planType?: string): number {
  return PLAN_LEVEL[planType ?? "free"] ?? 0;
}

interface TrialStatus {
  used: number;
  limit: number;
  isPaid: boolean;
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

  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [trialLoading, setTrialLoading] = useState(true);
  const [initialTrialLoaded, setInitialTrialLoaded] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const fetchTrialStatus = useCallback(async () => {
    if (!toolKey || !user) {
      setTrialLoading(false);
      setInitialTrialLoaded(true);
      return;
    }
    setTrialLoading(true);
    setTrialError(null);
    try {
      const res = await fetch("/api/trial/status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const used = data[toolKey] ?? 0;
        setTrialStatus({ used, limit: data.limit ?? 3, isPaid: data.isPaid ?? false });
      } else {
        setTrialError("Could not load feature status. Please try again.");
      }
    } catch {
      setTrialError("Network error — check your connection and try again.");
    } finally {
      setTrialLoading(false);
      setInitialTrialLoaded(true);
    }
  }, [toolKey, user]);

  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  const useOneTrial = useCallback(async () => {
    if (!toolKey) return;
    try {
      const res = await fetch("/api/trial/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toolKey }),
      });
      if (res.ok) {
        await fetchTrialStatus();
      } else {
        console.error("[PlanGate] Failed to consume trial:", res.status);
      }
    } catch (err) {
      console.error("[PlanGate] Network error consuming trial:", err);
    }
  }, [toolKey, fetchTrialStatus]);

  if (subLoading || !initialTrialLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (trialError) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-xs">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-white/60 text-sm leading-relaxed">{trialError}</p>
          <Button
            size="sm"
            variant="outline"
            className="border-white/15 text-white/60 hover:text-white hover:border-white/30"
            onClick={fetchTrialStatus}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const userLevel = planLevel(sub?.planType);
  const required = PLAN_LEVEL[requiredPlan] ?? 1;
  const isAdmin = user?.primaryEmailAddress?.emailAddress === "agnighosh207@gmail.com";

  if (isAdmin || userLevel >= required || trialStatus?.isPaid) {
    return (
      <TrialContext.Provider value={{ useOneTrial, trialsLeft: freeTrials }}>
        {children}
      </TrialContext.Provider>
    );
  }

  const trialsUsed = trialStatus?.used ?? 0;
  const trialsLeft = Math.max(0, freeTrials - trialsUsed);
  const hasFreeAccess = freeTrials > 0 && trialsLeft > 0;

  if (hasFreeAccess) {
    return (
      <TrialContext.Provider value={{ useOneTrial, trialsLeft }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-violet-500/25 bg-violet-500/8 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <p className="text-sm text-white/80 leading-tight">
              {trialsLeft === 1
                ? <><span className="text-violet-300 font-semibold">Last free use</span> — upgrade to keep going</>
                : <><span className="text-violet-300 font-semibold">{trialsLeft} free uses remaining</span> — explore before you decide</>
              }
            </p>
          </div>
          <Link href="/pricing">
            <Button
              size="sm"
              className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 py-1.5 h-auto rounded-lg"
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
        targetPlan={requiredPlan === "infinity" ? "pro" : "starter"}
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
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto border border-violet-500/30 cursor-pointer"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(109,40,217,0.08))" }}
              onClick={() => setShowUpgradeModal(true)}
            >
              <Lock className="w-8 h-8 text-violet-400" />
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
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-900/40"
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
