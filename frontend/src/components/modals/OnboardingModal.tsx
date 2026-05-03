import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wand2, 
  Check, 
  Zap, 
  Copy, 
  MessageCircle, 
  Sparkles, 
  ChevronRight, 
  Instagram, 
  Youtube, 
  Twitter, 
  Linkedin,
  X,
  Target,
  Rocket,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");


const NICHES = [
  { id: "Fitness", label: "Fitness 💪" },
  { id: "Finance", label: "Finance 💰" },
  { id: "Tech", label: "Tech 💻" },
  { id: "Business", label: "Business 🏢" },
  { id: "Lifestyle", label: "Lifestyle ✨" },
  { id: "Motivation", label: "Motivation 🔥" },
  { id: "Education", label: "Education 📚" },
  { id: "Other", label: "Other" },
];

const PLATFORMS = [
  { id: "Instagram", icon: Instagram, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  { id: "YouTube", icon: Youtube, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  { id: "Twitter", icon: Twitter, color: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/20" },
  { id: "LinkedIn", icon: Linkedin, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
];

const STARTER_IDEAS: Record<string, string> = {
  Fitness: "3 common workout mistakes beginners make without knowing it",
  Finance: "The one money habit that changed how I think about saving",
  Tech: "Why most people are using AI tools wrong in 2025",
  Business: "The biggest mistake new entrepreneurs make in their first year",
  Lifestyle: "5 morning habits that genuinely changed my productivity",
  Motivation: "The truth about consistency that nobody talks about",
  Education: "Why traditional studying doesn't work and what to do instead",
  Other: "The one thing I wish I knew before starting my content journey",
};

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("");
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const [fetchReferral, setFetchReferral] = useState(false);
  const { data: referral, isLoading: referralLoading } = useQuery({
    queryKey: ["referral-info"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${BASE}/api/referral/info`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: fetchReferral && step === 3,
    staleTime: 60000,
  });
  const { toast } = useToast();

  useEffect(() => {
    const isDone = localStorage.getItem("gf_onboarding_v1") === "done";
    if (!isDone) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 15000);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, []);

  const handleComplete = () => {
    localStorage.setItem("gf_onboarding_v1", "done");
    setIsOpen(false);
  };

  const handleGenerate = () => {
    handleComplete();
    const idea = STARTER_IDEAS[niche] || STARTER_IDEAS.Other;
    navigate(`/generate?idea=${encodeURIComponent(idea)}`);
  };

  const handleCopyLink = () => {
    if (referral?.shareableLink) {
      navigator.clipboard.writeText(referral.shareableLink);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareToWhatsApp = () => {
    const link = referral?.shareableLink || "";
    const text = `I've been using GrowFlow AI to create content for Instagram, YouTube, Twitter and LinkedIn in seconds. Try it free: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const nextStep = () => {
    if (step === 1) {
      localStorage.setItem("gf_user_niche", niche);
      localStorage.setItem("gf_user_platform", platform);
    }
    const nextS = step + 1;
    if (nextS === 3) setFetchReferral(true);
    setStep(nextS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full h-full md:h-auto md:max-w-lg bg-[#0c0d12] border border-white/10 md:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Top Progress Dots */}
        <div className="flex justify-center gap-2 py-6">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= step ? "w-8 bg-cyan-500" : "w-1.5 bg-white/10"
              }`} 
            />
          ))}
        </div>

        <button 
          onClick={handleComplete}
          className="absolute top-6 right-6 p-2 text-white/20 hover:text-white/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto px-8 pb-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-white">Welcome to GrowFlow AI 👋</h2>
                  <p className="text-white/50 font-medium">You have 5 free generations. Let's make them count.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-cyan-500">What's your main niche?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {NICHES.map(n => (
                        <button
                          key={n.id}
                          onClick={() => setNiche(n.id)}
                          className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                            niche === n.id 
                              ? "bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/20" 
                              : "bg-white/5 border-white/5 text-white/60 hover:border-white/20"
                          }`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-cyan-500">Which platform do you post on most?</label>
                    <div className="grid grid-cols-4 gap-3">
                      {PLATFORMS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPlatform(p.id)}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                            platform === p.id 
                              ? `${p.bg} ${p.border} ${p.color} ring-2 ring-cyan-500/50` 
                              : "bg-white/5 border-white/5 text-white/30 hover:border-white/20"
                          }`}
                        >
                          <p.icon className="w-6 h-6" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">{p.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={nextStep}
                  disabled={!niche || !platform}
                  className="w-full h-14 bg-white text-black hover:bg-white/90 font-black text-lg rounded-2xl"
                >
                  Next <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-white leading-tight">Here's how GrowFlow works in 3 steps</h2>
                </div>

                <div className="space-y-4">
                  {[
                    { num: "1️⃣", title: "Pick a topic", desc: "Type any idea, even vague ones like 'morning routine tips'" },
                    { num: "2️⃣", title: "AI generates for all 4 platforms", desc: "Instagram caption, YouTube script, Twitter thread, LinkedIn post — all at once" },
                    { num: "3️⃣", title: "Copy and post", desc: "Each output is ready to paste directly into the platform" }
                  ].map((s, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <span>{s.num}</span> {s.title}
                      </h4>
                      <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex gap-3 items-center">
                  <Lightbulb className="w-5 h-5 text-cyan-400 shrink-0" />
                  <p className="text-xs text-cyan-200/60 font-medium leading-relaxed">
                    💡 Most users post their first piece of generated content within 5 minutes of signing up.
                  </p>
                </div>

                <Button 
                  onClick={nextStep}
                  className="w-full h-14 bg-white text-black hover:bg-white/90 font-black text-lg rounded-2xl"
                >
                  Got it, let me try <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-white leading-tight">Unlock 15 free Infinity days</h2>
                  <p className="text-white/50 font-medium">Share GrowFlow with one creator friend</p>
                </div>

                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20">Your Referral Link</label>
                      <div className="h-12 bg-black/40 border border-white/10 rounded-xl px-4 flex items-center justify-between overflow-hidden">
                        <span className="text-xs font-mono text-cyan-400/70 truncate mr-4">
                          {referralLoading ? "Loading link..." : referral?.shareableLink}
                        </span>
                        <button onClick={handleCopyLink} className="text-white hover:text-cyan-400 transition-colors">
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleCopyLink}
                        className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl"
                      >
                        <Copy className="mr-2 w-4 h-4" /> Copy Link
                      </Button>
                      <Button 
                        onClick={shareToWhatsApp}
                        className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                      >
                        <MessageCircle className="mr-2 w-4 h-4" /> WhatsApp
                      </Button>
                    </div>
                  </div>

                  <div className="text-center space-y-4">
                    <button 
                      onClick={nextStep}
                      className="text-white/30 hover:text-white/60 text-sm font-bold transition-colors"
                    >
                      Skip for now
                    </button>
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                      They get 15 free Infinity days. You get 15 free Infinity days.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4">
                    <Rocket className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black text-white leading-tight">You're all set 🚀</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-lg">
                        {NICHES.find(n => n.id === niche)?.label.split(' ')[1]}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Target Niche</p>
                        <p className="text-sm font-bold text-white">{niche}</p>
                      </div>
                    </div>
                    <button onClick={() => setStep(1)} className="text-xs font-bold text-cyan-500 hover:underline">Edit</button>
                  </div>

                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4 text-center">
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <p className="text-xs font-black text-white/40 uppercase tracking-widest">5 Generations Available</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="text-center">
                      <h3 className="text-lg font-bold text-white">Your first task:</h3>
                      <p className="text-white/40">Generate content about {niche.toLowerCase()}</p>
                   </div>
                   <Button 
                    onClick={handleGenerate}
                    className="w-full h-16 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-cyan-950"
                  >
                    Generate My First Content <Sparkles className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
