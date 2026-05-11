import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, MessageSquare, Sparkles, Send, ArrowRight, Instagram, Twitter, Linkedin, Youtube, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/layout/Logo";

export default function ReviewPage() {
  const { shareId } = useParams();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'approved' | 'needs_changes' | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("instagram");
  const { toast } = useToast();

  useEffect(() => {
    fetchReviewContent();
  }, [shareId]);

  const fetchReviewContent = async () => {
    try {
      const res = await api.get(`/public/review/${shareId}`);
      setContent(res.data.content);
      // Auto-set first available platform
      const platforms = ["instagram", "twitter", "linkedin", "youtube"];
      for (const p of platforms) {
        if (res.data.content.content[p]) {
          setActiveTab(p);
          break;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "This review link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackStatus) return;
    setIsSubmitting(true);
    try {
      await api.post(`/public/review/${shareId}/feedback`, {
        status: feedbackStatus,
        comment
      });
      setSubmitted(true);
      toast({ title: "Feedback sent!", description: "The creator has been notified." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to send feedback." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050110] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050110] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <X className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Review Link Expired</h1>
        <p className="text-white/40 max-w-sm mb-8">{error}</p>
        <Button onClick={() => window.location.href = "https://growflowai.space"} className="bg-white/5 border border-white/10 hover:bg-white/10">
          Go to GrowFlow AI
        </Button>
      </div>
    );
  }

  const generatedData = content.content;

  return (
    <div className="min-h-screen bg-[#050110] selection:bg-cyan-500/30 font-sans">
      <nav className="h-20 border-b border-white/[0.06] bg-[#080316]/80 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Public Review Mode</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Review Request</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Draft Review: {content.idea.slice(0, 40)}...</h1>
          <p className="text-white/40 font-medium">Please review the generated content below and share your feedback.</p>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl mb-12">
          <div className="flex border-b border-white/[0.06] bg-black/20 p-2 gap-1 overflow-x-auto hide-scrollbar">
            {["instagram", "twitter", "linkedin", "youtube"].map((p) => (
              generatedData[p] && (
                <button
                  key={p}
                  onClick={() => setActiveTab(p)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap
                    ${activeTab === p 
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,242,255,0.05)]" 
                      : "text-white/30 hover:text-white/50 hover:bg-white/5"
                    }`}
                >
                  {p === "instagram" && <Instagram className="w-3.5 h-3.5" />}
                  {p === "twitter" && <Twitter className="w-3.5 h-3.5" />}
                  {p === "linkedin" && <Linkedin className="w-3.5 h-3.5" />}
                  {p === "youtube" && <Youtube className="w-3.5 h-3.5" />}
                  <span className="capitalize">{p}</span>
                </button>
              )
            ))}
          </div>

          <div className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                {activeTab === "instagram" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Caption</p>
                      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                        {generatedData.instagram.caption}
                      </div>
                    </div>
                    {generatedData.instagram.visualBriefs && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Visual Briefs</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {generatedData.instagram.visualBriefs.map((brief: string, idx: number) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 text-[11px] text-white/60">
                              <span className="text-cyan-400 font-bold mr-2">Slide {idx + 1}:</span> {brief}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "twitter" && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Thread</p>
                    {generatedData.twitter.tweets.map((tweet: string, idx: number) => (
                      <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 relative">
                        <span className="absolute top-4 right-4 text-[10px] font-bold text-white/10">{idx + 1}/{generatedData.twitter.tweets.length}</span>
                        <p className="text-sm text-white/80 leading-relaxed font-medium">{tweet}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "linkedin" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Post Content</p>
                      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                        {generatedData.linkedin.post}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "youtube" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Script</p>
                      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-medium">
                        {generatedData.youtube.script}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {!submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0A061E] border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-cyan-950/20"
          >
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Share your feedback
            </h3>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <button
                onClick={() => setFeedbackStatus("approved")}
                className={`flex-1 flex items-center justify-center gap-3 h-16 rounded-2xl border font-bold transition-all
                  ${feedbackStatus === "approved" 
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
              >
                <Check className="w-5 h-5" />
                Looks Good ✓
              </button>
              <button
                onClick={() => setFeedbackStatus("needs_changes")}
                className={`flex-1 flex items-center justify-center gap-3 h-16 rounded-2xl border font-bold transition-all
                  ${feedbackStatus === "needs_changes" 
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:bg-white/[0.07]"
                  }`}
              >
                <X className="w-5 h-5" />
                Needs Changes ✗
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                placeholder="Any specific comments or change requests? (Optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-all min-h-[120px] resize-none font-medium"
              />
              <Button
                onClick={handleSubmitFeedback}
                disabled={!feedbackStatus || isSubmitting}
                className="w-full h-14 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-xl shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Send Feedback <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Feedback Sent!</h2>
            <p className="text-white/40 mb-8 max-w-sm mx-auto font-medium">The creator has received your comments and will get back to you soon.</p>
            <Button
               onClick={() => window.location.href = "https://growflowai.space"}
               className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 px-8 rounded-xl"
            >
              Done
            </Button>
          </motion.div>
        )}

        <div className="mt-20 pt-12 border-t border-white/[0.06] text-center">
          <p className="text-white/30 text-sm mb-6 font-medium">Want to create professional content like this in seconds?</p>
          <div className="inline-flex flex-col md:flex-row items-center gap-4 bg-white/[0.03] border border-white/10 p-2 rounded-3xl">
            <div className="flex -space-x-3 px-4">
              {[1, 2, 3].map(i => (
                <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-10 h-10 rounded-full border-2 border-[#050110]" />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-[#050110] bg-cyan-500 flex items-center justify-center text-[10px] font-black text-black">
                +420
              </div>
            </div>
            <div className="text-left px-2">
              <p className="text-xs font-bold text-white">Join 12,000+ creators</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">Powered by GrowFlow AI</p>
            </div>
            <Button
              onClick={() => window.location.href = "https://growflowai.space"}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-black text-xs px-6 py-4 rounded-2xl flex items-center gap-2 group shadow-xl shadow-cyan-950"
            >
              Start Creating Free <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </main>

      <footer className="py-12 px-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/10">
        © {new Date().getFullYear()} GrowFlow AI · Personal Branding Engine
      </footer>
    </div>
  );
}
