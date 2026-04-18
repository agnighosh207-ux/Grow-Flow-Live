import { useState } from "react";
import { useLocation } from "wouter";
import { PlanGate, useTrialAction } from "@/components/shared/PlanGate";
import { useImproveCompetitorContent } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Check, Swords, TrendingUp, Megaphone, DollarSign, Link2, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ImproveCompetitorContentResult } from "@workspace/api-client-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 p-2 rounded-lg transition-all duration-200
        ${copied
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70"
        }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ResultCard({
  title,
  icon: Icon,
  content,
  accentColor,
  delay,
}: {
  title: string;
  icon: any;
  content: string;
  accentColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-white/8 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)",
        backdropFilter: "blur(12px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accentColor}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-white/80">{title}</span>
        </div>
        <CopyButton text={content} />
      </div>
      <div className="px-5 py-4">
        <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );
}

function MonetizationList({ title, icon: Icon, items, accentColor }: { title: string; icon: any; items: string[]; accentColor: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accentColor}`}>
          <Icon className="w-3 h-3" />
        </div>
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 group">
            <span className="w-5 h-5 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-[10px] font-semibold text-white/30 shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-white/65 text-sm leading-relaxed flex-1">{item}</p>
            <button
              onClick={() => navigator.clipboard.writeText(item)}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/60 transition-all"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImproveCompetitorInner() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<ImproveCompetitorContentResult | null>(null);
  const { toast } = useToast();
  const { useOneTrial } = useTrialAction();
  const [, navigate] = useLocation();

  const improveMutation = useImproveCompetitorContent({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        useOneTrial();
      },
      onError: (err: any) => {
        if (err?.status === 402) {
          toast({ variant: "destructive", title: "Upgrade Required", description: "You've used your free tries. Unlock full power to continue." });
          navigate("/pricing");
        } else {
          toast({ variant: "destructive", title: "Failed to improve content. Please try again." });
        }
      },
    },
  });

  const handleSubmit = () => {
    if (content.trim().length < 50) {
      toast({ variant: "destructive", title: "Paste at least 50 characters of competitor content." });
      return;
    }
    improveMutation.mutate({ data: { competitorContent: content.trim() } });
  };

  const isLoading = improveMutation.isPending;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-1.5 flex items-center gap-3">
          <Swords className="w-7 h-7 text-purple-400" />
          Improve Competitor Content
        </h1>
        <p className="text-white/50 text-sm">Paste any competitor content and get a stronger version, a sharper hook, a fresh angle — plus specific ways to monetize it.</p>
      </div>

      <div
        className="rounded-2xl border border-white/8 p-5 md:p-6 space-y-4"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(255,255,255,0.02) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="space-y-1.5">
          <label className="text-white/70 text-sm font-medium">Competitor Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste a competitor's post, caption, tweet thread, LinkedIn article, or any content you want to outperform..."
            rows={8}
            className="w-full rounded-xl bg-black/20 border border-white/10 text-white placeholder:text-white/25 text-sm px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all leading-relaxed"
          />
          <p className="text-white/25 text-xs">{content.length} characters</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading || content.trim().length < 50}
          className="w-full sm:w-auto h-11 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-purple-900/40 rounded-xl px-8"
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...</>
            : <><Swords className="w-4 h-4 mr-2" /> Improve This Content</>
          }
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-white/3 border border-white/5 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
            <div className="h-64 rounded-2xl bg-white/2 border border-white/4 animate-pulse" style={{ animationDelay: "0.3s" }} />
          </motion.div>
        )}

        {!isLoading && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            <p className="text-white/30 text-xs font-medium uppercase tracking-wider">
              Output — 3 improvements + monetization strategy
            </p>

            <div className="space-y-4">
              <ResultCard
                title="Improved Version"
                icon={TrendingUp}
                content={result.improvedVersion}
                accentColor="bg-violet-500/15 text-violet-400"
                delay={0}
              />
              <ResultCard
                title="Stronger Hook"
                icon={Swords}
                content={result.strongerHook}
                accentColor="bg-orange-500/15 text-orange-400"
                delay={0.08}
              />
              <ResultCard
                title="Fresh Angle"
                icon={Lightbulb}
                content={result.newAngle}
                accentColor="bg-cyan-500/15 text-cyan-400"
                delay={0.16}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="rounded-2xl border border-emerald-500/15 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(5,150,105,0.03) 100%)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="px-5 py-4 border-b border-emerald-500/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/85">Monetization Suggestions</h3>
                  <p className="text-[11px] text-white/35">Specific ways to earn from this type of content</p>
                </div>
              </div>

              <div className="px-5 py-5 space-y-6">
                <MonetizationList
                  title="CTA Ideas"
                  icon={Megaphone}
                  items={result.monetization.ctaIdeas}
                  accentColor="bg-violet-500/15 text-violet-400"
                />
                <div className="border-t border-white/5 pt-5">
                  <MonetizationList
                    title="Affiliate Suggestions"
                    icon={Link2}
                    items={result.monetization.affiliateSuggestions}
                    accentColor="bg-blue-500/15 text-blue-400"
                  />
                </div>
                <div className="border-t border-white/5 pt-5">
                  <MonetizationList
                    title="How to Earn"
                    icon={DollarSign}
                    items={result.monetization.howToEarn}
                    accentColor="bg-emerald-500/15 text-emerald-400"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {!isLoading && !result && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mx-auto">
              <Swords className="w-7 h-7 text-purple-400/60" />
            </div>
            <div className="space-y-1">
              <p className="text-white/45 text-sm font-medium">Paste competitor content above</p>
              <p className="text-white/25 text-xs max-w-sm mx-auto">We'll rewrite it into something better, sharper, and more monetizable.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ImproveCompetitorContent() {
  return (
    <PlanGate
      requiredPlan="starter"
      featureName="Improve Competitor Content"
      toolKey="improve_competitor"
      freeTrials={3}
      description="Paste any competitor content and get a stronger rewrite, a better hook, a fresh angle, and actionable monetization ideas."
    >
      <ImproveCompetitorInner />
    </PlanGate>
  );
}
