import { Layout } from "@/components/layout/layout";
import { Users, Copy, CheckCircle2, Gift, Link as LinkIcon, DollarSign, Target, GiftIcon, ArrowRight, Share2, UserPlus, CheckCircle, RefreshCcw, Sparkles, GitBranch, BarChart3, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useReferralInfo } from "@/hooks/useReferral";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/shared/Skeleton";

export default function ReferralsPage() {
  const { data: referral, isLoading } = useReferralInfo();
  const { data: sub } = useSubscriptionStatus();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const referralLink = referral?.shareableLink || `https://growflowai.space/sign-up?ref=${referral?.referralCode}`;
  const shareText = `I've been using GrowFlow AI to create content for Instagram, YouTube & LinkedIn in minutes! 🚀 Use my link to get 10 bonus credits free → ${referralLink}`;
  const whatsappText = `Hey! I've been using this AI tool to create 30 days of content in 20 minutes. Try it free → ${referralLink} (you get 10 bonus credits with my code)`;

  const SHARE_OPTIONS = [
    {
      label: "WhatsApp",
      icon: "💬",
      color: "bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366]",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`),
    },
    {
      label: "Twitter",
      icon: "🐦",
      color: "bg-sky-500/10 border-sky-500/30 text-sky-400",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`),
    },
    {
      label: "LinkedIn",
      icon: "💼",
      color: "bg-blue-600/10 border-blue-600/30 text-blue-400",
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`),
    },
    {
      label: "Email",
      icon: "✉️",
      color: "bg-white/5 border-white/10 text-white/60",
      action: () => window.open(`mailto:?subject=Try%20GrowFlow%20AI&body=${encodeURIComponent(shareText)}`),
    },
    {
      label: "Copy Link",
      icon: "🔗",
      color: "bg-white/5 border-white/10 text-white/60",
      action: () => { 
        navigator.clipboard.writeText(referralLink); 
        setCopied(true);
        toast({ title: "Link copied!" }); 
        setTimeout(() => setCopied(false), 2000);
      },
    },
    {
      label: "Copy Text",
      icon: "📝",
      color: "bg-white/5 border-white/10 text-white/60",
      action: () => { 
        navigator.clipboard.writeText(shareText); 
        toast({ title: "Sharing text copied!" }); 
      },
    },
  ];

  if (isLoading) return <PageSkeleton />;

  // Handle case where API failed or returned an error code
  const isErrorCode = referral?.referralCode === "ERROR" || !referral?.referralCode || referral.referralCode === "---";

  const referralCount = referral?.successfulReferrals || 0;
  const rewardsEarned = referral?.totalBonusDays || 0;
  const isPaidUser = sub?.planType && sub.planType !== "free";
  
  // Progress towards standard 15 Days
  const target = 1;
  const progressPercent = Math.min(100, Math.round((referralCount / target) * 100));

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* Header Block: High-Fidelity Hero Section */}
        <div className="relative overflow-hidden rounded-3xl glass-panel-premium p-10 md:p-16 shadow-2xl group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-1000" />
          
          <div className="relative z-10 text-center md:text-left">
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black uppercase text-[10px] tracking-[0.3em] mb-6 shadow-glow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              GrowFlow Engine v2.0
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1] glow-text-intense">
              Accelerate Your <br className="hidden md:block" /> 
              <span className="gradient-text-cyan">
                Creator Ecosystem.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/50 max-w-2xl leading-relaxed font-medium">
              {isPaidUser 
                ? "Scale your content production effortlessly. Every successful referral fuels your account with 20 premium generations. No limits, pure velocity." 
                : "Join the elite circle. Refer just 1 friend and unlock 15 days of unlimited Infinity Plan access. Experience the future of content, on us."}
            </p>
          </div>
        </div>

        {/* Bento-Style Action & Stats Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Main Action Hub - Span 3 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="lg:col-span-3 bento-card p-8 md:p-10 flex flex-col justify-between shadow-2xl"
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div>
                  <h3 className="text-white font-bold text-xl tracking-tight">Referral Headquarters</h3>
                  <p className="text-white/30 text-xs mt-1">Your unique gateway to rewards.</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-glow">
                  <GitBranch className="w-6 h-6" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className={`group w-full bg-black/60 border ${isErrorCode ? 'border-red-500/40' : 'border-white/10'} rounded-2xl p-6 md:p-8 font-mono text-2xl md:text-3xl font-black tracking-tighter text-center transition-all duration-300 hover:border-cyan-500/40 shadow-inner`}>
                  <span className={isErrorCode ? 'text-red-400/50 italic animate-pulse' : 'text-white'}>
                    {isErrorCode ? "SYNC_INTERRUPTED_RETRY" : referral?.referralCode}
                  </span>
                  {!isErrorCode && (
                    <div className="mt-2 text-[10px] text-white/20 uppercase tracking-[0.4em] font-black group-hover:text-cyan-400/40 transition-colors">
                      Personal Access Key
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {isErrorCode ? (
                    <Button 
                      onClick={() => window.location.reload()}
                      className="col-span-full h-16 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg"
                    >
                      <RefreshCcw className="w-5 h-5 mr-3 animate-spin-slow" /> Force Protocol Reset
                    </Button>
                  ) : (
                    SHARE_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={opt.action}
                        className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] ${opt.color}`}
                      >
                        <span className="text-2xl group-hover:scale-125 transition-transform">{opt.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{opt.label}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-10 p-4 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/30 italic text-center leading-relaxed">
              {isErrorCode 
                ? "Automatic link generation failed. Our diagnostic engine is on standby — please retry."
                : "Tracking Protocol: Referral data is captured via deterministic fingerprinting. Rewards are distributed instantly upon verified account activation."
              }
            </div>
          </motion.div>

          {/* Performance Dashboard - Span 2 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bento-card p-10 flex flex-col justify-between shadow-2xl relative"
          >
            <div className="space-y-10 relative z-10">
              <h3 className="text-white font-bold text-xl tracking-tight flex items-center justify-between border-b border-white/5 pb-6">
                Analytics
                <BarChart3 className="w-5 h-5 text-cyan-400" />
              </h3>
              
              <div className="grid grid-cols-1 gap-8">
                <div className="group">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 group-hover:text-cyan-400/50 transition-colors">Network Reach</p>
                  <div className="flex items-center justify-between">
                    <p className="text-5xl font-black text-white leading-none tracking-tighter">
                      {referral?.totalReferrals || 0}
                    </p>
                    <div className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                      SENT
                    </div>
                  </div>
                </div>

                <div className="group">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2 group-hover:text-cyan-400/50 transition-colors">Conversion Rate</p>
                  <div className="flex items-center justify-between">
                    <p className="text-5xl font-black text-white leading-none tracking-tighter">
                      {referralCount}
                    </p>
                    <div className="px-3 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-[10px] font-bold border border-teal-500/20">
                      ACTIVE
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 group">
                  <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-3 glow-bloom">Accumulated Yield</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-6xl font-black text-white leading-none tracking-tighter">
                      {isPaidUser ? (referral?.totalBonusCredits || 0) : (referral?.totalBonusDays || 0)}
                    </p>
                    <span className="text-sm font-bold text-white/40 uppercase tracking-[0.2em]">
                      {isPaidUser ? "Credits" : "Days"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {referralCount === 0 && (
              <div className="mt-8 p-6 bg-cyan-500/5 border border-dashed border-cyan-500/20 rounded-2xl text-center space-y-3">
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Guidance: Awaiting First Signal</p>
                <p className="text-xs text-white/40 leading-relaxed">
                  Share your unique link with other creators. Once they sign up, you'll instantly see your first conversion here.
                </p>
                <div className="pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      navigator.clipboard.writeText(referralLink);
                      setCopied(true);
                      toast({ title: "Link copied!" });
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/10 rounded-xl"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 mr-2 text-cyan-400" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                    {copied ? "Link Copied" : "Copy Your Link"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Milestone Tracker: Gamified Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }} 
          className="bento-card p-10 md:p-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-cyan-400 font-black uppercase text-[10px] tracking-[0.3em] mb-2">
                <Target className="w-4 h-4" />
                Active Mission
              </div>
              <h3 className="text-3xl font-black text-white tracking-tight">
                Current Threshold: <span className="gradient-text-cyan">{target} Referral</span>
              </h3>
              <p className="text-white/40 text-sm font-medium">Complete this cycle to trigger an automated reward injection.</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Status</p>
                <p className="text-3xl font-black text-white font-mono leading-none tracking-tighter">{referralCount} <span className="text-white/20">/</span> {target}</p>
              </div>
              <div className="h-20 w-20 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-3xl font-black text-cyan-400 shadow-glow relative group">
                <div className="absolute inset-0 bg-cyan-400/10 animate-pulse rounded-2xl" />
                <span className="relative z-10">{Math.floor(progressPercent)}%</span>
              </div>
            </div>
          </div>
          
          <div className="relative h-6 bg-black/60 rounded-2xl border border-white/5 overflow-hidden p-1 shadow-inner">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 2, ease: "circOut" }}
              className="absolute inset-y-1 left-1 bg-gradient-to-r from-indigo-600 via-cyan-500 to-teal-400 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.5)]" 
            />
            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/20 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-black text-sm tracking-tight">Cycle Unlocked</p>
                <p className="text-white/30 text-[9px] uppercase tracking-widest font-black mt-0.5">
                  {isPaidUser ? "20 Credits" : "15 Extension"}
                </p>
              </div>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] opacity-40">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/40 font-bold text-sm tracking-tight">Advanced Tier</p>
                  <p className="text-white/20 text-[9px] uppercase tracking-widest font-black mt-0.5">Locked</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* The Referral Loop: Tactical Briefing */}
        <div className="space-y-10">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-black text-white whitespace-nowrap tracking-tighter italic">THE RECURSIVE LOOP</h2>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: LinkIcon, title: "Propagation", desc: "Deploy your unique signal across high-density creator networks and niche communities.", color: "text-blue-400" },
              { icon: UserPlus, title: "Onboarding", desc: "Your network integrates with the GrowFlow infrastructure via your secure gateway.", color: "text-cyan-400" },
              { icon: DollarSign, title: "Validation", desc: "Both accounts receive an immediate resource injection upon protocol verification.", color: "text-teal-400" }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="group relative"
              >
                <div className="bento-card p-8 md:p-10 h-full relative z-10 transition-transform duration-500 group-hover:-translate-y-2">
                  <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/5 group-hover:border-white/20 transition-all duration-500`}>
                    <step.icon className={`w-8 h-8 ${step.color} transition-transform group-hover:scale-110`} />
                  </div>
                  <h4 className="font-black text-white mb-4 text-xl tracking-tight">{i + 1}. {step.title}</h4>
                  <p className="text-white/40 text-sm leading-relaxed font-medium">{step.desc}</p>
                </div>
                <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
  )
}
