import { useMemo } from "react";
import { motion } from "framer-motion";
import { Download, CalendarDays, PenTool, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ContentAnalysis {
  viralityScore: number;
  hookStrength: number;
  engagementPotential: number;
  shareability: number;
  emotionalTrigger: string;
  curiosityGap: string;
  targetAudienceReaction: string;
  improvementTip: string;
}

function ContentScoreBadge({ score, label, color, delay = 0 }: { score: number; label: string; color: string; delay?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</span>
        <span className={`text-xs font-black ${color.replace('bg-', 'text-')}`}>{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/[0.03]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.5, delay, ease: "circOut" }}
          className={`h-full rounded-full shadow-[0_0_12px_rgba(0,0,0,0.5)] ${color}`}
        />
      </div>
    </div>
  );
}

export function ViralScoreCard({ data, analysis, analysisLoading }: { data: any; analysis?: ContentAnalysis | null; analysisLoading?: boolean }) {
  const { toast } = useToast();
  const directViralScore = data?.content?.viral_score;

  const scores = useMemo(() => {
    const hookStrength = analysis?.hookStrength ?? data?.content?.hook_strength ?? 82;
    const engagementPotential = analysis?.engagementPotential ?? data?.content?.engagement_potential ?? 78;
    const shareability = analysis?.shareability ?? data?.content?.shareability ?? 74;
    const virality = analysis?.viralityScore ?? directViralScore ?? 80;

    return [
      { label: "Virality", score: virality, color: "bg-red-500" },
      { label: "Hook Strength", score: hookStrength, color: "bg-pink-500" },
      { label: "Engagement", score: engagementPotential, color: "bg-cyan-500" },
      { label: "Shareability", score: shareability, color: "bg-emerald-500" },
    ];
  }, [analysis, data, directViralScore]);

  const avg = useMemo(() => {
    return Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
  }, [scores]);

  const getExportItems = () => {
    if (!data) return [];
    const items = [];
    if (data.instagram) items.push({ platform: "Instagram", content: data.instagram.caption, idea: data.idea });
    if (data.linkedin) items.push({ platform: "LinkedIn", content: data.linkedin.post, idea: data.idea });
    if (data.twitter && data.twitter.tweets) items.push({ platform: "Twitter", content: data.twitter.tweets.join("\n\n"), idea: data.idea });
    if (data.youtube) items.push({ platform: "YouTube", content: data.youtube.script, idea: data.idea });
    return items;
  };

  const handleExportBuffer = () => {
    const items = getExportItems();
    const headers = ["Schedule Date", "Platform", "Content", "Status"];
    const rows = items.map((item, idx) => {
      const d = new Date(); d.setDate(d.getDate() + idx);
      return [`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`, item.platform, `"${item.content.replace(/"/g, '""')}"`, "draft"].join(",");
    });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "growflow-buffer.csv"; a.click();
    toast({ title: "Buffer CSV Ready", description: "Import this file into your Buffer dashboard." });
  };

  const handleExportGCal = () => {
    const items = getExportItems();
    const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, "");
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", ...items.map((item, idx) => {
      const d = new Date(); d.setDate(d.getDate() + idx);
      return `BEGIN:VEVENT\nDTSTART:${formatDate(d)}\nSUMMARY:Post on ${item.platform}\nDESCRIPTION:${item.content.replace(/\n/g, "\\n")}\nEND:VEVENT`;
    }), "END:VCALENDAR"].join("\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "growflow-schedule.ics"; a.click();
    toast({ title: "Calendar Exported", description: "Import the .ics file to Google Calendar." });
  };

  const handleCopyNotion = () => {
    const items = getExportItems();
    const tsv = ["Platform\tContent\tStatus", ...items.map(item => `${item.platform}\t${item.content.replace(/\n/g, " ")}\tDraft`)].join("\n");
    navigator.clipboard.writeText(tsv);
    toast({ title: "Copied for Notion", description: "Paste this into any Notion database." });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Viral Potential Analytics</h4>
        
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <Button variant="ghost" size="sm" onClick={handleExportBuffer} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            <Download className="w-3 h-3 mr-2" /> Buffer CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportGCal} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
            <CalendarDays className="w-3 h-3 mr-2" /> GCal (.ics)
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyNotion} className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">
             <PenTool className="w-3 h-3 mr-2" /> Notion Table
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {scores.map((s, i) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3"
          >
             <ContentScoreBadge score={s.score} label={s.label} color={s.color} delay={0.2 + (i * 0.1)} />
          </motion.div>
        ))}
      </div>

      {avg < 80 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/5"
        >
          <p className="text-[10px] text-white/50 font-black uppercase tracking-widest flex items-center gap-2">
            <Lightbulb className="w-3 h-3 text-amber-400" /> Strategy to increase your score:
          </p>
          <ul className="text-xs text-white/40 mt-2 space-y-1.5 font-medium">
            {avg < 60 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-amber-500" /> Add a stronger visceral hook in the first 5 words</li>}
            {avg < 75 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-cyan-500" /> Include a high-friction Call to Action (e.g. "Save this")</li>}
            {avg < 85 && <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-violet-500" /> Use more emotional, low-entropy language</li>}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
