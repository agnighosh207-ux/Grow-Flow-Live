import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { 
  Flame, Sparkles, Zap, Trophy, Users, 
  ArrowRight, Loader2, Calendar, Layout,
  Crown, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";

export default function CreatorProfile() {
  const [, params] = useRoute("/profile/:username");
  const username = params?.username;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      try {
        const { data } = await api.get(`/public/profile/${username}`);
        setData(data);
      } catch (err: any) {
        setError(err.response?.status === 404 ? "Creator Not Found" : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4">
          <Zap className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white italic">{error || "Profile Missing"}</h1>
        <p className="text-white/40 max-w-sm">We couldn't find this creator profile. It may have been moved or deleted.</p>
        <Button onClick={() => window.location.href = "/"} className="mt-4 bg-white text-black hover:bg-zinc-200">
          Back to Home
        </Button>
      </div>
    );
  }

  const creationDate = new Date(data.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#030303] flex flex-col items-center p-6 overflow-x-hidden relative">
      {/* Meta Tags for Social Sharing */}
      {data?.profile && (
        <>
          <title>{data.profile.displayName} — Creator on GrowFlow AI</title>
          <meta property="og:title" content={`${data.profile.displayName} — Creator on GrowFlow AI`} />
          <meta property="og:description" content={`${data.profile.streak} day streak • ${data.profile.totalGenerations} pieces created`} />
          <meta property="og:image" content={`/api/public/og/profile/${data.profile.username}`} />
        </>
      )}

      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        {/* The Card */}
        <div className="relative rounded-[48px] p-1 bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl">
          <div className="bg-zinc-900/90 backdrop-blur-3xl rounded-[44px] p-10 overflow-hidden relative group">
            
            {/* Inner Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="relative z-10 space-y-10">
              {/* Profile Header */}
              <div className="space-y-6 text-center">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-violet-500/30 shadow-2xl mx-auto">
                    <img src={data.profile.avatar} alt={data.profile.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-xl">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h1 className="text-3xl font-black text-white italic tracking-tight">
                    {data.profile.displayName}
                  </h1>
                  <p className="text-violet-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                    GrowFlow {data.profile.planTier} Creator
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-white/30 mb-1">
                    <Layout className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Impact</span>
                  </div>
                  <p className="text-2xl font-black text-white">{data.profile.totalGenerations}</p>
                  <p className="text-[10px] text-white/40 font-medium">Pieces created</p>
                </div>

                <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-orange-400/50 mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Streak</span>
                  </div>
                  <p className="text-2xl font-black text-white">{data.profile.streak}</p>
                  <p className="text-[10px] text-white/40 font-medium">Day streak 🔥</p>
                </div>
              </div>

              {/* Info & Badges */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                   <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-white/20" />
                      <span className="text-sm font-medium text-white/60">Creating since {new Date(data.profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                   </div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                   <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-amber-400/50" />
                      <span className="text-sm font-medium text-white/60">Niche: {data.profile.niche}</span>
                   </div>
                </div>
              </div>

              {/* Sample Work Section */}
              {data.content && data.content.length > 0 && (
                <div className="space-y-6 pt-4">
                   <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] text-center">Sample Work</p>
                   <div className="space-y-4">
                     {data.content.map((item: any) => (
                       <div key={item.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                          <div className="flex items-center gap-2 text-[9px] font-black text-violet-400/60 uppercase tracking-widest">
                            <Sparkles className="w-3 h-3" /> {item.contentType} • {item.platform}
                          </div>
                          <p className="text-sm text-white/80 font-medium leading-relaxed line-clamp-3">
                            {item.idea}
                          </p>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {/* CTA */}
              <div className="pt-6 border-t border-white/5">
                <Button 
                  onClick={() => window.location.href = `/?ref=${data.profile.username}`}
                  className="w-full h-16 rounded-3xl bg-violet-600 hover:bg-violet-500 text-white font-black text-base shadow-2xl shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-98 group"
                >
                  Create Your Content with GrowFlow AI 
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <p className="text-center text-[10px] text-white/20 font-bold uppercase tracking-widest mt-4">
                  Free 10 credits · join the {data.profile.niche} elite
                </p>
              </div>

            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex items-center gap-2 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer"
        onClick={() => window.location.href = "/"}
      >
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
           <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-black text-white tracking-widest uppercase">GrowFlow AI</span>
      </motion.div>
    </div>
  );
}
