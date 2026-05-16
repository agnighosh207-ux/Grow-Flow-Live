import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface NPSModalProps {
  open: boolean;
  onClose: () => void;
  trigger?: string;
}

const STORAGE_KEY = "gf_nps_status";

export function checkShouldShowNPS(genCount: number): boolean {
  try {
    const status = localStorage.getItem(STORAGE_KEY);
    if (status === "done" || status === "never") return false;
    
    // Show on 10th generation
    if (!status && genCount >= 10) return true;
    
    // Remind logic
    if (status?.startsWith("remind:")) {
      const remindAt = parseInt(status.split(":")[1] ?? "0", 10);
      return genCount >= remindAt;
    }
    return false;
  } catch { return false; }
}

export function NPSModal({ open, onClose, trigger = "10th_generation" }: NPSModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRespond = async () => {
    if (score === null) return;
    setSubmitting(true);
    try {
      await api.post("/feedback/nps/respond", {
        score,
        comment: comment.trim() || null,
        trigger
      });
      localStorage.setItem(STORAGE_KEY, "done");
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to submit NPS response" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemind = () => {
    try {
      const count = parseInt(localStorage.getItem("ce_gen_count") ?? "0", 10);
      localStorage.setItem(STORAGE_KEY, `remind:${count + 10}`);
    } catch {}
    onClose();
  };

  const handleNever = () => {
    try { localStorage.setItem(STORAGE_KEY, "never"); } catch {}
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center p-4 pt-[12vh]">

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative z-10 w-full max-w-lg rounded-[2.5rem] border border-white/10 p-8 md:p-10 text-center space-y-8 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(10,4,28,0.98) 0%, rgba(20,10,50,0.95) 100%)",
            }}
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div key="thanks" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-10 h-10 text-emerald-400 fill-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white">Thank you!</h3>
                  <p className="text-white/50 font-medium">Your feedback drives the future of GrowFlow AI.</p>
                </motion.div>
              ) : (
                <motion.div key="survey" className="space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white leading-tight">Help us grow.</h3>
                    <p className="text-sm text-white/40 font-medium">How likely are you to recommend GrowFlow to a fellow creator?</p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button 
                        key={n} 
                        onClick={() => setScore(n)}
                        className={`w-10 h-10 md:w-11 md:h-11 rounded-xl text-xs font-black transition-all transform hover:scale-110 active:scale-95
                          ${n <= 6 ? 'hover:bg-rose-500/20 text-rose-400' : n <= 8 ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-emerald-500/20 text-emerald-400'}
                          ${score === n ? 'ring-2 ring-[#5E6AD2] bg-white/10 text-white scale-110 shadow-[0_0_20px_rgba(94,106,210,0.3)]' : 'bg-white/5'}
                        `}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/20 px-2">
                    <span>Not Likely</span>
                    <span>Very Likely</span>
                  </div>

                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="What's the #1 thing we could improve? (optional)"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-[rgba(94,106,210,0.5)] transition-colors"
                  />

                  <Button
                    onClick={handleRespond}
                    disabled={score === null || submitting}
                    style={{ background: '#5E6AD2' }}
                    className="w-full h-14 font-black rounded-2xl shadow-xl transition-all text-white"
                  >
                    {submitting ? "Sending..." : "Submit Response"}
                  </Button>

                  <div className="flex items-center justify-center gap-6">
                    <button onClick={handleRemind} className="text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
                      Remind me in 10 generations
                    </button>
                    <button onClick={handleNever} className="text-white/20 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
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
