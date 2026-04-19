import { useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useRazorpay } from "react-razorpay";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown, Zap, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingPlan {
  id: string;
  name: string;
  label: string;
  price: string;
  period: string;
  description: string;
  valueProp?: string;
  features: string[];
  isRecommended?: boolean;
  isInfinity?: boolean;
  icon: any;
  buttonText: string;
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    label: "The Hook",
    price: "₹0",
    period: "/mo",
    description: "Perfect for getting started and testing the tools.",
    icon: Zap,
    buttonText: "Start for Free",
    features: [
      "5 Generations / month",
      "Standard 8B Models",
      "Essential Templates",
      "Basic History logging",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    label: "Rising Creator",
    price: "₹109",
    period: "/mo",
    description: "For creators starting their consistent growth journey.",
    icon: Sparkles,
    buttonText: "Upgrade Now",
    features: [
      "20 Generations / month",
      "Premium Language Unlock",
      "Standard 8B Models",
      "Email Support",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    label: "Most Popular / Choice of Top Creators",
    price: "₹249",
    period: "/mo",
    description: "Everything a serious creator needs to go viral.",
    isRecommended: true,
    icon: Zap,
    buttonText: "Upgrade to Creator",
    features: [
      "60 Generations / month",
      "Viral Score Prediction",
      "Multi-variation Output",
      "10 Premium Languages",
      "Priority Support",
    ],
  },
  {
    id: "infinity",
    name: "Infinity",
    label: "Unlimited Power",
    price: "₹499",
    period: "/mo",
    description: "The ultimate God-Tier AI for agencies and power users.",
    valueProp: "Professional Agency Output at Individual Creator Prices.",
    isInfinity: true,
    icon: Crown,
    buttonText: "Join the Infinity Circle",
    features: [
      "Unlimited Generations",
      "Priority 70B Pro Models",
      "Agency Toolkit",
      "Unrestricted Viral Score",
      "VIP 24/7 Support",
    ],
  },
];

export function PricingTable() {
  const [hoveredPlan, setHoveredPlan] = useState<string | null>("creator"); // Default highlight
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { user } = useUser();
  const { Razorpay } = useRazorpay();

  const handleCheckout = useCallback(async (planId: string, planTier: string) => {
    if (!user) {
      alert("Please login first to upgrade.");
      return;
    }

    if (planId === "free") return;

    try {
      setIsProcessing(planId);
      
      // Assume a custom endpoint exists in the project to hit createSubscription
      const response = await fetch("/api/payment/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier }),
      });
      
      const { subscription_id } = await response.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        subscription_id,
        name: "Grow Flow AI",
        description: `${planTier.toUpperCase()} Plan Subscription`,
        image: "https://your-logo-url.com/logo.png",
        handler: function (res: any) {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          
          alert(`Welcome to ${planTier.toUpperCase()}!\nPayment ID: ${res.razorpay_payment_id}`);
          
          setTimeout(() => {
             // Force a hard refresh to pull the new Drizzle values immediately so 
             // Phase 4 "Checkout-to-Dashboard" flow feels native.
             window.location.href = "/dashboard";
          }, 2000);
        },
        prefill: {
          name: user.fullName || "User",
          email: user.primaryEmailAddress?.emailAddress || "",
        },
        theme: { color: "#7C3AED" },
      };

      const rzp = new Razorpay(options as any);
      rzp.on("payment.failed", function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      alert("Failed to initialize checkout.");
    } finally {
      setIsProcessing(null);
    }
  }, [Razorpay, user]);

  return (
    <div className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4"
        >
          Supercharge Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Content Journey</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-violet-200/60"
        >
          Choose the perfect plan to hack algorithms, save hours of time, and build an audience on autopilot.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-end">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan("creator")}
            className={`relative rounded-3xl transition-all duration-300 ${
              plan.isRecommended 
                ? "bg-gradient-to-b from-amber-500/80 to-orange-500/80 p-[2px] z-20 md:scale-105 lg:scale-110 shadow-2xl shadow-amber-900/30" 
                : plan.isInfinity
                ? "bg-gradient-to-b from-zinc-800 to-black p-px z-10 border border-white/10"
                : "bg-white/5 border border-white/10 hover:border-violet-500/30"
            }`}
          >
            {/* Pulsating glow strictly for Recommended plan */}
            {plan.isRecommended && (
              <motion.div
                animate={{ boxShadow: ["0 0 0px 0px rgba(245, 158, 11, 0)", "0 0 30px 5px rgba(245, 158, 11, 0.4)", "0 0 0px 0px rgba(245, 158, 11, 0)"] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
              />
            )}

            {/* Badges */}
            {plan.isRecommended && (
              <div className="absolute -top-5 inset-x-0 flex justify-center z-30">
                <span className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-extrabold px-5 py-1.5 rounded-full shadow-lg">
                  <plan.icon className="w-3.5 h-3.5" />
                  {plan.label}
                </span>
              </div>
            )}
            
            {plan.isInfinity && (
              <div className="absolute -top-3 inset-x-0 flex justify-center z-30 opacity-100">
                <span className="bg-gradient-to-r from-slate-900 to-black text-violet-200 text-xs font-bold px-4 py-1 rounded-full border border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  <Crown className="w-3 h-3 inline-block mr-1.5 text-violet-400 -mt-0.5" />
                  {plan.label}
                </span>
              </div>
            )}

            {!plan.isRecommended && !plan.isInfinity && (
              <div className="absolute -top-3 inset-x-0 flex justify-center z-20 transition-opacity duration-300" style={{ opacity: hoveredPlan === plan.id ? 1 : 0 }}>
                <span className="bg-white/10 text-violet-200 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  {plan.label}
                </span>
              </div>
            )}

            {/* Inner Card Container */}
            <div className={`h-full flex flex-col pt-8 pb-6 px-6 md:px-8 ${
              plan.isRecommended 
                ? "bg-[#0a041c] rounded-[calc(1.5rem-2px)]" 
                : plan.isInfinity
                ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#130d26] via-[#05030a] to-[#000000] rounded-[calc(1.5rem-1px)] relative overflow-hidden"
                : "rounded-3xl"
            }`}>

              {/* Infinity Exclusive Styling Overlay */}
              {plan.isInfinity && (
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />
              )}

              <div className="mb-6 z-10">
                <h3 className={`text-xl font-bold mb-2 ${plan.isInfinity ? "text-violet-100" : "text-white"}`}>{plan.name}</h3>
                
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-extrabold ${plan.isRecommended ? "text-amber-400" : plan.isInfinity ? "text-transparent bg-clip-text bg-gradient-to-r from-silver-300 to-white" : "text-white"}`}>
                    {plan.price}
                  </span>
                  {plan.price !== "₹0" && <span className="text-sm font-medium text-white/40">{plan.period}</span>}
                </div>

                <p className={`text-sm ${plan.isInfinity ? "text-violet-200/80 font-medium" : "text-white/50"}`}>
                  {plan.description}
                </p>

                {/* Exclusive Value Prop text box for Infinity Plan */}
                {plan.isInfinity && plan.valueProp && (
                  <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-violet-500/20 text-xs text-violet-300/90 italic font-medium leading-relaxed">
                    "{plan.valueProp}"
                  </div>
                )}
              </div>

              <div className="flex-1 z-10">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`p-0.5 rounded-full mt-1 shrink-0 ${
                        plan.isRecommended ? "bg-amber-500/20 text-amber-400" : plan.isInfinity ? "bg-violet-500/20 text-violet-400" : "bg-white/5 text-white/40"
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className={`text-sm ${plan.isInfinity ? "text-violet-100/70" : "text-white/70"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                onClick={() => handleCheckout(plan.id, plan.name)}
                disabled={isProcessing === plan.id}
                className={`w-full h-12 font-bold rounded-xl transition-all duration-300 group z-10 ${
                  plan.isRecommended
                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] border-none"
                    : plan.isInfinity
                    ? "bg-gradient-to-r from-slate-800 to-black hover:from-slate-700 hover:to-zinc-900 text-silver-300 border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                    : "bg-white/5 hover:bg-white/10 text-white"
                }`}
              >
                {isProcessing === plan.id ? "Processing..." : plan.buttonText}
                <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-16 flex items-center justify-center gap-2 text-sm text-white/40 font-medium pb-24">
        <Shield className="w-4 h-4" /> Secure payments powered by Razorpay
      </div>
    </div>
  );
}
