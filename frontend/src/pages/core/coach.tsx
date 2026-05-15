import React, { useState, useEffect, useRef } from "react";
import { Brain, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Zap, Send, MessageCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { useAuth } from "@clerk/react";

interface CoachReport {
  weeklyScore: number;
  topStrength: string;
  biggestGap: string;
  weeklyTasks: { task: string; why: string; platform: string; timeRequired: string }[];
  contentPatterns: { pattern: string; observation: string }[];
  nextWeekFocus: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "How do I grow faster?",
  "What should I post this week?",
  "Why am I not getting views?",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function ContentCoachPage() {
  const [report, setReport] = useState<CoachReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");
  useEffect(() => { localStorage.setItem("preferred_language", language); }, [language]);

  const { data: sub } = useSubscriptionStatus();
  const isFreeUser = !sub?.planType || sub.planType === "free";

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
   const [activeView, setActiveView] = useState<"report" | "chat">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("coach_completed_tasks");
    if (saved) setCompletedTasks(JSON.parse(saved));
    fetchReport();
  }, []);

  const fetchReport = async (refresh = false) => {
    setLoading(true);
    try {
      const { data } = await api.post("/coach/analyze", { refresh, language });
      setReport(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || "We couldn't generate your report right now. Please try again later.";
      toast({ variant: "destructive", title: "Coach unavailable", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || chatLoading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const token = await getToken();
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history: messages.slice(-10) }),
      });
      const data = await res.json();
      const reply = data.reply || data.message || "Sorry, I couldn't respond right now. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const toggleTask = (task: string) => {
    const newTasks = completedTasks.includes(task)
      ? completedTasks.filter(t => t !== task)
      : [...completedTasks, task];
    setCompletedTasks(newTasks);
    localStorage.setItem("coach_completed_tasks", JSON.stringify(newTasks));
  };

  const getScoreColor = (score: number) => {
    if (score < 50) return "text-red-500";
    if (score < 75) return "text-amber-500";
    return "text-violet-500";
  };

  const getScoreBg = (score: number) => {
    if (score < 50) return "bg-red-500/10 border-red-500/20";
    if (score < 75) return "bg-amber-500/10 border-amber-500/20";
    return "bg-violet-500/10 border-violet-500/20";
  };

  const [showGuide, setShowGuide] = useState(false);

  return (
    <PageWrapper maxWidth="md" className="py-6 md:py-10 px-4 md:px-0 space-y-8 md:space-y-12">
      <FeatureGuideBanner
        toolKey="coach"
        title="AI Content Coach"
        icon={<Brain className="w-5 h-5 text-violet-500" />}
        tagline="Get a personalized weekly audit of your content and a step-by-step growth action plan."
        whatYouGet={["Weekly performance score", "Top strengths & gaps", "3 specific tasks for next week"]}
        whenToUse="Use this every Monday to review your previous week's performance and set your goals."
        proTip="The coach analyzes your actual generation history to find patterns you might have missed yourself."
        planRequired="Infinity"
        forceOpen={showGuide}
      />

       <div className="flex bg-white/5 rounded-2xl p-1 mb-8 border border-white/5">
        <button 
          onClick={() => setActiveView("chat")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeView === "chat" ? "bg-white/10 text-white shadow-xl shadow-white/5" : "text-white/30 hover:text-white/60"
          }`}
        >
          <MessageCircle className="w-4 h-4" /> Chat
        </button>
        <button 
          onClick={() => setActiveView("report")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeView === "report" ? "bg-white/10 text-white shadow-xl shadow-white/5" : "text-white/30 hover:text-white/60"
          }`}
        >
          <Zap className="w-4 h-4" /> My Report
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader 
          icon={<Brain />} 
          iconBg="bg-violet-500/10" 
          iconColor="text-violet-500" 
          title="AI Content Coach" 
          subtitle="Personalized weekly growth analysis and action plan"
          badge="Infinity"
          onInfoClick={() => setShowGuide(prev => !prev)}
        />
        <div className="flex flex-col items-end gap-3">
          <div className="w-full sm:w-48">
            <LanguageSelector value={language} onChange={setLanguage} isFreeUser={isFreeUser} />
          </div>
          <Button onClick={() => fetchReport(true)} disabled={loading} variant="outline" className="group w-full sm:w-auto">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
            Refresh Report
          </Button>
          <span className="text-xs text-muted-foreground">Report refreshes every 24 hours</span>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && report && activeView === "report" && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          {/* Score & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center ${getScoreBg(report.weeklyScore)}`}>
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/10" />
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray={364.4}
                    strokeDashoffset={364.4 - (364.4 * report.weeklyScore) / 100}
                    className={`${getScoreColor(report.weeklyScore)} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <span className={`absolute text-4xl font-black ${getScoreColor(report.weeklyScore)}`}>{report.weeklyScore}</span>
              </div>
              <h3 className="mt-4 font-bold text-xl">Weekly Score</h3>
              <p className="text-sm text-muted-foreground mt-1">Based on consistency & quality</p>
            </motion.div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <Card className="h-full border-violet-500/20 bg-violet-500/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-violet-500">
                      <CheckCircle2 className="h-5 w-5" /> Your Biggest Strength
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-lg font-medium">{report.topStrength}</p></CardContent>
                </Card>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Card className="h-full border-amber-500/20 bg-amber-500/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="h-5 w-5" /> Your Biggest Gap
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-lg font-medium">{report.biggestGap}</p></CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Action Plan */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" /> This Week's Action Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {report.weeklyTasks.map((task, idx) => (
                <motion.div
                  key={`task-${idx}-${task.task.slice(0, 10)}`} 
                  variants={itemVariants} 
                  whileHover={{ y: -5 }}
                  onClick={() => toggleTask(task.task)}
                  className={`cursor-pointer group p-6 rounded-2xl border transition-all duration-300 ${completedTasks.includes(task.task) ? "bg-muted/50 border-muted grayscale opacity-60" : "bg-card hover:shadow-xl hover:border-violet-500/50"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="bg-violet-500/5 text-violet-500 border-violet-500/20">{task.platform}</Badge>
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${completedTasks.includes(task.task) ? "bg-violet-500 border-violet-500" : "border-muted-foreground/30"}`}>
                      {completedTasks.includes(task.task) && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${completedTasks.includes(task.task) ? "line-through" : ""}`}>{task.task}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{task.why}</p>
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="px-2 py-1 rounded-md bg-muted">⏳ {task.timeRequired}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Patterns & Focus */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-2xl font-bold">Content Patterns</h2>
              <div className="p-8 rounded-[2.5rem] bg-violet-500/5 border border-violet-500/10 relative group shadow-inner">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                  <Sparkles className="h-16 w-16 text-violet-400" />
                </div>
                <span className="text-[10px] font-black uppercase text-violet-400 block mb-3 tracking-[0.3em]">Master Outclass Hook</span>
                {report.contentPatterns.map((p, i) => (
                  <div key={`pattern-${i}-${p.pattern.slice(0, 10)}`} className="mb-4 last:mb-0">
                    <h4 className="font-bold text-sm text-violet-900">{p.pattern}</h4>
                    <p className="text-sm text-muted-foreground">{p.observation}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-2xl font-bold">Next Week Focus</h2>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-violet-600 to-violet-900 text-white relative overflow-hidden group">
                <Brain className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ArrowRight className="h-6 w-6" /> Your Main Objective
                </h3>
                <p className="text-lg leading-relaxed font-medium">{report.nextWeekFocus}</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {!loading && !report && activeView === "report" && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
            <Brain className="h-10 w-10 text-violet-500" />
          </div>
          <h2 className="text-2xl font-bold">No Analysis Yet</h2>
          <p className="text-muted-foreground max-w-md">
            Click the button below to have our AI analyze your recent generations and build your growth strategy.
          </p>
          <Button onClick={() => fetchReport()} size="lg" className="bg-violet-600 hover:bg-violet-700">
            Generate My Weekly Report
          </Button>
        </div>
      )}

      {/* ── Chat Interface ─────────────────────────────────────────────────── */}
      {activeView === "chat" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-violet-400" /> Ask Your Coach
          </h2>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            {/* Messages area */}
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-white/25 text-sm">Ask your AI coach anything about growing your content</p>
                  <p className="text-[10px] text-white/10 mt-1 italic uppercase tracking-widest font-black">Your conversation resets when you leave this page.</p>
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {messages.map((m, i) => (
              <div key={`msg-${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-violet-500/20 text-white border border-violet-500/30" : "bg-white/5 text-white/80 border border-white/10"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div className="border-t border-white/5 p-3 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask your coach..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              className="bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
           </div>
          </div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
