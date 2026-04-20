import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Zap, Globe, Clock, ArrowRight, Star, TrendingUp,
  CalendarDays, BarChart3, Layers, Check, Shield, Lock, Users,
  Play, Linkedin as LinkedinIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { SiInstagram, SiYoutube, SiX } from "react-icons/si";

const TAGLINES = [
  "Built for creators worldwide",
  "Helping creators grow faster",
  "Loved by 2,400+ content creators",
];

const STATS = [
  { value: "50K+", label: "Posts Generated" },
  { value: "2,400+", label: "Active Creators" },
  { value: "3 min", label: "Avg. Time per Idea" },
  { value: "4.1/5", label: "Creator Rating" },
];

const STEPS = [
  {
    num: "01",
    icon: Sparkles,
    color: "text-cyan-400",
    bg: "from-cyan-600/15 to-cyan-600/0",
    border: "border-cyan-500/20",
    title: "Drop your idea",
    desc: "Type anything — a topic, a feeling, a trend. Even a single sentence is enough to get started.",
  },
  {
    num: "02",
    icon: Zap,
    color: "text-teal-400",
    bg: "from-teal-600/15 to-teal-600/0",
    border: "border-teal-500/20",
    title: "AI writes for every platform",
    desc: "GrowFlow AI instantly generates perfectly formatted content for Instagram, YouTube, Twitter, and LinkedIn.",
  },
  {
    num: "03",
    icon: TrendingUp,
    color: "text-pink-400",
    bg: "from-pink-600/15 to-pink-600/0",
    border: "border-pink-500/20",
    title: "Post and grow",
    desc: "Copy your content, schedule it, and watch your audience grow. No editing, no formatting — just results.",
  },
];

const PLATFORMS = [
  {
    name: "Instagram",
    icon: SiInstagram,
    color: "text-pink-400",
    border: "border-pink-500/20",
    bg: "from-pink-600/10 to-pink-600/0",
    glow: "shadow-pink-900/30",
    example: "✨ Consistency isn't about being perfect — it's about showing up. Even on the days when you don't feel like it.\n\n#ContentCreator #GrowthMindset #InstagramGrowth #CreatorLife",
  },
  {
    name: "YouTube Shorts",
    icon: SiYoutube,
    color: "text-red-400",
    border: "border-red-500/20",
    bg: "from-red-600/10 to-red-600/0",
    glow: "shadow-red-900/30",
    example: "🎬 HOOK: \"I used to spend 3 hours creating content. Now I do it in 3 minutes.\"\n\nHere's the exact workflow I use to create 30 days of content in one sitting...",
  },
  {
    name: "Twitter Thread",
    icon: SiX,
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "from-blue-600/10 to-blue-600/0",
    glow: "shadow-blue-900/30",
    example: "1/ Most creators are wasting 80% of their time on the wrong things.\n\nHere's the content framework that helped me 10x my reach in 60 days 🧵",
  },
  {
    name: "LinkedIn",
    icon: LinkedinIcon,
    color: "text-sky-400",
    border: "border-sky-500/20",
    bg: "from-sky-600/10 to-sky-600/0",
    glow: "shadow-sky-900/30",
    example: "After 3 years in content creation, here's what nobody tells you:\n\nThe creators who grow fastest aren't the most talented — they're the most consistent.\n\nConsistency is a system, not a personality trait.",
  },
];

