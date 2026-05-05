import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useRazorpay } from "react-razorpay";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown, Zap, Shield, ChevronRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateSubscription, useVerifySubscription } from "@/hooks/useSubscription";

type BillingPeriod = "monthly" | "quarterly" | "half-yearly" | "yearly";
type Currency = "INR" | "USD";

export function PricingTable() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [currency, setCurrency] = useState<Currency>(() => {
    try {
      if (typeof window !== "undefined") {
        return (localStorage.getItem("pricing_currency") as Currency) || "INR";
      }
    } catch (e) {
      console.warn("localStorage access denied");
    }
    return "INR";
  });
  const [hoveredPlan, setHoveredPlan] = useState<string | null>("creator");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { user } = useUser();
  const { Razorpay } = useRazorpay();
  const createSub = useCreateSubscription();
  const verifySub = useVerifySubscription();
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem("pricing_currency", currency);
    } catch (e) {}
  }, [currency]);

  // Bug 28 Fix: Track mount status to prevent confetti/redirect after unmount
  const [isMounted, setIsMounted] = useState(true);
  useEffect(() => {
    return () => setIsMounted(false);
  }, []);

  const getPrice = (planId: string) => {
    if (planId === "free") return currency === "INR" ? "₹0" : "$0";

    const prices: Record<string, Record<Currency, Record<BillingPeriod, string>>> = {
      starter: {
        INR: { monthly: "149", quarterly: "139", "half-yearly": "133", yearly: "119" },
        USD: { monthly: "5", quarterly: "4.50", "half-yearly": "4.25", yearly: "4" },
      },
      creator: {
        INR: { monthly: "449", quarterly: "419", "half-yearly": "404", yearly: "358" },
        USD: { monthly: "15", quarterly: "13.50", "half-yearly": "13", yearly: "12" },
      },
      infinity: {
        INR: { monthly: "799", quarterly: "749", "half-yearly": "720", yearly: "638" },
        USD: { monthly: "27", quarterly: "24.30", "half-yearly": "23.40", yearly: "21.60" },
      },
    };

    const symbol = currency === "INR" ? "₹" : "$";
    return `${symbol}${prices[planId][currency][billingPeriod]}`;
  };

  const handleCheckout = useCallback(async (planId: string, planName: string) => {
    if (!user) {
      alert("Please login first to upgrade.");
      return;
    }

    if (planId === "free") return;

    try {
      setIsProcessing(planId);
      const effectivePlan = planId as "starter" | "creator" | "infinity";
      
      const data = await createSub.mutateAsync({ 
        planType: effectivePlan,
        billingPeriod: billingPeriod,
        currency: currency
      });
      const { subscriptionId, keyId } = data;

      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        subscription_id: subscriptionId,
        name: "Grow Flow AI",
        description: `${planName} Plan Subscription`,
        // --- FIX: Razorpay Checkout Freeze ---
        // Removed broken image placeholder to prevent modal load delays.
        handler: async function (res: any) {
          try {
            await verifySub.mutateAsync({
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_subscription_id: res.razorpay_subscription_id,
              razorpay_signature: res.razorpay_signature,
              planType: effectivePlan
            });

            if (isMounted) {
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
              alert(`Welcome to ${planName}!\nPayment ID: ${res.razorpay_payment_id}`);
              
              setTimeout(() => {
                if (isMounted) setLocation("/generate");
              }, 2000);
            }
          } catch(err) {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: user.fullName || "User",
          email: user.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#00F2FF" },
      };

      const rzp = new Razorpay(options as any);
      rzp.on("payment.failed", function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      alert(err.message || "Failed to initialize checkout.");
    } finally {
      setIsProcessing(null);
    }
  }, [Razorpay, user, createSub, verifySub, billingPeriod, currency]);

  const plans = [
    {
      id: "free",
      name: "Free",
      label: "The Hook",
      subtitle: "Taste the power. No card needed.",
      icon: Zap,
      features: ["5 Generations / month", "Main Content Generator", "All 4 Platforms", "English Only", "GrowFlow Watermark"],
      buttonText: "Start Free",
    },
    {
      id: "starter",
      name: "Starter",
      label: "Rising Creator",
      subtitle: "For creators building momentum.",
      icon: Sparkles,
      features: ["25 Generations / month", "All Core Generation Tools", "Viral Hooks Generator", "Content Calendar", "Swipe Vault (inspiration library)", "Bio & Caption Generator", "7-Day Strategy Planner", "1 Premium Language", "Email Support"],
      buttonText: "Start Creating",
    },
    {
      id: "creator",
      name: "Creator",
      label: "Most Popular",
      subtitle: "For serious creators who want to go viral consistently.",
      isRecommended: true,
      icon: Zap,
      features: ["150 Generations / month", "Everything in Starter", "Trend Engine (Perplexity-powered)", "Hashtag Intelligence Suite", "Performance Predictor (pre-post scoring)", "Competitor Intelligence", "Content Repurposer (6 formats)", "A/B Hook Tester", "Viral Score™ (0-100 AI rating)", "10 Premium Languages", "Priority Support"],
      buttonText: "Go Creator",
    },
    {
      id: "infinity",
      name: "Infinity",
      label: "Unlimited Power",
      subtitle: "The complete AI content agency in your pocket.",
      isInfinity: true,
      valueProp: "Used by agencies billing ₹50,000/month to their clients.",
      icon: Crown,
      features: ["Unlimited Generations", "Everything in Creator", "AI Content Coach (weekly growth report)", "AI Ghostwriter (writes in your exact voice)", "Priority 70B Pro Models (2× faster)", "Unlimited Regenerations", "Trend Alert Digest (weekly email)", "VIP 24/7 Support"],
      buttonText: "Join Infinity",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4"
        >
          Supercharge Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">Content Journey</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-cyan-200/60"
        >
          Choose the perfect plan to hack algorithms, save hours of time, and build an audience on autopilot.
        </motion.p>
      </div>

      <div className="flex flex-col items-center gap-8 mb-20">
        <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
          {(["monthly", "quarterly", "half-yearly", "yearly"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setBillingPeriod(p)}
              className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                billingPeriod === p ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-white/30 hover:text-white/60"
              }`}
            >
              {p === "half-yearly" ? "6-Month" : p.replace('-', ' ')}
              {p === "quarterly" && <span className="ml-1 text-[9px] opacity-70">(Save 7%)</span>}
              {p === "half-yearly" && <span className="ml-1 text-[9px] opacity-70">(Save 11%)</span>}
              {p === "yearly" && <span className="ml-1 text-[9px] opacity-70">(Save 20%)</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          {(["INR", "USD"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`flex items-center gap-2 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-2xl border transition-all ${
                currency === c ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]" : "border-white/10 text-white/30 hover:border-white/20"
              }`}
            >
              {c === "INR" ? "🇮🇳 INR" : "🌍 USD"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex overflow-x-auto pb-8 md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-stretch snap-x snap-mandatory scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan("creator")}
            className={`relative min-w-[280px] md:min-w-0 snap-start rounded-[32px] transition-all duration-500 flex flex-col bg-[rgba(16,28,32,0.3)] backdrop-blur-2xl border ${
              plan.isRecommended 
                ? "z-20 md:scale-[1.03] lg:scale-[1.05] shadow-[0_0_50px_rgba(0,242,255,0.15)] border-cyan-400/50" 
                : plan.isInfinity
                ? "z-10 border-cyan-500/20 shadow-[0_0_40px_rgba(0,242,255,0.05)]"
                : "border-white/10 hover:border-white/20"
            }`}
          >
            {plan.isRecommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg z-30">
                Most Popular
              </div>
            )}

            <div className="p-8 flex flex-col h-full">
               <div className="mb-8">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80">{plan.label}</span>
                    <plan.icon className="w-4 h-4 text-white/20" />
                 </div>
                 <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                 <p className="text-xs text-white/40 font-medium leading-relaxed mb-6">{plan.subtitle}</p>
                 
                 <div className="flex items-baseline gap-1.5">
                   <span className="text-4xl font-black text-white tracking-tight">{getPrice(plan.id)}</span>
                   {plan.id !== "free" && <span className="text-xs font-bold text-white/20 uppercase tracking-widest">/ Month</span>}
                 </div>
                 
                 {plan.isInfinity && plan.valueProp && (
                   <div className="mt-6 p-4 rounded-2xl bg-cyan-500/[0.03] border border-cyan-500/10 text-[10px] text-cyan-300/70 italic font-medium leading-relaxed">
                     "{plan.valueProp}"
                   </div>
                 )}
               </div>

               <div className="flex-1">
                 <ul className="space-y-4 mb-10">
                   {plan.features.map((f, idx) => (
                     <li key={idx} className="flex gap-3 items-start">
                       <div className="mt-1 shrink-0 w-3.5 h-3.5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                         <Check className="w-2.5 h-2.5 text-cyan-400 stroke-[4]" />
                       </div>
                       <span className="text-[12px] text-white/60 font-medium leading-tight">{f}</span>
                     </li>
                   ))}
                 </ul>
               </div>

               <Button 
                onClick={() => handleCheckout(plan.id, plan.name)}
                disabled={isProcessing === plan.id}
                className={`w-full h-12 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 group ${
                  plan.isRecommended 
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-xl shadow-cyan-500/20" 
                  : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                }`}
              >
                {isProcessing === plan.id ? "Processing..." : plan.buttonText}
                <ChevronRight className="ml-2 w-3 h-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 pt-12 border-t border-white/5 flex flex-wrap items-center justify-center gap-10">
         <div className="flex items-center gap-2.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
           <Shield className="w-3.5 h-3.5 text-cyan-500/40" /> 
           Secure payments via Razorpay
         </div>
         <div className="flex items-center gap-2.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
           <span className="text-emerald-500/50">↩️</span>
           Cancel anytime, no lock-in
         </div>
         <div className="flex items-center gap-2.5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
           <span className="text-cyan-500/50">🎁</span>
           7-day trial on all paid plans
         </div>
      </div>
    </div>
  );
}
