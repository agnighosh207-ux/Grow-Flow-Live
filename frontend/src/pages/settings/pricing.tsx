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
  Shield, IndianRupee, RefreshCw, Brain, Globe, DollarSign, Users, ChevronDown
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

function TopUpSection({ currency }: { currency: "INR" | "USD" }) {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const PACKS = currency === "USD" ? [
    { key: "small",  credits: 10, price: "$0.99", popular: false, desc: "Quick boost" },
    { key: "medium", credits: 25, price: "$1.99", popular: true,  desc: "Best value" },
    { key: "large",  credits: 60, price: "$3.99", popular: false, desc: "Power pack" },
  ] : [
    { key: "small",  credits: 10, price: "₹49",  popular: false, desc: "Quick boost" },
    { key: "medium", credits: 25, price: "₹99",  popular: true,  desc: "Best value" },
    { key: "large",  credits: 60, price: "₹199", popular: false, desc: "Power pack" },
  ];

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
              queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
              toast({ title: `✅ ${data.credits} credits added!`, description: "Your credits are ready to use." });
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
        <h3 className="text-2xl font-black text-white">Top Up Anytime</h3>
        <p className="text-white/40 text-sm mt-1">One-time purchase. Credits never expire.</p>
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
  { name: "Aditya K.", handle: "@adityadesign", content: "The 7-day trial convinced me. Setting up the autopay was smooth and the templates are fire.", rating: 5, type: "starter" }
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
        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-[#8B91E3]" /> 7-day free trial</span>
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
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[15%] w-[600px] h-[500px] rounded-full bg-[rgba(94,106,210,0.20)] blur-[140px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[400px] rounded-full bg-indigo-800/15 blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-pink-800/10 blur-[140px]" />
        
        {/* Floating Graphics */}
        <motion.div className="absolute top-[15%] right-[5%] opacity-[0.07] animate-float" style={{ animationDelay: '0.5s' }}><Brain className="w-64 h-64 text-[#8B91E3]" /></motion.div>
        <motion.div className="absolute bottom-[20%] left-[10%] opacity-[0.05] animate-float" style={{ animationDelay: '2s' }}><Zap className="w-48 h-48 text-indigo-400" /></motion.div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 pb-24">
        <FoundersBanner />

        {/* Back + Header */}
        <div className="mb-10">
          <button
            onClick={() => globalThis.history.back()}
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
                onClick={() => globalThis.open("https://dashboard.razorpay.com", "_blank")}
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

                  <div className="bg-[#0A051A] border border-white/10 rounded-2xl p-1 flex gap-1">
                  <button
                    onClick={() => setCurrency("INR")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currency === "INR" ? "bg-[#5E6AD2]/20 text-[#8B91E3] border border-[rgba(94,106,210,0.4)]/20" : "text-white/30 hover:text-white/50"}`}
                  >
                    <span className="w-4 h-3 bg-[rgba(94,106,210,0.20)] rounded-sm flex items-center justify-center text-[8px]">IN</span>
                    INR
                  </button>
                  <button
                    onClick={() => setCurrency("USD")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currency === "USD" ? "bg-[#5E6AD2]/20 text-[#8B91E3] border border-[rgba(94,106,210,0.4)]/20" : "text-white/30 hover:text-white/50"}`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    USD
                  </button>
                </div>
              </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
                Simple, transparent <br />
                <span className="text-[#5E6AD2]">pricing</span>
              </h1>
              <p className="text-sm md:text-lg max-w-xl mx-auto font-medium" style={{ color: 'var(--text-muted)' }}>
                Unlock high-performance AI tools and scale your content production.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

        <div className="flex flex-col items-center justify-center mb-12">
          <LiveCounter />
          
          <div className="mb-8 rounded-2xl p-4 text-center max-w-lg"
            style={{ background: 'rgba(94,106,210,0.06)', border: '1px solid rgba(94,106,210,0.15)' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold" style={{ color: '#F1F1F3' }}>
                Launch Offer — Start free for 7 days, then pay
              </span>
            </div>
            <p className="text-xs" style={{ color: '#9B9BA8' }}>
              Set up autopay today. Your card won't be charged until day 8. Cancel anytime before.
            </p>
          </div>

          <div className="flex items-center justify-center p-1 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {BILLING_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setBilling(opt.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  billing === opt.key
                    ? "bg-[#5E6AD2] text-white shadow-lg"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {opt.label}
                {opt.key === "yearly" ? (
                  <span className="ml-1.5 text-[10px] font-black text-emerald-400">2 months FREE</span>
                ) : opt.badge ? (
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-[#5E6AD2]/20 text-[#8B91E3]">
                    {opt.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <LaunchPricingBanner />

        {/* Plan Cards */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4 md:overflow-visible md:mx-0 md:px-0 mb-16">
          <div className="flex gap-4 min-w-max md:min-w-0 md:grid md:grid-cols-4 items-end">
            {/* Explorer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-[280px] md:w-auto flex-shrink-0"
            >
              <div className="flex flex-col h-full" style={{ background: '#0e0e14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <div className="mb-6">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Explorer</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">₹0</span>
                    <span className="text-white/40 text-xs">/ forever</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 mb-6">
                  {["5 free generations to try", "4 platform types", "Basic tools"].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#8B91E3] mt-0.5" />
                      <span className="text-white/60 text-xs">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/sign-up" className="w-full">
                  <Button className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10">
                    Get Started
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Starter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-[280px] md:w-auto flex-shrink-0"
            >
              <div className="flex flex-col h-full" style={{ background: '#0e0e14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <div className="mb-6">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Starter</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(starterPrice)}</span>
                    <span className="text-white/40 text-xs">/ mo</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 mb-6">
                  {["25 generations / month", "Idea Gen + Strategy", "All 4 platforms", "Priority Support"].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#8B91E3] mt-0.5" />
                      <span className="text-white/60 text-xs">{f}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => handlePlanClick("starter")}
                  className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10"
                >
                  {getPlanState("starter") === "current" ? "Current Plan" : "Start 7-Day Free Trial"}
                </Button>
                {getPlanState("starter") !== "current" && (
                  <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    No charge until day 8 · Cancel anytime
                  </p>
                )}
              </div>
            </motion.div>

            {/* Creator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-[300px] md:w-auto flex-shrink-0 relative z-10"
            >
              <div className="flex flex-col h-full" style={{ 
                background: 'linear-gradient(160deg, rgba(94,106,210,0.08) 0%, #0e0e14 40%)',
                border: '1px solid rgba(94,106,210,0.3)',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 0 40px rgba(94,106,210,0.12), 0 0 0 1px rgba(94,106,210,0.1)',
                marginBottom: '-8px'
              }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5E6AD2] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                  Most Popular
                </div>
                <div className="mb-6">
                  <p className="text-xs font-bold text-[#8B91E3] uppercase tracking-widest mb-1">Creator</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(creatorPrice)}</span>
                    <span className="text-white/40 text-xs">/ mo</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 mb-6">
                  {["150 generations / month", "Viral Score™ AI Rating", "Trend Engine Access", "Content Repurposer"].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#8B91E3] mt-0.5" />
                      <span className="text-white/70 text-xs font-medium">{f}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => handlePlanClick("creator")}
                  className="w-full h-11 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "#5E6AD2", color: 'white', boxShadow: '0 4px 15px rgba(94,106,210,0.3)' }}
                >
                  {getPlanState("creator") === "current" ? "Current Plan" : "Start 7-Day Free Trial"}
                </Button>
                {getPlanState("creator") !== "current" && (
                  <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    No charge until day 8 · Cancel anytime
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-[280px] md:w-auto flex-shrink-0"
            >
              <div className="flex flex-col h-full" style={{ background: '#0e0e14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px' }}>
                <div className="mb-6">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Infinity</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(infinityPrice)}</span>
                    <span className="text-white/40 text-xs">/ mo</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 mb-6">
                  {["Unlimited Generations*", "AI Content Coach", "Custom Brand Voice", "Ghostwriter Mode"].map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#8B91E3] mt-0.5" />
                      <span className="text-white/60 text-xs">{f}</span>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => handlePlanClick("infinity")}
                  className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10"
                >
                  {getPlanState("infinity") === "current" ? "Current Plan" : "Start 7-Day Free Trial"}
                </Button>
                {getPlanState("infinity") !== "current" && (
                  <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    No charge until day 8 · Cancel anytime
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-10 pt-6 border-t"
          style={{ borderColor: 'var(--border)' }}>
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: '#16A34A' }} />
          <p className="text-xs text-center" style={{ color: '#55555F' }}>
            <span style={{ color: '#9B9BA8', fontWeight: 600 }}>7-day free trial on all plans.</span>{' '}
            No charge until day 8. Cancel before then — no questions asked. After trial, cancel within 7 days of any charge for a full refund.
          </p>
        </div>

        {/* Agency Section */}
          <div className="mb-16 border rounded-2xl p-8 relative overflow-hidden group mt-16" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ background: 'rgba(94,106,210,0.1)', borderColor: 'rgba(94,106,210,0.2)' }}>
                      <Users className="w-6 h-6 text-[#8B91E3]" />
                   </div>
                   <div>
                      <h3 className="text-2xl font-bold text-white">For Agencies & Teams</h3>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(94,106,210,0.6)' }}>Enterprise Grade Scale</p>
                   </div>
                </div>
              <p className="text-white/50 text-sm max-w-lg leading-relaxed">
                Empower your entire team with collaborative content generation. Manage members, monitor usage, and maintain consistent brand voice across all accounts.
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[10px] font-black uppercase tracking-wider text-[#8B91E3]">
                <span className="bg-[#5E6AD2]/10 border border-[rgba(94,106,210,0.4)]/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Check className="w-3 h-3" /> 5 Member Seats</span>
                <span className="bg-[#5E6AD2]/10 border border-[rgba(94,106,210,0.4)]/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Check className="w-3 h-3" /> 1,000 Generations / mo</span>
                <span className="bg-[#5E6AD2]/10 border border-[rgba(94,106,210,0.4)]/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Check className="w-3 h-3" /> Team Analytics</span>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-4 min-w-[200px]">
              <div className="text-center md:text-right">
                <div className="flex items-baseline gap-1 justify-center md:justify-end">
                  <span className="text-4xl font-black text-white">{currency === "USD" ? "$39" : "₹2,999"}</span>
                  <span className="text-white/40 text-sm">/ mo</span>
                </div>
                <p className="text-[#8B91E3]/40 text-[10px] font-bold uppercase tracking-tighter mt-1">Billed monthly</p>
              </div>
                <Button 
                  onClick={() => setShowAgencyUpgrade(true)}
                  disabled={getPlanState("agency") === "current"}
                  className="w-full md:w-auto h-11 px-8 rounded-xl text-xs font-bold transition-all"
                  style={{ background: "#5E6AD2", color: 'white', boxShadow: '0 4px 15px rgba(94,106,210,0.3)' }}
                >
                  {getPlanState("agency") === "current" ? "Active Plan" : "Get Agency Plan"}
                </Button>
            </div>
          </div>
        </div>
        <div className="mb-16">
          <TopUpSection currency={currency} />
        </div>

        {/* ROI Anchor Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16 rounded-2xl border border-[rgba(94,106,210,0.4)]/20 bg-gradient-to-br from-[#5E6AD2]/30 to-indigo-950/20 p-6 md:p-8"
        >
          <div className="flex items-center gap-2 mb-2">
            {currency === "INR" ? <IndianRupee className="w-4 h-4 text-[#8B91E3]" /> : <DollarSign className="w-4 h-4 text-[#8B91E3]" />}
            <p className="text-xs font-bold uppercase tracking-widest text-[#8B91E3]">What {formatPrice(creatorPrice)} actually gets you</p>
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
              <span className="bg-gradient-to-r from-[#5E6AD2] to-indigo-400 bg-clip-text text-transparent">
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

        <div className="mb-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-5 py-2 mb-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">30-Day Money-Back Guarantee</span>
          </div>
          <p className="text-xs text-white/40 max-w-sm">If you don't grow your audience in the first 30 days, we'll refund your payment fully. No questions asked.</p>
        </div>

        <TestimonialSection />

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
              <div className="p-3 text-center bg-[rgba(94,106,210,0.30)] relative">
                <div className="flex justify-center mb-0.5">
                  <span className="text-[8px] bg-[#5E6AD2]/20 text-[#8B91E3] border border-[rgba(94,106,210,0.4)]/30 rounded-full px-1.5 py-0.5 font-semibold">
                    POPULAR
                  </span>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8B91E3] text-shadow-sm">Creator</p>
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
                <div className={`px-4 py-2 border-b border-white/5 ${section === "infinity" ? "bg-[rgba(94,106,210,0.20)]" : "bg-white/[0.01]"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${section === "infinity" ? "text-[#8B91E3]" : "text-white/30"}`}>
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
                    <div className={`p-3 flex items-center justify-center bg-[rgba(94,106,210,0.10)]`}>
                      <CellContent value={feature.creator} />
                    </div>
                    <div className={`p-3 flex items-center justify-center ${section === "infinity" ? "bg-[rgba(94,106,210,0.5)]" : ""}`}>
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
                  className="w-full bg-[#5E6AD2] hover:bg-[#5E6AD2] border border-[rgba(94,106,210,0.4)]/30 text-white text-xs shadow-lg shadow-[rgba(94,106,210,0.25)]"
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
              <Shield className="w-4 h-4 text-[#8B91E3]" />
              You're always protected
            </h3>
            <div className="space-y-3.5">
              {[
                { icon: Shield, label: "Secure payments", desc: "Powered by Razorpay, India's #1 gateway" },
                { icon: X, label: "Cancel anytime", desc: "No lock-in — cancel in one click" },
                { icon: Star, label: "4.1/5 rating", desc: "2,400+ creators love GrowFlow AI" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#5E6AD2]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-[#8B91E3]" />
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

      <UpgradeModal
        open={showAgencyUpgrade}
        onClose={() => setShowAgencyUpgrade(false)}
        targetPlan="agency"
        reason="upgrade"
        currency={currency}
        billingPeriod={billing}
      />

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
