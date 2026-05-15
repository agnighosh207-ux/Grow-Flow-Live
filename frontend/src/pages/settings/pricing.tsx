import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { FoundersBanner } from "@/components/banners/FoundersBanner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

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

import {
  Check, X, Zap, Infinity as InfinityIcon, Star, ArrowLeft,
  Sparkles, TrendingUp, BarChart3, CalendarDays, Flame, Wand2,
  Shield, Clock, ChevronRight, Crown, Lock, AlertTriangle,
  IndianRupee, RefreshCw, Brain, Globe, DollarSign, Users, ChevronDown
} from "lucide-react";
import { MagneticButton } from "@/components/shared/MagneticButton";
import { Hover3DCard } from "@/components/shared/Hover3DCard";

type BillingPeriod = "monthly" | "quarterly" | "half-yearly" | "yearly";

const BILLING_OPTIONS: { key: BillingPeriod; label: string; badge?: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "3-Month", badge: "Save 10%" },
  { key: "half-yearly", label: "6-Month", badge: "Save 20%" },
  { key: "yearly", label: "Yearly", badge: "-20%" },
];

const BASE_PRICES: Record<string, Record<BillingPeriod, number>> = {
  starter: { monthly: 149, quarterly: 139, "half-yearly": 133, yearly: 119 },
  creator: { monthly: 449, quarterly: 419, "half-yearly": 404, yearly: 358 },
  infinity: { monthly: 799, quarterly: 749, "half-yearly": 720, yearly: 638 },
  agency: { monthly: 2999, quarterly: 2799, "half-yearly": 2699, yearly: 2399 },
};

const STRIKETHROUGH_PRICES: Record<string, number> = {
  starter: 449,
  creator: 799,
  infinity: 1299,
};

const BILLING_TOTALS: Record<string, Record<BillingPeriod, number>> = {
  starter: { monthly: 149, quarterly: 417, "half-yearly": 798, yearly: 1430 },
  creator: { monthly: 449, quarterly: 1257, "half-yearly": 2428, yearly: 4300 },
  infinity: { monthly: 799, quarterly: 2247, "half-yearly": 4320, yearly: 7660 },
  agency: { monthly: 2999, quarterly: 8397, "half-yearly": 16194, yearly: 28788 },
};

const USD_BASE_PRICES: Record<string, Record<BillingPeriod, number>> = {
  starter: { monthly: 1.99, quarterly: 1.79, "half-yearly": 1.69, yearly: 1.49 },
  creator: { monthly: 5.49, quarterly: 4.99, "half-yearly": 4.79, yearly: 4.39 },
  infinity: { monthly: 9.49, quarterly: 8.49, "half-yearly": 7.99, yearly: 7.49 },
  agency: { monthly: 39, quarterly: 35, "half-yearly": 32, yearly: 29 },
};

const USD_STRIKETHROUGH_PRICES: Record<string, number> = {
  starter: 5.49,
  creator: 9.49,
  infinity: 15.49,
};

const USD_BILLING_TOTALS: Record<string, Record<BillingPeriod, number>> = {
  starter: { monthly: 1.99, quarterly: 5.37, "half-yearly": 10.14, yearly: 17.88 },
  creator: { monthly: 5.49, quarterly: 14.97, "half-yearly": 28.74, yearly: 52.68 },
  infinity: { monthly: 9.49, quarterly: 25.47, "half-yearly": 47.94, yearly: 89.88 },
  agency: { monthly: 39, quarterly: 105, "half-yearly": 192, yearly: 348 },
};

function getBillingMonths(period: BillingPeriod): number {
  return { monthly: 1, quarterly: 3, "half-yearly": 6, yearly: 12 }[period];
}

interface Feature {
  key: string;
  label: string;
  free: boolean | string;
  starter: boolean | string;
  creator: boolean | string;
  infinity: boolean | string;
  section: "core" | "tools" | "infinity";
  infinityLabel?: string;
}

