import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Loader2, Crown, Lock, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateSubscription, useVerifySubscription, useValidateCoupon } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

declare global { interface Window { Razorpay: any; } }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "limit" | "expired" | "blocked" | "pro_feature";
  featureName?: string;
  message?: string;
  targetPlan?: "starter" | "pro";
}

type PaymentState = "idle" | "pending" | "success" | "error";

const REASONS = {
  limit: {
    title: "You've reached your free limit",
    subtitle: "You've reached your free limit. Upgrade to continue.",
  },
  expired: { title: "Trial expired", subtitle: "Your trial has ended. Subscribe to continue." },
  blocked: { title: "Access blocked", subtitle: "Your account access is restricted. Please resubscribe." },
  pro_feature: { title: "Unlock Infinity Plan", subtitle: "This feature is exclusive to the Infinity plan. Upgrade to unlock it and much more." },
};

const INFINITY_BENEFITS = [
  { icon: "⚡", label: "Viral Mode", desc: "Max-engagement hooks that drive shares" },
  { icon: "🔀", label: "Multi-variation outputs", desc: "3 versions per generation to find your winner" },
  { icon: "🎣", label: "Hook Generator", desc: "AI-crafted hooks optimized per platform" },
  { icon: "📅", label: "Content Calendar", desc: "Plan your entire content week in one place" },
];

const STARTER_HIGHLIGHTS = [
  "50 content generations per month",
  "Instagram, YouTube, Twitter, LinkedIn",
  "Hooks, CTAs, hashtags — all structured",
  "Idea Generator + 7-Day Strategy Planner",
  "Full content history & saved posts",
  "Cancel anytime",
];

const PRO_HIGHLIGHTS = [
  "Unlimited content generations",
  "AI Writing Styles (Bold · Viral · Story · Pro)",
  "Viral Score™ — rate content virality 0–100",
  "Trending Topics Feed — daily fresh ideas",
  "Multi-Variation Output (3× per generation)",
  "Content Calendar + Performance Insights",
  "Priority AI (2× faster) + Priority Support",
];

