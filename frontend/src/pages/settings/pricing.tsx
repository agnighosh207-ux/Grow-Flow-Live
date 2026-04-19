import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/modals/UpgradeModal";
import { FoundersBanner } from "@/components/banners/FoundersBanner";
import { useToast } from "@/hooks/use-toast";

import {
  Check, X, Zap, Infinity as InfinityIcon, Star, ArrowLeft,
  Sparkles, TrendingUp, BarChart3, CalendarDays, Flame, Wand2,
  Shield, Clock, ChevronRight, Crown, Lock, AlertTriangle,
  IndianRupee
} from "lucide-react";

type BillingPeriod = "monthly" | "quarterly" | "biannual" | "yearly";

const BILLING_OPTIONS: { key: BillingPeriod; label: string; badge?: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "3-Month", badge: "Save 10%" },
  { key: "biannual", label: "6-Month", badge: "Save 20%" },
  { key: "yearly", label: "Yearly", badge: "Best Deal" },
];

const BASE_PRICES: Record<string, Record<BillingPeriod, number>> = {
  starter: { monthly: 109, quarterly: 98, biannual: 87, yearly: 72 },
  creator: { monthly: 249, quarterly: 224, biannual: 199, yearly: 166 },
  infinity: { monthly: 499, quarterly: 449, biannual: 399, yearly: 332 },
};

const STRIKETHROUGH_PRICES: Record<string, number> = {
  starter: 299,
  creator: 499,
  infinity: 699,
};

const BILLING_TOTALS: Record<string, Record<BillingPeriod, number>> = {
  starter: { monthly: 109, quarterly: 294, biannual: 522, yearly: 864 },
  creator: { monthly: 249, quarterly: 672, biannual: 1194, yearly: 1992 },
  infinity: { monthly: 499, quarterly: 1347, biannual: 2394, yearly: 3984 },
};

