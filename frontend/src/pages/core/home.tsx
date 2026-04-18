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
    color: "text-violet-400",
    bg: "from-violet-600/15 to-violet-600/0",
    border: "border-violet-500/20",
    title: "Drop your idea",
    desc: "Type anything — a topic, a feeling, a trend. Even a single sentence is enough to get started.",
  },
  {
    num: "02",
    icon: Zap,
    color: "text-purple-400",
    bg: "from-purple-600/15 to-purple-600/0",
    border: "border-purple-500/20",
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
    avatarColor: "from-blue-500 to-violet-600",
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
    avatarColor: "from-violet-500 to-purple-600",
    text: "The viral hooks feature is my favourite — I've never been good at writing punchy intros. Some outputs still need editing but it's a great starting point. Way better than staring at a blank page.",
    stars: 4,
    metric: "2x faster posting",
    date: "Mar 2025",
  },
];

const FEATURES = [
  { icon: Globe, color: "text-violet-400", bg: "from-violet-600/10", label: "Platform Native", desc: "Content perfectly formatted for each platform's algorithm and audience expectations." },
  { icon: Zap, color: "text-purple-400", bg: "from-purple-600/10", label: "Viral Hooks", desc: "Stop the scroll with AI-generated hooks tested against top-performing content patterns." },
  { icon: Clock, color: "text-pink-400", bg: "from-pink-600/10", label: "Save Hours", desc: "What used to take hours of formatting now happens in exactly one click." },
  { icon: Layers, color: "text-blue-400", bg: "from-blue-600/10", label: "Style Modes", desc: "Switch between Casual, Bold, Storytelling, and Professional to match your voice.", pro: true },
  { icon: CalendarDays, color: "text-emerald-400", bg: "from-emerald-600/10", label: "Content Calendar", desc: "Plan your whole week of content across all platforms from one view.", pro: true },
  { icon: BarChart3, color: "text-amber-400", bg: "from-amber-600/10", label: "Performance Insights", desc: "Track your consistency, content mix, and growth trends over time.", pro: true },
];

const TRUST = [
  { icon: Shield, label: "Secure Payments", desc: "Powered by Razorpay", color: "text-emerald-400" },
  { icon: Lock, label: "Data Encrypted", desc: "End-to-end SSL/TLS", color: "text-blue-400" },
  { icon: Users, label: "2,400+ Creators", desc: "And growing daily", color: "text-violet-400" },
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
      className="min-h-screen bg-[#060312] text-foreground overflow-x-hidden selection:bg-violet-500/30 font-sans"
    >

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] bg-violet-700/25 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] bg-purple-700/25 blur-[140px] rounded-full" />
        <div className="absolute top-[35%] right-[15%] w-[35%] h-[35%] bg-pink-700/15 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] left-[10%] w-[30%] h-[30%] bg-blue-700/10 blur-[100px] rounded-full" />
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
            <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-full px-4 sm:px-5 text-sm shadow-lg shadow-violet-900/40">
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
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 mb-8 backdrop-blur-md"
        >
          <span className="flex w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-semibold text-violet-300 tracking-wide uppercase">AI Content Generation 2.0</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tight mb-6 leading-[1.05]"
        >
          <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white/95 to-white/60">
            Stop writing.<br />
          </span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">
            Start growing.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs font-medium tracking-widest uppercase text-violet-400/70 mb-4 flex items-center gap-2"
        >
          <span className="w-6 h-px bg-violet-500/40" />
          Built specifically for creators — not generic AI
          <span className="w-6 h-px bg-violet-500/40" />
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
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-full px-10 h-14 text-base shadow-2xl shadow-violet-900/50 border border-violet-500/20 transition-all duration-200 hover:scale-[1.05] active:scale-[0.98]"
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
          className="w-full max-w-3xl"
        >
          <div className="relative rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-violet-900/30"
            style={{ background: "linear-gradient(135deg, rgba(20,10,50,0.95) 0%, rgba(10,5,30,0.98) 100%)" }}
          >
            <div className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-pink-500" />
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-[10px] text-white/25 font-medium">GrowFlow AI — Content Generator</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl border border-white/6 bg-white/[0.02]">
                <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="text-white/60 text-sm italic">"The future of content creation is here"</span>
              </div>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
                {PLATFORMS.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.name}
                      onClick={() => setActivePlatform(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 shrink-0 ${
                        activePlatform === i
                          ? `${p.color} border-current bg-current/10`
                          : "text-white/30 border-white/8 hover:border-white/15 hover:text-white/50"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePlatform}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-xl border p-4 ${PLATFORMS[activePlatform].border} bg-gradient-to-br ${PLATFORMS[activePlatform].bg}`}
                >
                  <div className={`flex items-center gap-1.5 mb-3`}>
                    {(() => { const Icon = PLATFORMS[activePlatform].icon; return <Icon className={`w-3.5 h-3.5 ${PLATFORMS[activePlatform].color}`} />; })()}
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${PLATFORMS[activePlatform].color}`}>
                      {PLATFORMS[activePlatform].name}
                    </span>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{PLATFORMS[activePlatform].example}</p>
                </motion.div>
              </AnimatePresence>
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
              <div className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-400 mb-1">{s.value}</div>
              <div className="text-xs text-white/35 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4 text-xs font-medium text-white/50">
              <Play className="w-3 h-3 text-violet-400 fill-violet-400" /> How it works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">From idea to content in 3 steps</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">No learning curve. No complex settings. Just type and create.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-14 left-[33%] right-[33%] h-px bg-gradient-to-r from-violet-500/30 via-purple-500/50 to-pink-500/30" />
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
              <Zap className="w-3 h-3 text-purple-400 fill-purple-400" /> What you get
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Everything you need to grow</h2>
            <p className="text-white/40 text-base max-w-md mx-auto">Tools built specifically for content creators who want to post more and stress less.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, bg, label, desc, pro }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="relative rounded-2xl border border-white/8 p-6 group overflow-hidden"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${bg} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/6 flex items-center justify-center">
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    {pro && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                        PRO
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-white/90">{label}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
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
              <TrendingUp className="w-3 h-3 text-violet-400" /> Creator stories
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
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-violet-600/20 border border-violet-500/30 text-sm font-medium text-violet-300 hover:bg-violet-600/30 hover:text-violet-200 transition-all duration-200"
              >
                <Star className="w-3.5 h-3.5 fill-violet-400 text-violet-400" />
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
              className="relative w-full max-w-md rounded-2xl border border-violet-500/25 p-6 bg-[#0a0518] shadow-2xl z-10"
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
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white" 
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
          <div className="relative rounded-3xl border border-violet-500/20 overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(10,5,30,0.98) 50%, rgba(147,51,234,0.08) 100%)" }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-30%] left-[20%] w-[60%] h-[60%] bg-violet-600/20 blur-[80px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[10%] w-[40%] h-[40%] bg-purple-600/15 blur-[60px] rounded-full" />
            </div>
            <div className="relative z-10 p-10 md:p-14">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-900/50">
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
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-full px-12 h-13 text-base shadow-2xl shadow-violet-900/50 border border-violet-500/20"
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
                className="inline-flex items-center gap-2 text-xs text-white/35 hover:text-violet-400 transition-colors"
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
