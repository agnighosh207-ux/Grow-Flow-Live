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
  const shareText = `I've been using GrowFlow AI to create content for Instagram, YouTube & LinkedIn in minutes! Use my link to get started free → ${referralLink}`;
  const whatsappText = `Hey! I've been using this AI tool to create 30 days of content in 20 minutes. Try it free → ${referralLink}`;

  const SHARE_OPTIONS = [
    {
      label: "WhatsApp",
      icon: Share2,
      color: "bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366]",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText)}`),
    },
    {
      label: "Twitter",
      icon: Share2,
      color: "bg-violet-500/10 border-violet-500/30 text-violet-400",
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`),
    },
    {
      label: "LinkedIn",
      icon: Share2,
      color: "bg-indigo-600/10 border-indigo-600/30 text-indigo-400",
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`),
    },
    {
      label: "Email",
      icon: Share2,
      color: "bg-white/5 border-white/10 text-white/60",
      action: () => window.open(`mailto:?subject=Try%20GrowFlow%20AI&body=${encodeURIComponent(shareText)}`),
    },
    {
      label: "Copy Link",
      icon: Copy,
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
      icon: Copy,
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
    <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-8 md:space-y-12 pb-24">
        {/* Header Block: High-Fidelity Hero Section */}
        <div className="relative overflow-hidden rounded-3xl glass-panel-premium p-10 md:p-16 shadow-2xl group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-violet-500/20 transition-all duration-1000" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none group-hover:bg-violet-500/20 transition-all duration-1000" />
          
          <div className="relative z-10 text-center md:text-left">
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold uppercase text-[10px] tracking-wider mb-6"
            >
              <Gift className="w-3.5 h-3.5" />
              Invite & Earn
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
              Invite Friends, <br className="hidden md:block" /> 
              <span className="gradient-text">
                Earn Rewards.
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/50 max-w-2xl leading-relaxed">
              {isPaidUser 
                ? "Every successful referral earns you 20 bonus credits. Share your unique link and grow your content production." 
                : "Refer a friend and both of you get 15 extra free days of premium access when they subscribe."}
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
                <h3 className="text-white font-semibold text-lg tracking-tight">Your Referral Link</h3>
                  <p className="text-white/30 text-xs mt-1">Share this link to earn rewards.</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-glow">
                  <GitBranch className="w-6 h-6" />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className={`group w-full bg-black/60 border ${isErrorCode ? 'border-red-500/40' : 'border-white/10'} rounded-2xl p-6 md:p-8 font-mono text-2xl md:text-3xl font-bold tracking-tighter text-center transition-all duration-300 hover:border-violet-500/40`}>
                  <span className={isErrorCode ? 'text-red-400/50 italic' : 'text-white'}>
                    {isErrorCode ? "Loading failed — please retry" : referral?.referralCode}
                  </span>
                  {!isErrorCode && (
                    <div className="mt-2 text-[10px] text-white/20 uppercase tracking-wider font-medium group-hover:text-violet-400/40 transition-colors">
                      Your Referral Code
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {isErrorCode ? (
                    <Button 
                      onClick={() => window.location.reload()}
                      className="col-span-full h-14 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium uppercase tracking-wider rounded-2xl transition-all"
                    >
                      <RefreshCcw className="w-4 h-4 mr-2" /> Refresh Page
                    </Button>
                  ) : (
                    SHARE_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={opt.action}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer ${opt.color}`}
                      >
                        <opt.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium uppercase tracking-wide">{opt.label}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-white/30 text-center leading-relaxed">
              {isErrorCode 
                ? "Could not generate your referral link. Please refresh the page."
                : "Rewards are tracked automatically and granted when your friend starts their first subscription."
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
              <h3 className="text-white font-semibold text-lg tracking-tight flex items-center justify-between border-b border-white/5 pb-6">
                Stats
                <BarChart3 className="w-5 h-5 text-violet-400" />
              </h3>
              
              <div className="grid grid-cols-1 gap-8">
                <div className="group">
                  <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2 group-hover:text-violet-400/50 transition-colors">Invites Sent</p>
                  <div className="flex items-center justify-between">
                    <p className="text-4xl font-bold text-white leading-none tracking-tight">
                      {referral?.totalReferrals || 0}
                    </p>
                    <div className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                      SENT
                    </div>
                  </div>
                </div>

                <div className="group">
                  <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2 group-hover:text-violet-400/50 transition-colors">Signed Up</p>
                  <div className="flex items-center justify-between">
                    <p className="text-4xl font-bold text-white leading-none tracking-tight">
                      {referralCount}
                    </p>
                    <div className="px-3 py-1 rounded-lg bg-violet-500/10 text-violet-400 text-[10px] font-bold border border-violet-500/20">
                      ACTIVE
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/10 group">
                  <p className="text-[10px] font-medium text-violet-400 uppercase tracking-wider mb-3">Rewards Earned</p>
                  <div className="flex items-baseline gap-3">
                    <p className="text-5xl font-bold text-white leading-none tracking-tight">
                      {isPaidUser ? (referral?.totalBonusCredits || 0) : (referral?.totalBonusDays || 0)}
                    </p>
                    <span className="text-sm font-medium text-white/40 uppercase tracking-wider">
                      {isPaidUser ? "Credits" : "Days"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {referralCount === 0 && (
              <div className="mt-8 p-6 bg-violet-500/5 border border-dashed border-violet-500/20 rounded-2xl text-center space-y-3">
                <p className="text-[10px] font-medium text-violet-400 uppercase tracking-wider">No referrals yet</p>
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
                    className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-medium uppercase tracking-wider border border-white/10 rounded-xl"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 mr-2 text-violet-400" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
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
          <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-30" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-violet-400 font-medium uppercase text-[10px] tracking-wider mb-2">
                <Target className="w-4 h-4" />
                Next Milestone
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Refer <span className="gradient-text">{target} Friend</span> to unlock rewards
              </h3>
              <p className="text-white/40 text-sm">You'll receive {isPaidUser ? "20 bonus credits" : "15 extra free days"} when they subscribe.</p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right">
              <p className="text-[10px] font-medium text-white/20 uppercase tracking-wider mb-1">Progress</p>
                <p className="text-2xl font-bold text-white font-mono leading-none tracking-tight">{referralCount} <span className="text-white/20">/</span> {target}</p>
              </div>
              <div className="h-20 w-20 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center text-3xl font-black text-violet-400 shadow-glow relative group">
                <div className="absolute inset-0 bg-violet-400/10 animate-pulse rounded-2xl" />
                <span className="relative z-10">{Math.floor(progressPercent)}%</span>
              </div>
            </div>
          </div>
          
          <div className="relative h-6 bg-black/60 rounded-2xl border border-white/5 overflow-hidden p-1 shadow-inner">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 2, ease: "circOut" }}
              className="absolute inset-y-1 left-1 bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400 rounded-xl shadow-[0_0_30px_rgba(124,58,237,0.5)]" 
            />
            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/20 transition-colors group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white font-medium text-sm tracking-tight">First Referral</p>
                <p className="text-white/30 text-[9px] uppercase tracking-wider font-medium mt-0.5">
                  {isPaidUser ? "20 Credits" : "15 Days Free"}
                </p>
              </div>
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] opacity-40">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white/40 font-medium text-sm tracking-tight">More Rewards</p>
                  <p className="text-white/20 text-[9px] uppercase tracking-wider font-medium mt-0.5">Coming Soon</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* The Referral Loop: Tactical Briefing */}
        <div className="space-y-10">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-white whitespace-nowrap tracking-tight">Your Referrals</h2>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          {(!referral?.referrals || referral.referrals.length === 0) ? (
            <div className="bento-card p-12 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-white/5 border border-dashed border-white/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-white/20" />
              </div>
              <h3 className="text-white font-bold text-xl">No referrals yet</h3>
              <p className="text-white/40 text-sm max-w-xs mx-auto">
                Share your link and earn free credits for every friend who signs up.
              </p>
              <div className="flex items-center justify-center gap-2 pt-4">
                 <Button 
                   onClick={() => {
                     navigator.clipboard.writeText(referralLink);
                     setCopied(true);
                     toast({ title: "Link copied!" });
                     setTimeout(() => setCopied(false), 2000);
                   }}
                   className="bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest rounded-xl px-8"
                 >
                   Deploy Your Link
                 </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {referral.referrals.map((ref: any) => (
                <div key={ref.id} className="bento-card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {ref.avatarUrl ? (
                      <img src={ref.avatarUrl} alt={ref.username} className="w-full h-full object-cover" />
                    ) : (
                      <UserPlus className="w-6 h-6 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm">@{ref.username}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">
                      {ref.rewardGranted ? "✅ Reward Granted" : "⏳ Pending Verification"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The Referral Loop: Tactical Briefing */}
        <div className="space-y-10">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-semibold text-white whitespace-nowrap tracking-tight">How It Works</h2>
            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: LinkIcon, title: "Share", desc: "Send your unique referral link to fellow creators and friends.", color: "text-indigo-400" },
              { icon: UserPlus, title: "They Sign Up", desc: "Your friend creates an account and starts their free trial.", color: "text-violet-400" },
              { icon: Gift, title: "Both Earn Rewards", desc: isPaidUser ? "You get 20 credits, they get 10 credits when they subscribe." : "You both get 15 extra free days when they subscribe.", color: "text-emerald-400" }
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
                  <h4 className="font-semibold text-white mb-3 text-lg tracking-tight">{i + 1}. {step.title}</h4>
                  <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
                </div>
                <div className="absolute inset-0 bg-violet-500/5 blur-3xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
  )
}
