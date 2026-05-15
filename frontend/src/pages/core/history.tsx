import { useState, useEffect, useCallback } from "react";
import {
  useGetContentStats,
  getGetContentStatsQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Copy, Check, Zap, TrendingUp, Calendar,
  Target, MessageSquare, BarChart2, Loader2, Trash2, Clock, AlertCircle,
  Lightbulb, Map, FileText, AtSign, PenTool, Type, Package, History as HistoryIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { PageSkeleton, EmptyState } from "@/components/shared/Skeleton";

const TABS = [
  { key: "all", label: "All", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { key: "Educational", label: "Content", icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "Trends", label: "Trends", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: "Ideas", label: "Ideas", icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { key: "Strategy", label: "Strategy", icon: <Map className="w-3.5 h-3.5" /> },
  { key: "Pack", label: "Pack", icon: <Package className="w-3.5 h-3.5" /> },
  { key: "Bio", label: "Bio", icon: <AtSign className="w-3.5 h-3.5" /> },
  { key: "Hooks", label: "Hooks", icon: <PenTool className="w-3.5 h-3.5" /> },
  { key: "Caption", label: "Caption", icon: <Type className="w-3.5 h-3.5" /> },
];

const TYPE_COLORS: Record<string, string> = {
  Educational: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Story: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Viral: "bg-red-500/10 text-red-400 border-red-500/20",
  Trends: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Ideas: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Strategy: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Pack: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  Bio: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  Hooks: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
  Caption: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(typeof text === "string" ? text : JSON.stringify(text, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${copied ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-white/40 hover:text-white/70 border border-white/8 hover:bg-white/8"}`}
    >
      {copied ? <><Check className="w-2.5 h-2.5" />Copied</> : <><Copy className="w-2.5 h-2.5" />Copy</>}
    </button>
  );
}



function DetailView({ item, onClose }: { item: any; onClose: () => void }) {
  const content = item.content;
  const type = item.contentType;

  const renderSection = (title: string, data: any) => {
    if (!data) return null;
    if (typeof data === "string") {
      return (
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{title}</span>
          <p className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">{data}</p>
          <CopyBtn text={data} />
        </div>
      );
    }
    if (Array.isArray(data)) {
      return (
        <div className="space-y-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">{title}</span>
          {data.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[10px] text-white/20 mt-0.5 shrink-0">{i + 1}.</span>
              <p className="text-xs text-white/70 leading-relaxed">{typeof item === "string" ? item : JSON.stringify(item)}</p>
            </div>
          ))}
          <CopyBtn text={data.join("\n")} />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-5">
      <SheetHeader className="space-y-2 pb-4 border-b border-white/6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${TYPE_COLORS[type] ?? "bg-white/5 text-white/50 border-white/10"}`}>{type}</span>
          <span className="text-[10px] text-white/30 ml-auto flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(item.createdAt), "PPp")}</span>
        </div>
        <SheetTitle className="text-white text-lg leading-snug">"{item.idea}"</SheetTitle>
      </SheetHeader>

      <div className="rounded-xl border border-white/6 p-4 space-y-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        {/* Content/Generate type */}
        {(type === "Educational" || type === "Story" || type === "Viral") && (
          <>
            {content?.instagram && renderSection("Instagram Caption", content.instagram.caption)}
            {content?.instagram?.hook && renderSection("Instagram Hook", content.instagram.hook)}
            {content?.youtube?.script && renderSection("YouTube Script", content.youtube.script)}
            {content?.twitter?.tweets && renderSection("Twitter Thread", content.twitter.tweets)}
            {content?.linkedin?.post && renderSection("LinkedIn Post", content.linkedin.post)}
          </>
        )}
        {/* Trends */}
        {type === "Trends" && content?.trends && renderSection("Trending Topics", content.trends.map((t: any) => `${t.title} — ${t.hook} (Score: ${t.trendScore})`))}
        {/* Ideas */}
        {type === "Ideas" && content?.ideas && renderSection("Content Ideas", content.ideas.map((i: any) => `${i.idea} — ${i.hook}`))}
        {/* Strategy */}
        {type === "Strategy" && content?.plan && renderSection("Strategy Plan", content.plan.map((d: any) => `Day ${d.day}: [${d.platform}] ${d.topic} — ${d.hook}`))}
        {/* Pack */}
        {type === "Pack" && (
          <>
            {content?.instagram?.caption && renderSection("Instagram", content.instagram.caption)}
            {content?.twitter?.thread && renderSection("Twitter Thread", content.twitter.thread)}
            {content?.linkedin?.post && renderSection("LinkedIn", content.linkedin.post)}
            {content?.reel?.script && renderSection("Reel Script", content.reel.script)}
          </>
        )}
        {/* Bio */}
        {type === "Bio" && content?.variations && renderSection("Bio Variations", content.variations.map((v: any) => `${v.label}: ${v.bio}`))}
        {/* Hooks */}
        {type === "Hooks" && content?.hooks && renderSection("Generated Hooks", content.hooks)}
        {/* Caption */}
        {type === "Caption" && (
          <>
            {content?.fullRewrite?.caption && renderSection("Full Rewrite", content.fullRewrite.caption)}
            {content?.microEdit?.caption && renderSection("Micro Edit", content.microEdit.caption)}
            {content?.diagnosis?.mainIssue && renderSection("Diagnosis", content.diagnosis.mainIssue)}
          </>
        )}
        {/* Fallback for unknown types */}
        {!["Educational","Story","Viral","Trends","Ideas","Strategy","Pack","Bio","Hooks","Caption"].includes(type) && (
          <pre className="text-xs text-white/50 whitespace-pre-wrap overflow-auto max-h-96">{JSON.stringify(content, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

import { haptic } from "@/lib/utils";

export default function History() {
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Pull to refresh logic
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: stats, isLoading: statsLoading } = useGetContentStats({
    query: { queryKey: getGetContentStatsQueryKey(), staleTime: 120_000 },
  });

  const fetchHistory = useCallback(async (category: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      // Map tab keys to backend contentType values
      if (category === "Educational") {
        // "Content" tab should show Educational, Story, Viral
        // We fetch all and filter client-side for this tab
        params.set("category", "all");
      } else if (category !== "all") {
        params.set("category", category);
      }
      const res = await fetch(`/api/content/history?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      let fetched = data.items || [];
      // Client-side filter for "Content" tab
      if (category === "Educational") {
        fetched = fetched.filter((i: any) => ["Educational", "Story", "Viral"].includes(i.contentType));
      }
      setItems(fetched);
    } catch { setItems([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchHistory(activeTab); }, [activeTab, fetchHistory]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/content/history/${id}`, { method: "DELETE", credentials: "include" });
      toast({ title: "Deleted" });
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch { toast({ variant: "destructive", title: "Failed to delete" }); }
    setDeletingId(null);
  };

  const STAT_CARDS = [
    { label: "Lifetime Total", value: stats?.totalGenerations ?? 0, sub: "all-time generations (never resets)", icon: <BarChart2 className="w-5 h-5" />, iconBg: "bg-cyan-500/15", iconColor: "text-cyan-400", accent: "from-cyan-500/10" },
    { label: "This Week", value: stats?.thisWeek ?? 0, sub: "new generations", icon: <TrendingUp className="w-5 h-5" />, iconBg: "bg-pink-500/15", iconColor: "text-pink-400", accent: "from-pink-500/8" },
    { label: "Top Style", value: stats?.topContentType ?? "—", sub: "most used format", icon: <Target className="w-5 h-5" />, iconBg: "bg-emerald-500/15", iconColor: "text-emerald-400", accent: "from-emerald-500/8" },
    { label: "Top Tone", value: stats?.topTone ?? "—", sub: "most used tone", icon: <MessageSquare className="w-5 h-5" />, iconBg: "bg-blue-500/15", iconColor: "text-blue-400", accent: "from-blue-500/8" },
  ];

  return (
    <div 
      className="space-y-6 pb-16 min-h-screen"
      onTouchStart={(e) => {
        if (window.scrollY === 0) setPullY(e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        if (pullY > 0) {
          const y = e.touches[0].clientY;
          if (y > pullY + 80 && !isRefreshing) {
            setIsRefreshing(true);
            haptic('heavy');
            fetchHistory(activeTab).then(() => {
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
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-1.5">History</h1>
        <p className="text-white/50 text-sm md:text-base">All your AI generations across every feature — stored for 15 days.</p>
      </div>

      {/* 15-day Retention Notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/15 bg-amber-500/5">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-amber-300/90 font-medium">15-Day Retention Policy</p>
          <p className="text-[11px] text-amber-300/50 mt-0.5">Generation history is automatically cleared after 15 days to keep things fast. Your <span className="text-amber-300/80 font-semibold">Lifetime Total counter never resets</span> — it tracks every generation you've ever made.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))
          : STAT_CARDS.map((card) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: STAT_CARDS.indexOf(card) * 0.04 }}
              className={`rounded-2xl border border-white/6 p-4 bg-gradient-to-br ${card.accent} to-transparent`} style={{ background: "rgba(255,255,255,0.025)" }}
            >
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-3`}>{card.icon}</div>
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mb-0.5">{card.label}</p>
              <p className="text-xl font-bold text-white leading-tight">{card.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{card.sub}</p>
            </motion.div>
          ))
        }
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
              activeTab === tab.key
                ? "bg-white/10 text-white border-white/15 shadow-lg shadow-white/5"
                : "bg-white/3 text-white/40 border-white/6 hover:bg-white/6 hover:text-white/60"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <PageSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No history yet"
          description="Your generated content will appear here. Generate something to get started."
          action={() => setLocation("/generate")}
          actionLabel="Generate your first content →"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {items.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: Math.min(idx * 0.03, 0.2), duration: 0.2 }}
                onClick={() => setSelectedItem(item)}
                className="group rounded-2xl border border-white/6 p-5 cursor-pointer hover:border-white/12 transition-all duration-500 relative flex flex-col"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                {/* Delete button */}
                <div className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => handleDelete(item.id, e)} disabled={deletingId === item.id}
                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 flex items-center justify-center transition-colors">
                    {deletingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_COLORS[item.contentType] ?? "bg-white/5 text-white/50 border-white/10"}`}>
                    {item.contentType}
                  </span>
                  {item.tone && item.tone !== "AI Search" && item.tone !== "Enhancement" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-white/5 text-white/40 border-white/8">
                      {item.tone}
                    </span>
                  )}
                </div>

                {/* Idea/Title */}
                <p className="text-white/85 text-sm font-medium mb-4 line-clamp-2 leading-relaxed flex-1">
                  "{item.idea}"
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-[10px] text-white/30 border-t border-white/6 pt-3 mt-auto">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(item.createdAt), "h:mm a")}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto border-l border-white/6 p-0"
          style={{ background: "rgba(8,4,22,0.97)", backdropFilter: "blur(32px)" }}>
          {selectedItem && <DetailView item={selectedItem} onClose={() => setSelectedItem(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
