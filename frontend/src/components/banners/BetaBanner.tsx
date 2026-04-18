import { IS_BETA } from "@/config/appMode";
import { Zap } from "lucide-react";

export function BetaBanner() {
  if (!IS_BETA) return null;

  return (
    <div
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
      style={{
        background: "linear-gradient(90deg, rgba(124,58,237,0.22) 0%, rgba(168,85,247,0.18) 50%, rgba(124,58,237,0.22) 100%)",
        borderBottom: "1px solid rgba(124,58,237,0.25)",
      }}
    >
      <Zap className="w-3 h-3 text-violet-400 shrink-0" />
      <span className="text-white/60">
        You're using an <span className="text-violet-300 font-semibold">early beta</span> version — some features may not work perfectly. Your feedback helps us improve.
      </span>
    </div>
  );
}