const TESTIMONIALS = [
  {
    name: "Priya S.",
    role: "Fitness & wellness creator · 9.2k followers",
    avatar: "PS",
    avatarColor: "from-pink-500 to-rose-600",
    text: "Wasn't expecting much honestly, but the Instagram captions are genuinely good — not that generic AI tone. LinkedIn posts needed a little tweaking but overall saves me hours every week.",
    stars: 4,
    metric: "Saves 4 hrs/week",
    date: "Mar 2025",
  },
  {
    name: "Marcus T.",
    role: "Tech educator · 42k subscribers",
    avatar: "MT",
    avatarColor: "from-blue-500 to-cyan-600",
    text: "The Twitter thread generator is impressive. Generated a thread on AI tools that got 800+ retweets. Sometimes the hooks need a small edit but 80% of the time it's ready to post as-is.",
    stars: 5,
    metric: "800+ retweets",
    date: "Feb 2025",
  },
  {
    name: "Aisha R.",
    role: "Lifestyle blogger · 31k followers",
    avatar: "AR",
    avatarColor: "from-amber-500 to-orange-600",
    text: "Finally something that gets the difference between Instagram and LinkedIn content. Wish generation was a bit faster sometimes, but the quality makes up for it. Using it daily for 2+ months.",
    stars: 4,
    metric: "3x post frequency",
    date: "Jan 2025",
  },
  {
    name: "Rahul G.",
    role: "Business coach · 6k followers",
    avatar: "RG",
    avatarColor: "from-emerald-500 to-teal-600",
    text: "Started on the free plan, upgraded after day 2. Content quality is way above what I was manually writing. Not perfect for every niche but for business content it's solid.",
    stars: 5,
    metric: "Upgraded in 2 days",
    date: "Mar 2025",
  },
  {
    name: "Devon L.",
    role: "Music producer · 3.1k followers",
    avatar: "DL",
    avatarColor: "from-red-500 to-orange-600",
    text: "Took me a few tries to get used to how it works. Music niche content isn't always perfect but for general posts and thread ideas it saves real time. Would love more niche-specific tuning.",
    stars: 3,
    metric: "3 hrs saved/week",
    date: "Feb 2025",
  },
  {
    name: "Sneha K.",
    role: "EdTech creator · 22k subscribers",
    avatar: "SK",
    avatarColor: "from-cyan-500 to-teal-600",
    text: "The viral hooks feature is my favourite — I've never been good at writing punchy intros. Some outputs still need editing but it's a great starting point. Way better than staring at a blank page.",
    stars: 4,
    metric: "2x faster posting",
    date: "Mar 2025",
  },
];

const FEATURES = [
  { icon: Globe, color: "text-[#00F2FF]", bg: "from-[#00F2FF]/20", label: "Multi-Platform Native", desc: "No generic outputs. Everything is mapped to the exact algorithmic expectations of Twitter, LinkedIn, Instagram, and YouTube. Context is king.", span: "md:col-span-2 md:row-span-2" },
  { icon: Zap, color: "text-[#00F2FF]", bg: "from-[#00F2FF]/20", label: "Viral Hook Injector", desc: "Instantly halt the feed scroll with psychologically-mapped hooks tested against the highest performing content vectors.", span: "md:col-span-1 md:row-span-1" },
  { icon: Clock, color: "text-[#00F2FF]", bg: "from-[#00F2FF]/20", label: "Hyper-Speed Pipeline", desc: "Generate 30 days of interconnected, native content in literal seconds. Time is your most valuable asset.", span: "md:col-span-1 md:row-span-1" },
  { icon: Layers, color: "text-[#00F2FF]", bg: "from-[#00F2FF]/20", label: "Dynamic Style Modes", desc: "Shift tone algorithmically. Go from aggressive execution to deep, authoritative storytelling with one dimensional toggle.", pro: true, span: "md:col-span-1 md:row-span-1" },
  { icon: CalendarDays, color: "text-[#00F2FF]", bg: "from-[#00F2FF]/20", label: "Omni-Channel Calendar", desc: "Deploy your entire generated content matrix across all platforms from a single, unified view.", pro: true, span: "md:col-span-2 md:row-span-1" },
  { icon: BarChart3, color: "text-[#00F2FF]", bg: "from-[#00F2FF]/20", label: "Deep Performance Intelligence", desc: "Analyze engagement vectors, content decay rates, and programmatic algorithmic growth patterns over time.", pro: true, span: "md:col-span-3 md:row-span-1" },
];

