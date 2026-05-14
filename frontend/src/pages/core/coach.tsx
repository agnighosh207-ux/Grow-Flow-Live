import React, { useState, useEffect } from "react";
import { Brain, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { PageWrapper } from "@/components/shared/PageWrapper";

import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

interface CoachReport {
  weeklyScore: number;
  topStrength: string;
  biggestGap: string;
  weeklyTasks: { task: string; why: string; platform: string; timeRequired: string }[];
  contentPatterns: { pattern: string; observation: string }[];
  nextWeekFocus: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function ContentCoachPage() {
  const [report, setReport] = useState<CoachReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const { toast } = useToast();

  const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");

  useEffect(() => {
    localStorage.setItem("preferred_language", language);
  }, [language]);

  const { data: sub } = useSubscriptionStatus();
  const isFreeUser = !sub?.planType || sub.planType === "free";

  useEffect(() => {
    const saved = localStorage.getItem("coach_completed_tasks");
    if (saved) setCompletedTasks(JSON.parse(saved));
    
    // Fetch initial report
    fetchReport();
  }, []);

  const fetchReport = async (refresh = false) => {
    setLoading(true);
    try {
      const { data } = await api.post("/coach/analyze", { refresh, language });
      setReport(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || "We couldn't generate your report right now. Please try again later.";
      toast({
        variant: "destructive",
        title: "Coach unavailable",
        description: msg
      });
    } finally {
      setLoading(false);
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
    return "text-emerald-500";
  };

  const getScoreBg = (score: number) => {
    if (score < 50) return "bg-red-500/10 border-red-500/20";
    if (score < 75) return "bg-amber-500/10 border-amber-500/20";
    return "bg-emerald-500/10 border-emerald-500/20";
  };

  return (
    <PageWrapper maxWidth="md" className="py-10">
      <FeatureGuideBanner 
        toolKey="coach" 
        title="AI Content Coach" 
        icon={<Brain className="w-5 h-5 text-indigo-500" />}
        tagline="Get a personalized weekly audit of your content and a step-by-step growth action plan."
        whatYouGet={["Weekly performance score", "Top strengths & gaps", "3 specific tasks for next week"]}
        whenToUse="Use this every Monday to review your previous week's performance and set your goals."
        proTip="The coach analyzes your actual generation history to find patterns you might have missed yourself."
        planRequired="Infinity"
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-10 w-10 text-indigo-500" />
            AI Content Coach
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalized weekly growth analysis and action plan.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="w-full sm:w-48">
            <LanguageSelector 
              value={language} 
              onChange={setLanguage} 
              isFreeUser={isFreeUser}
            />
          </div>
          <Button 
            onClick={() => fetchReport(true)} 
            disabled={loading}
            variant="outline"
            className="group w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Refresh Report
          </Button>
          <span className="text-xs text-muted-foreground">Report refreshes every 24 hours</span>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && report && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Score & Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center ${getScoreBg(report.weeklyScore)}`}>
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/10"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={364.4}
                    strokeDashoffset={364.4 - (364.4 * report.weeklyScore) / 100}
                    className={`${getScoreColor(report.weeklyScore)} transition-all duration-1000 ease-out`}
                  />
                </svg>
                <span className={`absolute text-4xl font-black ${getScoreColor(report.weeklyScore)}`}>
                  {report.weeklyScore}
                </span>
              </div>
              <h3 className="mt-4 font-bold text-xl">Weekly Score</h3>
              <p className="text-sm text-muted-foreground mt-1">Based on consistency & quality</p>
            </motion.div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants}>
                <Card className="h-full border-emerald-500/20 bg-emerald-500/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5" />
                      Your Biggest Strength
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium">{report.topStrength}</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="h-full border-amber-500/20 bg-amber-500/[0.02]">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="h-5 w-5" />
                      Your Biggest Gap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-medium">{report.biggestGap}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Action Plan */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              This Week's Action Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {report.weeklyTasks.map((task, idx) => (
                <motion.div 
                  key={idx} 
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  onClick={() => toggleTask(task.task)}
                  className={`cursor-pointer group p-6 rounded-2xl border transition-all duration-300 ${completedTasks.includes(task.task) ? 'bg-muted/50 border-muted grayscale opacity-60' : 'bg-card hover:shadow-xl hover:border-indigo-500/50'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="bg-indigo-500/5 text-indigo-500 border-indigo-500/20">
                      {task.platform}
                    </Badge>
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${completedTasks.includes(task.task) ? 'bg-indigo-500 border-indigo-500' : 'border-muted-foreground/30'}`}>
                      {completedTasks.includes(task.task) && <CheckCircle2 className="h-4 w-4 text-white" />}
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-2 ${completedTasks.includes(task.task) ? 'line-through' : ''}`}>{task.task}</h3>
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
              <div className="space-y-3">
                {report.contentPatterns.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-card flex gap-4">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <div>
                      <h4 className="font-bold">{p.pattern}</h4>
                      <p className="text-sm text-muted-foreground">{p.observation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-2xl font-bold">Next Week Focus</h2>
              <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white relative overflow-hidden group">
                <Brain className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform duration-700" />
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ArrowRight className="h-6 w-6" />
                  Your Main Objective
                </h3>
                <p className="text-lg leading-relaxed font-medium">
                  "{report.nextWeekFocus}"
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {!loading && !report && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <Brain className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold">No Analysis Yet</h2>
          <p className="text-muted-foreground max-w-md">
            Click the button below to have our AI analyze your recent generations and build your growth strategy.
          </p>
          <Button onClick={() => fetchReport()} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
            Generate My Weekly Report
          </Button>
        </div>
      )}
    </PageWrapper>
  );
}
