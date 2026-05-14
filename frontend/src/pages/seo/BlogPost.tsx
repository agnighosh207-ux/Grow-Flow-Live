import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface PostConfig {
  title: string;
  description: string;
  date: string;
  author: string;
  readTime: string;
  content: { heading: string; body: string }[];
}

const BLOG_DATA: Record<string, PostConfig> = {
  "how-to-grow-instagram-india-2026": {
    title: "How to Grow on Instagram in India (2026 Complete Guide)",
    description: "The definitive guide for Indian creators to grow from 0 to 10,000 followers using AI-powered content strategies.",
    readTime: "8 min read",
    date: "January 2026",
    author: "GrowFlow Team",
    content: [
      { heading: "Why Instagram Growth is Different in India", body: "Indian audiences respond to authenticity, regional language content, and relatable storytelling far more than polished production. Hinglish captions consistently outperform pure English for audiences below 25." },
      { heading: "The Content Formula That Works in 2026", body: "Post 4-5 times per week minimum. Mix: 2 educational reels, 1 personal story, 1 trending audio reel, 1 engagement post (poll/question). Use GrowFlow AI to generate all of these in under 10 minutes." },
      { heading: "Best Posting Times for Indian Audiences", body: "7-9 AM (morning commute), 12-2 PM (lunch break), 8-11 PM (prime time). Sunday evenings see the highest engagement rates for Indian Gen Z audiences." },
      { heading: "Hashtag Strategy for India in 2026", body: "Use 5-8 hashtags maximum. Mix: 2 broad (1M+ posts), 3 medium (100K-1M), 2 niche (under 100K). Always include at least one Indian-specific hashtag like #IndianCreator or your niche + India." },
      { heading: "How to Use AI to 10x Your Content Output", body: "Tools like GrowFlow AI let you generate a full week of captions, hooks, and content ideas in one sitting. Batch create on Sundays, schedule through the week, and focus your energy on filming and engagement." }
    ]
  },
  "viral-content-formula-hindi-creators": {
    title: "The Viral Content Formula for Hindi Creators (2026)",  
    description: "How Hindi and Hinglish creators are dominating social media using proven content formulas and AI tools.",
    readTime: "6 min read",
    date: "February 2026",
    author: "GrowFlow Team",
    content: [
      { heading: "Why Hindi Content is Exploding in 2026", body: "India has 600M+ Hindi speakers coming online every year. YouTube alone sees 3x more Hindi content consumption than English. The opportunity for Hindi creators has never been bigger." },
      { heading: "The 3 Viral Content Types for Hindi Audiences", body: "1. Emotional storytelling (dil ko chhune wali baatein), 2. Practical life advice (jugaad tips), 3. Shocking facts (yeh toh pata hi nahi tha). These three formats consistently hit 100K+ views for Hindi creators under 10K followers." },
      { heading: "Hinglish: The Secret Weapon", body: "Pure Hindi feels formal. Pure English feels foreign. Hinglish hits the sweet spot for 18-35 Indian audiences. GrowFlow AI generates native Hinglish content that sounds like it was written by a real creator, not translated." },
      { heading: "Hook Formulas That Work in Hindi", body: "'Yeh galti mat karna...', 'Kya aapko pata hai...', 'Main 3 saal se yeh kar raha tha aur...', 'Ek baat batao...'. These hook structures have 40-60% higher watch time completion than generic hooks." }
    ]
  }
};

export default function BlogPost({ slug }: { slug: string }) {
  const post = BLOG_DATA[slug as keyof typeof BLOG_DATA];
  const [, navigate] = useLocation();

  React.useEffect(() => {
    if (post) {
      document.title = `${post.title} — GrowFlow AI Blog`;
    }
  }, [post]);

  if (!post) return <div>Post not found</div>;

  return (
    <PageWrapper maxWidth="md" className="py-20 space-y-12">
      <div className="space-y-6 text-center">
        <div className="flex items-center justify-center gap-6 text-xs font-black text-cyan-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><Calendar size={14}/> {post.date}</span>
          <span className="flex items-center gap-1.5"><User size={14}/> {post.author}</span>
          <span className="flex items-center gap-1.5"><Clock size={14}/> {post.readTime}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white italic leading-tight tracking-tight">
          {post.title}
        </h1>
        <p className="text-xl text-white/50 font-medium italic">
          {post.description}
        </p>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="space-y-10">
        {post.content.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-2xl font-black text-white italic tracking-tight">{section.heading}</h2>
            <p className="text-lg text-white/70 leading-relaxed">{section.body}</p>
          </div>
        ))}
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
