import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPT_KEY = "notif_prompt_shown";

export function NotificationPermissionModal() {
  const { isSignedIn } = useUser();
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "granting" | "done">("idle");

  useEffect(() => {
    if (!isSignedIn) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(PROMPT_KEY)) return;

    const timer = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(timer);
  }, [isSignedIn]);

  function dismiss() {
    localStorage.setItem(PROMPT_KEY, "dismissed");
    setShow(false);
  }

  async function handleAllow() {
    setState("granting");
    localStorage.setItem(PROMPT_KEY, "asked");
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setState("done");
        setTimeout(() => {
          try {
            new Notification("You're all set! 🎉", {
              body: "We'll let you know when your trial is ending and drop weekly content tips your way.",
              icon: "/favicon.ico",
            });
          } catch {}
          setTimeout(() => setShow(false), 1200);
        }, 300);
      } else {
        setState("idle");
        dismiss();
      }
    } catch {
      setState("idle");
      dismiss();
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          <div className="fixed inset-0 z-[60] pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm"
          >
            <div
              className="rounded-2xl border border-cyan-500/25 p-4 shadow-2xl shadow-cyan-950/50"
              style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(10,4,28,0.97) 100%)", backdropFilter: "blur(24px)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  {state === "done"
                    ? <Bell className="w-5 h-5 text-emerald-400" />
                    : <Bell className="w-5 h-5 text-cyan-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-0.5">
                    {state === "done" ? "You're all set! 🎉" : "Stay in the loop"}
                  </p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    {state === "done"
                      ? "We'll ping you when it matters — trial ending, weekly wins, all of it."
                      : "Know when your trial's ending, get weekly content wins, and never miss a beat."}
                  </p>
                </div>
                <button
                  onClick={dismiss}
                  className="text-white/20 hover:text-white/50 transition-colors shrink-0 mt-0.5"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {state !== "done" && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleAllow}
                    disabled={state === "granting"}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs h-8 rounded-lg shadow-lg shadow-cyan-900/40"
                  >
                    <Bell className="w-3.5 h-3.5 mr-1.5" />
                    {state === "granting" ? "Just a sec..." : "Turn on notifications"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={dismiss}
                    className="text-white/35 hover:text-white/60 hover:bg-white/5 text-xs h-8 rounded-lg border border-white/8"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
