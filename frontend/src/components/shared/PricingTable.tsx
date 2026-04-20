import { useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useRazorpay } from "react-razorpay";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Crown, Zap, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateSubscription, useVerifySubscription } from "@/hooks/useSubscription";

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
      "1 Regen / topic",
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
      "3 Regens / topic",
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
      "Unlimited Regens / topic",
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
  const createSub = useCreateSubscription();
  const verifySub = useVerifySubscription();

  const handleCheckout = useCallback(async (planId: string, planTier: string) => {
    if (!user) {
      alert("Please login first to upgrade.");
      return;
    }

    if (planId === "free") return;

    try {
      setIsProcessing(planId);
      const effectivePlan = planId as "starter" | "creator" | "infinity";
      
      const data = await createSub.mutateAsync({ planType: effectivePlan });
      const { subscriptionId, keyId } = data;

      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        subscription_id: subscriptionId,
        name: "Grow Flow AI",
        description: `${planTier.toUpperCase()} Plan Subscription`,
        image: "https://your-logo-url.com/logo.png",
        handler: async function (res: any) {
          try {
            await verifySub.mutateAsync({
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_subscription_id: res.razorpay_subscription_id,
              razorpay_signature: res.razorpay_signature,
              planType: effectivePlan
            });
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            
            alert(`Welcome to ${planTier.toUpperCase()}!\nPayment ID: ${res.razorpay_payment_id}`);
            
            setTimeout(() => {
               window.location.href = "/dashboard";
            }, 2000);
          } catch(err) {
            alert("Payment verification failed. Please contact support.");
          }
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
      alert(err.message || "Failed to initialize checkout.");
    } finally {
      setIsProcessing(null);
    }
  }, [Razorpay, user, createSub, verifySub]);

  return (
    <div className="w-full max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-24">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 items-end">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15, mass: 1, delay: i * 0.1 }}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan("creator")}
            className={`relative rounded-3xl transition-all duration-300 bg-[rgba(16,28,32,0.2)] backdrop-blur-xl ${
              plan.isRecommended 
                ? "z-20 md:scale-105 lg:scale-110 shadow-[0_0_30px_rgba(0,242,255,0.1)] border border-[#00F2FF] animate-[pulse_3s_ease-in-out_infinite]" 
                : plan.isInfinity
                ? "z-10 border border-[#00F2FF]/20"
                : "border border-[#00F2FF]/10 hover:border-[#00F2FF]/30"
            }`}
          >
            {/* Badges */}
            {/* Removed Popular Badge per Wave 3 Instructions */}
            
            {plan.isInfinity && (
              <div className="absolute -top-3 inset-x-0 flex justify-center z-30 opacity-100">
                <span className="bg-gradient-to-r from-slate-900 to-black text-cyan-200 text-xs font-bold px-4 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  <Crown className="w-3 h-3 inline-block mr-1.5 text-cyan-400 -mt-0.5" />
                  {plan.label}
                </span>
              </div>
            )}

            {!plan.isRecommended && !plan.isInfinity && (
              <div className="absolute -top-3 inset-x-0 flex justify-center z-20 transition-opacity duration-300" style={{ opacity: hoveredPlan === plan.id ? 1 : 0 }}>
                <span className="bg-white/10 text-cyan-200 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md border border-white/20">
                  {plan.label}
                </span>
              </div>
            )}

            {/* Inner Card Container */}
            <div className={`h-full flex flex-col pt-8 pb-6 px-6 md:px-8 rounded-3xl`}>

              {/* Infinity Exclusive Styling Overlay */}
              {plan.isInfinity && (
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
              )}

              <div className="mb-6 z-10">
                <h3 className={`text-xl font-bold mb-2 ${plan.isInfinity ? "text-cyan-100" : "text-white"}`}>{plan.name}</h3>
                
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-[#F1F5F9]">
                    {plan.price}
                  </span>
                  {plan.price !== "₹0" && <span className="text-sm font-medium text-white/40">{plan.period}</span>}
                </div>

                <p className={`text-sm ${plan.isInfinity ? "text-cyan-200/80 font-medium" : "text-white/50"}`}>
                  {plan.description}
                </p>

                {/* Exclusive Value Prop text box for Infinity Plan */}
                {plan.isInfinity && plan.valueProp && (
                  <div className="mt-4 p-3 rounded-lg bg-white/[0.03] border border-cyan-500/20 text-xs text-cyan-300/90 italic font-medium leading-relaxed">
                    "{plan.valueProp}"
                  </div>
                )}
              </div>

              <div className="flex-1 z-10">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className={`p-0.5 rounded-full mt-1 shrink-0 ${
                        plan.isRecommended ? "bg-amber-500/20 text-amber-400" : plan.isInfinity ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-white/40"
                      }`}>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className={`text-sm ${plan.isInfinity ? "text-cyan-100/70" : "text-white/70"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button 
                onClick={() => handleCheckout(plan.id, plan.name)}
                disabled={isProcessing === plan.id}
                className="w-full h-12 font-bold transition-all duration-300 group z-10 bg-[#00F2FF] hover:bg-[#00D9E5] text-[#0B1215] rounded-[4px] border-none shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_25px_rgba(0,242,255,0.4)]"
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
