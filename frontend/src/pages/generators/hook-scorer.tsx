import { useState } from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { Target, Loader2, TrendingUp, AlertCircle, CheckCircle2, Copy, Sparkles } from "lucide-react";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { PageHeader } from "@/components/shared/PageHeader";

export default function HookScorerPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: sub } = useSubscriptionStatus();
  const [hook, setHook] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScore = async () => {
    if (!hook.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/hook-scorer/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hook: hook.trim(), platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setResult(data);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const scoreBg = (score: number) =>
    score >= 80 ? "bg-emerald-500/10 border-emerald-500/20" : score >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  return (
    <PageWrapper maxWidth="lg">
      <PageHeader 
        icon={<Target />} 
        title="Hook Scorer" 
        subtitle="Score your hook before posting — know if it'll stop the scroll"
      />
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Input */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
          <textarea
            value={hook}
            onChange={e => setHook(e.target.value)}
            placeholder="Paste your hook here... e.g. 'I quit my 9-5 after discovering this one thing'"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-cyan-500/40 resize-none min-h-[80px]"
            maxLength={300}
          />
          <div className="flex items-center gap-3">
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/40"
            >
              {["Instagram","YouTube","Twitter","LinkedIn","TikTok"].map(p => (
                <option key={p} value={p} className="bg-zinc-900">{p}</option>
              ))}
            </select>
            <button
              onClick={handleScore}
              disabled={loading || !hook.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold px-6 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Score It
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Overall Score */}
            <div className={`rounded-2xl border p-5 text-center ${scoreBg(result.overallScore)}`}>
              <div className={`text-6xl font-black ${scoreColor(result.overallScore)}`}>{result.overallScore}</div>
              <div className="text-white/50 text-sm mt-1">/ 100</div>
              <div className={`text-sm font-bold mt-2 ${scoreColor(result.overallScore)}`}>{result.verdict}</div>
            </div>

            {/* Score Breakdown */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <h3 className="text-xs font-black text-white/40 uppercase tracking-widest mb-3">Score Breakdown</h3>
              <div className="space-y-2">
                {Object.entries(result.scores || {}).map(([key, val]: any) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-24 capitalize">{key}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val >= 80 ? 'bg-emerald-500' : val >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${val}%`, transition: 'width 0.6s ease' }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-8 text-right ${scoreColor(val)}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Strengths</h3>
                <ul className="space-y-1.5">
                  {(result.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">•</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Improve</h3>
                <ul className="space-y-1.5">
                  {(result.improvements || []).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">•</span>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Improved Version */}
            {result.improvedVersion && (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest">AI-Improved Version</h3>
                  <button onClick={() => { navigator.clipboard.writeText(result.improvedVersion); toast({ title: "Copied!" }); }}
                    className="text-xs text-white/30 hover:text-cyan-400 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <p className="text-sm text-white/80 leading-relaxed">{result.improvedVersion}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="rounded-2xl border border-dashed border-white/8 p-10 text-center">
            <Target className="w-8 h-8 text-white/15 mx-auto mb-3" />
            <p className="text-white/25 text-sm">Paste your hook above and score it</p>
            <p className="text-white/15 text-xs mt-1">Works for Instagram, YouTube, LinkedIn & more</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
