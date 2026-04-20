import { useState, useEffect } from "react";
import { PlanGate } from "@/components/shared/PlanGate";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Bookmark, Heart, RefreshCw, Wand2, Trash2,
  Loader2, Instagram, Linkedin, Twitter, Calendar,
} from "lucide-react";
import { SiYoutube } from "react-icons/si";

interface SavedItem {
  id: number;
  idea: string;
  contentType: string;
  tone: string;
  content: any;
  createdAt: string;
  savedAt: string;
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  Educational: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  Story: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  Viral: "bg-orange-500/15 text-orange-300 border-orange-500/20",
};

const TONE_COLORS: Record<string, string> = {
  Casual: "bg-emerald-500/12 text-emerald-300/80 border-emerald-500/15",
  Professional: "bg-sky-500/12 text-sky-300/80 border-sky-500/15",
  Aggressive: "bg-red-500/12 text-red-300/80 border-red-500/15",
};

const PLATFORM_ICONS = {
  instagram: <Instagram className="w-3 h-3" />,
  youtube: <SiYoutube className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
};

export default function Saved() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/api/favorites/content")
      .then(r => r.json())
      .then(data => { setItems(data.items ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleRemove(id: number) {
    setRemoving(prev => new Set([...prev, id]));
    try {
      await fetch(`/api/favorites/${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Removed from saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to remove" });
    } finally {
      setRemoving(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  function handleReuse(item: SavedItem) {
    navigate(`/generate?idea=${encodeURIComponent(item.idea)}&contentType=${encodeURIComponent(item.contentType)}&tone=${encodeURIComponent(item.tone)}`);
  }

  function handleRegenerate(item: SavedItem) {
    navigate(`/generate?idea=${encodeURIComponent(item.idea)}&contentType=${encodeURIComponent(item.contentType)}&tone=${encodeURIComponent(item.tone)}&auto=1`);
  }

  return (
    <PlanGate requiredPlan="starter" featureName="Saved Content" description="Save and revisit your favourite generated content — available on Starter (₹299/month) and above.">
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
            <Heart className="w-7 h-7 text-pink-400" />
            Saved Content
          </h1>
          <p className="text-white/50 text-sm">
            {loading ? "Loading..." : items.length > 0 ? `${items.length} saved piece${items.length !== 1 ? "s" : ""} of content` : "Content you save will appear here"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-xl bg-white/3 border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 space-y-4"
        >
          <div className="w-18 h-18 rounded-2xl bg-pink-500/10 border border-pink-500/15 flex items-center justify-center mx-auto" style={{ width: 72, height: 72 }}>
            <Heart className="w-8 h-8 text-pink-400/40" />
          </div>
          <div>
            <p className="text-white/60 font-medium">No saved content yet</p>
            <p className="text-white/30 text-sm mt-1">Tap the heart icon on any generated content to save it here.</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/generate")}
            className="bg-white/8 hover:bg-white/12 text-white/70 border border-white/10 rounded-xl text-xs mt-2"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Generate Content
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const ctColor = CONTENT_TYPE_COLORS[item.contentType] || "bg-white/8 text-white/60 border-white/10";
              const toneColor = TONE_COLORS[item.tone] || "bg-white/8 text-white/60 border-white/10";
              const isRemoving = removing.has(item.id);

              const ideaDisplay = item.idea.replace(/^\[Niche: \w+\]\s*/, "");

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-white/8 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${ctColor}`}>
                            {item.contentType}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${toneColor}`}>
                            {item.tone}
                          </span>
                        </div>
                        <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{ideaDisplay}</p>
                        <div className="flex items-center gap-3 mt-2.5">
                          <div className="flex items-center gap-1.5 text-white/25">
                            {Object.entries(PLATFORM_ICONS).map(([p, icon]) => (
                              <span key={p}>{icon}</span>
                            ))}
                          </div>
                          <span className="flex items-center gap-1 text-white/25 text-[11px]">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(item.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={isRemoving}
                        className="p-2 rounded-lg text-pink-400/60 hover:text-pink-400 hover:bg-pink-500/10 transition-all duration-200 shrink-0"
                        title="Remove from saved"
                      >
                        {isRemoving
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Heart className="w-4 h-4 fill-pink-400/40" />
                        }
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReuse(item)}
                        className="text-white/50 hover:text-white/80 bg-white/3 hover:bg-white/8 border border-white/8 text-xs rounded-lg"
                      >
                        <Wand2 className="w-3 h-3 mr-1.5" /> Reuse Idea
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRegenerate(item)}
                        className="text-cyan-400/70 hover:text-cyan-300 bg-cyan-500/5 hover:bg-cyan-500/12 border border-cyan-500/15 text-xs rounded-lg"
                      >
                        <RefreshCw className="w-3 h-3 mr-1.5" /> Regenerate
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
    </PlanGate>
  );
}
