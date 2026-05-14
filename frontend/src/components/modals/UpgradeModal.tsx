import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Check, Loader2, Crown, Lock, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateSubscription, useVerifySubscription, useValidateCoupon } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { NPSModal } from "@/components/modals/NPSModal";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

declare global { interface Window { Razorpay: any; } }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
    script.onload = () => { clearTimeout(timeout); resolve(true); };
    script.onerror = () => { clearTimeout(timeout); resolve(false); };
    document.body.appendChild(script);
  });
}

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "limit" | "expired" | "blocked" | "pro_feature" | "upgrade";
  featureName?: string;
  message?: string;
  targetPlan?: "starter" | "creator" | "infinity";
  billingPeriod?: "monthly" | "quarterly" | "half-yearly" | "yearly";
  currency?: "INR" | "USD";
}

type PlanType = "starter" | "creator" | "infinity";
type PaymentState = "idle" | "pending" | "success" | "error";

const REASONS = {
  upgrade: {
    title: "Upgrade your plan",
    subtitle: "Unlock premium tools and scale your content creation faster.",
  },
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
  "25 content generations per month",
  "All core generation tools",
  "Viral Hooks, Bio & Caption Generator",
  "Content Calendar & Swipe Vault",
  "7-Day Strategy Planner",
  "1 Premium Language",
  "Cancel anytime",
];

const CREATOR_HIGHLIGHTS = [
  "150 content generations per month",
  "Everything in Starter",
  "Trend Engine (live Perplexity search)",
  "Hashtag Intelligence + Performance Predictor",
  "Competitor Analyzer + Content Repurposer",
  "A/B Hook Tester + Viral Score™",
  "10 Premium Languages",
  "Cancel anytime",
];

const INFINITY_HIGHLIGHTS = [
  "Unlimited content generations",
  "Everything in Creator",
  "AI Content Coach (weekly growth reports)",
  "AI Ghostwriter (learns your exact voice)",
  "Priority 70B AI Models (2× faster)",
  "Weekly Trend Alert email digest",
  "VIP 24/7 Priority Support",
  "Cancel anytime",
];

export function UpgradeModal({ open, onClose, reason = "limit", featureName, message, targetPlan = "starter", billingPeriod = "monthly", currency = "INR" }: UpgradeModalProps) {
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(
    reason === "pro_feature" ? "infinity" : targetPlan
  );
  const [purchasedPlan, setPurchasedPlan] = useState<PlanType>(
    reason === "pro_feature" ? "infinity" : targetPlan
  );

  // Sync selected plan when the modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedPlan(reason === "pro_feature" ? "infinity" : targetPlan);
      setPurchasedPlan(reason === "pro_feature" ? "infinity" : targetPlan);
    }
  }, [open, targetPlan, reason]);
  const createSub = useCreateSubscription();
  const verifySub = useVerifySubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showNPS, setShowNPS] = useState(false);
  const validateCoupon = useValidateCoupon();
  const [, setLocation] = useLocation();

  const { title, subtitle } = REASONS[reason];
  const effectiveTitle = reason === "pro_feature" ? "Unlock Infinity Plan" : title;
  const effectiveSubtitle = message
    ? message
    : reason === "pro_feature" && featureName
      ? `${featureName} is exclusive to Infinity. Upgrade to unlock it and all premium features.`
      : subtitle;

  const highlights = selectedPlan === "infinity" ? INFINITY_HIGHLIGHTS : selectedPlan === "creator" ? CREATOR_HIGHLIGHTS : STARTER_HIGHLIGHTS;
  