const TRUST = [
  { icon: Shield, label: "Secure Payments", desc: "Powered by Razorpay", color: "text-emerald-400" },
  { icon: Lock, label: "Data Encrypted", desc: "End-to-end SSL/TLS", color: "text-blue-400" },
  { icon: Users, label: "2,400+ Creators", desc: "And growing daily", color: "text-cyan-400" },
];

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [activePlatform, setActivePlatform] = useState(0);
  const [testimonials, setTestimonials] = useState(TESTIMONIALS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", role: "", text: "", stars: 0 });
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTaglineIdx(i => (i + 1) % TAGLINES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePlatform(i => (i + 1) % PLATFORMS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen bg-[#060312] text-foreground overflow-x-hidden selection:bg-cyan-500/30 font-sans"
    >

      <div className="fixed inset-0 pointer-events-none z-0" style={{ transform: "translateZ(0)" }}>
        <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] bg-cyan-700/25 blur-[140px] rounded-full" style={{ willChange: "transform" }} />
        <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] bg-teal-700/25 blur-[140px] rounded-full" style={{ willChange: "transform" }} />
        <div className="absolute top-[35%] right-[15%] w-[35%] h-[35%] bg-pink-700/15 blur-[120px] rounded-full" style={{ willChange: "transform" }} />
        <div className="absolute top-[60%] left-[10%] w-[30%] h-[30%] bg-blue-700/10 blur-[100px] rounded-full" style={{ willChange: "transform" }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-7xl mx-auto">
        <Logo size="sm" />
        <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
          <Link href="/pricing"><span className="hover:text-white/80 transition-colors cursor-pointer">Pricing</span></Link>
          <Link href="/support"><span className="hover:text-white/80 transition-colors cursor-pointer">Support</span></Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/sign-in">
            <span className="hidden sm:inline text-sm font-medium text-white/50 hover:text-white/80 cursor-pointer transition-colors px-3 py-2">
              Sign In
            </span>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-transparent border-2 border-[#00F2FF] text-[#00F2FF] hover:bg-[#00F2FF] hover:text-[#0B1215] font-semibold rounded-full px-4 sm:px-5 text-sm transition-all duration-300 shadow-[0_0_15px_rgba(0,242,255,0.15)] hover:shadow-[0_0_25px_rgba(0,242,255,0.4)]">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      <div className="relative z-10 flex items-center justify-center gap-5 py-2.5 px-4 border-y border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
        </div>
        <span className="text-xs font-semibold text-white/70">4.1/5</span>
        <span className="w-px h-3.5 bg-white/10" />
        <AnimatePresence mode="wait">
          <motion.span
            key={taglineIdx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-white/40"
          >
            {TAGLINES[taglineIdx]}
          </motion.span>
        </AnimatePresence>
        <span className="w-px h-3.5 bg-white/10" />
        <span className="text-xs text-white/40">
          <span className="text-white/70 font-semibold">2,400+</span> creators trust us
        </span>
      </div>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 mb-8 backdrop-blur-md"
        >
          <span className="flex w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">AI Content Generation 2.0</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tight mb-6 leading-[1.05]"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#F1F5F9] to-[#00F2FF]">
            Stop writing.<br />
            Start growing.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs font-medium tracking-widest uppercase text-cyan-400/70 mb-4 flex items-center gap-2"
        >
          <span className="w-6 h-px bg-cyan-500/40" />
          Built specifically for creators — not generic AI
          <span className="w-6 h-px bg-cyan-500/40" />
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mb-4 leading-relaxed"
        >
          One idea transforms into scroll-stopping content for <strong className="text-white/70">Instagram, YouTube, Twitter,</strong> and <strong className="text-white/70">LinkedIn</strong> — in under 60 seconds.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-white/30 mb-10"
        >
          No credit card required · Free plan available · Cancel anytime
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-16"
        >
          <Link href="/sign-up">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-transparent border-2 border-[#00F2FF] text-[#00F2FF] hover:bg-[#00F2FF] hover:text-[#0B1215] font-semibold rounded-full px-10 h-14 text-base transition-all duration-300 shadow-[0_0_15px_rgba(0,242,255,0.15)] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)]"
            >
              Start Creating Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/pricing">
            <Button
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto rounded-full px-8 h-14 text-base border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]"
            >
              View Pricing
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="w-[95%] sm:w-full max-w-5xl mx-auto mt-6"
        >
          {/* God Tier Cinematic Hero Console */}
          <div className="relative min-h-[550px] sm:min-h-[650px] w-[110%] -ml-[5%] md:w-full md:ml-0 rounded-[20px] sm:rounded-[40px] overflow-hidden border border-[#00F2FF]/15 shadow-[0_0_150px_rgba(0,242,255,0.05),inset_0_0_40px_rgba(0,242,255,0.05)] flex flex-col items-center justify-center bg-[#050B0D]/90 mt-16 group py-16 sm:py-20" style={{ transform: "translateZ(0)" }}>
             
             {/* Streaming Data Background */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
               <motion.div
                 animate={{ y: ["0%", "-100%"] }}
                 transition={{ duration: 40, ease: "linear", repeat: Infinity }}
                 className="absolute inset-x-0 top-0 h-[200%] w-full flex flex-col font-mono text-[8px] sm:text-[10px] text-[#00F2FF]/40 leading-relaxed p-4"
               >
                 {Array.from({ length: 40 }).map((_, i) => (
                   <span key={i} className="whitespace-pre">
                     {`[SYS.${Math.floor(Math.random()*9000)}] INJECT: { payload: 0x${Math.random().toString(16).slice(2, 8).toUpperCase()}, node: ${Math.random().toString(36).slice(2, 6).toUpperCase()} } -- SUCCESS`}
                   </span>
                 ))}
               </motion.div>
             </div>

             {/* Sweeping Scanner Line */}
             <motion.div 
               animate={{ top: ['-20%', '120%'] }} 
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="absolute left-0 right-0 h-1 bg-[#00F2FF]/50 shadow-[0_0_30px_#00F2FF] pointer-events-none z-10 opacity-40 blur-[2px]"
             />
             
             {/* Dynamic Glowing Aurora Core */}
             <div className="absolute inset-0 overflow-hidden mix-blend-screen pointer-events-none">
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} 
                 transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                 style={{ willChange: "transform" }}
                 className="absolute -top-[30%] -left-[30%] w-[160%] h-[160%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(0,242,255,0.2)_90deg,transparent_180deg)] blur-[100px] opacity-70"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00F2FF]/5 to-[#050B0D] opacity-90"></div>
             </div>
             
             {/* 3D Kinetic Neural Array */}
             <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-10">
               <div className="relative w-40 h-40 sm:w-64 sm:h-64 rounded-full border border-dashed border-[#00F2FF]/20 shadow-[0_0_100px_rgba(0,242,255,0.1)] flex items-center justify-center">
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 rounded-full border border-[#00F2FF]/20"
               />
               <motion.div 
                 animate={{ rotate: -360 }} 
                 transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-4 sm:inset-8 rounded-full border border-dotted border-[#00F2FF]/40"
               />
               
               {/* Pulsing Quantum Core */}
               <div className="relative w-12 h-12 sm:w-20 sm:h-20 rounded-full bg-[#00F2FF] shadow-[0_0_80px_#00F2FF,inset_0_0_20px_#FFF] flex items-center justify-center animate-pulse z-20">
                 <div className="w-full h-full rounded-full border-2 border-white/40 absolute scale-110 animate-ping opacity-30 delay-150" />
                </div>
              </div>
            </div>
                
             <div className="relative w-full z-40 flex flex-col items-center justify-center p-4 sm:p-8 pointer-events-auto py-12 sm:py-20">
               <div className="w-full max-w-2xl rounded-2xl border border-[#00F2FF]/30 bg-[#0B1215]/80 shadow-[inset_0_0_80px_rgba(0,242,255,0.05),0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500" style={{ transform: "translateZ(0)" }}>
                  <div className="flex items-center justify-between px-4 py-2 sm:py-3 border-b border-[#00F2FF]/20 bg-gradient-to-r from-transparent via-[#00F2FF]/10 to-transparent relative">
                     <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00F2FF]/50 to-transparent" />
                     <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                     </div>
                     <span className="text-[9px] sm:text-[10px] text-[#00F2FF] font-mono tracking-[0.2em] uppercase">GrowFlow AI // Output Matrix</span>
                     <div className="flex items-center gap-1.5 opacity-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-pulse" />
                        <span className="text-[8px] text-[#00F2FF] font-mono hidden sm:inline">SYS.SYNC</span>
                     </div>
                  </div>

                  <div className="p-4 sm:p-6 pb-6">
                    <div className="flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl border border-[#00F2FF]/20 bg-[#050B0D]/80 mb-5 shadow-inner relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00F2FF]/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <Sparkles className="w-4 h-4 text-[#00F2FF] shrink-0" />
                      <span className="text-sm font-medium text-[#F1F5F9] truncate">"The future of content creation is here"</span>
                      <div className="w-1.5 h-4 bg-[#00F2FF] rounded-sm ml-1 animate-pulse" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      {PLATFORMS.map((platform, i) => {
                        const Icon = platform.icon;
                        const isActive = activePlatform === i;
                        return (
                          <div key={platform.name} onClick={() => setActivePlatform(i)} className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider cursor-pointer border transition-all duration-500 ${isActive ? "bg-[#101C20] shadow-[0_0_15px_rgba(0,242,255,0.1)] " + platform.border + " " + platform.color : "border-transparent text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {platform.name}
                          </div>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activePlatform}
                        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
                        transition={{ duration: 0.3 }}
                        className={`relative rounded-xl border ${PLATFORMS[activePlatform].border} p-5 sm:p-6 overflow-hidden bg-[#050B0D]/90 isolate shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] min-h-[160px] sm:min-h-[180px] flex flex-col justify-center`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${PLATFORMS[activePlatform].bg} pointer-events-none opacity-40 -z-10`} />
                        <div className="relative z-10">
                          <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${PLATFORMS[activePlatform].color}`}>
                            <Zap className="w-3.5 h-3.5 fill-current" /> Generated {PLATFORMS[activePlatform].name} Drop
                          </div>
                          <p className="text-sm text-[#F1F5F9] leading-relaxed whitespace-pre-wrap font-medium drop-shadow-md">
                            {PLATFORMS[activePlatform].example}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
               </div>
                 <div className="mt-8 relative z-50 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#00F2FF]/30 bg-[rgba(5,11,13,0.95)] shadow-[0_0_30px_rgba(0,242,255,0.15)]">
                 <span className="w-2 h-2 rounded-full bg-[#00F2FF] animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_#00F2FF]" />
                 <span className="text-[#00F2FF] text-[10px] sm:text-xs tracking-[0.3em] font-mono font-bold uppercase drop-shadow-[0_0_5px_rgba(0,242,255,0.5)]">Engine Operational</span>
               </div>
             </div>
          </div>
        </motion.div>
      </main>

      <section className="relative z-10 py-14 px-4 border-y border-white/[0.04]"
        style={{ background: "rgba(255,255,255,0.01)" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-400 mb-1">{s.value}</div>
              <div className="text-xs text-white/35 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" /> How it works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">From idea to content in 3 steps</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">No learning curve. No complex settings. Just type and create.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-14 left-[33%] right-[33%] h-px bg-gradient-to-r from-cyan-500/30 via-teal-500/50 to-pink-500/30" />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className={`relative rounded-2xl border ${step.border} p-7 text-center overflow-hidden`}
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${step.bg} to-transparent pointer-events-none`} />
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/8 mb-4 mx-auto">
                      <Icon className={`w-5 h-5 ${step.color}`} />
                    </div>
                    <div className="text-[10px] font-bold text-white/20 tracking-[0.2em] mb-2">{step.num}</div>
                    <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <Zap className="w-3 h-3 text-teal-400 fill-teal-400" /> What you get
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Everything you need to grow</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">Tools built specifically for content creators who want to post more and stress less.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:auto-rows-[1fr]">
            {FEATURES.map(({ icon: Icon, color, bg, label, desc, pro, span }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 90, damping: 20, mass: 1, delay: i * 0.1 }}
                className={`relative rounded-[28px] border border-[#00F2FF]/15 p-8 sm:p-10 group overflow-hidden ${span} glass-panel shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_60px_rgba(0,242,255,0.08),inset_0_0_80px_rgba(0,242,255,0.03)] transition-all duration-700 hover:-translate-y-1 bg-[#050B0D]/90 isolate`}
              >
                {/* Advanced Light Leak Effects */}
                <div className={`absolute top-0 left-0 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top_left,rgba(0,242,255,0.08)_0%,transparent_50%)] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-1000 -z-10`} />
                <div className={`absolute bottom-0 right-0 w-[100%] h-[100%] bg-[radial-gradient(circle_at_bottom_right,rgba(0,242,255,0.04)_0%,transparent_60%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10`} />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    {/* Exquisite Icon Plaque */}
                    <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#101C20] to-[#0A1114] border border-[#00F2FF]/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,242,255,0.1),0_0_20px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-700 ease-out">
                      <div className="absolute inset-0 rounded-[20px] bg-[#00F2FF]/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Icon className={`w-7 h-7 ${color} drop-shadow-[0_0_12px_rgba(0,242,255,0.6)] relative z-10`} />
                    </div>
                    {/* Glassmorphic PRO Badge */}
                    {pro && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-[#00F2FF] bg-[#00F2FF]/[0.03] border border-[#00F2FF]/30 shadow-[0_0_15px_rgba(0,242,255,0.15)] backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00F2FF] animate-pulse shadow-[0_0_5px_#00F2FF]" />
                        PRO Access
                      </span>
                    )}
                  </div>
                  
                  {/* Neural Visual Payloads */}
                  <div className="flex-1 w-full flex items-center justify-center min-h-[120px] pb-8 pointer-events-none">
                     {label === "Multi-Platform Native" && (
                        <div className="flex gap-4 opacity-40 group-hover:opacity-100 transition-opacity duration-700 scale-90 sm:scale-100">
                           <div className="flex flex-col gap-2 w-16 sm:w-20">
                              <div className="w-full h-2 rounded-full bg-[#00F2FF]/40 shadow-[0_0_8px_#00F2FF]" />
                              <div className="w-3/4 h-2 rounded-full bg-[#00F2FF]/20" />
                              <div className="w-full h-28 rounded-lg bg-gradient-to-b from-[#00F2FF]/30 to-transparent mt-2 border-t border-[#00F2FF]/50" />
                           </div>
                           <div className="flex flex-col gap-2 w-16 sm:w-20 translate-y-6">
                              <div className="w-full h-2 rounded-full bg-pink-500/40 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                              <div className="w-1/2 h-2 rounded-full bg-pink-500/20" />
                              <div className="w-full h-32 rounded-lg bg-gradient-to-b from-pink-500/30 to-transparent mt-2 border-t border-pink-500/50" />
                           </div>
                           <div className="flex flex-col gap-2 w-16 sm:w-20 -translate-y-4">
                              <div className="w-full h-2 rounded-full bg-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                              <div className="w-4/5 h-2 rounded-full bg-blue-500/20" />
                              <div className="w-full h-20 rounded-lg bg-gradient-to-b from-blue-500/30 to-transparent mt-2 border-t border-blue-500/50" />
                           </div>
                        </div>
                     )}
                     {label === "Deep Performance Intelligence" && (
                        <div className="w-full relative h-28 flex items-end justify-between px-6 sm:px-12 gap-1.5 sm:gap-3 opacity-50 group-hover:opacity-100 transition-opacity duration-700 mt-4">
                           {[40, 25, 60, 45, 80, 55, 95, 70, 100, 85].map((h, j) => (
                             <div key={j} className="w-full rounded-t-sm bg-gradient-to-t from-[#00F2FF]/40 to-[#00F2FF]/90 relative group-hover:scale-y-[1.15] transition-transform origin-bottom duration-500" style={{ height: `${h}%`, transitionDelay: `${j * 40}ms` }}>
                                <div className="absolute -top-1 left-0 right-0 h-1 bg-white opacity-90 shadow-[0_0_10px_#00F2FF]" />
                             </div>
                           ))}
                           <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00F2FF]/60 to-transparent shadow-[0_0_5px_#00F2FF]" />
                        </div>
                     )}
                     {label === "Omni-Channel Calendar" && (
                        <div className="grid grid-cols-7 gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-700 mt-2">
                           {Array.from({length: 21}).map((_, j) => (
                              <div key={j} className={`w-5 h-5 sm:w-7 sm:h-7 rounded-[4px] ${[2, 5, 8, 12, 17, 19].includes(j) ? 'bg-[#00F2FF]/80 shadow-[0_0_12px_rgba(0,242,255,0.6)] animate-pulse' : 'bg-white/5 border border-white/5'}`} />
                           ))}
                        </div>
                     )}
                     {label === "Viral Hook Injector" && (
                        <div className="w-full flex flex-col gap-3 opacity-40 group-hover:opacity-100 transition-opacity duration-700 mt-4 max-w-[80%] mx-auto">
                           <div className="w-full h-1.5 rounded-full bg-[#00F2FF]/20 overflow-hidden"><div className="w-[85%] h-full bg-[#00F2FF] shadow-[0_0_10px_#00F2FF]" /></div>
                           <div className="w-4/5 h-1.5 rounded-full bg-pink-500/20 overflow-hidden"><div className="w-[60%] h-full bg-pink-500 shadow-[0_0_10px_#ec4899]" /></div>
                           <div className="w-full h-1.5 rounded-full bg-[#00F2FF]/10 overflow-hidden"><div className="w-[40%] h-full bg-[#00F2FF]/50" /></div>
                        </div>
                     )}
                     {label === "Hyper-Speed Pipeline" && (
                        <div className="w-full flex items-center justify-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity duration-700 h-16">
                           {[1,2,3,4,5,6,7].map(j => (
                             <motion.div 
                               initial={{ height: 12 }}
                               animate={{ height: [12, 48, 12] }}
                               transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.15 }}
                               key={j} className="w-1.5 rounded-full bg-[#00F2FF]/80 shadow-[0_0_10px_rgba(0,242,255,0.6)]" 
                             />
                           ))}
                        </div>
                     )}
                     {label === "Dynamic Style Modes" && (
                        <div className="relative w-24 h-24 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity duration-700">
                           <div className="absolute inset-0 rounded-full border border-[#00F2FF]/30 border-t-[#00F2FF] animate-spin shadow-[0_0_15px_rgba(0,242,255,0.3)]" style={{ animationDuration: '3s' }} />
                           <div className="absolute inset-3 rounded-full border border-[#00F2FF]/20 border-b-pink-500 animate-[spin_2s_linear_infinite_reverse]" />
                           <div className="w-8 h-8 rounded-full bg-[#00F2FF]/80 shadow-[0_0_20px_#00F2FF] animate-pulse" />
                        </div>
                     )}
                  </div>

                  <div className="mt-auto pt-4 relative z-20">
                    <h3 className="font-extrabold text-2xl md:text-[28px] leading-tight mb-3 text-[#F1F5F9] tracking-tight">{label}</h3>
                    <p className="text-sm md:text-base text-[#94A3B8] leading-relaxed max-w-md font-medium">{desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <TrendingUp className="w-3 h-3 text-cyan-400" /> Creator stories
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Real results from real creators</h2>
            <p className="text-white/40 text-base">Join thousands already growing faster with GrowFlow AI.</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                <Star className="w-4 h-4 text-amber-400" style={{ fill: 'rgba(251,191,36,0.3)' }} />
              </div>
              <span className="text-sm font-semibold text-white/70">4.1 out of 5</span>
              <span className="text-xs text-white/30">· based on creator feedback</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name + i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl border border-white/8 p-6 overflow-hidden group"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map((j) => (
                        <Star key={j} className={`w-3.5 h-3.5 ${j <= t.stars ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`} style={j > t.stars ? { fill: 'rgba(255,255,255,0.07)' } : {}} />
                      ))}
                    </div>
                    <span className="text-[10px] text-white/25">{t.date}</span>
                  </div>
                  <p className="text-sm text-white/65 leading-relaxed mb-4">"{t.text}"</p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                        {t.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{t.name}</div>
                        <div className="text-[10px] text-white/35">{t.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 shrink-0 ml-2">{t.metric}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-10 text-center"
          >
            <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-white/8 px-8 py-6"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400/40 text-amber-400/40" />)}
              </div>
              <p className="text-sm text-white/50">Used GrowFlow AI? We'd love to hear from you.</p>
              <button
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-600/20 border border-cyan-500/30 text-sm font-medium text-cyan-300 hover:bg-cyan-600/30 hover:text-cyan-200 transition-all duration-200"
              >
                <Star className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                Leave a Review
              </button>
              <p className="text-[11px] text-white/25">Your review helps other creators make better decisions</p>
            </div>
          </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowReviewModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-md rounded-2xl border border-cyan-500/25 p-6 bg-[#0a0518] shadow-2xl z-10"
            >
              <h3 className="text-xl font-bold text-white mb-4">Leave a Review</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Your Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <Star 
                        key={star} 
                        className={`w-6 h-6 cursor-pointer hover:scale-110 transition-transform ${
                          (hoveredStar || newReview.stars) >= star ? 'fill-amber-400 text-amber-400' : 'text-white/20'
                        }`}
                        onClick={() => setNewReview({ ...newReview, stars: star })}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Your Name</label>
                  <Input 
                    value={newReview.name} 
                    onChange={e => setNewReview({ ...newReview, name: e.target.value })}
                    placeholder="e.g. Alex M."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Role & Audience (Optional)</label>
                  <Input 
                    value={newReview.role} 
                    onChange={e => setNewReview({ ...newReview, role: e.target.value })}
                    placeholder="e.g. Creator · 10k followers"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Your Feedback</label>
                  <Textarea 
                    value={newReview.text} 
                    onChange={e => setNewReview({ ...newReview, text: e.target.value })}
                    placeholder="What do you love? What could be better?"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1 text-white/50 hover:text-white" onClick={() => setShowReviewModal(false)}>Cancel</Button>
                <Button 
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" 
                  disabled={!newReview.name || !newReview.text || newReview.stars === 0}
                  onClick={() => {
                    const review = {
                      name: newReview.name,
                      role: newReview.role || "User",
                      avatar: newReview.name.substring(0, 2).toUpperCase(),
                      avatarColor: "from-blue-500 to-indigo-600",
                      text: newReview.text,
                      stars: newReview.stars,
                      metric: "Just now",
                      date: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    };
                    setTestimonials([review, ...testimonials]);
                    setShowReviewModal(false);
                    setNewReview({ name: "", role: "", text: "", stars: 0 });
                  }}
                >
                  Post Review
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="relative z-10 py-16 px-4 border-y border-white/[0.04]"
        style={{ background: "rgba(255,255,255,0.01)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-xs text-white/25 font-semibold uppercase tracking-[0.2em]">You're in good hands</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TRUST.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="flex items-center gap-4 rounded-xl border border-white/6 px-5 py-4"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/6 flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${t.color}`} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white/80">{t.label}</div>
                    <div className="text-xs text-white/35">{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative rounded-3xl border border-cyan-500/20 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(10,5,30,0.98) 50%, rgba(147,51,234,0.08) 100%)" }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-30%] left-[20%] w-[60%] h-[60%] bg-cyan-600/20 blur-[80px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[40%] bg-teal-600/15 blur-[60px] rounded-full" />
            </div>
            <div className="relative z-10 p-10 md:p-14">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-700 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-900/50">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Ready to grow faster?</h2>
              <p className="text-white/45 mb-4 leading-relaxed">
                Join 2,400+ creators who stopped wasting time and started posting content that actually performs.
              </p>
              <p className="text-sm text-white/30 mb-8">Free plan available · No credit card required · 7-day trial on paid plans</p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {[
                  { Icon: SiInstagram, label: "Instagram", color: "text-pink-400" },
                  { Icon: SiYoutube, label: "YouTube Shorts", color: "text-red-400" },
                  { Icon: SiX, label: "Twitter Thread", color: "text-blue-400" },
                  { Icon: LinkedinIcon, label: "LinkedIn", color: "text-sky-400" },
                ].map(({ Icon, label, color }) => (
                  <span key={label} className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/8 bg-white/[0.03] ${color}`}>
                    <Icon className="w-3 h-3" /> {label}
                  </span>
                ))}
              </div>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold rounded-full px-12 h-13 text-base shadow-2xl shadow-cyan-900/50 border border-cyan-500/20"
                  style={{ height: 52 }}
                >
                  Start Creating Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <div className="flex items-center justify-center gap-5 mt-6">
                {[
                  { icon: Check, label: "No credit card" },
                  { icon: Check, label: "Free plan forever" },
                  { icon: Check, label: "Cancel anytime" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-white/30">
                    <Icon className="w-3 h-3 text-emerald-400" /> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="space-y-3">
              <Logo size="sm" />
              <p className="text-xs text-white/30 max-w-xs leading-relaxed">
                AI-powered content creation for creators who want to grow faster across every platform.
              </p>
              <a
                href="mailto:growflowhelp@gmail.com"
                className="inline-flex items-center gap-2 text-xs text-white/35 hover:text-cyan-400 transition-colors"
              >
                📧 growflowhelp@gmail.com
              </a>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs text-white/35">
              <Link href="/pricing"><span className="hover:text-white/60 transition-colors cursor-pointer">Pricing</span></Link>
              <Link href="/terms"><span className="hover:text-white/60 transition-colors cursor-pointer">Terms of Service</span></Link>
              <Link href="/support"><span className="hover:text-white/60 transition-colors cursor-pointer">Support</span></Link>
              <Link href="/privacy"><span className="hover:text-white/60 transition-colors cursor-pointer">Privacy Policy</span></Link>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-xs text-white/20">© 2026 GrowFlow AI. All rights reserved.</span>
            <div className="flex items-center gap-4 text-xs text-white/20">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secured by Razorpay</span>
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Encrypted</span>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
