import React from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface PostConfig {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  readTime: string;
  content: React.ReactNode;
}

const BLOG_DATA: Record<string, PostConfig> = {
  "how-to-grow-instagram-india-2026": {
    title: "How to Grow on Instagram in India (2026 Strategy)",
    excerpt: "The Instagram algorithm has changed. Here is the exact roadmap for Indian creators to hit 100k followers this year.",
    date: "May 10, 2026",
    author: "GrowFlow Team",
    readTime: "8 min",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-lg">
        <p>In 2026, Instagram in India is no longer about just "posting reels." It's about community depth and platform-specific formatting. Indian audiences are more discerning than ever.</p>
        <h2 className="text-2xl font-black text-white italic">1. The Hook is Everything</h2>
        <p>With attention spans dropping to 1.5 seconds, your visual hook and text hook must stop the scroll instantly. Use "Hinglish" for authenticity—it builds immediate trust with the Indian Gen-Z and Millennial demographic.</p>
        <h2 className="text-2xl font-black text-white italic">2. Use AI for Consistency</h2>
        <p>Consistency is the only "hack" that still works. Tools like GrowFlow AI help you generate 30 days of content in one sitting, so you never have to worry about what to post tomorrow.</p>
        <h2 className="text-2xl font-black text-white italic">3. Niche Down</h2>
        <p>General entertainment is saturated. Focus on specific Indian niches: FinTech for Tier-2 cities, regional food blogging, or hyper-local tech news.</p>
      </div>
    )
  },
  "viral-content-formula-hindi-creators": {
    title: "The Viral Content Formula for Hindi Creators",
    excerpt: "Learn how to use Hindi and Hinglish to build a massive loyal following in the Indian heartland.",
    date: "May 8, 2026",
    author: "Aman Sharma",
    readTime: "6 min",
    content: (
      <div className="space-y-6 text-white/70 leading-relaxed text-lg">
        <p>The next 100 million creators will come from Hindi-speaking regions. If you're not using the "Desi Context," you're leaving growth on the table.</p>
        <h2 className="text-2xl font-black text-white italic">The Power of Emotions</h2>
        <p>Indian audiences connect through emotion. Whether it's humor, inspiration, or anger, your content needs an emotional core. Use our AI Tone selector set to 'Aggressive' or 'Story' to capture this.</p>
      </div>
    )
  }
};

export default function BlogPost({ slug }: { slug: string }) {
  const post = BLOG_DATA[slug as keyof typeof BLOG_DATA];
  const [, navigate] = useLocation();

  if (!post) return <div>Post not found</div>;

  return (
    <PageWrapper maxWidth="md" className="py-20 space-y-12">
      <div className="space-y-6 text-center">
        <div className="flex items-center justify-center gap-6 text-xs font-black text-cyan-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><Calendar size={14}/> {post.date}</span>
          <span className="flex items-center gap-1.5"><User size={14}/> {post.author}</span>
          <span className="flex items-center gap-1.5"><Clock size={14}/> {post.readTime} read</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white italic leading-tight tracking-tight">
          {post.title}
        </h1>
        <p className="text-xl text-white/50 font-medium italic">
          {post.excerpt}
        </p>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="prose prose-invert max-w-none">
        {post.content}
      </div>

      {/* CTA Box */}
      <div className="mt-16 p-10 rounded-3xl bg-cyan-600/10 border border-cyan-500/20 text-center space-y-6">
        <h3 className="text-2xl font-black text-white italic">Want to put this strategy on autopilot?</h3>
        <p className="text-white/60">GrowFlow AI handles the writing, you handle the growth.</p>
        <Button 
          size="lg"
          onClick={() => navigate("/sign-up")}
          className="rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black px-10 h-14"
        >
          TRY GROWFLOW FREE →
        </Button>
      </div>
    </PageWrapper>
  );
}
