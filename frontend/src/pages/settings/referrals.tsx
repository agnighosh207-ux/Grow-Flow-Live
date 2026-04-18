import { Layout } from "@/components/layout/layout";
import { Users, Copy, CheckCircle2, Gift, Link as LinkIcon, DollarSign, Target, GiftIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useReferralInfo } from "@/hooks/useReferral";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ReferralsPage() {
  const { data: referral, isLoading } = useReferralInfo();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
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
            <GiftIcon className="text-purple-400 w-8 h-8" />
            Refer & Earn
          </h1>
          <p className="text-white/60">Invite your network and unlock 15 days of free unlimited access to the Infinity Plan.</p>
        </div>

        {/* Main Action Row - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          
          {/* Referral Link Card */}
          <motion.div 
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} 
            className="h-full bg-slate-900/50 p-8 rounded-xl border border-white/10 flex flex-col justify-center text-center items-center"
          >
            <h2 className="text-xl font-bold text-white mb-6">Your Personal Referral Link</h2>
            <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 relative w-full pr-28">
              <span className="text-sm text-white/70 truncate overflow-x-hidden w-full text-left pl-2 block">
                {referral?.shareableLink || "Loading..."}
              </span>
              <button 
                onClick={handleCopyLink}
                className={`absolute right-1 top-1 bottom-1 px-4 font-bold text-xs rounded-lg transition-all duration-300 ${
                  copied 
                    ? "bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                    : "bg-purple-600 hover:bg-purple-500 text-white"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
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
            <div className={`flex flex-col sm:flex-row gap-6 h-full items-center justify-center w-full z-10 transition-opacity duration-300 ${referralCount === 0 ? 'opacity-40 grayscale' : ''}`}>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-purple-400 font-semibold mb-3 uppercase tracking-[0.1em] text-[11px] h-4 flex items-center justify-center whitespace-nowrap">Total Referrals</h3>
                <p className="text-4xl font-black text-white">{referralCount}</p>
              </div>
              
              {/* Dividers */}
              <div className="hidden sm:block w-px h-16 bg-white/10 self-center" />
              <div className="sm:hidden w-16 h-px bg-white/10" />

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-purple-400 font-semibold mb-3 uppercase tracking-[0.1em] text-[11px] h-4 flex items-center justify-center whitespace-nowrap">Bonus Days Earned</h3>
                <p className="text-4xl font-black text-white">{rewardsEarned}</p>
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
              <Target className="w-6 h-6 text-purple-400" /> Goal: 15 Days Extended Infinity Trial
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
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
            />
          </div>
          <p className="text-white/40 text-xs mt-3">Re-triggerable reward. Every successful referral grants 15 days.</p>
        </motion.div>

        {/* How it works scheme */}
        <motion.div 
          initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.3}}
        >
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-4">How the Reward Scheme Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 p-7 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-full bg-slate-950 text-purple-400 flex items-center justify-center font-bold text-lg mb-5 border border-purple-500/30">1</div>
              <h4 className="font-bold text-lg mb-3 text-white">Share Your Link</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Send your unique invite link to creators, founders, and marketers in your network who need elite content generation.
              </p>
            </div>
            
            <div className="bg-slate-900/50 p-7 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-full bg-slate-950 text-purple-400 flex items-center justify-center font-bold text-lg mb-5 border border-purple-500/30">2</div>
              <h4 className="font-bold text-lg mb-3 text-white">Friend Purchases Plan</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Your referred friend must sign in using your specific link and successfully purchase a premium membership plan.
              </p>
            </div>
            
            <div className="bg-slate-900/50 p-7 rounded-xl border border-white/10 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="w-12 h-12 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center font-bold text-lg mb-5 border border-emerald-500/30">3</div>
              <h4 className="font-bold text-lg mb-3 text-emerald-400">Both Get 15 Days Free</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Upon a successful verified purchase, our system automatically adds exactly 15 days of unlimited Infinity Plan access to both of your accounts.
              </p>
            </div>
          </div>
        </motion.div>
        
      </div>
  )
}
