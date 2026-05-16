import { useState, useEffect } from "react";
import { PlanGate } from "@/components/shared/PlanGate";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, Heart, RefreshCw, Wand2, Trash2, Loader2, Instagram, Linkedin, Twitter, Calendar } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { useAuth } from "@clerk/react";
import { PageSkeleton, EmptyState } from "@/components/shared/Skeleton";
import { haptic } from "@/lib/utils";

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
  Educational: "bg-[rgba(94,106,210,0.15)] text-[#8B91E3] border-[rgba(94,106,210,0.20)]",
  Story: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  Viral: "bg-orange-500/15 text-orange-300 border-orange-500/20",
};

const TONE_COLORS: Record<string, string> = {
  Casual: "bg-[rgba(94,106,210,0.12)] text-[rgba(139,145,227,0.80)] border-[rgba(94,106,210,0.15)]",
  Professional: "bg-indigo-500/12 text-indigo-300/80 border-indigo-500/15",
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

  const { getToken } = useAuth();

  // Pull to refresh logic
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSaved = async () => {
    try {
      const token = await getToken();
      const res = await fetch("/api/favorites/content", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  async function handleRemove(id: number) {
    setRemoving(prev => new Set([...prev, id]));
    try {
      const token = await getToken();
      await fetch(`/api/favorites/${id}`, { 
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
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
    <div 
      className="space-y-8 pb-16 max-w-4xl mx-auto min-h-screen"
      onTouchStart={(e) => {
        if (window.scrollY === 0) setPullY(e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        if (pullY > 0) {
          const y = e.touches[0].clientY;
          if (y > pullY + 80 && !isRefreshing) {
            setIsRefreshing(true);
            haptic('heavy');
            fetchSaved().then(() => {
              setIsRefreshing(false);
              setPullY(0);
            });
          }
        }
      }}
      onTouchEnd={() => setPullY(0)}
    >
      {isRefreshing && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#5E6AD2]" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5 flex items-center gap-3">
            <Heart className="w-7 h-7 text-[#8B91E3]" />
            Saved Content
          </h1>
          <p className="text-white/50 text-sm">
            {loading ? "Loading..." : items.length > 0 ? `${items.length} saved piece${items.length !== 1 ? "s" : ""} of content` : "Content you save will appear here"}
          </p>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : (!items || items.length === 0) ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Save your favourite generated content here by clicking the bookmark icon after generating."
          action={() => navigate("/generate")}
          actionLabel="Start generating →"
        />
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
                        className="p-2 rounded-lg text-[rgba(139,145,227,0.60)] hover:text-[#8B91E3] hover:bg-[rgba(94,106,210,0.10)] transition-all duration-200 shrink-0"
                        title="Remove from saved"
                      >
                        {isRemoving
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Heart className="w-4 h-4 fill-[rgba(139,145,227,0.40)]" />
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
                        className="text-[rgba(139,145,227,0.70)] hover:text-[#8B91E3] bg-[rgba(94,106,210,0.5)] hover:bg-[rgba(94,106,210,0.12)] border border-[rgba(94,106,210,0.15)] text-xs rounded-lg"
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
