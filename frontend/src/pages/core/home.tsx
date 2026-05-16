import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Zap, Globe, Clock, ArrowRight, Star, TrendingUp,
  CalendarDays, BarChart3, Layers, Check, Shield, Lock, Users,
  Play, Linkedin as LinkedinIcon, Loader2, Copy, ChevronUp,
  RefreshCw, ChevronRight, X, Languages
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/layout/Logo";
import { SiInstagram, SiYoutube, SiX } from "react-icons/si";
import { MagneticButton } from "@/components/shared/MagneticButton";
import { Hover3DCard } from "@/components/shared/Hover3DCard";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    color: "text-[#8B91E3]",
    bg: "from-[#5E6AD2]/15 to-[#0A0A0F]/0",
    border: "border-[rgba(94,106,210,0.2)]",
    title: "Drop your idea",
    desc: "Type anything — a topic, a feeling, a trend. Even a single sentence is enough to get started.",
  },
  {
    num: "02",
    icon: Zap,
    color: "text-indigo-400",
    bg: "from-indigo-600/15 to-indigo-600/0",
    border: "border-indigo-500/20",
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
    name: "Rohan M.",
    role: "@fitnessbyrohan · 12k followers",
    avatar: "RM",
    avatarColor: "from-emerald-500 to-teal-600",
    text: "Generated 30 days of content in 20 minutes. My Instagram went from 2K to 12K followers. The hooks are genuinely better than what I was writing manually.",
    stars: 5,
    metric: "10K growth in 30 days",
    date: "Apr 2025",
  },
  {
    name: "Priya S.",
    role: "Lifestyle Creator · 9.2k followers",
    avatar: "PS",
    avatarColor: "from-pink-500 to-rose-600",
    text: "Wasn't expecting much honestly, but the Instagram captions are genuinely good — not that generic AI tone. Saves me hours every week.",
    stars: 5,
    metric: "Saves 4 hrs/week",
    date: "Mar 2025",
  },
  {
    name: "Ananya K.",
    role: "@ananyacreates · 45k subscribers",
    avatar: "AK",
    avatarColor: "from-blue-500 to-[#4A52B8]-600",
    text: "The YouTube Shorts scripts are a game changer. I just drop my video idea and it gives me a punchy script with visual cues. Highly recommend for video creators.",
    stars: 5,
    metric: "2x video output",
    date: "Apr 2025",
  },
];

const FEATURES = [
  { icon: Globe, color: "text-[#8B91E3]", bg: "from-[#5E6AD2]/20", label: "Multi-Platform Native", desc: "No generic outputs. Everything is mapped to the exact algorithmic expectations of Twitter, LinkedIn, Instagram, and YouTube. Context is king.", span: "md:col-span-2 md:row-span-2" },
  { icon: Zap, color: "text-[#8B91E3]", bg: "from-[#5E6AD2]/20", label: "Viral Hook Injector", desc: "Instantly halt the feed scroll with psychologically-mapped hooks tested against the highest performing content vectors.", span: "md:col-span-1 md:row-span-1" },
  { icon: Clock, color: "text-[#8B91E3]", bg: "from-[#5E6AD2]/20", label: "Hyper-Speed Pipeline", desc: "Generate 30 days of interconnected, native content in literal seconds. Time is your most valuable asset.", span: "md:col-span-1 md:row-span-1" },
  { icon: Layers, color: "text-[#8B91E3]", bg: "from-[#5E6AD2]/20", label: "Dynamic Style Modes", desc: "Shift tone algorithmically. Go from aggressive execution to deep, authoritative storytelling with one dimensional toggle.", pro: true, span: "md:col-span-1 md:row-span-1" },
  { icon: CalendarDays, color: "text-[#8B91E3]", bg: "from-[#5E6AD2]/20", label: "Omni-Channel Calendar", desc: "Deploy your entire generated content matrix across all platforms from a single, unified view.", pro: true, span: "md:col-span-2 md:row-span-1" },
  { icon: BarChart3, color: "text-[#8B91E3]", bg: "from-[#5E6AD2]/20", label: "Deep Performance Intelligence", desc: "Analyze engagement vectors, content decay rates, and programmatic algorithmic growth patterns over time.", pro: true, span: "md:col-span-3 md:row-span-1" },
];

