import { ReactNode, useState } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FeatureGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredPlan?: "starter" | "creator" | "infinity";
  featureName: string;
}

const planHierarchy = {
  free: 0,
  starter: 1,
  creator: 2,
  infinity: 3,
};

export function FeatureGuard({ children, fallback, requiredPlan = "infinity", featureName }: FeatureGuardProps) {
  const { data: sub } = useSubscriptionStatus();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const currentPlan = (sub?.planType as keyof typeof planHierarchy) || "free";
  const currentRank = planHierarchy[currentPlan];
  const requiredRank = planHierarchy[requiredPlan];

  const hasAccess = currentRank >= requiredRank || (sub?.planType === "infinity");

  if (hasAccess) {
    return <>{children}</>;
  }

  const handleGuardedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUpgradeModal(true);
  };

  return (
    <>
      <div onClick={handleGuardedClick} className="relative group cursor-pointer">
        {/* Render children pointer-events-none so click bubbles to wrapper */}
        <div className="pointer-events-none opacity-50 transition-opacity">
          {children}
        </div>
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/20 backdrop-blur-[1px] rounded-md">
          <span className="flex items-center gap-1.5 px-2 py-1 bg-cyan-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-cyan-900/50">
            <Lock className="w-3 h-3" /> Locked
          </span>
        </div>
      </div>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md border-cyan-500/20 bg-[#0a041c]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-cyan-50">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Pro Feature Locked
            </DialogTitle>
            <DialogDescription className="text-cyan-200/70 pt-2 text-sm leading-relaxed">
              This is an <span className="font-semibold text-cyan-300 capitalize">{requiredPlan}</span> feature. Upgrade now to unlock Pro-level virality and gain access to {featureName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-white/5">
            <Button variant="ghost" className="text-white/50 hover:text-white" onClick={() => setShowUpgradeModal(false)}>
              Cancel
            </Button>
            <Link href="/pricing">
              <Button className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