const getPriceDisplay = (plan: PlanType, period: typeof billingPeriod) => {
  if (currency === "USD") {
    const usdPrices: Record<PlanType, Record<string, string>> = {
      starter: { monthly: "$5", quarterly: "$4.50", "half-yearly": "$4.25", yearly: "$4" },
      creator: { monthly: "$15", quarterly: "$13.50", "half-yearly": "$13", yearly: "$12" },
      infinity: { monthly: "$27", quarterly: "$24.30", "half-yearly": "$23.40", yearly: "$21.60" },
    };
    return usdPrices[plan][period] || usdPrices[plan]["monthly"];
  }
  const inrPrices: Record<PlanType, Record<string, string>> = {
    starter: { monthly: "₹149", quarterly: "₹139", "half-yearly": "₹133", yearly: "₹119" },
    creator: { monthly: "₹449", quarterly: "₹419", "half-yearly": "₹404", yearly: "₹358" },
    infinity: { monthly: "₹799", quarterly: "₹749", "half-yearly": "₹720", yearly: "₹638" },
  };
  return inrPrices[plan][period] || inrPrices[plan]["monthly"];
};

  const price = getPriceDisplay(selectedPlan, billingPeriod);

  const planLabel = selectedPlan === "infinity" ? "Infinity" : selectedPlan === "creator" ? "Creator" : "Starter";
  const purchasedPlanLabel = purchasedPlan === "infinity" ? "Infinity" : purchasedPlan === "creator" ? "Creator" : "Starter";

  const handleClose = () => {
    if (paymentState === "pending") return;
    setPaymentState("idle");
    onClose();
  };

  const handleCheckout = async (forcePlan?: PlanType) => {
    const plan = forcePlan ?? selectedPlan;
    const planLabelForCheckout = plan === "infinity" ? "Infinity" : plan === "creator" ? "Creator" : "Starter";
    setPurchasedPlan(plan);
    setPaymentState("pending");

    try {
      const priceForCheckout = getPriceDisplay(plan, billingPeriod);

      console.log("[UpgradeModal] Loading Razorpay script...");
      const loaded = await loadRazorpay();
      console.log("[UpgradeModal] Razorpay loaded:", loaded, "window.Razorpay:", !!window.Razorpay);

      if (!loaded || !window.Razorpay) {
        toast({
          variant: "destructive",
          title: "Payment gateway unavailable",
          description: "Razorpay could not load. Please check your internet connection and try again, or disable any ad blockers."
        });
        setPaymentState("idle");
        return;
      }

      console.log("[UpgradeModal] Creating subscription on backend...", { plan, billingPeriod, currency });
      const data = await createSub.mutateAsync({ 
        planType: plan, 
        couponCode: discountPercent > 0 ? couponCode : undefined,
        billingPeriod: billingPeriod,
        currency: currency
      });
      console.log("[UpgradeModal] Backend response received:", { hasSubId: !!data?.subscriptionId, keyId: data?.keyId });

      if (!data?.subscriptionId) {
        throw new Error("Failed to initialize subscription with payment provider.");
      }

      const razorpayKey = data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      console.log("[UpgradeModal] Initializing Razorpay with key:", razorpayKey?.substring(0, 8) + "...");

      const options = {
        key: razorpayKey,
        subscription_id: data.subscriptionId,
        name: "GrowFlow AI",
        description: `${planLabelForCheckout} plan · ${priceForCheckout}${billingPeriod === "yearly" ? '/year' : '/month'}`,
        theme: { color: "#7c3aed" },
        prefill: {},
        handler: async (response: any) => {
          setPaymentState("pending"); // Keep loading while verifying
          try {
            await verifySub.mutateAsync({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              planType: plan,
            });
            queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
            setPaymentState("success");
          } catch (err: any) {
            console.error("Verification failed:", err);
            setPaymentState("error");
            toast({ variant: "destructive", title: "Verification failed", description: "Payment was successful but we couldn't verify it. Contact support if your plan isn't active soon." });
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentState("idle");
          },
          escape: true,
          backdropclose: false
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error("Payment failed:", response.error);
        setPaymentState("error");
        toast({ variant: "destructive", title: "Payment Failed", description: response.error.description });
      });
      
      console.log("[UpgradeModal] Final Razorpay Options:", {
        keyLength: options.key?.length,
        subId: options.subscription_id,
        name: options.name,
      });
      console.log("[UpgradeModal] Calling rzp.open()...");
      rzp.open();
      console.log("[UpgradeModal] rzp.open() called.");
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast({ variant: "destructive", title: "Checkout Error", description: err.message || "Failed to start checkout. Please try again." });
      setPaymentState("error");
    }
  };



  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[50] overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center p-4 sm:p-6 pt-[8vh] md:pt-[12vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,8,35,0.97) 0%, rgba(20,10,45,0.97) 100%)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 0 80px -10px rgba(124,58,237,0.4)",
            }}
          >
            <div className="h-0.5 w-full bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-600" />

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
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
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-3">
                        <Sparkles className="w-3 h-3" /> {purchasedPlanLabel} plan activated
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-5 max-w-xs mx-auto">
                        Your {purchasedPlanLabel} plan is now active. Start turning ideas into content across all 4 platforms.
                      </p>

                      <ul className="space-y-1.5 text-left mb-6 max-w-xs mx-auto">
                        {(purchasedPlan === "infinity" ? INFINITY_HIGHLIGHTS : purchasedPlan === "creator" ? CREATOR_HIGHLIGHTS : STARTER_HIGHLIGHTS).slice(0, 3).map(h => (
                          <li key={h} className="flex items-center gap-2 text-xs text-white/60">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-cyan-900/40 mb-3"
                        onClick={handleClose}
                      >
                        <Zap className="w-4 h-4 mr-2" /> Start creating
                      </Button>
                      <button onClick={() => setShowNPS(true)} className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">
                        Quick Feedback?
                      </button>
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
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1 mb-3">
                      Payment cancelled please try again
                    </span>
                    <h2 className="text-xl font-bold text-white mb-2">Payment incomplete</h2>
                    <p className="text-white/50 text-sm leading-relaxed mb-1 max-w-xs mx-auto">
                      Your payment wasn't completed. No charge was made.
                    </p>
                    <p className="text-white/30 text-xs mb-6">
                      You can try again — your card details are pre-filled.
                    </p>
                    <Button
                      className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-cyan-900/40 mb-3"
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
                        <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/25 flex items-center justify-center">
                          <Lock className="w-4 h-4 text-cyan-400" />
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

                    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] p-4 mb-5">
                      <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest mb-3">
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
                        <span className="text-2xl font-bold text-white">{currency === "USD" ? "$27" : "₹799"}</span>
                        <span className="text-white/40 text-xs ml-1">/month</span>
                      </div>
                      <span className="text-[10px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-1 font-semibold">
                        Cancel anytime
                      </span>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-cyan-900/40 mb-2"
                      onClick={() => handleCheckout("infinity")}
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
                        <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/25 flex items-center justify-center">
                          <Crown className="w-4 h-4 text-cyan-400" />
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

                    <div className="flex flex-col gap-4 mb-6">


                      <Button
                        className="w-full h-16 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-cyan-900/40"
                        onClick={() => handleCheckout("creator")}
                        disabled={paymentState === "pending"}
                      >
                        {paymentState === "pending" ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Activating...</>
                        ) : (
                          <><Zap className="w-5 h-5 mr-2" /> Upgrade to Creator →</>
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
                        <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/25 flex items-center justify-center">
                          <Crown className="w-4 h-4 text-cyan-400" />
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

                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 hide-scrollbar">
                      {(["starter", "creator", "infinity"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedPlan(p)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all duration-200 whitespace-nowrap min-w-[100px] ${
                            selectedPlan === p
                              ? "bg-cyan-600/25 border-cyan-500/50 text-cyan-200"
                              : "border-white/8 text-white/40 hover:text-white/60 hover:border-white/15"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span>{p === "infinity" ? "Infinity" : p === "creator" ? "Creator" : "Starter"}</span>
                            <span className="text-[10px] font-normal opacity-80">
                              {currency === "USD" 
                                ? (p === "infinity" ? "$27/mo" : p === "creator" ? "$15/mo" : "$5/mo")
                                : (p === "infinity" ? "₹799/mo" : p === "creator" ? "₹449/mo" : "₹149/mo")
                              }
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-xl border border-white/6 bg-white/[0.02] p-4 mb-5">
                      <div className="flex items-end gap-1 mb-3">
                        <span className="text-3xl font-bold text-white">
                          {discountPercent > 0 ? (
                            <>
                              <span className="line-through text-white/40 text-xl mr-2">{price}</span>
                              {currency === "USD" ? "$" : "₹"}{Math.round(parseInt(price.replace('₹', '').replace('$', '')) * (1 - discountPercent / 100))}
                            </>
                          ) : (
                            price
                          )}
                        </span>
                        <span className="text-white/40 text-sm mb-0.5">/month</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5 font-medium">
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
                            <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-cyan-900/40 mb-2"
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
          <NPSModal open={showNPS} onClose={() => { setShowNPS(false); handleClose(); }} trigger="upgrade" />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