const TRUST = [
  { icon: Shield, label: "Secure Payments", desc: "Powered by Razorpay", color: "text-emerald-400" },
  { icon: Lock, label: "Data Encrypted", desc: "End-to-end SSL/TLS", color: "text-[#8B91E3]" },
  { icon: Users, label: "2,400+ Creators", desc: "And growing daily", color: "text-[#8B91E3]" },
];

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function Leaderboard() {
  const [creators, setCreators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/top-creators")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCreators(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || creators.length === 0) return null;

  return (
    <section className="relative z-10 py-12 md:py-24 px-4 overflow-hidden border-t border-white/[0.04]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-7 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Creators crushing it with GrowFlow AI</h2>
          <p className="text-white/40 max-w-xl mx-auto">Real creators, real growth, real consistency. See who's dominating the content game this month.</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {creators.map((c, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const rankColor = rank === 1 ? "text-yellow-400" : rank === 2 ? "text-slate-300" : rank === 3 ? "text-orange-400" : "text-white/20";
            const planBadge = c.planTier === "INFINITY" ? "👑" : c.planTier === "CREATOR" ? "⚡" : "🌱";
            
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${isTop3 ? "border-white/10 bg-white/[0.04] shadow-xl" : "border-white/5 bg-white/[0.01]"}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`text-2xl font-black w-8 text-center ${rankColor}`}>{rank}</div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">{c.name}</span>
                      <span className="text-sm" title={c.planTier}>{planBadge}</span>
                    </div>
                    <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">Member since {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-mono font-black text-white">{(c.totalGenerations || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Content pieces</div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/sign-up">
            <div className="inline-flex items-center gap-2 text-[#8B91E3] font-bold hover:text-[#8B91E3] transition-colors cursor-pointer group">
              {"Join them and start growing"} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [showStickyNav, setShowStickyNav] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowStickyNav(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [taglineIdx, setTaglineIdx] = useState(0);
  const [activePlatform, setActivePlatform] = useState(0);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [testimonials, setTestimonials] = useState(TESTIMONIALS);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ name: "", role: "", text: "", stars: 0 });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [demoIdea, setDemoIdea] = useState("");
  const [demoResult, setDemoResult] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [guestLimitReached, setGuestLimitReached] = useState(false);

  const LANGUAGES = [
    "English", "Hindi", "Hinglish", "Bengali", "Gujarati", "Kannada",
    "Malayalam", "Marathi", "Punjabi", "Odia", "Assamese", "Tamil",
    "Telugu", "Urdu", "Bhojpuri", "Spanish", "French", "German"
  ];

  const handleDemoGenerate = async () => {
    if (!demoIdea.trim() || demoLoading) return;
    setDemoLoading(true);
    setDemoResult("");
    try {
      const res = await fetch("/api/content/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: demoIdea.slice(0, 120) })
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.error === "GUEST_LIMIT_REACHED") {
          setGuestLimitReached(true);
          setDemoLoading(false);
          return;
        }
      }

      const data = await res.json();
      setDemoResult(data.caption || data.content || "Could not generate. Please try again.");
    } catch {
      setDemoResult("Something went wrong. Sign up to try the full version!");
    } finally {
      setDemoLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/public/stats");
        const data = await res.json();
        if (data.totalGenerations) setTotalGenerations(data.totalGenerations);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
      className="min-h-screen bg-[var(--bg)] text-foreground overflow-x-hidden selection:bg-[rgba(94,106,210,0.30)] font-sans"
    >
      <AnimatePresence>
        {showStickyNav && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.07] hidden md:flex items-center justify-between px-6 py-3"
            style={{ background: "rgba(9,9,11,0.95)", backdropFilter: "blur(20px)" }}
          >
            <Logo size="sm" />
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link href="/pricing"><span className="hover:text-white/70 transition-colors cursor-pointer">Pricing</span></Link>
              <Link href="/support"><span className="hover:text-white/70 transition-colors cursor-pointer">Support</span></Link>
            </div>
            <Link href="/sign-up">
              <Button className="btn-primary rounded-full px-5 py-2 text-sm h-9">
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ transform: "translateZ(0)" }}>
        <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(94,106,210,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(94,106,210,0.06) 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] right-[-5%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(94,106,210,0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
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
            <Button className="btn-primary rounded-full px-4 sm:px-5 text-sm">
              Get Started Free
            </Button>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-8 md:pt-28 md:pb-16 text-center max-w-4xl mx-auto">
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(94,106,210,0.4), transparent)" }} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => setShowLanguagesModal(true)}
          className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border text-sm cursor-pointer transition-all hover:scale-105 active:scale-95 group"
          style={{ background: 'rgba(94,106,210,0.1)', borderColor: 'rgba(94,106,210,0.2)', color: '#8B91E3' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#8B91E3" }} />
          AI-powered · Built for Indian creators · 18+ languages
          <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          style={{ letterSpacing: '-0.04em', lineHeight: 1.05 }}
        >
          Create viral content
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #8B91E3 0%, #5E6AD2 50%, #4A52B8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            10× faster
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl mb-8 max-w-2xl mx-auto"
          style={{ color: '#71717a', lineHeight: 1.6 }}
        >
          Generate captions, hooks, strategies and content for every platform —
          in Hindi, Hinglish, Tamil, Bengali, or any of 18 Indian languages.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center mb-12"
        >
          <Link href="/sign-up">
            <button className="btn-primary h-12 px-8 text-base rounded-xl" style={{ boxShadow: '0 0 30px rgba(94,106,210,0.3)' }}>
              Start for free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/pricing">
            <button className="btn-secondary h-12 px-8 text-base rounded-xl">
              View pricing
            </button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 text-xs"
          style={{ color: '#52525b' }}
        >
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-[#8B91E3]" /> 7-day free trial</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-[#8B91E3]" /> Cancel anytime</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-[#8B91E3]" /> No credit card required</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="relative z-10 w-full max-w-5xl mx-auto mt-16"
        >
          <div className="relative rounded-2xl overflow-hidden border"
            style={{ borderColor: 'rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>
            
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ background: '#0e0e14', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 mx-4 bg-zinc-900 rounded-md px-3 py-1.5 text-xs text-zinc-500">
                growflowai.space/generate
              </div>
            </div>
            
            {/* Platform tabs + output preview */}
            <div className="p-4 sm:p-6" style={{ background: '#0a0a12' }}>
              <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar flex-nowrap pb-2">
                {PLATFORMS.map((platform, i) => {
                  const Icon = platform.icon;
                  const isActive = activePlatform === i;
                  return (
                    <div key={platform.name} onClick={() => setActivePlatform(i)} className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider cursor-pointer border transition-all duration-300 shrink-0 ${isActive ? "" : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                      style={isActive ? { background: "rgba(94,106,210,0.12)", borderColor: "rgba(94,106,210,0.3)", color: "#8B91E3" } : undefined}>
                      <Icon className="w-3.5 h-3.5" />
                      {platform.name}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlatform}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="relative rounded-xl border p-5 sm:p-6 overflow-hidden min-h-[160px] sm:min-h-[180px] flex flex-col justify-center"
                  style={{ background: '#0e0e14', borderColor: 'rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-[#8B91E3]">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Generated {PLATFORMS[activePlatform].name} Drop
                  </div>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">
                    {PLATFORMS[activePlatform].example}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Reflection */}
          <div className="absolute -bottom-16 inset-x-8 h-16 rounded-2xl blur-2xl opacity-30"
            style={{ background: 'linear-gradient(180deg, rgba(94,106,210,0.3) 0%, transparent 100%)' }} />
        </motion.div>
      </main>

      <div className="relative z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="relative z-10 border-y py-12 px-4" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "18+", label: "Indian Languages", sub: "Including Bhojpuri & Odia" },
            { value: "20+", label: "AI Tools", sub: "All in one dashboard" },
            { value: "₹149", label: "Starting Price", sub: "Less than a cup of coffee/week" },
            { value: "7-day", label: "Free Trial", sub: "No credit card needed" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold mb-1" style={{ 
                background: 'linear-gradient(135deg, #8B91E3, #5E6AD2)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent' 
              }}>
                {stat.value}
              </div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: '#a1a1aa' }}>{stat.label}</div>
              <div className="text-xs" style={{ color: '#52525b' }}>{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-8 md:py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-6">
            Content created for creators in these niches
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {[
              { label: "Fitness & Health", emoji: "💪" },
              { label: "Finance & Investing", emoji: "📈" },
              { label: "Tech & Coding", emoji: "💻" },
              { label: "Food & Recipes", emoji: "🍕" },
              { label: "Fashion & Lifestyle", emoji: "✨" },
              { label: "Education & Study", emoji: "📚" },
              { label: "Comedy & Memes", emoji: "😂" },
              { label: "Travel & Vlogs", emoji: "✈️" },
              { label: "Motivation & Self-help", emoji: "🔥" },
              { label: "Gaming & Esports", emoji: "🎮" },
            ].map(({ label, emoji }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-white/8 bg-white/[0.02] text-white/35 hover:text-white/50 hover:border-white/15 transition-all">
                {emoji} {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <Play className="w-3 h-3 text-[#8B91E3] fill-[#8B91E3]" /> How it works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">From idea to content in 3 steps</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">No learning curve. No complex settings. Just type and create.</p>
          </div>

          <div className="md:hidden flex flex-col items-center gap-0">
            {STEPS.map((step, i) => (
              <div key={step.num} className="w-full">
                <Hover3DCard className="h-full">
                  <div
                    className={`hyper-hover-card relative rounded-2xl border ${step.border} p-7 text-center overflow-hidden h-full`}
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.bg} to-transparent pointer-events-none`} />
                    <div className="relative">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/8 mb-4 mx-auto">
                        <step.icon className={`w-5 h-5 ${step.color}`} />
                      </div>
                      <div className="text-[10px] font-bold text-white/20 tracking-[0.2em] mb-2">{step.num}</div>
                      <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                      <p className="text-white/45 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </Hover3DCard>
                {i < STEPS.length - 1 && (
                  <div className="flex justify-center w-full py-2">
                    <div className="w-px h-6 bg-gradient-to-b from-[#5E6AD2]/40 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:grid grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-14 left-[33%] right-[33%] h-px bg-gradient-to-r from-[#5E6AD2]/30 via-indigo-500/50 to-pink-500/30" />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="w-full"
                >
                  <Hover3DCard className="h-full">
                    <div
                      className={`hyper-hover-card relative rounded-2xl border ${step.border} p-7 text-center overflow-hidden h-full`}
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
                    </div>
                  </Hover3DCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── LIVE DEMO SECTION ─────────────────────────────────── */}
      <section className="relative z-10 py-12 md:py-20 px-4 border-y border-white/[0.04]"
        style={{ background: "rgba(94,106,210,0.015)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.25)] mb-4 text-xs font-semibold text-[#8B91E3] uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#8B91E3" }} />
              Try it live — no signup needed
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">See it work in real time</h2>
            <p className="text-white/40 text-sm">Type any topic and watch AI generate content instantly.</p>
          </div>

          <div className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: "rgba(10,5,30,0.8)", backdropFilter: "blur(20px)" }}
          >
            {/* Input area */}
            <div className="p-4 md:p-6 border-b border-white/[0.06]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={demoIdea}
                  onChange={e => setDemoIdea(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !demoLoading && demoIdea.trim() && handleDemoGenerate()}
                  placeholder="e.g. Why I quit my 9-5 to become a creator..."
                  maxLength={120}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none transition-all"
                  style={{ outline: "none" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(94,106,210,0.5)"}
                  onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
                />
                <button
                  onClick={handleDemoGenerate}
                  disabled={demoLoading || !demoIdea.trim()}
                  className="disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold px-5 py-3 rounded-xl text-sm transition-all flex items-center gap-2 flex-shrink-0"
                  style={{ background: "#5E6AD2" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#8B91E3"}
                  onMouseLeave={e => e.currentTarget.style.background = "#5E6AD2"}
                >
                  {demoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span className="hidden sm:inline">{demoLoading ? "Generating..." : "Generate"}</span>
                </button>
              </div>
            </div>

            {/* Output area */}
            <div className="p-4 md:p-6 relative min-h-[160px]">
              {guestLimitReached && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-[rgba(10,5,30,0.95)] backdrop-blur-sm animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-[#8B91E3]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Guest limit reached</h3>
                  <p className="text-white/40 text-sm mb-6 max-w-[280px]">
                    You've reached the free guest generation limit. Sign up now to get 50+ monthly credits and unlock all platforms.
                  </p>
                  <Link href="/sign-up">
                    <button className="btn-primary px-8 h-12 rounded-xl text-sm font-bold">
                      Get Started Free <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              )}
              {!demoResult && !demoLoading && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-[#8B91E3]" />
                  </div>
                  <p className="text-white/30 text-sm">Your generated content will appear here</p>
                  <div className="flex gap-2 mt-4 flex-wrap justify-center">
                    {["Why I deleted Instagram for 30 days", "5 habits that changed my life", "How I went from 0 to 10K followers"].map(s => (
                      <button key={s} onClick={() => setDemoIdea(s)}
                        className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {demoLoading && (
                <div className="space-y-3 py-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-3 bg-white/5 rounded-full animate-pulse" 
                      style={{ width: `${[100,80,100,75,90][i-1]}%` }} />
                  ))}
                </div>
              )}
              {demoResult && !demoLoading && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-[#8B91E3] uppercase tracking-widest">Instagram Caption</span>
                    <button onClick={() => { navigator.clipboard.writeText(demoResult); toast({ title: "Copied!" }); }}
                      className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{demoResult}</p>
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <p className="text-xs text-white/25">Want all platforms + hooks + strategy?</p>
                    <Link href="/sign-up">
                      <button className="text-xs font-bold text-[#8B91E3] hover:text-[#8B91E3] flex items-center gap-1 transition-colors">
                        Get full access free <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {demoResult && (
            <div className="mt-4 text-center">
              <p className="text-xs text-white/25 mb-3">This is just Instagram. GrowFlow AI also generates:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["Twitter Thread", "YouTube Hook", "LinkedIn Post", "30 Content Ideas", "7-Day Strategy"].map(t => (
                  <span key={t} className="text-[10px] px-3 py-1 rounded-full border border-white/10 text-white/30">{t} ✓</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative z-10 py-10 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-7 md:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <Zap className="w-3 h-3 text-[#8B91E3] fill-[#8B91E3]" /> What you get
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
                className={`w-full ${span}`}
              >
                <Hover3DCard className="h-full">
                  <div
                    className={`hyper-hover-card relative rounded-[28px] border border-[rgba(94,106,210,0.2)]/20 p-8 sm:p-10 group overflow-hidden glass-panel shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all duration-500 bg-[#050B0D]/90 isolate h-full`}
                  >
                    {/* Advanced Light Leak Effects */}
                    <div className={`absolute top-0 left-0 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top_left,rgba(167,139,250,0.08)_0%,transparent_50%)] pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-1000 -z-10`} />
                    <div className={`absolute bottom-0 right-0 w-[100%] h-[100%] bg-[radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.04)_0%,transparent_60%)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10`} />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-6">
                        {/* Exquisite Icon Plaque */}
                        <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#101C20] to-[#0A1114] border border-[rgba(94,106,210,0.2)]/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(94,106,210,0.1),0_0_20px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-700 ease-out">
                          <div className="absolute inset-0 rounded-[20px] bg-[#5E6AD2]/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <Icon className={`w-7 h-7 ${color} drop-shadow-[0_0_12px_rgba(94,106,210,0.6)] relative z-10`} />
                        </div>
                        {/* Glassmorphic PRO Badge */}
                        {pro && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] text-[#8B91E3] bg-[#5E6AD2]/[0.03] border border-[rgba(94,106,210,0.2)]/30 shadow-[0_0_15px_rgba(94,106,210,0.15)] backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2] animate-pulse shadow-[0_0_5px_rgba(94,106,210,0.8)]" />
                            PRO Access
                          </span>
                        )}
                      </div>
                      
                      {/* Neural Visual Payloads */}
                      <div className="flex-1 w-full flex items-center justify-center min-h-[120px] pb-8 pointer-events-none">
                         {label === "Multi-Platform Native" && (
                            <div className="flex gap-4 opacity-40 group-hover:opacity-100 transition-opacity duration-700 scale-90 sm:scale-100">
                               <div className="flex flex-col gap-2 w-16 sm:w-20">
                                  <div className="w-full h-2 rounded-full bg-[#5E6AD2]/40 shadow-[0_0_8px_rgba(94,106,210,0.8)]" />
                                  <div className="w-3/4 h-2 rounded-full bg-[#5E6AD2]/20" />
                                  <div className="w-full h-28 rounded-lg bg-gradient-to-b from-[#5E6AD2]/30 to-transparent mt-2 border-t border-[rgba(94,106,210,0.2)]/50" />
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
                                 <div key={j} className="w-full rounded-t-sm bg-gradient-to-t from-[#5E6AD2]/40 to-[#5E6AD2]/90 relative group-hover:scale-y-[1.15] transition-transform origin-bottom duration-500" style={{ height: `${h}%`, transitionDelay: `${j * 40}ms` }}>
                                    <div className="absolute -top-1 left-0 right-0 h-1 bg-white opacity-90 shadow-[0_0_10px_rgba(94,106,210,0.8)]" />
                                 </div>
                               ))}
                               <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5E6AD2]/60 to-transparent shadow-[0_0_5px_rgba(94,106,210,0.8)]" />
                            </div>
                         )}
                         {label === "Omni-Channel Calendar" && (
                            <div className="grid grid-cols-7 gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-700 mt-2">
                               {Array.from({length: 21}).map((_, j) => (
                                  <div key={j} className={`w-5 h-5 sm:w-7 sm:h-7 rounded-[4px] ${[2, 5, 8, 12, 17, 19].includes(j) ? 'bg-[#8B91E3]/80 shadow-[0_0_12px_rgba(167,139,250,0.6)] animate-pulse' : 'bg-white/5 border border-white/5'}`} />
                               ))}
                            </div>
                         )}
                         {label === "Viral Hook Injector" && (
                            <div className="w-full flex flex-col gap-3 opacity-40 group-hover:opacity-100 transition-opacity duration-700 mt-4 max-w-[80%] mx-auto">
                               <div className="w-full h-1.5 rounded-full bg-[#8B91E3]/20 overflow-hidden"><div className="w-[85%] h-full bg-[#8B91E3] shadow-[0_0_10px_#8B91E3]" /></div>
                               <div className="w-4/5 h-1.5 rounded-full bg-pink-500/20 overflow-hidden"><div className="w-[60%] h-full bg-pink-500 shadow-[0_0_10px_#ec4899]" /></div>
                               <div className="w-full h-1.5 rounded-full bg-[#8B91E3]/10 overflow-hidden"><div className="w-[40%] h-full bg-[#8B91E3]/50" /></div>
                            </div>
                         )}
                         {label === "Hyper-Speed Pipeline" && (
                            <div className="w-full flex items-center justify-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity duration-700 h-16">
                               {[1,2,3,4,5,6,7].map(j => (
                                 <motion.div 
                                   initial={{ height: 12 }}
                                   animate={{ height: [12, 48, 12] }}
                                   transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.15 }}
                                   key={j} className="w-1.5 rounded-full bg-[#8B91E3]/80 shadow-[0_0_10px_rgba(167,139,250,0.6)]" 
                                 />
                               ))}
                            </div>
                         )}
                         {label === "Dynamic Style Modes" && (
                            <div className="relative w-24 h-24 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity duration-700">
                               <div className="absolute inset-0 rounded-full border border-[#8B91E3]/30 border-t-[#8B91E3] animate-spin shadow-[0_0_15px_rgba(167,139,250,0.3)]" style={{ animationDuration: '3s' }} />
                               <div className="absolute inset-3 rounded-full border border-[#8B91E3]/20 border-b-pink-500 animate-[spin_2s_linear_infinite_reverse]" />
                               <div className="w-8 h-8 rounded-full bg-[#8B91E3]/80 shadow-[0_0_20px_#8B91E3] animate-pulse" />
                            </div>
                         )}
                      </div>

                      <div className="mt-auto pt-4 relative z-20">
                        <h3 className="font-extrabold text-2xl md:text-[28px] leading-tight mb-3 text-[#F1F5F9] tracking-tight">{label}</h3>
                        <p className="text-sm md:text-base text-[#94A3B8] leading-relaxed max-w-md font-medium">{desc}</p>
                      </div>
                    </div>
                  </div>
                </Hover3DCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-12 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <TrendingUp className="w-3 h-3 text-[#8B91E3]" /> Creator stories
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
                className="hyper-hover-card relative rounded-2xl border border-white/10 p-6 overflow-hidden group shadow-[0_5px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_40px_rgba(167,139,250,0.15)] transition-all duration-500"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#5E6AD2]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[rgba(94,106,210,0.20)] border border-[rgba(94,106,210,0.30)] text-sm font-medium text-[#8B91E3] hover:bg-[rgba(94,106,210,0.30)] hover:text-[#8B91E3] transition-all duration-200"
              >
                <Star className="w-3.5 h-3.5 fill-[#8B91E3] text-[#8B91E3]" />
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
              className="relative w-full max-w-md rounded-2xl border border-[rgba(94,106,210,0.25)] p-6 bg-[#0a0518] shadow-2xl z-10"
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
                  className="flex-1 bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white" 
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

      <Leaderboard />

      <section className="relative z-10 py-10 md:py-16 px-4 border-y border-white/[0.04]"
        style={{ background: "rgba(255,255,255,0.01)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-7 md:mb-8">
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

      <section className="relative z-10 py-12 md:py-24 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-7 md:mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What you'd pay for these tools separately</h2>
            <p className="text-white/40">GrowFlow AI replaces your entire content team for a fraction of the cost.</p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 mb-8">
            {[
              { tool: "Hootsuite / Buffer", price: "₹3,500/mo", feature: "Content scheduling" },
              { tool: "Jasper / Copy.ai", price: "₹4,200/mo", feature: "AI copywriting" },
              { tool: "Brandwatch", price: "₹8,000/mo", feature: "Trend monitoring" },
              { tool: "A human content writer", price: "₹15,000/mo", feature: "Ghostwriting" },
              { tool: "A social media strategist", price: "₹20,000/mo", feature: "Strategy + coaching" },
            ].map((item, i) => (
              <motion.div
                key={item.tool}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="text-white font-semibold">{item.tool}</span>
                  <span className="text-xs text-white/30 tracking-wide uppercase">{item.feature}</span>
                </div>
                <span className="text-white/60 font-mono">{item.price}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs font-bold text-white/20 uppercase tracking-widest">vs</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center p-8 rounded-3xl border border-[#8B91E3]/30 bg-[#8B91E3]/5 shadow-[0_0_50px_rgba(167,139,250,0.1)] mb-6 mt-4 md:mt-0"
          >
            <div className="text-white/40 text-sm mb-2 line-through font-medium">Total: ₹50,700/mo</div>
            <div className="text-2xl md:text-4xl font-bold text-[#8B91E3] mb-2">
              GrowFlow AI Infinity gives you all of this for ₹799/month
            </div>
            <p className="text-sm text-[#8B91E3]/60 font-medium">That's 98% cheaper than hiring the equivalent team.</p>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-12 md:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative rounded-3xl border border-[rgba(94,106,210,0.2)] overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(94,106,210,0.12) 0%, rgba(10,5,30,0.98) 50%, rgba(147,51,234,0.08) 100%)" }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-30%] left-[20%] w-[60%] h-[60%] bg-[rgba(94,106,210,0.20)] blur-[80px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[40%] bg-indigo-600/15 blur-[60px] rounded-full" />
            </div>
            <div className="relative z-10 p-10 md:p-14">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5E6AD2] to-indigo-700 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[rgba(94,106,210,0.50)]">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Ready to grow faster?</h2>
              <p className="text-white/45 mb-4 leading-relaxed">
                Join creators who generated {totalGenerations.toLocaleString()}+ pieces of content with GrowFlow AI
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
                  className="bg-gradient-to-r from-[#5E6AD2] to-indigo-600 hover:from-[#5E6AD2] hover:to-indigo-500 text-white font-semibold rounded-full px-12 h-13 text-base shadow-2xl shadow-[rgba(94,106,210,0.50)] border border-[rgba(94,106,210,0.2)]"
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
                    <Icon className="w-3 h-3 text-[#8B91E3]" /> {label}
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
                className="inline-flex items-center gap-2 text-xs text-white/35 hover:text-[#8B91E3] transition-colors"
              >
                📧 growflowhelp@gmail.com
              </a>
              <div className="flex items-center gap-4 mt-3">
                <a href="https://instagram.com/growflowai" target="_blank" rel="noopener noreferrer"
                  className="text-white/20 hover:text-pink-400 transition-colors">
                  <SiInstagram className="w-4 h-4" />
                </a>
                <a href="https://twitter.com/growflowai" target="_blank" rel="noopener noreferrer"
                  className="text-white/20 hover:text-white/60 transition-colors">
                  <SiX className="w-4 h-4" />
                </a>
                <a href="mailto:growflowhelp@gmail.com"
                  className="text-white/20 hover:text-[#8B91E3] transition-colors text-xs">
                  📧 Support
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-4 text-xs text-white/35">
              <Link href="/pricing"><span className="hover:text-white/60 transition-colors cursor-pointer">Pricing</span></Link>
              <Link href="/terms-and-conditions"><span className="hover:text-white/60 transition-colors cursor-pointer">Terms</span></Link>
              <Link href="/privacy-policy"><span className="hover:text-white/60 transition-colors cursor-pointer">Privacy</span></Link>
              <Link href="/refund-policy"><span className="hover:text-white/60 transition-colors cursor-pointer">Refund Policy</span></Link>
              <Link href="/contact"><span className="hover:text-white/60 transition-colors cursor-pointer">Contact Us</span></Link>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-white/20">© 2026 GrowFlow AI. All rights reserved.</span>
            <div className="flex items-center gap-4 text-xs text-white/20">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secured by Razorpay</span>
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Encrypted</span>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {showStickyNav && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-[90px] md:bottom-8 right-5 md:right-8 z-[60] w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 shadow-2xl transition-all"
              aria-label="Back to top"
            >
              <ChevronUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </footer>
      <AnimatePresence>
        {showLanguagesModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLanguagesModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0e0a25] border border-white/10 rounded-[2rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setShowLanguagesModal(false)}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center">
                  <Languages className="w-7 h-7 text-[#8B91E3]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Supported Languages</h2>
                  <p className="text-white/40 text-sm">Deeply optimized for the Indian creator economy.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {LANGUAGES.map((lang) => (
                  <div key={lang} className="px-4 py-3 rounded-xl bg-white/5 border border-white/[0.06] text-white/70 text-sm font-medium flex items-center justify-between">
                    {lang}
                    <Check className="w-3.5 h-3.5 text-[#8B91E3]" />
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/[0.06] text-center">
                <p className="text-white/30 text-xs mb-4 italic">
                  *Our AI generates content using native scripts (Hindi, Bengali, etc.) for authentic audience connection.
                </p>
                <button onClick={() => setShowLanguagesModal(false)}
                  className="btn-primary w-full h-12 rounded-xl font-bold">
                  Awesome!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
