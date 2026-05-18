import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { FoundersBanner } from "@/components/banners/FoundersBanner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";

declare global { var Razorpay: any; }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (globalThis.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    const timeout = setTimeout(() => resolve(false), 10000); // 10 second timeout
    script.onload = () => { clearTimeout(timeout); resolve(true); };
    script.onerror = () => { clearTimeout(timeout); resolve(false); };
    document.body.appendChild(script);
  });
}

import {
  Gift, Check, X, Zap, Star, ArrowLeft,
  Sparkles, TrendingUp, CalendarDays, Flame, Wand2,
  Shield, IndianRupee, RefreshCw, Brain, Globe, DollarSign, Users, ChevronDown, ChevronUp,
  Crown, Building2, Infinity
} from "lucide-react";

function LiveCounter() {
  const [count, setCount] = useState(1247);
  useEffect(() => {
    const i = setInterval(() => setCount(p => p + (Math.random() > 0.8 ? 1 : 0)), 9000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className="flex -space-x-1.5">
        {['S','R','A','P','K'].map((l,i) => (
          <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold"
            style={{ background: `hsl(${i*50+200},60%,35%)`, borderColor: 'var(--bg)', color: 'white' }}>
            {l}
          </div>
        ))}
      </div>
      <span className="text-sm" style={{ color: '#9B9BA8' }}>
        <span className="font-bold" style={{ color: '#F1F1F3' }}>{count.toLocaleString()}</span> creators growing with GrowFlow
      </span>
    </div>
  );
}

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
  { key: "priority", label: "Priority AI Processing", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
  { key: "support", label: "Priority Email Support", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
];

const INFINITY_EXCLUSIVES = [
  { icon: Brain, color: "text-[#8B91E3]", label: "AI Content Coach", desc: "Weekly personalized growth report analyzing your content patterns, strengths, and exact 3-task action plan." },
  { icon: Wand2, color: "text-[#8B91E3]", label: "AI Ghostwriter", desc: "Trains on your past content to write in your exact voice. The more you use it, the better it sounds like you." },
  { icon: Flame, color: "text-orange-400", label: "Viral Score™", desc: "Every piece of content gets scored 0-100 for virality potential by AI before you post it." },
  { icon: TrendingUp, color: "text-emerald-400", label: "Trend Engine", desc: "Perplexity-powered live search finds what's trending right now in your niche, not last week." },
  { icon: Sparkles, color: "text-pink-400", label: "Multi-Variation Output", desc: "Get 3 completely different angles on every topic — A/B test before you post." },
  { icon: CalendarDays, color: "text-[#8B91E3]", label: "Full Content Suite", desc: "Calendar, Repurposer, Competitor Intelligence, Hashtag Strategist — everything a content agency uses." },
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

function useSearchParams() {
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));
  useEffect(() => {
    const updateParams = () => setSearchParams(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", updateParams);
    return () => window.removeEventListener("popstate", updateParams);
  }, []);
  return [searchParams];
}

function TopUpSection({ currency }: { currency: "INR" | "USD" }) {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();

  const PACKS = currency === "USD" ? [
    { key: "small",  credits: 10, price: "$0.99", popular: false, desc: "Quick boost" },
    { key: "medium", credits: 25, price: "$1.99", popular: true,  desc: "Best value" },
    { key: "large",  credits: 60, price: "$3.99", popular: false, desc: "Power pack" },
  ] : [
    { key: "small",  credits: 10, price: "₹49",  popular: false, desc: "Quick boost" },
    { key: "medium", credits: 25, price: "₹99",  popular: true,  desc: "Best value" },
    { key: "large",  credits: 60, price: "₹199", popular: false, desc: "Power pack" },
  ];

  useEffect(() => {
    const topupPack = searchParams.get("topup");
    if (topupPack && ["small", "medium", "large"].includes(topupPack)) {
      // Delay slightly to let Razorpay script load
      setTimeout(() => handleTopup(topupPack), 800);
    }
  }, []);

  const handleTopup = async (packKey: string) => {
    setLoadingPack(packKey);
    try {
      if (import.meta.env.DEV) console.log("[TopUp] Loading Razorpay...");
      const loaded = await loadRazorpay();
      if (!loaded || !globalThis.Razorpay) {
        throw new Error("Razorpay could not load. Please check your internet or disable ad blockers.");
      }
      
      const token = await getToken();
      if (import.meta.env.DEV) console.log("[TopUp] Creating order...", { packKey, currency });
      const res = await fetch("/api/subscription/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pack: packKey, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      if (import.meta.env.DEV) console.log("[TopUp] Order created:", data.orderId);

      const razorpayKey = data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

      const options = {
        key: razorpayKey,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "GrowFlow AI",
        description: `Credit Top-Up: ${data.label}`,
        order_id: data.orderId,
        theme: { color: "#5E6AD2" },
        handler: async (response: any) => {
          setLoadingPack(packKey); // Keep loading during verification
          try {
            if (import.meta.env.DEV) console.log("[TopUp] Verifying payment...");
            const verifyRes = await fetch("/api/subscription/credits/verify-topup", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ ...response, credits: data.credits }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setSuccessPack(packKey); // Show success state
              await queryClient.refetchQueries({ queryKey: ["subscription-status"] });
              setTimeout(() => setSuccessPack(null), 3000);
              toast({ 
                title: `✅ ${data.credits} credits added to your wallet!`,
                description: "Open the generate page to use them right now."
              });
            } else {
              throw new Error(verifyData.error || "Verification failed");
            }
          } catch (err: any) {
            toast({ variant: "destructive", title: "Verification failed", description: err.message });
          } finally {
            setLoadingPack(null);
          }
        },
        modal: { 
          ondismiss: () => setLoadingPack(null),
          escape: true,
          backdropclose: false
        },
      };

      if (import.meta.env.DEV) console.log("[TopUp] Opening Razorpay...");
      const rzp = new globalThis.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error("Top-up failed:", response.error);
        toast({ variant: "destructive", title: "Payment Failed", description: response.error.description });
        setLoadingPack(null);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Top-up error:", err);
      toast({ variant: "destructive", title: "Top-up Error", description: err.message });
      setLoadingPack(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-16 mb-12 relative">
      <div className="absolute inset-0 bg-[#5E6AD2]/5 blur-3xl -z-10 rounded-full" />
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5E6AD2]/10 border border-[rgba(94,106,210,0.4)]/20 mb-3">
          <Zap className="w-3.5 h-3.5 text-[#8B91E3]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8B91E3]">One-time Boost</span>
        </div>
        <div className="mb-4">
          <p className="text-sm font-bold text-white mb-1">Buy Credits Instantly</p>
          <p className="text-[11px] text-white/40">
            One-time purchase. Credits never expire. Added to your wallet immediately.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PACKS.map(pack => (
          <div key={pack.key} className={`relative rounded-[2rem] border p-6 text-center transition-all duration-300 ${pack.popular ? 'border-[rgba(94,106,210,0.4)]/40 bg-[#5E6AD2]/5 shadow-xl shadow-[rgba(94,106,210,0.10)]' : 'border-white/8 bg-white/[0.02] hover:border-white/20'}`}>
            {pack.popular && (
              <div className="absolute -top-3 inset-x-0 flex justify-center">
                <span className="bg-gradient-to-r from-[#5E6AD2] to-indigo-600 text-white text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">Most Popular</span>
              </div>
            )}
            <div className="text-4xl font-black text-white mt-2">{pack.credits}</div>
            <div className="text-xs font-bold text-white/40 mb-1 uppercase tracking-widest">credits</div>
            <p className="text-[10px] text-white/20 mb-5 italic">{pack.desc}</p>
            <Button
              onClick={() => handleTopup(pack.key)}
              disabled={!!loadingPack}
              className={`w-full h-12 rounded-2xl text-sm font-black transition-all ${pack.popular ? 'bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white shadow-lg shadow-[rgba(94,106,210,0.20)]' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'} disabled:opacity-50`}
            >
              {loadingPack === pack.key ? <RefreshCw className="w-4 h-4 animate-spin" /> : pack.price}
            </Button>

            {successPack === pack.key ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-[#050210] rounded-[2rem] border border-emerald-500/30 flex flex-col items-center justify-center p-6 z-20"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-12 h-12 rounded-full bg-emerald-500/25 border border-emerald-500/40 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Check className="w-6 h-6 text-emerald-400" />
                </motion.div>
                <span className="text-sm font-black text-white">Top-up Successful!</span>
                <span className="text-[10px] text-white/50 mt-1">Credits added to wallet</span>
              </motion.div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-white/20 mt-3">Credits never expire · Secure payment via Razorpay</p>
    </div>
  );
}

const TESTIMONIALS = [
  { name: "Rahul S.", handle: "@rahul_growth", content: "Upgraded to Creator and it paid for itself in two days. The Viral Score feature actually works.", rating: 5, type: "creator" },
  { name: "Priya M.", handle: "@priyamarketing", content: "I was spending ₹10k/mo on a writer. Infinity replaced them and the quality is honestly better because of the Brand Voice feature.", rating: 5, type: "infinity" },
  { name: "Aditya K.", handle: "@adityadesign", content: "The 3-day trial convinced me. Setting up the autopay was smooth and the templates are fire.", rating: 5, type: "starter" }
];

function UrgencyHeader() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const base = 1247;
    const sessionRandom = Math.floor(Math.random() * 23);
    setCount(base + sessionRandom);
    
    const interval = setInterval(() => {
      setCount(prev => prev + (Math.random() > 0.7 ? 1 : 0));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 mb-8 mt-4">
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 text-sm font-bold">
          {count.toLocaleString()} creators already growing with GrowFlow
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/30">
        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#8B91E3]" /> 3-day free trial</span>
        <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-[#8B91E3]" /> Cancel anytime</span>
        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#8B91E3]" /> Instant access</span>
      </div>
    </div>
  );
}

function LaunchPricingBanner() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  
  useEffect(() => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    deadline.setHours(23, 59, 59, 0);
    const deadlineMs = deadline.getTime();
    
    const tick = () => {
      const diff = deadlineMs - Date.now();
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      });
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-center max-w-2xl mx-auto">
      <p className="text-amber-400 font-black text-sm uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
        <Flame className="w-4 h-4" /> Launch Pricing — Limited Time Only <Flame className="w-4 h-4" />
      </p>
      <p className="text-white/50 text-xs mb-3">
        Current prices are 40% off our regular pricing. Lock in now before it increases.
      </p>
      <div className="flex items-center justify-center gap-3">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hours" },
          { value: timeLeft.minutes, label: "Min" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2 min-w-[60px]">
            <div className="text-2xl font-black text-amber-300">{String(value).padStart(2, '0')}</div>
            <div className="text-[9px] font-bold text-amber-500/60 uppercase">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TestimonialSection() {
  return (
    <div className="mb-16 mt-8">
      <h2 className="text-2xl font-bold text-center mb-8">Don't just take our word for it</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col">
            <div className="flex items-center gap-1 mb-3">
              {[...new Array(t.rating)].map((_, i) => <Star key={`star-${t.name}-${i}`} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-4 flex-1">"{t.content}"</p>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white">{t.name}</span>
              <span className="text-white/30 text-xs">{t.handle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    tagline: "Perfect to begin your creator journey",
    color: "#6366F1",       // indigo
    glow: "rgba(99,102,241,0.15)",
    border: "rgba(99,102,241,0.25)",
    priceINR: { monthly: 149, quarterly: 129, "half-yearly": 119, yearly: 109 },
    priceUSD: { monthly: 2, quarterly: 1.8, "half-yearly": 1.6, yearly: 1.5 },
    credits: "25 generations/mo",
    features: [
      "25 content generations/month",
      "All 4 platforms (Instagram, YouTube, Twitter, LinkedIn)",
      "Hook Generator + Idea Engine",
      "Basic AI Coach",
      "Content History (30 days)",
    ],
    notIncluded: ["Competitor Intel", "Ghostwriter", "Team seats"],
  },
  {
    id: "creator",
    name: "Creator",
    icon: Crown,
    tagline: "For serious creators who post daily",
    color: "#8B5CF6",       // violet
    glow: "rgba(139,92,246,0.20)",
    border: "rgba(139,92,246,0.35)",
    badge: "MOST POPULAR",
    priceINR: { monthly: 449, quarterly: 399, "half-yearly": 369, yearly: 329 },
    priceUSD: { monthly: 6, quarterly: 5.5, "half-yearly": 5, yearly: 4.5 },
    credits: "150 generations/mo",
    features: [
      "150 content generations/month",
      "Everything in Starter",
      "Competitor Intel + Repurpose",
      "Ghostwriter + Brand Voice",
      "A/B Test + Hook Scorer",
      "Priority AI (faster responses)",
    ],
    notIncluded: ["Team seats (Agency plan)"],
  },
  {
    id: "infinity",
    name: "Infinity",
    icon: Infinity,
    tagline: "Unlimited everything for power creators",
    color: "#F59E0B",       // amber
    glow: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.30)",
    priceINR: { monthly: 799, quarterly: 699, "half-yearly": 649, yearly: 579 },
    priceUSD: { monthly: 10, quarterly: 9, "half-yearly": 8.5, yearly: 7.5 },
    credits: "Unlimited",
    features: [
      "Unlimited generations — no caps ever",
      "Everything in Creator",
      "AI Coach (full analysis)",
      "Trend Alerts + Digest emails",
      "SambaNova 70B model (highest quality)",
      "First access to new features",
    ],
    notIncluded: [],
  },
  {
    id: "agency",
    name: "Agency",
    icon: Building2,
    tagline: "For agencies and creator teams",
    color: "#10B981",       // emerald
    glow: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.25)",
    priceINR: { monthly: 2999, yearly: 2499 },
    priceUSD: { monthly: 38, yearly: 30 },
    credits: "1000 generations/mo",
    features: [
      "1000 generations/month",
      "5 team seats",
      "Everything in Infinity",
      "Team dashboard + member management",
      "Usage analytics per member",
      "Dedicated support",
    ],
    notIncluded: [],
  },
];

const NEW_BILLING_OPTIONS = [
  { id: "monthly",     label: "Monthly",     save: null },
  { id: "quarterly",   label: "3 Months",    save: "Save 10%" },
  { id: "half-yearly", label: "6 Months",    save: "Save 20%" },
  { id: "yearly",      label: "Yearly",      save: "Save 30%" },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("yearly");
  const [currency, setCurrency] = useState<"INR" | "USD">((): "INR" | "USD" => {
    try {
      if (typeof globalThis !== "undefined") {
        const stored = localStorage.getItem("pricing_currency");
        if (stored === "INR" || stored === "USD") return stored;
      }
    } catch (e) {
      console.warn("localStorage access denied", e);
    }
    return "INR";
  });
  const [upgradeModal, setUpgradeModal] = useState<{ 
    open: boolean; 
    plan: "starter" | "creator" | "infinity" | "agency"; 
    billing: BillingPeriod; 
    currency: "INR" | "USD";
    reason?: "limit" | "pro_feature" | "checkout";
  }>({ 
    open: false, plan: "starter", billing: "monthly", currency: "INR", reason: "checkout" 
  });
  
  useEffect(() => {
    loadRazorpay().catch(console.error);
    document.title = "Pricing & Credits — GrowFlow AI";
  }, []);
  
  useEffect(() => {
    localStorage.setItem("pricing_currency", currency);
  }, [currency]);

  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentShown, setExitIntentShown] = useState(false);
  const [showAgencyUpgrade, setShowAgencyUpgrade] = useState(false);

  const { data: sub } = useSubscriptionStatus();
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<string>("creator");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const agencyBillingOptions = NEW_BILLING_OPTIONS.filter(b => 
    b.id === "monthly" || b.id === "yearly"
  );
  const availableBilling = selectedPlan === "agency" 
    ? agencyBillingOptions 
    : NEW_BILLING_OPTIONS;
  
  const price = currency === "INR" 
    ? (plan.priceINR as any)[billing] 
    : (plan.priceUSD as any)[billing];

  const isCurrentPlan = sub?.planType === selectedPlan;
  const hasActivePlan = ["active", "trial"].includes(sub?.plan || "");
  
  useEffect(() => {
    if (selectedPlan === "agency" && !["monthly", "yearly"].includes(billing)) {
      setBilling("monthly");
    }
  }, [selectedPlan, billing]);

  const handleCheckout = (p: string, b: string, c: string) => {
    handlePlanClick(p as any);
  };

  const currentPlan = sub?.planType ?? "free";
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const isActivePaidUser = (sub?.plan === "active" || sub?.plan === "trial") && !sub?.isAdmin;

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
    setUpgradeModal({ open: true, plan, billing, currency, reason: "checkout" });
  };

  return (
    <div className="min-h-screen bg-[#080810]">
      
      {/* EXITS INTENT AND MODALS (kept from old layout) */}
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
              className="bg-[#12121C] border border-white/10 rounded-[40px] pt-10 pb-8 px-8 md:pt-14 md:pb-12 md:px-12 max-w-sm text-center relative overflow-hidden shadow-[0_0_80px_rgba(94,106,210,0.1)]"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#5E6AD2]/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="w-16 h-16 rounded-2xl bg-[#5E6AD2]/20 flex items-center justify-center mx-auto mb-6">
                <Gift className="w-8 h-8 text-[#8B91E3]" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 italic">Wait! Don't leave empty-handed.</h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed font-medium">
                Try the <span className="text-[#8B91E3] font-bold">Creator Plan</span> today and get <span className="text-white font-bold">50% extra credits</span> for your first month.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => { setShowExitIntent(false); handlePlanClick("creator"); }}
                  className="w-full h-14 bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white font-black rounded-2xl shadow-xl shadow-[rgba(94,106,210,0.40)]"
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

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ ...upgradeModal, open: false })}
        targetPlan={upgradeModal.plan}
        billingPeriod={upgradeModal.billing}
        currency={upgradeModal.currency}
      />
      <UpgradeModal
        open={showAgencyUpgrade}
        onClose={() => setShowAgencyUpgrade(false)}
        targetPlan="agency"
        reason="upgrade"
        currency={currency}
        billingPeriod={billing}
      />

      {/* ── TOP HEADER ── */}
      <div className="sticky top-0 z-40 bg-[#080810]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button onClick={() => globalThis.history.back()} 
            className="text-white/40 hover:text-white p-2 -ml-2">
            ← Back
          </button>
          <h1 className="text-sm font-bold text-white">Choose Your Plan</h1>
          {/* Currency toggle */}
          <button
            onClick={() => setCurrency(c => c === "INR" ? "USD" : "INR")}
            className="text-xs font-bold text-white/40 hover:text-white/70 border border-white/10 px-2 py-1 rounded-lg transition-colors"
          >
            {currency === "INR" ? "₹ INR" : "$ USD"}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32">
        {/* ── HEADLINE ── */}
        <div className="text-center pt-6 pb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
              3-Day Free Trial — No Charges Until Day 4
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Grow faster with AI</h2>
          <p className="text-sm text-white/40">Used by 2,400+ Indian creators on Instagram, YouTube & LinkedIn</p>
        </div>

        {/* Credit Top-Up Section — MOVED UP */}
        <div id="topup" className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[11px] uppercase tracking-widest font-bold text-white/30">
              ⚡ Quick Credit Top-Up — No Subscription Needed
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <TopUpSection currency={currency} />
        </div>

        {/* ── PLAN SELECTOR TABS ── */}
        <div className="grid grid-cols-4 gap-1.5 mb-5 p-1 rounded-2xl bg-white/3 border border-white/5">
          {PLANS.map(p => {
            const Icon = p.icon;
            const isSel = selectedPlan === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 ${
                  isSel ? "bg-white/10 border border-white/10 shadow-lg" : "hover:bg-white/5"
                }`}
                style={isSel ? { boxShadow: `0 0 20px ${p.glow}`, borderColor: p.border } : {}}
              >
                <Icon className="w-4 h-4 transition-colors" style={{ color: isSel ? p.color : "rgba(255,255,255,0.3)" }} />
                <span className={`text-[10px] font-bold transition-colors ${isSel ? "text-white" : "text-white/30"}`}>
                  {p.name}
                </span>
                {p.badge && isSel && (
                  <span className="text-[8px] font-black text-violet-300 bg-violet-500/20 px-1.5 rounded-full">
                    HOT
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── MAIN PLAN CARD ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPlan}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="rounded-3xl border p-5 mb-4"
            style={{ 
              background: `linear-gradient(135deg, ${plan.glow} 0%, transparent 60%)`,
              borderColor: plan.border,
              boxShadow: `0 8px 40px ${plan.glow}`,
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <plan.icon className="w-5 h-5" style={{ color: plan.color }} />
                  <h3 className="text-lg font-black text-white">{plan.name}</h3>
                  {plan.badge && (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                      style={{ color: plan.color, background: plan.glow, border: `1px solid ${plan.border}` }}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/40">{plan.tagline}</p>
              </div>
              <div className="text-right">
                <div className="flex items-end gap-0.5">
                  <span className="text-2xl font-black text-white">
                    {currency === "INR" ? "₹" : "$"}{price}
                  </span>
                  <span className="text-[11px] text-white/30 mb-0.5">/mo</span>
                </div>
                <p className="text-[10px] text-white/30">{plan.credits}</p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: plan.glow, border: `1px solid ${plan.border}` }}>
                    <Check className="w-2.5 h-2.5" style={{ color: plan.color }} />
                  </div>
                  <span className="text-[12px] text-white/70">{f}</span>
                </div>
              ))}
              {plan.notIncluded.map((f, i) => (
                <div key={i} className="flex items-center gap-2 opacity-40">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/10">
                    <X className="w-2.5 h-2.5 text-white/40" />
                  </div>
                  <span className="text-[12px] text-white/30 line-through">{f}</span>
                </div>
              ))}
            </div>

            {isCurrentPlan && hasActivePlan && (
              <div className="mb-4 p-3 rounded-xl border text-center"
                style={{ borderColor: plan.border, background: plan.glow }}>
                <p className="text-xs font-bold" style={{ color: plan.color }}>
                  {sub?.plan === "trial" 
                    ? `✅ You're on trial — ${sub.trialDaysLeft} day(s) left` 
                    : "✅ Your current active plan"}
                </p>
              </div>
            )}

            {!isCurrentPlan || !hasActivePlan ? (
              <button
                onClick={() => handleCheckout(selectedPlan, billing, currency)}
                disabled={hasActivePlan && !isCurrentPlan}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ 
                  background: hasActivePlan && !isCurrentPlan ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}CC 100%)`,
                  boxShadow: hasActivePlan && !isCurrentPlan ? "none" : `0 4px 20px ${plan.glow}`,
                }}
              >
                {hasActivePlan && !isCurrentPlan
                  ? "Cancel current plan first"
                  : sub?.hasUsedTrial
                    ? `Subscribe — Charged Immediately`
                    : `Start 3-Day Free Trial →`}
              </button>
            ) : (
              <button
                onClick={() => navigate("/settings?tab=billing")}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-white/60 bg-white/5 border border-white/10 transition-all"
              >
                Manage Subscription →
              </button>
            )}
            
            {(!hasActivePlan || isCurrentPlan) && (
              <p className="text-[10px] text-white/25 text-center mt-3">
                UPI setup charges ₹1–5 as mandate fee → auto-refunded instantly
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── BILLING PERIOD SELECTOR ── */}
        <div className="mb-6">
          <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold mb-3 text-center">Billing Period</p>
          <div className="grid grid-cols-2 gap-2">
            {availableBilling.map(opt => (
              <button
                key={opt.id}
                onClick={() => setBilling(opt.id as any)}
                className={`relative py-3 px-4 rounded-2xl border transition-all text-left ${
                  billing === opt.id ? "bg-white/10 border-white/20 text-white" : "bg-white/3 border-white/5 text-white/40 hover:text-white/60"
                }`}
              >
                <p className="text-xs font-bold">{opt.label}</p>
                {opt.save ? (
                  <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">{opt.save}</p>
                ) : (
                  <p className="text-[10px] text-white/25 mt-0.5">Standard</p>
                )}
                {billing === opt.id && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── QUICK COMPARE TABLE ── */}
        <div className="mb-6 rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Quick Comparison</p>
          </div>
          <div className="divide-y divide-white/5">
            {[
              { label: "Generations/month", values: ["25", "150", "∞", "1000"] },
              { label: "All tools included",  values: ["Core only", "All tools", "All tools", "All tools"] },
              { label: "AI Coach",           values: ["Basic", "Full", "Full", "Full"] },
              { label: "Team seats",         values: ["1", "1", "1", "5"] },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-5 gap-0">
                <div className="col-span-2 px-4 py-2.5">
                  <p className="text-[11px] text-white/40">{row.label}</p>
                </div>
                {row.values.map((val, j) => (
                  <div key={j} className={`px-2 py-2.5 text-center ${PLANS[j].id === selectedPlan ? "bg-white/5" : ""}`}>
                    <p className={`text-[11px] font-semibold ${PLANS[j].id === selectedPlan ? "text-white" : "text-white/30"}`}>
                      {val}
                    </p>
                  </div>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-5 bg-white/3">
              <div className="col-span-2" />
              {PLANS.map(p => (
                <div key={p.id} className={`py-2 text-center ${p.id === selectedPlan ? "bg-white/5" : ""}`}>
                  <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: p.id === selectedPlan ? p.color : "rgba(255,255,255,0.2)" }}>
                    {p.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* ── TRUST SIGNALS ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: "🔒", text: "Secured by Razorpay" },
            { icon: "↩️", text: "Cancel anytime" },
            { icon: "✅", text: "3-day free trial" },
          ].map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/3 border border-white/5 text-center">
              <span className="text-lg">{t.icon}</span>
              <p className="text-[10px] text-white/40 font-semibold">{t.text}</p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div className="mb-6">
          <p className="text-sm font-bold text-white mb-3">Common Questions</p>
          <div className="space-y-2">
            {[
              { q: "Will I be charged right now?", a: "No. You get 3 days completely free. UPI AutoPay requires a ₹1–5 mandate setup fee that is automatically refunded within seconds. Your first actual charge happens on Day 4." },
              { q: "What if I cancel before 3 days?", a: "Zero charges. Cancel from Settings → Subscription before Day 3 and you pay absolutely nothing." },
              { q: "Can I switch plans?", a: "You need to cancel your current plan from Settings first. After cancellation, you can subscribe to a different plan immediately — but the 3-day trial is only available once per account." },
              { q: "Why does Razorpay show my name instead of GrowFlow AI?", a: "This is being updated in our Razorpay merchant profile. The charges will appear as GrowFlow AI on your bank statement shortly." },
              { q: "What are credit top-ups?", a: "If you run out of monthly credits, you can buy extra credits as a one-time purchase. They never expire and are added to your wallet instantly." },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.015] overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-xs font-semibold text-white/70 pr-4">{item.q}</span>
                  {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />}
                </button>
                <AnimatePresence>
                  {expandedFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                      <p className="text-[11px] text-white/40 px-4 pb-4 leading-relaxed border-t border-white/5 pt-3">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── STICKY BOTTOM CTA (mobile) ── */}
      {!hasActivePlan && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-[#080810]/95 backdrop-blur-xl border-t border-white/5">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => handleCheckout(selectedPlan, billing, currency)}
              className="w-full py-4 rounded-2xl font-black text-white text-sm transition-all active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}CC 100%)`, boxShadow: `0 4px 24px ${plan.glow}` }}
            >
              {sub?.hasUsedTrial ? `Subscribe to ${plan.name} — ${currency === "INR" ? "₹" : "$"}${price}/mo` : `Try ${plan.name} Free for 3 Days →`}
            </button>
            <p className="text-[10px] text-white/25 text-center mt-2">
              {sub?.hasUsedTrial ? "AutoPay setup — charged immediately" : "AutoPay setup · ₹1–5 mandate fee refunded instantly"}
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
}
