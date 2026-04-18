import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: string;
}

const STORAGE_KEY = "ce_rating_status";

export function getRatingStatus(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function checkShouldShowRating(genCount: number): boolean {
  try {
    const status = localStorage.getItem(STORAGE_KEY);
    if (status === "done" || status === "never") return false;
    if (!status && genCount === 3) return true;
    if (status?.startsWith("remind:")) {
      const remindAt = parseInt(status.split(":")[1] ?? "0", 10);
      return genCount >= remindAt;
    }
    return false;
  } catch { return false; }
}

export function checkShouldShowFeedback(): boolean {
  try {
    const status = localStorage.getItem(STORAGE_KEY);
    if (status === "done" || status === "never") return false;
    if (status?.startsWith("remind:")) {
      const remindAt = parseInt(status.split(":")[1] ?? "0", 10);
      const count = parseInt(localStorage.getItem("ce_gen_count") ?? "0", 10);
      return count >= remindAt;
    }
    return true;
  } catch { return false; }
}

export function incrementGenCount(): number {
  try {
    const prev = parseInt(localStorage.getItem("ce_gen_count") ?? "0", 10);
    const next = prev + 1;
    localStorage.setItem("ce_gen_count", String(next));
    return next;
  } catch { return 0; }
}

export function FeedbackModal({ open, onClose, trigger = "manual" }: FeedbackModalProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [location] = useLocation();

  async function handleRate() {
    if (selected === 0) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating: selected,
          comment: comment.trim() || null,
          trigger,
          page: location || "/",
        }),
      });
      if (!res.ok) {
        setSubmitError(true);
        setSubmitting(false);
        return;
      }
    } catch {
      setSubmitError(true);
      setSubmitting(false);
      return;
    }
    try { localStorage.setItem(STORAGE_KEY, "done"); } catch {}
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(onClose, 1800);
  }

  function handleRemind() {
    try {
      const count = parseInt(localStorage.getItem("ce_gen_count") ?? "0", 10);
      localStorage.setItem(STORAGE_KEY, `remind:${count + 3}`);
    } catch {}
    onClose();
  }

  function handleNever() {
    try { localStorage.setItem(STORAGE_KEY, "never"); } catch {}
    onClose();
  }

  function handleClose() {
    handleRemind();
  }

  const displayStars = hovered || selected;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 p-6 text-center space-y-5"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(10,4,28,0.98) 100%)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 text-white/25 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-2 space-y-2"
                >
                  <div className="text-3xl">🎉</div>
                  <p className="text-white font-semibold">Thanks for your feedback!</p>
                  <p className="text-white/45 text-sm">Your rating helps us improve Grow Flow AI.</p>
                </motion.div>
              ) : (
                <motion.div key="rate" className="space-y-5">
                  <div className="space-y-1.5">
                    <div className="text-2xl">⭐</div>
                    <h3 className="text-white font-semibold text-base">Enjoying Grow Flow AI?</h3>
                    <p className="text-white/45 text-sm leading-relaxed">
                      You've generated {localStorage.getItem("ce_gen_count") ?? "a few"} pieces of content. How are we doing?
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setSelected(star)}
                        className="transition-transform duration-100 hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors duration-100 ${
                            star <= displayStars
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-white/8 text-white/20"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {selected > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white/50 text-xs"
                    >
                      {selected === 5 ? "Amazing! 🚀" : selected === 4 ? "Great! 👍" : selected === 3 ? "Good 👌" : selected === 2 ? "Could be better 🤔" : "Sorry to hear that 😔"}
                    </motion.p>
                  )}

                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Any thoughts? (optional)"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder:text-white/25 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                  />

                  {submitError && (
                    <p className="text-red-400 text-xs">
                      Failed to submit. Please try again.
                    </p>
                  )}

                  <Button
                    onClick={handleRate}
                    disabled={selected === 0 || submitting}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl disabled:opacity-40 transition-all"
                  >
                    {submitting ? "Submitting..." : "Submit Feedback"}
                  </Button>

                  <div className="flex items-center justify-center gap-4">
                    <button onClick={handleRemind} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                      Remind me later
                    </button>
                    <span className="text-white/15 text-xs">·</span>
                    <button onClick={handleNever} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                      Don't show again
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { FeedbackModal as RatingModal };
