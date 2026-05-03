import { Layout } from "@/components/layout/layout";
import { Users, Copy, CheckCircle2, Gift, Link as LinkIcon, DollarSign, Target, GiftIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useReferralInfo } from "@/hooks/useReferral";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Share2, UserPlus, CheckCircle } from "lucide-react";

export default function ReferralsPage() {
  const { data: referral, isLoading } = useReferralInfo();
  const { data: sub } = useSubscriptionStatus();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const isPaidUser = !!sub && sub.planType !== "free" && sub.plan !== "trial";

  const handleCopyLink = () => {
    if (referral?.shareableLink) {
      navigator.clipboard.writeText(referral.shareableLink);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const referralCount = referral?.successfulReferrals || 0;
  const rewardsEarned = referral?.totalBonusDays || 0;
  
  // Progress towards standard 15 Days
  const target = 1;
  const progressPercent = Math.min(100, Math.round((referralCount / target) * 100));

  return (
    <div className="w-full space-y-8 font-sans">
        
        {/* Header Block */}
        <div className="flex flex-col items-start text-left">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2 text-white">
            <GiftIcon className="text-teal-400 w-8 h-8" />
            Refer & Earn
          </h1>
          <p className="text-white/60">
            {isPaidUser 
              ? "Invite your network and get 20 bonus generations added to your account for every successful referral." 
              : "Invite your network and unlock 15 days of free unlimited access to the Infinity Plan."}
          </p>
        </div>

        {/* Main Action Row - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Referral Link Card */}
          <motion.div 
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} 
            className="h-full bg-slate-900/50 p-8 rounded-xl border border-white/10 flex flex-col justify-center text-center items-center"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
              <div className="flex-1 flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-4 md:p-5 relative group overflow-hidden">
                <span className="text-xl md:text-2xl font-mono font-bold text-white tracking-tight truncate pr-4">
                  {referral?.referralCode || "---"}
                </span>
                <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-cyan-400/40 transition-colors">Your Code</span>
              </div>
              <Button 
                onClick={handleCopyLink}
                className={`h-auto py-4 px-8 font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 w-full md:w-auto ${
                  copied 
                    ? "bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                    : "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/20"
                }`}
              >
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-4 leading-relaxed">
              When your friends sign up using your link, they'll be securely tracked under your account ID.
            </p>
          </motion.div>

          {/* Stats Card */}
          <motion.div 
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} 
            className="h-full bg-slate-900/50 p-8 rounded-xl border border-white/10 flex flex-col justify-center relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-6 h-full items-center justify-between w-full z-10 transition-opacity duration-300">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-teal-400 font-semibold mb-3 uppercase tracking-[0.1em] text-[10px] h-4 flex items-center justify-center whitespace-nowrap">Invites Sent</h3>
                <p className="text-3xl font-black text-white">{referral?.totalReferrals || 0}</p>
              </div>
              
              <div className="w-px h-12 bg-white/10 hidden sm:block" />

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-teal-400 font-semibold mb-3 uppercase tracking-[0.1em] text-[10px] h-4 flex items-center justify-center whitespace-nowrap">Conversions</h3>
                <p className="text-3xl font-black text-white">{referralCount}</p>
              </div>

              <div className="w-px h-12 bg-white/10 hidden sm:block" />

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-teal-400 font-semibold mb-3 uppercase tracking-[0.1em] text-[10px] h-4 flex items-center justify-center whitespace-nowrap">Total Reward</h3>
                <p className="text-3xl font-black text-white">
                  {isPaidUser ? (referral?.totalBonusCredits || 0) : (referral?.totalBonusDays || 0)}
                  <span className="text-xs font-medium text-white/40 ml-1.5 uppercase tracking-tighter">
                    {isPaidUser ? "Credits" : "Days"}
                  </span>
                </p>
              </div>
            </div>

            {/* Empty State Overlay */}
            {referralCount === 0 && (
              <div className="absolute inset-0 z-20 flex items-end justify-center pb-6 pointer-events-none">
                <p className="text-[13px] text-white/50 px-4 py-2 bg-black/40 rounded-full backdrop-blur-md border border-white/5">
                  Share your link to see stats!
                </p>
              </div>
            )}
          </motion.div>

        </div>

        {/* Goal Progress Section */}
        <motion.div 
          initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} 
          className="bg-slate-900/50 border border-white/10 rounded-xl p-8"
        >
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Target className="w-6 h-6 text-teal-400" /> Goal: {isPaidUser ? "20 Bonus Credits" : "15 Days Extended Trial"}
            </h3>
            <span className="text-white font-mono text-sm tracking-wider bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              {referralCount} / {target}
            </span>
          </div>
          <div className="h-6 bg-black/40 shadow-inner rounded-full overflow-hidden w-full relative border border-white/5 backdrop-blur-sm">
            <motion.div 
              initial={{width: 0}} 
              animate={{width: `${progressPercent}%`}}
              transition={{duration: 1, ease: "easeOut"}}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full" 
            />
          </div>
          <p className="text-white/40 text-xs mt-3">
            Re-triggerable reward. Every successful referral grants {isPaidUser ? "20 generations" : "15 days"}.
          </p>
        </motion.div>

        {/* How it works scheme */}
        <motion.div 
          initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}}
        >
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-4">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 p-7 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6 border border-teal-500/20">
                <Share2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg mb-2 text-white">1. Share Your Link</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                Share your unique link with creator friends, founders, or marketers in your network.
              </p>
            </div>
            
            <div className="bg-slate-900/50 p-7 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-teal-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-6 border border-teal-500/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg mb-2 text-white">2. They Join & Explore</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                They sign up using your link and explore the power of GrowFlow AI content generation.
              </p>
            </div>
            
            <div className="bg-slate-900/50 p-7 rounded-xl border border-emerald-500/10 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-lg mb-2 text-emerald-400">3. Both Get Rewarded</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                You both get rewarded — {isPaidUser ? "20 bonus credits" : "15 days trial extension"}.
              </p>
            </div>
          </div>
        </motion.div>
        
      </div>
  )
}