export function UpgradeModal({ open, onClose, reason = "limit", featureName, message, targetPlan = "starter" }: UpgradeModalProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro">(
    reason === "pro_feature" ? "pro" : targetPlan
  );
  const [purchasedPlan, setPurchasedPlan] = useState<"starter" | "pro">(
    reason === "pro_feature" ? "pro" : targetPlan
  );
  const createSub = useCreateSubscription();
  const verifySub = useVerifySubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const validateCoupon = useValidateCoupon();
  const [, setLocation] = useLocation();

  const { title, subtitle } = REASONS[reason];
  const effectiveTitle = reason === "pro_feature" ? "Unlock Infinity Plan" : title;
  const effectiveSubtitle = message
    ? message
    : reason === "pro_feature" && featureName
      ? `${featureName} is exclusive to Infinity. Upgrade to unlock it and all premium features.`
      : subtitle;

  const highlights = selectedPlan === "pro" ? PRO_HIGHLIGHTS : STARTER_HIGHLIGHTS;
  const price = selectedPlan === "pro" ? "₹399" : "₹249";
  const planLabel = selectedPlan === "pro" ? "Infinity" : "Creator";
  const purchasedPlanLabel = purchasedPlan === "pro" ? "Infinity" : "Creator";

  const handleClose = () => {
    if (paymentState === "pending") return;
    setPaymentState("idle");
    onClose();
  };

  const handleCheckout = async (forcePlan?: "starter" | "pro") => {
    const plan = forcePlan ?? selectedPlan;
    const planLabelForCheckout = plan === "pro" ? "Infinity" : "Creator";
    setPurchasedPlan(plan);
    setPaymentState("pending");

    try {
      const priceForCheckout = plan === "pro" ? "₹499" : "₹249";
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast({ variant: "destructive", title: "Could not load payment gateway. Check your connection." });
        setPaymentState("idle");
        return;
      }

      const data = await createSub.mutateAsync({ planType: plan === "pro" ? "infinity" : "creator", couponCode: discountPercent > 0 ? couponCode : undefined });

      const options = {
        key: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        subscription_id: data.subscriptionId,
        name: "GrowFlow AI",
        description: `${planLabelForCheckout} plan · ${priceForCheckout}/month`,
        theme: { color: "#7c3aed" },
        prefill: {},
        handler: async (response: any) => {
          try {
            await verifySub.mutateAsync({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              planType: plan === "pro" ? "infinity" : "creator",
            });
            queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
            setPaymentState("success");
          } catch {
            setPaymentState("error");
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentState((prev) => (prev === "pending" ? "error" : prev));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message || "Failed to start checkout" });
      setPaymentState("idle");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-2xl border border-violet-500/25 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,8,35,0.97) 0%, rgba(20,10,45,0.97) 100%)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 0 80px -10px rgba(124,58,237,0.4)",
            }}
          >
            <div className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600" />

            <div className="p-6">
              <AnimatePresence mode="wait">

                {paymentState === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.05 }}
                      className="w-18 h-18 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mb-5"
                      style={{ width: 72, height: 72 }}
                    >
                      <Check className="w-9 h-9 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-3">
                        <Sparkles className="w-3 h-3" /> {purchasedPlanLabel} plan activated
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-5 max-w-xs mx-auto">
                        Your {purchasedPlanLabel} plan is now active. Start turning ideas into content across all 4 platforms.
                      </p>

                      <ul className="space-y-1.5 text-left mb-6 max-w-xs mx-auto">
                        {(purchasedPlan === "pro" ? PRO_HIGHLIGHTS : STARTER_HIGHLIGHTS).slice(0, 3).map(h => (
                          <li key={h} className="flex items-center gap-2 text-xs text-white/60">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-900/40"
                        onClick={handleClose}
                      >
                        <Zap className="w-4 h-4 mr-2" /> Start creating
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : paymentState === "error" ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center text-center py-4"
                  >
                    <div
                      className="rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-4"
                      style={{ width: 64, height: 64 }}
                    >
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Payment incomplete</h2>
                    <p className="text-white/50 text-sm leading-relaxed mb-1 max-w-xs mx-auto">
                      Your payment wasn't completed. No charge was made.
                    </p>
                    <p className="text-white/30 text-xs mb-6">
                      You can try again — your card details are pre-filled.
                    </p>
                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-900/40 mb-3"
                      onClick={() => handleCheckout()}
                    >
                      <Zap className="w-4 h-4 mr-2" /> Try again
                    </Button>
                    <button
                      onClick={handleClose}
                      className="text-xs text-white/30 hover:text-white/50 transition-colors"
                    >
                      Maybe later
                    </button>
                  </motion.div>
                ) : reason === "pro_feature" ? (
                  <motion.div key="pro_feature" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/25 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <h2 className="font-bold text-white text-base leading-tight">{effectiveTitle}</h2>
                          <p className="text-white/50 text-xs mt-0.5">{effectiveSubtitle}</p>
                        </div>
                      </div>
                      <button onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 mb-5">
                      <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-3">
                        What you unlock
                      </p>
                      <ul className="space-y-2.5">
                        {INFINITY_BENEFITS.map((b) => (
                          <li key={b.label} className="flex items-start gap-2.5">
                            <span className="text-sm shrink-0 mt-0.5">{b.icon}</span>
                            <div>
                              <span className="text-xs font-semibold text-white/85">{b.label}</span>
                              <span className="text-xs text-white/40 ml-1.5">{b.desc}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between mb-4 px-1">
                      <div>
                        <span className="text-2xl font-bold text-white">₹399</span>
                        <span className="text-white/40 text-xs ml-1">/month</span>
                      </div>
                      <span className="text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-1 font-semibold">
                        Cancel anytime
                      </span>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-900/40 mb-2"
                      onClick={() => handleCheckout("pro")}
                      disabled={paymentState === "pending"}
                    >
                      {paymentState === "pending" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" /> Unlock Full Power</>
                      )}
                    </Button>

                    <button
                      onClick={handleClose}
                      className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors py-1"
                    >
                      Maybe Later
                    </button>
                  </motion.div>
                ) : reason === "limit" ? (
                  <motion.div key="limit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/25 flex items-center justify-center">
                          <Crown className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <h2 className="font-bold text-white text-base leading-tight">{effectiveTitle}</h2>
                          <p className="text-white/50 text-xs mt-0.5 max-w-[260px] leading-relaxed">{effectiveSubtitle}</p>
                        </div>
                      </div>
                      <button onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-3 mb-5">
                      <Button
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 text-white/80 hover:text-white font-semibold text-sm rounded-xl transition-all duration-200"
                        variant="outline"
                        onClick={() => handleCheckout("starter")}
                        disabled={paymentState === "pending"}
                      >
                        {paymentState === "pending" ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                        ) : (
                          <>Get Unlimited Access</>
                        )}
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-900/40"
                        onClick={() => handleCheckout("pro")}
                        disabled={paymentState === "pending"}
                      >
                        {paymentState === "pending" ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                        ) : (
                          <><Zap className="w-4 h-4 mr-1.5" /> Unlock Full Power</>
                        )}
                      </Button>
                    </div>

                    <p className="text-center text-[11px] text-white/35 leading-relaxed mb-1">
                      Creators using Infinity grow faster with better-performing content
                    </p>

                    <button
                      onClick={() => { handleClose(); setLocation("/pricing"); }}
                      className="w-full text-center text-xs text-white/25 hover:text-white/50 transition-colors py-1"
                    >
                      Compare all plans
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="checkout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/25 flex items-center justify-center">
                          <Crown className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <h2 className="font-bold text-white text-base leading-tight">{effectiveTitle}</h2>
                          <p className="text-white/50 text-xs mt-0.5">{effectiveSubtitle}</p>
                        </div>
                      </div>
                      <button onClick={handleClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-4">
                      {(["starter", "pro"] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setSelectedPlan(p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                            selectedPlan === p
                              ? "bg-violet-600/25 border-violet-500/50 text-violet-200"
                              : "border-white/8 text-white/40 hover:text-white/60 hover:border-white/15"
                          }`}
                        >
                          {p === "pro" ? "Infinity · ₹399/mo" : "Creator · ₹249/mo"}
                          {p === "pro" && <span className="ml-1 text-[9px] text-violet-400">★ Best</span>}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 mb-5">
                      <div className="flex items-end gap-1 mb-3">
                        <span className="text-3xl font-bold text-white">
                          {discountPercent > 0 ? (
                            <>
                              <span className="line-through text-white/40 text-xl mr-2">{price}</span>
                              ₹{Math.round(parseInt(price.replace('₹', '')) * (1 - discountPercent / 100))}
                            </>
                          ) : (
                            price
                          )}
                        </span>
                        <span className="text-white/40 text-sm mb-0.5">/month</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2.5 py-0.5 font-medium">
                          <Zap className="w-2.5 h-2.5" /> {planLabel} plan
                        </span>
                      </div>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          placeholder="Coupon Code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs px-3 bg-white/10 hover:bg-white/20"
                          onClick={async () => {
                            if (!couponCode) return;
                            try {
                              const res = await validateCoupon.mutateAsync(couponCode);
                              if (res.success) {
                                setDiscountPercent(res.discountPercent);
                                toast({ title: "Coupon Applied!", description: `You got ${res.discountPercent}% off.` });
                              }
                            } catch (err: any) {
                              setDiscountPercent(0);
                              toast({ variant: "destructive", title: "Invalid Coupon", description: err.message });
                            }
                          }}
                          disabled={validateCoupon.isPending || !couponCode}
                        >
                          {validateCoupon.isPending ? "..." : "Apply"}
                        </Button>
                      </div>
                      <ul className="space-y-1.5">
                        {highlights.map((h) => (
                          <li key={h} className="flex items-center gap-2 text-xs text-white/70">
                            <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-900/40 mb-2"
                      onClick={() => handleCheckout()}
                      disabled={paymentState === "pending"}
                    >
                      {paymentState === "pending" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" /> Unlock Full Power</>
                      )}
                    </Button>


                    <button
                      onClick={() => { handleClose(); setLocation("/pricing"); }}
                      className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors py-1"
                    >
                      Compare all plans
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
