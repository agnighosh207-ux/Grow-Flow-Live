import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { Zap, Plus } from "lucide-react";
import { useLocation } from "wouter";

export function CreditWallet() {
  const { data: sub } = useSubscriptionStatus();
  const [, setLocation] = useLocation();
  
  if (!sub || sub.plan === "free") return null;
  if (sub.planType === "infinity") {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center 
            justify-center">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-medium">Credit Wallet</p>
            <p className="text-lg font-black text-violet-300">∞ Unlimited</p>
          </div>
        </div>
        <p className="text-[11px] text-white/30">
          Infinity plan — generate as much as you want, forever.
        </p>
      </div>
    );
  }
  
  const pct = Math.max(0, Math.min(100, 
    ((sub.generationsRemaining || 0) / (sub.generationLimit || 25)) * 100
  ));
  const isLow = pct <= 20;
  const isCritical = pct <= 5;
  
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-semibold text-white">Credit Wallet</p>
        </div>
        <button
          onClick={() => setLocation("/pricing#topup")}
          className="flex items-center gap-1.5 text-[11px] font-bold 
            text-violet-400 hover:text-violet-300 bg-violet-500/10 
            hover:bg-violet-500/15 border border-violet-500/20 px-2.5 
            py-1.5 rounded-lg transition-all"
        >
          <Plus className="w-3 h-3" />
          Buy Credits
        </button>
      </div>
      
      {/* Credit numbers */}
      <div className="flex items-end gap-1 mb-3">
        <span className={`text-3xl font-black ${
          isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-white"
        }`}>
          {sub.generationsRemaining}
        </span>
        <span className="text-white/30 text-sm mb-1">
          / {sub.generationLimit} credits
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isCritical ? "bg-red-500" : 
            isLow ? "bg-amber-500" : 
            "bg-gradient-to-r from-violet-600 to-violet-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      
      {/* Status text */}
      <div className="flex justify-between items-center">
        <p className="text-[11px] text-white/30">
          {sub.monthlyGenerationsUsed || 0} used this month
        </p>
        {isLow && (
          <p className={`text-[11px] font-semibold ${
            isCritical ? "text-red-400" : "text-amber-400"
          }`}>
            {isCritical ? "⚠️ Almost out!" : "Running low"}
          </p>
        )}
      </div>
      
      {/* Buy more packs inline when low */}
      {isLow && (
        <div className="mt-4 p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
          <p className="text-[11px] text-violet-400 font-semibold mb-2">
            Quick top-up
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "10 credits", price: "₹49", pack: "small" },
              { label: "25 credits", price: "₹99", pack: "medium" },
              { label: "60 credits", price: "₹199", pack: "large" },
            ].map(p => (
              <button
                key={p.pack}
                onClick={() => setLocation(`/pricing?topup=${p.pack}`)}
                className="p-2 rounded-lg bg-white/5 border border-white/8 
                  hover:border-violet-500/30 hover:bg-violet-500/5 
                  transition-all text-center"
              >
                <p className="text-[10px] text-white/50">{p.label}</p>
                <p className="text-sm font-black text-violet-400">{p.price}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