const FEATURES: Feature[] = [
  // Core
  { key: "generations", label: "Content Generations / Month", free: "5", starter: "25", creator: "150", infinity: "Unlimited*", section: "core" },
  { key: "platforms", label: "All 4 Platforms", free: true, starter: true, creator: true, infinity: true, section: "core" },
  { key: "regen", label: "Regenerations per Topic", free: false, starter: "1 / topic", creator: "3 / topic", infinity: "Unlimited", section: "core" },
  { key: "language", label: "Multi-Language Output", free: "English Only", starter: "Eng + 1 Premium", creator: "10 Languages", infinity: "10 Languages", section: "core" },
  { key: "watermark", label: "Content Watermark Removed", free: false, starter: true, creator: true, infinity: true, section: "core" },
  
  // Starter Tools
  { key: "hooks", label: "Viral Hooks Generator", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "bio", label: "Bio & Caption Generator", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "ideas", label: "Idea Generator", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "strategy", label: "7-Day Strategy Planner", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "calendar", label: "Content Calendar", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "vault", label: "Swipe Vault (Inspiration Library)", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "history", label: "Content History & Favorites", free: false, starter: true, creator: true, infinity: true, section: "tools" },

  // Creator Tools
  { key: "trends", label: "Trend Engine (Live Search)", free: false, starter: false, creator: true, infinity: true, section: "infinity" },
  { key: "hashtags", label: "Hashtag Intelligence Suite", free: false, starter: false, creator: true, infinity: true, section: "infinity" },
  { key: "predictor", label: "Performance Predictor (Pre-Post Score)", free: false, starter: false, creator: true, infinity: true, section: "infinity" },
  { key: "competitor", label: "Competitor Content Analyzer", free: false, starter: false, creator: true, infinity: true, section: "infinity" },
  { key: "repurpose", label: "Content Repurposer (6 Formats)", free: false, starter: false, creator: true, infinity: true, section: "infinity" },
  { key: "abtest", label: "A/B Hook Tester", free: false, starter: false, creator: true, infinity: true, section: "infinity" },
  { key: "viralscore", label: "Viral Score™ (0–100 AI Rating)", free: false, starter: false, creator: true, infinity: true, section: "infinity", infinityLabel: "AI rates 0–100" },
  { key: "analyze", label: "Content Performance Analyzer", free: false, starter: false, creator: true, infinity: true, section: "infinity" },

  // Infinity Exclusives
  { key: "coach", label: "AI Content Coach (Weekly Report)", free: false, starter: false, creator: false, infinity: true, section: "infinity", infinityLabel: "Personalized growth advice" },
  { key: "ghostwriter", label: "AI Ghostwriter (Your Voice)", free: false, starter: false, creator: false, infinity: true, section: "infinity", infinityLabel: "Learns your writing style" },
  { key: "trenddigest", label: "Weekly Trend Alert Email", free: false, starter: false, creator: false, infinity: true, section: "infinity", infinityLabel: "Fresh every Monday" },
  { key: "priority", label: "Priority 70B AI Models (2× faster)", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
  { key: "support", label: "VIP Priority Support", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
];

const INFINITY_EXCLUSIVES = [
  { icon: Brain, color: "text-violet-400", label: "AI Content Coach", desc: "Weekly personalized growth report analyzing your content patterns, strengths, and exact 3-task action plan." },
  { icon: Wand2, color: "text-cyan-400", label: "AI Ghostwriter", desc: "Trains on your past content to write in your exact voice. The more you use it, the better it sounds like you." },
  { icon: Flame, color: "text-orange-400", label: "Viral Score™", desc: "Every piece of content gets scored 0-100 for virality potential by AI before you post it." },
  { icon: TrendingUp, color: "text-emerald-400", label: "Trend Engine", desc: "Perplexity-powered live search finds what's trending right now in your niche, not last week." },
  { icon: Sparkles, color: "text-pink-400", label: "Multi-Variation Output", desc: "Get 3 completely different angles on every topic — A/B test before you post." },
  { icon: CalendarDays, color: "text-blue-400", label: "Full Content Suite", desc: "Calendar, Repurposer, Competitor Intelligence, Hashtag Strategist — everything a content agency uses." },
];

function CellContent({ value, infinityLabel }: { value: boolean | string; infinityLabel?: string }) {
  if (typeof value === "string") {
    return <span className="text-xs sm:text-sm text-white/70 text-center leading-tight">{value}</span>;
  }
  if (value) {
    return (
      <span className="flex flex-col items-center gap-0.5">
        <Check className="w-4 h-4 text-emerald-400" />
        {infinityLabel && <span className="text-[10px] text-white/45 text-center leading-tight hidden sm:block">{infinityLabel}</span>}
      </span>
    );
  }
  return <X className="w-4 h-4 text-white/20 mx-auto" />;
}

const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, creator: 2, infinity: 3, agency: 4 };

function TopUpSection() {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const PACKS = [
    { key: "small",  credits: 10, price: "₹49",  popular: false, desc: "Quick boost" },
    { key: "medium", credits: 25, price: "₹99",  popular: true,  desc: "Best value" },
    { key: "large",  credits: 60, price: "₹199", popular: false, desc: "Power pack" },
  ];

  const handleTopup = async (packKey: string) => {
    setLoadingPack(packKey);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Razorpay could not load. Try disabling ad blockers.");
      
      const token = await getToken();
      const res = await fetch("/api/subscription/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pack: packKey }),
      });
      const data = await res.json();
      if (!data.orderId) throw new Error(data.error || "Failed to create order");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: "INR",
        name: "GrowFlow AI",
        description: `Credit Top-Up: ${data.label}`,
        order_id: data.orderId,
        theme: { color: "#7c3aed" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/subscription/credits/verify-topup", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ ...response, credits: data.credits }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
              toast({ title: `✅ ${data.credits} credits added!`, description: "Your credits are ready to use." });
            } else {
              throw new Error(verifyData.error || "Verification failed");
            }
          } catch (err: any) {
            toast({ variant: "destructive", title: "Top-up failed", description: err.message });
          } finally {
            setLoadingPack(null);
          }
        },
        modal: { ondismiss: () => setLoadingPack(null) },
      };
      new window.Razorpay(options).open();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setLoadingPack(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 mb-6">
      <div className="text-center mb-5">
        <h3 className="text-lg font-bold text-white">Need More Credits?</h3>
        <p className="text-white/40 text-sm mt-1">One-time top-up. No subscription. Use anytime.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {PACKS.map(pack => (
          <div key={pack.key} className={`relative rounded-2xl border p-4 text-center transition-all ${pack.popular ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/8 bg-white/[0.02] hover:border-white/15'}`}>
            {pack.popular && (
              <div className="absolute -top-2.5 inset-x-0 flex justify-center">
                <span className="bg-violet-500 text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">Best Value</span>
              </div>
            )}
            <div className="text-2xl font-black text-white mt-1">{pack.credits}</div>
            <div className="text-[10px] text-white/40 mb-3">credits</div>
            <button
              onClick={() => handleTopup(pack.key)}
              disabled={!!loadingPack}
              className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${pack.popular ? 'bg-violet-500 hover:bg-violet-400 text-white' : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'} disabled:opacity-50`}
            >
              {loadingPack === pack.key ? "..." : pack.price}
            </button>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-white/20 mt-3">Credits never expire · Secure payment via Razorpay</p>
    </div>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("yearly");
  const [currency, setCurrency] = useState<"INR" | "USD">((): "INR" | "USD" => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("pricing_currency");
        if (stored === "INR" || stored === "USD") return stored;
      }
    } catch (e) {
      console.warn("localStorage access denied");
    }
    return "INR";
  });
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; plan: "starter" | "creator" | "infinity" | "agency"; billing: BillingPeriod; currency: "INR" | "USD" }>({ 
    open: false, plan: "starter", billing: "monthly", currency: "INR" 
  });
  
  useEffect(() => {
    localStorage.setItem("pricing_currency", currency);
  }, [currency]);

  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);

  const { data: sub, isLoading: subLoading } = useSubscriptionStatus();
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const currentPlan = sub?.planType ?? "free";
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const isActivePaidUser = sub?.plan === "active" || sub?.plan === "trial";

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger if mouse leaves the top of the viewport
      if (e.clientY <= 0 && !exitIntentShown && !isActivePaidUser) {
        const shownInSession = sessionStorage.getItem("exit_intent_shown");
        if (!shownInSession) {
          setShowExitIntent(true);
          setExitIntentShown(true);
          sessionStorage.setItem("exit_intent_shown", "true");
        }
      }
    };
    
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [exitIntentShown, isActivePaidUser]);
  
  const prices = currency === "USD" ? USD_BASE_PRICES : BASE_PRICES;
  const totals = currency === "USD" ? USD_BILLING_TOTALS : BILLING_TOTALS;
  const strikePrices = currency === "USD" ? USD_STRIKETHROUGH_PRICES : STRIKETHROUGH_PRICES;
  
  const starterPrice = prices.starter[billing];
  const creatorPrice = prices.creator[billing];
  const infinityPrice = prices.infinity[billing];

  const formatPrice = (p: number) => {
    if (currency === "USD") return `$${p}`;
    return `₹${p}`;
  };

  // Returns button state for each plan
  const getPlanState = (plan: "starter" | "creator" | "infinity" | "agency"): "current" | "upgrade" | "downgrade" | "cta" => {
    if (!sub || !isActivePaidUser) return "cta";
    const targetRank = PLAN_RANK[plan] ?? 0;
    if (plan === currentPlan) return "current";
    if (targetRank > currentRank) return "upgrade";
    return "downgrade";
  };
  
  const handlePlanClick = (plan: "starter" | "creator" | "infinity" | "agency") => {
    if (isLoaded && !isSignedIn) {
      navigate("/sign-in");
      return;
    }
    const state = getPlanState(plan);
    if (state === "current") {
      toast({ title: "You're already on this plan", description: "You're already on this plan. Manage it from Settings.", });
      return;
    }
    if (state === "downgrade") {
      toast({
        title: "You're on a higher plan 👑",
        description: `You're already on ${currentPlan}. To switch to a lower plan, cancel your current subscription first from Settings.`,
      });
      return;
    }
    // Only open the modal for upgrade or new users
    setUpgradeModal({ open: true, plan, billing, currency });
  };

  const billingLabel = (period: BillingPeriod) => {
    if (period === "quarterly") return "every 3 months";
    if (period === "half-yearly") return "every 6 months";
    if (period === "yearly") return "yearly";
    return "monthly";
  };

  return (
    <div className="min-h-screen bg-[#050210] text-white overflow-x-hidden">
      <AnimatePresence>
        {showExitIntent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-start justify-center bg-black/80 backdrop-blur-md p-4 pt-[12vh]"

          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-[#12121C] border border-white/10 rounded-[40px] pt-10 pb-8 px-8 md:pt-14 md:pb-12 md:px-12 max-w-sm text-center relative overflow-hidden shadow-[0_0_80px_rgba(0,242,255,0.1)]"

            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                <Gift className="w-8 h-8 text-cyan-400" />
              </div>
              
              <h2 className="text-3xl font-black text-white mb-2 italic">Wait! Don't leave empty-handed.</h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed font-medium">
                Try the <span className="text-cyan-400 font-bold">Creator Plan</span> today and get <span className="text-white font-bold">50% extra credits</span> for your first month.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => { setShowExitIntent(false); handlePlanClick("creator"); }}
                  className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-2xl shadow-xl shadow-cyan-900/40"
                >
                  Claim My Bonus Offer
                </Button>
                <button 
                  onClick={() => setShowExitIntent(false)}
                  className="w-full h-12 text-white/30 hover:text-white/50 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Maybe later
                </button>
              </div>

              <p className="text-[10px] text-white/20 mt-8 font-bold uppercase tracking-widest">Limited time founder's offer</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[15%] w-[600px] h-[500px] rounded-full bg-cyan-700/20 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[400px] rounded-full bg-teal-800/15 blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-pink-800/10 blur-[140px]" />
        
        {/* Floating Graphics */}
        <motion.div className="absolute top-[15%] right-[5%] opacity-[0.07] animate-float" style={{ animationDelay: '0.5s' }}><Brain className="w-64 h-64 text-cyan-400" /></motion.div>
        <motion.div className="absolute bottom-[20%] left-[10%] opacity-[0.05] animate-float" style={{ animationDelay: '2s' }}><Zap className="w-48 h-48 text-teal-400" /></motion.div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 pb-24">
        <FoundersBanner />

        {/* Back + Header */}
        <div className="mb-10">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {sub?.subscriptionStatus === "past_due" && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 mb-6">
              <p className="text-red-400 font-semibold text-sm">⚠️ Payment failed</p>
              <p className="text-white/50 text-xs mt-1">Your last payment could not be processed. Please update your payment method.</p>
              <button 
                onClick={() => window.open("https://dashboard.razorpay.com", "_blank")}
                className="mt-3 bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                Update Payment Method →
              </button>
            </div>
          )}

          <div className="text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex flex-col items-center gap-6 mb-8">
                {/* Promo Badge */}
                <span className="inline-flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-white/40 bg-white/5 border border-white/10 rounded-full px-5 py-2">
                   Save up to 20% with yearly | Most popular among serious creators
                </span>

                {/* Currency Toggle */}
                <div className="bg-[#0A051A] border border-white/10 rounded-2xl p-1 flex gap-1">
                  <button
                    onClick={() => setCurrency("INR")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currency === "INR" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20" : "text-white/30 hover:text-white/50"}`}
                  >
                    <span className="w-4 h-3 bg-cyan-400/20 rounded-sm flex items-center justify-center text-[8px]">IN</span>
                    INR
                  </button>
                  <button
                    onClick={() => setCurrency("USD")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currency === "USD" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20" : "text-white/30 hover:text-white/50"}`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    USD
                  </button>
                </div>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tighter">
                Pick your{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                  growth plan
                </span>
              </h1>
              <p className="text-white/40 text-lg max-w-xl mx-auto font-medium">
                Start free with 5 monthly generations. Upgrade when you're ready to scale.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center justify-center">
            <div className="inline-flex flex-wrap items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
              {BILLING_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setBilling(opt.key)}
                  className={`px-3 md:px-5 py-2.5 rounded-xl text-[10px] md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    billing === opt.key
                      ? (opt.key === 'yearly' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-white shadow-sm")
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {opt.label}
                  {opt.badge && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full transition-colors ${
                      billing === opt.key 
                        ? (opt.key === 'yearly' ? 'bg-emerald-400 text-emerald-950' : 'bg-cyan-400 text-cyan-950') 
                        : 'bg-emerald-500/10 text-emerald-400/50'
                    }`}>
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible md:mx-0 md:px-0 mb-16">
          <div className="flex gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-4 items-start">
            {/* Explorer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-[280px] md:w-auto flex-shrink-0"
            >
              <Hover3DCard className="h-full">
                <div className="hyper-hover-card rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col h-full">
                  <div className="mb-6">
                    <p className="text-xs font-semibold tracking-widest uppercase text-white/20 mb-2">Explorer</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-white">₹0</span>
                      <span className="text-white/40 text-sm">/ forever</span>
                    </div>
                    <p className="text-white/40 text-xs mt-1">Try it all before you commit</p>
                  </div>

                  <div className="space-y-2.5 flex-1 mb-6">
                    {[
                      "5 free monthly generations",
                      "All 4 platforms unlocked",
                      "Basic English Output",
                      "Full content history",
                    ].map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-white/70 text-sm">{f}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-white/20 mb-4 text-center italic">No credit card required</p>

                  <Link href="/sign-up" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full py-6 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold rounded-xl"
                    >
                      Start Exploring
                    </Button>
                  </Link>
                </div>
              </Hover3DCard>
            </motion.div>
            {/* Starter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="w-[300px] md:w-auto flex-shrink-0"
            >
              <Hover3DCard className="h-full">
                <div className="hyper-hover-card rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/30 to-teal-950/20 p-6 flex flex-col h-full">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400">Starter</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {billing === "monthly" && (
                          <span className="text-sm text-white/50 line-through">{formatPrice(strikePrices.starter)}</span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-emerald-100">{formatPrice(starterPrice)}</span>
                        <span className="text-white/40 text-sm">/ mo</span>
                        {billing === "monthly" && (
                          <span className="text-xs text-emerald-400 ml-2 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">(Launching Offer)</span>
                        )}
                      </div>
                    </div>
                    {billing !== "monthly" && (
                      <p className="text-white/40 text-xs mt-1">
                        {formatPrice(totals.starter[billing])} billed {billingLabel(billing)}
                        {" "}·{" "}
                        <span className="text-emerald-400">Save {formatPrice((prices.starter.monthly * getBillingMonths(billing)) - totals.starter[billing])}</span>
                      </p>
                    )}
                    <p className="text-white/40 text-[11px] mt-0.5">Introductory pricing for early users</p>
                    <p className="text-white/55 text-sm mt-1">For creators just getting started</p>
                  </div>

                  <div className="space-y-2.5 flex-1 mb-6">
                    {[
                      "25 content generations / month",
                      "1 Regeneration per topic",
                      "All 4 platforms unlocked",
                      "English + 1 Premium Language",
                      "Idea Generator + Strategy Planner",
                      "Viral Hooks Generator",
                      "Improve Competitor Content",
                      "Saved Favorites & History",
                    ].map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-white/70 text-sm">{f}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-emerald-500/10 mt-1">
                      <p className="text-emerald-400/60 text-xs">✦ Perfect to try before upgrading</p>
                    </div>
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 flex items-start gap-2 mt-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-300/80 text-[11px] leading-relaxed">
                        Basic tools only. No viral score or multi-variation.
                      </p>
                    </div>
                  </div>

                  <MagneticButton>
                    <Button
                      className={`w-full border transition-all ${
                        getPlanState("starter") === "current"
                          ? "bg-emerald-600/30 border-emerald-500/40 text-emerald-300 cursor-default"
                          : getPlanState("starter") === "downgrade"
                          ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                          : "bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-200 hover:text-white"
                      }`}
                      onClick={() => handlePlanClick("starter")}
                    >
                      {getPlanState("starter") === "current" ? "✓ Current Plan" : getPlanState("starter") === "downgrade" ? "Lower Plan" : "Get Starter →"}
                      {getPlanState("starter") === "upgrade" && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </MagneticButton>
                </div>
              </Hover3DCard>
            </motion.div>

            {/* Creator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-[300px] md:w-auto flex-shrink-0 -translate-y-2 md:-translate-y-4 relative"
            >
              <div className="absolute -top-3.5 inset-x-0 flex justify-center z-10">
                <span className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  ⚡ Most Popular
                </span>
              </div>
              <Hover3DCard className="h-full">
                <div className="hyper-hover-card relative rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-blue-950/20 to-cyan-950/40 p-6 flex flex-col ring-1 ring-cyan-500/20 shadow-[0_0_60px_rgba(139,92,246,0.18)] h-full">
                  <div className="mb-6 mt-2">
                    <p className="text-xs font-semibold tracking-widest uppercase text-cyan-400 mb-2">Creator</p>
                    <div className="flex flex-col gap-1">
                      {billing === "monthly" && (
                          <span className="text-sm text-white/50 line-through">{formatPrice(strikePrices.creator)}</span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white">{formatPrice(creatorPrice)}</span>
                        <span className="text-white/40 text-sm">/ mo</span>
                        {billing === "monthly" && (
                          <span className="text-xs text-emerald-400 ml-2 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">(Launching Offer)</span>
                        )}
                      </div>
                    </div>
                    {billing !== "monthly" && (
                      <p className="text-white/40 text-xs mt-1">
                        {formatPrice(totals.creator[billing])} billed {billingLabel(billing)}
                        {" "}·{" "}
                        <span className="text-emerald-400">Save {formatPrice((prices.creator.monthly * getBillingMonths(billing)) - totals.creator[billing])}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-cyan-400/70 font-medium mt-0.5">{currency === "INR" ? "Best for Indian creators 🇮🇳" : "Best for global growth 🌍"}</p>
                  </div>

                  <div className="space-y-2.5 flex-1 mb-4">
                    {[
                      "150 content generations / month",
                      "3 Regenerations per topic",
                      "Multi-Variation (3 outputs per gen)",
                      "Viral Score™ enabled",
                      "Trend Engine (Live Insights)",
                      "All 4 platforms",
                      "Hooks, CTAs & hashtags",
                      "Idea Generator + 7-Day Strategy",
                      "🌍 Multi-language content (Hindi, Hinglish, Bengali)",
                      "Improve Competitor Content",
                      "Download as .txt",
                    ].map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        <span className="text-white/75 text-sm">{f}</span>
                      </div>
                    ))}

                    <div className="pt-3 border-t border-white/8 mt-1 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Unlock more with Infinity</p>
                      {[
                        { icon: Wand2, label: "AI Writing Styles", color: "text-cyan-400/60" },
                        { icon: CalendarDays, label: "Content Calendar", color: "text-blue-400/60" }
                      ].map(({ icon: Icon, label, color }) => (
                        <div key={label} className="flex items-center gap-2 opacity-60">
                          <Lock className="w-3 h-3 text-white/20 shrink-0" />
                          <Icon className={`w-3 h-3 ${color} shrink-0`} />
                          <span className="text-white/35 text-xs line-through">{label}</span>
                        </div>
                      ))}
                      <button
                        onClick={() => handlePlanClick("infinity")}
                        className="mt-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium"
                      >
                        Unlock with Infinity →
                      </button>
                    </div>
                  </div>

                  <MagneticButton>
                    <Button
                      className={`w-full border transition-all ${
                        getPlanState("creator") === "current"
                          ? "bg-cyan-600/30 border-cyan-500/40 text-cyan-300 cursor-default"
                          : getPlanState("creator") === "downgrade"
                          ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                          : "shine-effect bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 border-cyan-500/30 text-white shadow-lg shadow-cyan-500/25"
                      }`}
                      onClick={() => handlePlanClick("creator")}
                    >
                      {getPlanState("creator") === "current" ? "✓ Current Plan" : getPlanState("creator") === "downgrade" ? "Lower Plan" : "Get Creator →"}
                      {getPlanState("creator") === "upgrade" && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </MagneticButton>
                </div>
              </Hover3DCard>
            </motion.div>

            {/* Infinity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="w-[300px] md:w-auto flex-shrink-0"
            >
              <Hover3DCard className="h-full">
                <div className="hyper-hover-card relative rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-950/40 to-pink-950/20 p-6 flex flex-col h-full">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      <Crown className="w-3.5 h-3.5" />
                      UNLIMITED POWER
                    </span>
                  </div>

                  <div className="mb-6 mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold tracking-widest uppercase text-teal-300">Infinity</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {billing === "monthly" && (
                          <span className="text-sm text-white/50 line-through">{formatPrice(strikePrices.infinity)}</span>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black bg-gradient-to-r from-teal-300 to-pink-300 bg-clip-text text-transparent">
                          {formatPrice(infinityPrice)}
                        </span>
                        <span className="text-white/40 text-sm">/ mo</span>
                        {billing === "monthly" && (
                          <span className="text-xs text-teal-400 ml-2 font-semibold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">(Launching Offer)</span>
                        )}
                      </div>
                    </div>
                    {billing !== "monthly" && (
                      <p className="text-white/40 text-xs mt-1">
                        {formatPrice(totals.infinity[billing])} billed {billingLabel(billing)}
                        {" "}·{" "}
                        <span className="text-emerald-400">Save {formatPrice((prices.infinity.monthly * getBillingMonths(billing)) - totals.infinity[billing])}</span>
                      </p>
                    )}
                    <p className="text-white/60 text-sm mt-1">For agencies & super users</p>
                    <p className="text-[11px] text-teal-400/70 font-medium mt-0.5">Introductory pricing for early users</p>
                  </div>

                  <div className="space-y-2.5 flex-1 mb-6">
                    <p className="text-[11px] text-teal-400 font-semibold uppercase tracking-wider mb-1.5">
                      Everything in Creator, plus:
                    </p>
                    {[
                      { label: "Unlimited generations*", icon: InfinityIcon, desc: "Fair usage limits apply" },
                      { label: "Unlimited Regenerations", icon: RefreshCw },
                      { label: "AI Writing Styles", icon: Wand2 },
                      { label: "Trending Topics Feed", icon: TrendingUp },
                      { label: "Content Calendar", icon: CalendarDays },
                      { label: "Performance Insights", icon: BarChart3 },
                      { label: "Priority AI (2× faster)", icon: Zap },
                      { label: "Priority Support", icon: Shield },
                    ].map(({ label, icon: Icon, desc }) => (
                      <div key={label} className="flex items-start gap-2.5">
                        <Icon className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-white/85 text-sm">{label}</span>
                          {desc && <p className="text-white/40 text-[10px] m-0">{desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <MagneticButton>
                    <Button
                      className={`w-full border transition-all ${
                        getPlanState("infinity") === "current"
                          ? "bg-teal-600/30 border-teal-500/40 text-teal-300 cursor-default"
                          : "shine-effect bg-gradient-to-r from-teal-600/80 to-pink-600/80 hover:from-teal-500 hover:to-pink-500 border border-white/20 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                      }`}
                      onClick={() => handlePlanClick("infinity")}
                    >
                      {getPlanState("infinity") === "current" ? "✓ Current Plan" : "Unlock Infinity →"}
                      {getPlanState("infinity") !== "current" && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                  </MagneticButton>
                  <p className="text-center text-white/35 text-xs mt-2.5">Cancel anytime</p>
                </div>
              </Hover3DCard>
            </motion.div>
          </div>
        </div>

        {/* Agency Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16 border border-violet-500/30 rounded-2xl p-8 bg-violet-500/5 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-violet-500/20 transition-all duration-1000" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
                    <Users className="w-6 h-6 text-violet-400" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-white">For Agencies & Teams</h3>
                    <p className="text-violet-400/60 text-xs font-black uppercase tracking-widest">Enterprise Grade Scale</p>
                 </div>
              </div>
              <p className="text-white/50 text-sm max-w-lg leading-relaxed">
                Empower your entire team with collaborative content generation. Manage members, monitor usage, and maintain consistent brand voice across all accounts.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[10px] font-black uppercase tracking-wider text-violet-300">
                <span className="bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Check className="w-3 h-3" /> 5 Member Seats</span>
                <span className="bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Check className="w-3 h-3" /> 1,000 Generations / mo</span>
                <span className="bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Check className="w-3 h-3" /> Team Analytics</span>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px]">
              <div className="text-center md:text-right">
                <div className="flex items-baseline gap-1 justify-center md:justify-end">
                  <span className="text-4xl font-black text-white">{currency === "USD" ? "$39" : "₹2,999"}</span>
                  <span className="text-white/40 text-sm">/ mo</span>
                </div>
                <p className="text-violet-400/40 text-[10px] font-bold uppercase tracking-tighter mt-1">Billed monthly</p>
              </div>
              <Button 
                onClick={() => handlePlanClick("agency")}
                disabled={getPlanState("agency") === "current"}
                className={`w-full md:w-auto h-12 ${getPlanState("agency") === "current" ? "bg-white/5 text-white/30" : "bg-violet-600 hover:bg-violet-500 text-white"} font-bold px-10 rounded-xl shadow-lg shadow-violet-900/40 transition-all hover:scale-105 active:scale-95`}
              >
                {getPlanState("agency") === "current" ? "✓ Active Plan" : "Get Agency Plan"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ROI Anchor Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-teal-950/20 p-6 md:p-8"
        >
          <div className="flex items-center gap-2 mb-2">
            {currency === "INR" ? <IndianRupee className="w-4 h-4 text-cyan-400" /> : <DollarSign className="w-4 h-4 text-cyan-400" />}
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">What {formatPrice(creatorPrice)} actually gets you</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white">
            Creator pays for itself in one post.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-2">The old way</p>
              <p className="text-3xl font-black text-red-300 mb-1">{currency === "INR" ? "₹5,000–₹15,000" : "$50–$150"}</p>
              <p className="text-white/50 text-sm">A freelance content writer for 100 pieces. Slow turnaround, inconsistent quality, and it's still just one platform.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-2">With Creator</p>
              <p className="text-3xl font-black text-emerald-300 mb-1">{formatPrice(creatorPrice)}</p>
              <p className="text-white/50 text-sm">100 pieces of content across Instagram, YouTube, Twitter & LinkedIn. Instant. Optimized. Ready to post.</p>
            </div>
          </div>
          <p className="text-center text-white/35 text-xs mt-5">
            That's <span className="text-emerald-400 font-semibold">20–60× cheaper</span> than outsourcing — with better consistency.
          </p>
        </motion.div>

        {/* Why Infinity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              Why creators choose{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
                Infinity
              </span>
            </h2>
            <p className="text-white/50 text-sm max-w-md mx-auto">
              Creator gives you volume.{" "}
              <strong className="text-white/75">Infinity gives you volume that performs.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {INFINITY_EXCLUSIVES.map(({ icon: Icon, color, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 p-5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <h3 className="font-semibold text-sm text-white">{label}</h3>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-center mb-8">Full feature comparison</h2>

          <div className="rounded-2xl border border-white/10 overflow-hidden overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-5 bg-white/[0.04] border-b border-white/10 min-w-[560px]">
              <div className="p-3 text-xs text-white/40 font-medium">Feature</div>
              <div className="p-3 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40">Explorer</p>
                <p className="text-white font-bold mt-0.5 text-xs">Free</p>
              </div>
              <div className="p-3 text-center bg-emerald-950/20">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">Starter</p>
                <p className="text-emerald-100 font-bold mt-0.5 text-xs">{formatPrice(starterPrice)}<span className="text-white/40 text-[10px] font-normal">/mo</span></p>
              </div>
              <div className="p-3 text-center bg-cyan-950/30 relative">
                <div className="flex justify-center mb-0.5">
                  <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full px-1.5 py-0.5 font-semibold">
                    POPULAR
                  </span>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-cyan-400 text-shadow-sm">Creator</p>
                <p className="text-white font-bold mt-0.5 text-xs">
                  {formatPrice(creatorPrice)}<span className="text-white/40 text-[10px] font-normal">/mo</span>
                </p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-300">Infinity</p>
                <p className="text-white font-bold mt-0.5 text-xs">
                  {formatPrice(infinityPrice)}<span className="text-white/40 text-[10px] font-normal">/mo</span>
                </p>
              </div>
            </div>

            {(["core", "tools", "infinity"] as const).map((section) => (
              <div key={section} className="min-w-[560px]">
                <div className={`px-4 py-2 border-b border-white/5 ${section === "infinity" ? "bg-cyan-950/20" : "bg-white/[0.01]"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${section === "infinity" ? "text-cyan-400" : "text-white/30"}`}>
                    {section === "core" ? "Core" : section === "tools" ? "Tools" : "Infinity Exclusives ✦"}
                  </p>
                </div>
                {FEATURES.filter((f) => f.section === section).map((feature, i) => (
                  <div
                    key={feature.key}
                    className={`grid grid-cols-5 border-b border-white/[0.04] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                  >
                    <div className="p-3 text-xs text-white/70">{feature.label}</div>
                    <div className="p-3 flex items-center justify-center">
                      <CellContent value={feature.free} />
                    </div>
                    <div className="p-3 flex items-center justify-center bg-emerald-950/10">
                      <CellContent value={feature.starter} />
                    </div>
                    <div className={`p-3 flex items-center justify-center bg-cyan-950/10`}>
                      <CellContent value={feature.creator} />
                    </div>
                    <div className={`p-3 flex items-center justify-center ${section === "infinity" ? "bg-cyan-950/5" : ""}`}>
                      <CellContent value={feature.infinity} infinityLabel={feature.infinityLabel} />
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* CTA Row */}
            <div className="grid grid-cols-5 bg-white/[0.03] p-3 gap-2 min-w-[560px]">
              <div />
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/20 text-white/60 hover:bg-white/5 text-xs"
                  onClick={() => navigate(sub ? "/generate" : "/sign-in")}
                >
                  Try Free
                </Button>
              </div>
              <div>
                <Button
                  size="sm"
                  className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs"
                  onClick={() => handlePlanClick("starter")}
                >
                  Get Starter
                </Button>
              </div>
              <div>
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 border border-cyan-500/30 text-white text-xs shadow-lg shadow-cyan-500/25"
                  onClick={() => handlePlanClick("creator")}
                >
                  Get Creator
                </Button>
              </div>
              <div>
                <Button
                  size="sm"
                  className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs"
                  onClick={() => handlePlanClick("infinity")}
                >
                  Get Infinity
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trust + FAQ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
              <Shield className="w-4 h-4 text-cyan-400" />
              You're always protected
            </h3>
            <div className="space-y-3.5">
              {[
                { icon: Shield, label: "Secure payments", desc: "Powered by Razorpay, India's #1 gateway" },
                { icon: X, label: "Cancel anytime", desc: "No lock-in — cancel in one click" },
                { icon: Star, label: "4.1/5 rating", desc: "2,400+ creators love GrowFlow AI" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-white/50 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <h3 className="font-bold mb-4 text-lg">Common questions</h3>
            <div className="space-y-4">
              {[
                { q: "What happens after my 5 free generations?", a: "You'll hit your free limit for the month and can't generate more content until the next cycle. You'll need to upgrade to continue without waiting." },
                { q: "Can I switch between Creator and Infinity?", a: "Yes — upgrade or downgrade anytime from your settings. Changes take effect immediately." },
                { q: "Can I cancel my subscription easily?", a: "Absolutely. You can cancel with a single click anytime inside your settings page before your next billing cycle." },
                { q: "What is Viral Score™?", a: "An AI score (0–100) predicting how likely your content is to go viral, based on hook strength, platform patterns, and engagement signals." },
              ].map(({ q, a }) => (
                <div key={q}>
                  <p className="text-sm font-semibold text-white mb-1">{q}</p>
                  <p className="text-white/50 text-sm leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ ...upgradeModal, open: false })}
        targetPlan={upgradeModal.plan}
        billingPeriod={upgradeModal.billing}
        currency={upgradeModal.currency}
      />
      
      <TopUpSection />

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto mt-16">
          <h3 className="text-center text-xl font-bold text-white mb-6">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {[
              { q: "Can I cancel anytime?", a: "Yes. Cancel from Settings anytime. You keep access until your billing period ends." },
              { q: "Is there a free trial?", a: "Yes — 5 free generations with no credit card. Paid plans include a 7-day trial." },
              { q: "Which payment methods are accepted?", a: "UPI, all Indian debit/credit cards, net banking, and wallets via Razorpay." },
              { q: "What happens when I hit my generation limit?", a: "You'll see an upgrade prompt. Your previous content stays saved. No data is lost." },
              { q: "Can I switch plans?", a: "Yes. Upgrade or downgrade anytime from Settings. Changes apply from your next billing date." },
              { q: "Do you support Hindi and regional languages?", a: "Yes. GrowFlow AI supports English, Hindi, Hinglish, Bengali, Tamil, Telugu, and more." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-white/80 hover:text-white transition-colors list-none">
                  {q}
                  <ChevronDown className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <div className="px-5 pb-4 text-sm text-white/45 leading-relaxed border-t border-white/5 pt-3">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
  </div>
  );
}
