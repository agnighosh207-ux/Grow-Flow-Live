import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle2, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EarlyAccessModalProps {
  open: boolean;
  onClose: () => void;
  source?: string;
}

export function EarlyAccessModal({ open, onClose, source = "pricing" }: EarlyAccessModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/early-access/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Connection error. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setEmail("");
      setSuccess(false);
      setError("");
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(15,10,40,0.98) 0%, rgba(20,10,50,0.98) 100%)",
              border: "1px solid rgba(124,58,237,0.3)",
              boxShadow: "0 0 80px rgba(124,58,237,0.2)",
            }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              {!success ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-violet-300" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Get Early Access</h2>
                      <p className="text-white/45 text-xs">Be first when premium unlocks</p>
                    </div>
                  </div>

                  <div className="rounded-xl p-4 mb-6" style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.2)",
                  }}>
                    <p className="text-sm text-white/70 leading-relaxed">
                      🚀 GrowFlow AI is in <strong className="text-violet-300">early access</strong>. Premium plans accessibility is launching soon with{" "}
                      <span className="text-white/85">special founding member pricing</span> for users who sign up now.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 placeholder:text-white/35 focus:border-violet-500/50 focus:ring-violet-500/20 h-11"
                        style={{ color: '#ffffff' }}
                        required
                        disabled={loading}
                      />
                    </div>

                    {error && (
                      <p className="text-red-400 text-xs">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="w-full h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-50"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving your spot...</>
                      ) : (
                        "Notify Me When It Launches →"
                      )}
                    </Button>
                  </form>

                  <p className="text-center text-white/25 text-xs mt-4">
                    No spam, ever. Unsubscribe anytime.
                  </p>
                </>
              ) : (
                <motion.div
                  className="text-center py-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">You're on the list! 🎉</h3>
                  <p className="text-white/55 text-sm leading-relaxed mb-6">
                    We'll notify you when premium plans launch — with <strong className="text-violet-300">founding member pricing</strong> reserved for early subscribers like you.
                  </p>
                  <Button
                    onClick={handleClose}
                    className="bg-white/10 hover:bg-white/15 border border-white/15 text-white/80"
                  >
                    Continue Exploring Free
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