const BILLING_SAVINGS: Record<string, Record<string, number>> = {
  starter: { quarterly: 33, biannual: 132, yearly: 444 },
  creator: { quarterly: 75, biannual: 300, yearly: 996 },
  infinity: { quarterly: 150, biannual: 600, yearly: 2004 },
};

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
  { key: "generations", label: "Content Generations", free: "3 lifetime", starter: "20 / month", creator: "60 / month", infinity: "Unlimited*", section: "core" },
  { key: "regen", label: "Regenerations per Topic", free: false, starter: "Unlimited", creator: "Unlimited", infinity: "Unlimited", section: "core" },
  { key: "platforms", label: "All 4 Platforms", free: true, starter: true, creator: true, infinity: true, section: "core" },
  { key: "language", label: "Multi-Language Output", free: "English Only", starter: "Eng + 1 Regional", creator: "Full Access*", infinity: "Full Access*", section: "core" },
  { key: "hooks", label: "Hooks, CTAs & Hashtags", free: false, starter: true, creator: true, infinity: true, section: "core" },
  { key: "formats", label: "Captions, Scripts & Threads", free: false, starter: true, creator: true, infinity: true, section: "core" },
  { key: "ideas", label: "Idea Generator", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "strategy", label: "7-Day Strategy Planner", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "viralhooks", label: "Viral Hooks Generator", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "saved", label: "Saved Favorites & History", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "download", label: "Download as .txt", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "improve", label: "Improve Competitor Content", free: false, starter: true, creator: true, infinity: true, section: "tools" },
  { key: "styles", label: "AI Writing Styles", free: false, starter: false, creator: false, infinity: true, section: "infinity", infinityLabel: "Bold · Viral · Story · Pro" },
  { key: "viralscore", label: "Viral Score™", free: false, starter: false, creator: true, infinity: true, section: "infinity", infinityLabel: "AI rates 0–100" },
  { key: "trending", label: "Trending Topics Feed", free: false, starter: false, creator: false, infinity: true, section: "infinity", infinityLabel: "Fresh daily ideas" },
  { key: "multivar", label: "Multi-Variation Output", free: false, starter: false, creator: true, infinity: true, section: "infinity", infinityLabel: "3 versions per gen" },
  { key: "calendar", label: "Content Calendar", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
  { key: "insights", label: "Performance Insights", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
  { key: "priority", label: "Priority AI (2× faster)", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
  { key: "support", label: "Priority Support", free: false, starter: false, creator: false, infinity: true, section: "infinity" },
];

const INFINITY_EXCLUSIVES = [
  { icon: Wand2, color: "text-violet-400", label: "AI Writing Styles", desc: "Switch between Bold, Viral, Storytelling, and Professional tones — AI matches your unique voice." },
  { icon: Flame, color: "text-orange-400", label: "Viral Score™", desc: "Every piece gets rated 0–100 for virality potential before you even post it." },
  { icon: TrendingUp, color: "text-emerald-400", label: "Trending Topics Feed", desc: "Fresh content ideas pulled from what's trending daily — never run out of inspiration." },
  { icon: Sparkles, color: "text-pink-400", label: "Multi-Variation Output", desc: "Get 3 completely different versions of each post and pick the one that hits hardest." },
  { icon: CalendarDays, color: "text-blue-400", label: "Content Calendar", desc: "Plan your entire week of content in one place — stay consistent and see the big picture." },
  { icon: BarChart3, color: "text-yellow-400", label: "Performance Insights", desc: "See which topics and formats perform best so you double down on what works." },
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

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; plan: "starter" | "creator" | "infinity" }>({ open: false, plan: "starter" });
  
  const { data: sub } = useSubscriptionStatus();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const currentPlan = sub?.planType ?? "free";
  const starterPrice = BASE_PRICES.starter[billing];
  const creatorPrice = BASE_PRICES.creator[billing];
  const infinityPrice = BASE_PRICES.infinity[billing];
  const handlePlanClick = (plan: "starter" | "creator" | "infinity") => {
    if (!sub) {
      navigate("/sign-in");
      return;
    }
    if (
      (plan === "starter" && currentPlan === "starter" && sub.plan === "active") ||
      (plan === "creator" && currentPlan === "creator" && sub.plan === "active") ||
      (plan === "infinity" && currentPlan === "infinity" && sub.plan === "active")
    ) {
      toast({ title: "Already on this plan", description: "You're already subscribed to this plan." });
      return;
    }
    setUpgradeModal({ open: true, plan });
  };

  const billingLabel = (period: BillingPeriod) => {
    if (period === "quarterly") return "every 3 months";
    if (period === "biannual") return "every 6 months";
    if (period === "yearly") return "yearly";
    return "monthly";
  };

  return (
    <div className="min-h-screen bg-[#050210] text-white overflow-x-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[15%] w-[600px] h-[500px] rounded-full bg-violet-700/20 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[400px] rounded-full bg-purple-800/15 blur-[140px]" />
        <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-pink-800/10 blur-[140px]" />
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

          <div className="text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
                <Zap className="w-3.5 h-3.5" />
                Simple, Transparent Pricing
              </span>
              <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
                Pick your{" "}
                <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  growth plan
                </span>
              </h1>
              <p className="text-white/60 text-lg max-w-xl mx-auto">
                Start free with 3 full-featured generations. Upgrade when you're ready to scale.
              </p>
              <p className="text-white/80 font-medium text-sm mt-3 bg-violet-500/10 inline-block px-4 py-2 rounded-lg border border-violet-500/20">
                Content in your audience’s language = higher engagement 🚀
              </p>
              <p className="text-white/35 text-sm mt-3">
                Built to help you grow faster, not just generate content.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="relative bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1 flex-wrap justify-center">
            {BILLING_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setBilling(opt.key)}
                className={`relative px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  billing === opt.key ? "text-white" : "text-white/50 hover:text-white/70"
                }`}
              >
                {billing === opt.key && (
                  <motion.div
                    layoutId="billingPill"
                    className="absolute inset-0 bg-violet-600 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{opt.label}</span>
                {opt.badge && (
                  <span className="relative z-10 ml-1 sm:ml-1.5 text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-1 sm:px-1.5 py-0.5 font-semibold">
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-16">

          {/* Free / Explorer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-white/40 mb-2">Explorer</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">₹0</span>
                <span className="text-white/40 text-sm">/ forever</span>
              </div>
              <p className="text-white/50 text-sm mt-1">Try it all before you commit</p>
            </div>

            <div className="space-y-2.5 flex-1 mb-6">
              {[
                "3 complete content generations",
                "All 4 platforms unlocked",
                "Basic English Output",
                "Full content history",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-white/70 text-sm">{f}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 mt-1">
                <p className="text-white/30 text-xs italic">No credit card required</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-white/20 text-white/60 hover:bg-white/5"
              onClick={() => navigate(sub ? "/generate" : "/sign-in")}
            >
              {sub ? "Start Exploring" : "Start Exploring Free"}
            </Button>
          </motion.div>

          {/* Starter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-950/30 to-teal-950/20 p-6 flex flex-col"
          >
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold tracking-widest uppercase text-emerald-400">Starter</p>
              </div>
              <div className="flex flex-col gap-1">
                {billing === "monthly" && (
                    <span className="text-sm text-white/50 line-through">₹{STRIKETHROUGH_PRICES.starter}</span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-100">₹{starterPrice}</span>
                  <span className="text-white/40 text-sm">/ mo</span>
                  {billing === "monthly" && (
                    <span className="text-xs text-emerald-400 ml-2 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">(Launching Offer)</span>
                  )}
                </div>
              </div>
              {billing !== "monthly" && (
                <p className="text-white/40 text-xs mt-1">
                  ₹{BILLING_TOTALS.starter[billing]} billed {billingLabel(billing)}
                  {" "}·{" "}
                  <span className="text-emerald-400">Save ₹{BILLING_SAVINGS.starter[billing]}</span>
                </p>
              )}
              <p className="text-white/40 text-[11px] mt-0.5">Introductory pricing for early users</p>
              <p className="text-white/55 text-sm mt-1">For creators just getting started</p>
            </div>

            <div className="space-y-2.5 flex-1 mb-6">
              {[
                "20 content generations / month",
                "Unlimited regenerations",
                "All 4 platforms unlocked",
                "English + 1 Regional Language",
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

            <Button
              className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 hover:text-white"
              onClick={() => handlePlanClick("starter")}
            >
              {currentPlan === "starter" && sub?.plan === "active" ? "Current Plan" : "Get Starter →"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

          {/* Creator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-2xl border border-violet-500/40 bg-gradient-to-b from-blue-950/20 to-violet-950/40 p-6 flex flex-col ring-1 ring-violet-500/20 shadow-[0_0_60px_rgba(139,92,246,0.18)]"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                <Flame className="w-3.5 h-3.5 text-yellow-300" />
                MOST POPULAR
              </span>
            </div>

            <div className="mb-6 mt-2">
              <p className="text-xs font-semibold tracking-widest uppercase text-violet-400 mb-2">Creator</p>
              <div className="flex flex-col gap-1">
                {billing === "monthly" && (
                    <span className="text-sm text-white/50 line-through">₹{STRIKETHROUGH_PRICES.creator}</span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₹{creatorPrice}</span>
                  <span className="text-white/40 text-sm">/ mo</span>
                  {billing === "monthly" && (
                    <span className="text-xs text-emerald-400 ml-2 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">(Launching Offer)</span>
                  )}
                </div>
              </div>
              {billing !== "monthly" && (
                <p className="text-white/40 text-xs mt-1">
                  ₹{BILLING_TOTALS.creator[billing]} billed {billingLabel(billing)}
                  {" "}·{" "}
                  <span className="text-emerald-400">Save ₹{BILLING_SAVINGS.creator[billing]}</span>
                </p>
              )}
              <p className="text-[11px] text-violet-400/70 font-medium mt-0.5">Best for Indian creators 🇮🇳</p>
            </div>

            <div className="space-y-2.5 flex-1 mb-4">
              {[
                "60 content generations / month",
                "Multi-Variation (3 outputs per gen)",
                "Viral Score™ enabled",
                "All 4 platforms",
                "Hooks, CTAs & hashtags",
                "Idea Generator + 7-Day Strategy",
                "🌍 Multi-language content (Hindi, Hinglish, Bengali)",
                "Improve Competitor Content",
                "Download as .txt",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <span className="text-white/75 text-sm">{f}</span>
                </div>
              ))}

              <div className="pt-3 border-t border-white/8 mt-1 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Unlock more with Infinity</p>
                {[
                  { icon: Wand2, label: "AI Writing Styles", color: "text-violet-400/60" },
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
                  className="mt-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 font-medium"
                >
                  Unlock with Infinity →
                </button>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border border-violet-500/30 text-white shadow-lg shadow-violet-500/25"
              onClick={() => handlePlanClick("creator")}
            >
              {currentPlan === "creator" && sub?.plan === "active" ? "Current Plan" : "Get Creator →"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

          {/* Infinity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-pink-950/20 p-6 flex flex-col"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                <Crown className="w-3.5 h-3.5" />
                UNLIMITED POWER
              </span>
            </div>

            <div className="mb-6 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold tracking-widest uppercase text-purple-300">Infinity</p>
              </div>
              <div className="flex flex-col gap-1">
                {billing === "monthly" && (
                    <span className="text-sm text-white/50 line-through">₹{STRIKETHROUGH_PRICES.infinity}</span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                    ₹{infinityPrice}
                  </span>
                  <span className="text-white/40 text-sm">/ mo</span>
                  {billing === "monthly" && (
                    <span className="text-xs text-purple-400 ml-2 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">(Launching Offer)</span>
                  )}
                </div>
              </div>
              {billing !== "monthly" && (
                <p className="text-white/40 text-xs mt-1">
                  ₹{BILLING_TOTALS.infinity[billing]} billed {billingLabel(billing)}
                  {" "}·{" "}
                  <span className="text-emerald-400">Save ₹{BILLING_SAVINGS.infinity[billing]}</span>
                </p>
              )}
              <p className="text-white/60 text-sm mt-1">For agencies & super users</p>
              <p className="text-[11px] text-purple-400/70 font-medium mt-0.5">Introductory pricing for early users</p>
            </div>

            <div className="space-y-2.5 flex-1 mb-6">
              <p className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider mb-1.5">
                Everything in Creator, plus:
              </p>
              {[
                { label: "Unlimited generations*", icon: InfinityIcon, desc: "Fair usage limits apply" },
                { label: "AI Writing Styles", icon: Wand2 },
                { label: "Trending Topics Feed", icon: TrendingUp },
                { label: "Content Calendar", icon: CalendarDays },
                { label: "Performance Insights", icon: BarChart3 },
                { label: "Priority AI (2× faster)", icon: Zap },
                { label: "Priority Support", icon: Shield },
              ].map(({ label, icon: Icon, desc }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-white/85 text-sm">{label}</span>
                    {desc && <p className="text-white/40 text-[10px] m-0">{desc}</p>}
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              onClick={() => handlePlanClick("infinity")}
            >
              {currentPlan === "infinity" && sub?.plan === "active" ? "Current Plan" : "Unlock Infinity →"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-center text-white/35 text-xs mt-2.5">Cancel anytime</p>
          </motion.div>
        </div>

        {/* ROI Anchor Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-purple-950/20 p-6 md:p-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-4 h-4 text-violet-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400">What ₹249 actually gets you</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white">
            Creator pays for itself in one post.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-2">The old way</p>
              <p className="text-3xl font-black text-red-300 mb-1">₹5,000–₹15,000</p>
              <p className="text-white/50 text-sm">A freelance content writer for 50 pieces. Slow turnaround, inconsistent quality, and it's still just one platform.</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-2">With Creator</p>
              <p className="text-3xl font-black text-emerald-300 mb-1">₹249</p>
              <p className="text-white/50 text-sm">50 pieces of content across Instagram, YouTube, Twitter & LinkedIn. Instant. Optimized. Ready to post.</p>
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
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
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
                <p className="text-emerald-100 font-bold mt-0.5 text-xs">₹{starterPrice}<span className="text-white/40 text-[10px] font-normal">/mo</span></p>
              </div>
              <div className="p-3 text-center bg-violet-950/30 relative">
                <div className="flex justify-center mb-0.5">
                  <span className="text-[8px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full px-1.5 py-0.5 font-semibold">
                    POPULAR
                  </span>
                </div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-violet-400 text-shadow-sm">Creator</p>
                <p className="text-white font-bold mt-0.5 text-xs">
                  ₹{creatorPrice}<span className="text-white/40 text-[10px] font-normal">/mo</span>
                </p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-purple-300">Infinity</p>
                <p className="text-white font-bold mt-0.5 text-xs">
                  ₹{infinityPrice}<span className="text-white/40 text-[10px] font-normal">/mo</span>
                </p>
              </div>
            </div>

            {(["core", "tools", "infinity"] as const).map((section) => (
              <div key={section} className="min-w-[560px]">
                <div className={`px-4 py-2 border-b border-white/5 ${section === "infinity" ? "bg-violet-950/20" : "bg-white/[0.01]"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${section === "infinity" ? "text-violet-400" : "text-white/30"}`}>
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
                    <div className={`p-3 flex items-center justify-center bg-violet-950/10`}>
                      <CellContent value={feature.creator} />
                    </div>
                    <div className={`p-3 flex items-center justify-center ${section === "infinity" ? "bg-violet-950/5" : ""}`}>
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
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 border border-violet-500/30 text-white text-xs shadow-lg shadow-violet-500/25"
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
              <Shield className="w-4 h-4 text-violet-400" />
              You're always protected
            </h3>
            <div className="space-y-3.5">
              {[
                { icon: Shield, label: "Secure payments", desc: "Powered by Razorpay, India's #1 gateway" },
                { icon: X, label: "Cancel anytime", desc: "No lock-in — cancel in one click" },
                { icon: Star, label: "4.1/5 rating", desc: "2,400+ creators love GrowFlow AI" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-violet-400" />
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
                { q: "What happens after my 3 free generations?", a: "You'll hit your free limit and can't generate more content. You'll need to upgrade to continue." },
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
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal((p) => ({ ...p, open: false }))}
        reason="limit"
        targetPlan={upgradeModal.plan === "infinity" ? "pro" : "starter"}
      />
    </div>
  );
}
