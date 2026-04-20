import { useState } from "react";
import {
  useGetContentHistory,
  getGetContentHistoryQueryKey,
  useDeleteHistoryItem,
  useGetContentStats,
  getGetContentStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Copy, Check, RefreshCw, ArrowUpRight, Zap, TrendingUp, Calendar,
  Languages, Target, MessageSquare, BarChart2, Loader2, Trash2, Clock
} from "lucide-react";
import { Twitter, Linkedin } from "lucide-react";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const PLATFORM_ICONS = {
  twitter: <Twitter className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  instagram: <SiInstagram className="w-3 h-3" />,
  youtube: <SiYoutube className="w-3 h-3" />,
};

const TONE_COLOR: Record<string, string> = {
  Casual: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Professional: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Aggressive: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

const TYPE_COLOR: Record<string, string> = {
  Educational: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Story: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Viral: "bg-red-500/10 text-red-400 border-red-500/20",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={handle}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all
        ${copied
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          : "bg-white/5 text-white/40 hover:text-white/70 border border-white/8 hover:bg-white/8"
        }`}
    >
      {copied ? <><Check className="w-2.5 h-2.5" />Copied</> : <><Copy className="w-2.5 h-2.5" />Copy</>}
    </button>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-white/6 p-5 animate-pulse"
      style={{ background: "rgba(255,255,255,0.025)" }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/6" />
        <div className="space-y-2">
          <div className="h-3 w-20 bg-white/6 rounded" />
          <div className="h-6 w-12 bg-white/8 rounded" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/6 p-5 animate-pulse"
      style={{ background: "rgba(255,255,255,0.025)" }}>
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-20 bg-white/6 rounded-full" />
        <div className="h-5 w-16 bg-white/6 rounded-full" />
      </div>
      <div className="space-y-2 mb-6">
        <div className="h-3.5 w-full bg-white/6 rounded" />
        <div className="h-3.5 w-4/5 bg-white/6 rounded" />
        <div className="h-3.5 w-3/5 bg-white/6 rounded" />
      </div>
      <div className="h-px bg-white/6 mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-white/6 rounded" />
        <div className="flex gap-1">
          {[0, 1, 2, 3].map(i => <div key={i} className="w-3 h-3 bg-white/6 rounded" />)}
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const { data: historyData, isLoading } = useGetContentHistory({}, {
    query: {
      queryKey: getGetContentHistoryQueryKey(),
      staleTime: 60_000,
    },
  });
  const { data: stats, isLoading: statsLoading } = useGetContentStats({
    query: {
      queryKey: getGetContentStatsQueryKey(),
      staleTime: 120_000,
    },
  });
  const deleteMutation = useDeleteHistoryItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [remixItem, setRemixItem] = useState<any>(null);

  const performRemix = (language: string) => {
    if (!remixItem) return;
    const p = new URLSearchParams({ 
      idea: remixItem.idea, 
      contentType: remixItem.contentType, 
      tone: remixItem.tone, 
      language,
      auto: "1" 
    });
    setLocation(`/generate?${p.toString()}`);
    setRemixItem(null);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Deleted" });
        queryClient.invalidateQueries({ queryKey: getGetContentHistoryQueryKey() });
        if (selectedItem?.id === id) setSelectedItem(null);
        setDeletingId(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete" });
        setDeletingId(null);
      }
    });
  };

  const handleReuse = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const p = new URLSearchParams({ idea: item.idea, contentType: item.contentType, tone: item.tone });
    setLocation(`/generate?${p.toString()}`);
  };

  const handleRegenerate = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const p = new URLSearchParams({ idea: item.idea, contentType: item.contentType, tone: item.tone, auto: "1" });
    setLocation(`/generate?${p.toString()}`);
  };

  const STAT_CARDS = [
    {
      label: "Total Generations",
      value: stats?.totalGenerations ?? 0,
      sub: `${stats?.thisWeek ?? 0} this week`,
      icon: <BarChart2 className="w-5 h-5" />,
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
      accent: "from-cyan-500/10",
    },
    {
      label: "Top Style",
      value: stats?.topContentType ?? "—",
      sub: "most used format",
      icon: <Target className="w-5 h-5" />,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      accent: "from-emerald-500/8",
    },
    {
      label: "Top Tone",
      value: stats?.topTone ?? "—",
      sub: "most used tone",
      icon: <MessageSquare className="w-5 h-5" />,
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      accent: "from-blue-500/8",
    },
    {
      label: "This Week",
      value: stats?.thisWeek ?? 0,
      sub: "new generations",
      icon: <TrendingUp className="w-5 h-5" />,
      iconBg: "bg-pink-500/15",
      iconColor: "text-pink-400",
      accent: "from-pink-500/8",
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5">History</h1>
        <p className="text-white/50 text-sm md:text-base">Your past campaigns. Reuse or regenerate with one click.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : STAT_CARDS.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: STAT_CARDS.indexOf(card) * 0.04 }}
              className={`rounded-2xl border border-white/6 p-4 bg-gradient-to-br ${card.accent} to-transparent`}
              style={{ background: `rgba(255,255,255,0.025)` }}
            >
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-3`}>
                {card.icon}
              </div>
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mb-0.5">{card.label}</p>
              <p className="text-xl font-bold text-white leading-tight">{card.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{card.sub}</p>
            </motion.div>
          ))
        }
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !historyData?.items || historyData.items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-white/6 p-14 text-center flex flex-col items-center"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-white/25" />
          </div>
          <h3 className="text-base font-semibold text-white/70 mb-1.5">No history yet</h3>
          <p className="text-white/35 text-sm max-w-xs mb-5">Generate your first content campaign to see it here.</p>
          <Button
            size="sm"
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs"
            onClick={() => setLocation("/generate")}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Generate Now
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {historyData?.items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: Math.min(idx * 0.04, 0.25), duration: 0.22 }}
                onClick={() => setSelectedItem(item)}
                className="group rounded-2xl border border-white/6 p-5 cursor-pointer hover:border-white/12 transition-all duration-200 relative flex flex-col"
                style={{ background: "rgba(255,255,255,0.025)" }}
                whileHover={{ y: -2 }}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 flex items-center justify-center transition-colors"
                  >
                    {deletingId === item.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_COLOR[item.contentType] ?? "bg-white/5 text-white/50 border-white/10"}`}>
                    {item.contentType}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TONE_COLOR[item.tone] ?? "bg-white/5 text-white/50 border-white/10"}`}>
                    {item.tone}
                  </span>
                </div>

                <p className="text-white/85 text-sm font-medium mb-4 line-clamp-3 leading-relaxed flex-1">
                  "{item.idea}"
                </p>

                <div className="space-y-2.5 mt-auto">
                  <div className="flex items-center justify-between text-[10px] text-white/30 border-t border-white/6 pt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {Object.entries(PLATFORM_ICONS).map(([p, icon]) => (
                        <span key={p}>{icon}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={(e) => handleReuse(item, e)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-white/50 hover:text-white/80 bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/12 transition-all"
                    >
                      <ArrowUpRight className="w-3 h-3" /> Reuse
                    </button>
                    <button
                      onClick={(e) => handleRegenerate(item, e)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-cyan-300/70 hover:text-cyan-300 bg-cyan-500/6 hover:bg-cyan-500/12 border border-cyan-500/15 hover:border-cyan-500/25 transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Redo
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRemixItem(item); }}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium text-pink-300/70 hover:text-pink-300 bg-pink-500/6 hover:bg-pink-500/12 border border-pink-500/15 hover:border-pink-500/25 transition-all"
                    >
                      <Languages className="w-3 h-3" /> Remix
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent
          className="w-full sm:max-w-2xl overflow-y-auto border-l border-white/6 p-0"
          style={{ background: "rgba(8,4,22,0.97)", backdropFilter: "blur(32px)" }}
        >
          {selectedItem && (
            <div className="p-6 space-y-6">
              <SheetHeader className="space-y-3 pb-5 border-b border-white/6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${TYPE_COLOR[selectedItem.contentType] ?? ""}`}>
                    {selectedItem.contentType}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${TONE_COLOR[selectedItem.tone] ?? ""}`}>
                    {selectedItem.tone}
                  </span>
                  <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(selectedItem.createdAt), "PPp")}
                  </span>
                </div>
                <SheetTitle className="text-white text-lg leading-snug">"{selectedItem.idea}"</SheetTitle>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      const p = new URLSearchParams({ idea: selectedItem.idea, contentType: selectedItem.contentType, tone: selectedItem.tone });
                      setLocation(`/generate?${p.toString()}`);
                      setSelectedItem(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/8 text-white/60 hover:text-white/90 border border-white/8 transition-all"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Reuse Idea
                  </button>
                  <button
                    onClick={() => {
                      const p = new URLSearchParams({ idea: selectedItem.idea, contentType: selectedItem.contentType, tone: selectedItem.tone, auto: "1" });
                      setLocation(`/generate?${p.toString()}`);
                      setSelectedItem(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300/80 hover:text-cyan-300 border border-cyan-500/20 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </button>
                </div>
              </SheetHeader>

              {[
                {
                  label: "Instagram",
                  icon: <SiInstagram className="w-4 h-4 text-pink-400" />,
                  content: [
                    { tag: "Hook", text: selectedItem.content.instagram?.hook },
                    { tag: "Caption", text: selectedItem.content.instagram?.caption },
                    { tag: "CTA", text: selectedItem.content.instagram?.cta },
                    { tag: "Hashtags", text: selectedItem.content.instagram?.hashtags },
                  ],
                },
                {
                  label: "YouTube Shorts",
                  icon: <SiYoutube className="w-4 h-4 text-red-400" />,
                  content: [
                    { tag: "Hook", text: selectedItem.content.youtube?.hook },
                    { tag: "Script", text: selectedItem.content.youtube?.script },
                  ],
                },
                {
                  label: "X / Twitter Thread",
                  icon: <Twitter className="w-4 h-4 text-white/60" />,
                  content: selectedItem.content.twitter?.tweets?.map((t: string, i: number) => ({
                    tag: `Tweet ${i + 1}`, text: t,
                  })) ?? [],
                },
                {
                  label: "LinkedIn",
                  icon: <Linkedin className="w-4 h-4 text-blue-400" />,
                  content: [
                    { tag: "Headline", text: selectedItem.content.linkedin?.headline },
                    { tag: "Post", text: selectedItem.content.linkedin?.post },
                    { tag: "CTA", text: selectedItem.content.linkedin?.cta },
                    { tag: "Hashtags", text: selectedItem.content.linkedin?.hashtags },
                  ],
                },
              ].map(({ label, icon, content }) => (
                <div key={label} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-sm font-semibold text-white/85">{label}</h3>
                  </div>
                  <div className="rounded-xl border border-white/6 p-4 space-y-3"
                    style={{ background: "rgba(255,255,255,0.02)" }}>
                    {content.filter((c: { tag: string; text?: string }) => c.text).map(({ tag, text }: { tag: string; text: string }) => (
                      <div key={tag} className="group/section space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{tag}</span>
                          <CopyBtn text={text} />
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!remixItem} onOpenChange={(open) => !open && setRemixItem(null)}>
        <SheetContent side="bottom" className="sm:max-w-md mx-auto sm:rounded-t-2xl border-t border-white/10 p-6" style={{ background: "rgba(8,4,22,0.98)", backdropFilter: "blur(32px)" }}>
          <SheetHeader className="mb-6">
            <SheetTitle className="text-white flex items-center gap-2">
              <Languages className="w-5 h-5 text-pink-400" />
              Remix into a new language
            </SheetTitle>
            <SheetDescription className="text-white/60">
              Select a language. We'll automatically rewrite this content to match the cultural nuances of the new audience.
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pb-6">
            {["English", "Hindi", "Hinglish", "Bengali", "Spanish", "French", "German", "Marathi", "Tamil", "Telugu"].map((lang) => (
              <button
                key={lang}
                onClick={() => performRemix(lang)}
                className="p-4 rounded-xl border border-white/10 hover:border-pink-500/40 bg-white/5 hover:bg-pink-500/10 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                {lang}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
