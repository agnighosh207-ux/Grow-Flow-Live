import React, { useState, useEffect } from "react";
import { Search, Sparkles, TrendingUp, TrendingDown, Target, Brain, Copy, RefreshCw, Layers, Plus, Trash2, ArrowRight, ShieldAlert, Zap, Quote, ChevronRight, BarChart3, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { useLocation } from "wouter";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function CompetitorIntelPage() {
  const [activeTab, setActiveTab] = useState("single");
  const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");

  useEffect(() => {
    localStorage.setItem("preferred_language", language);
  }, [language]);

  const { data: sub } = useSubscriptionStatus();
  const isFreeUser = !sub?.planType || sub.planType === "free";

  const [content, setContent] = useState("");
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [goal, setGoal] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Batch states
  const [batchItems, setBatchItems] = useState([{ content: "", label: "Competitor 1" }]);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const analyzeCompetitor = async () => {
    if (!content || content.length < 100) {
      toast({ variant: "destructive", title: "Content too short", description: "Paste at least 100 characters for a deep analysis." });
      return;
    }
    setAnalyzing(true);
    try {
      const { data } = await api.post("/improve-competitor/analyze", {
        competitorContent: content,
        yourNiche: niche,
        platform,
        yourGoal: goal,
        language
      });
      setResult(data);
      // --- P-3 FIX: Invalidate cache to sync credit counter ---
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Analysis failed", description: err.response?.data?.message || "Something went wrong." });
    } finally {
      setAnalyzing(false);
    }
  };

  const addBatchItem = () => {
    if (batchItems.length >= 3) return;
    setBatchItems([...batchItems, { content: "", label: `Competitor ${batchItems.length + 1}` }]);
  };

  const removeBatchItem = (index: number) => {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  };

  const updateBatchItem = (index: number, key: string, value: string) => {
    const newItems = [...batchItems];
    (newItems[index] as any)[key] = value;
    setBatchItems(newItems);
  };

  const analyzeBatch = async () => {
    const validItems = batchItems.filter(i => i.content.length > 50);
    if (validItems.length < 2) {
      toast({ variant: "destructive", title: "Add more items", description: "Compare at least 2 competitors for meaningful insights." });
      return;
    }
    setBatchAnalyzing(true);
    try {
      const { data } = await api.post("/improve-competitor/batch", {
        items: validItems, niche, platform, language
      });
      setBatchResults(data);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Batch analysis failed", description: err.response?.data?.message || "Check your plan tier." });
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="pb-24 relative overflow-x-hidden min-h-screen">
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12 space-y-12">
        {/* Elite Header */}
        <div className="text-center space-y-10">
           <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-center gap-3 mb-2">
                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <Target className="w-6 h-6 text-white" />
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Competitor Intelligence</h1>
              </div>
              <p className="text-white/40 font-medium max-w-lg mx-auto italic">Analyze and outperform any content creator by decoding their psychological architecture.</p>
           </motion.div>

           {/* Mode Selection Tabs */}
           <div className="flex justify-center">
            <div className="bg-white/5 p-1.5 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-2xl">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent h-12 md:h-14 whitespace-nowrap">
                  <TabsTrigger value="single" className="rounded-xl md:rounded-[1.5rem] px-8 md:px-12 h-9 md:h-11 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all data-[state=active]:bg-red-500 data-[state=active]:text-white">
                    Single Scan
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="rounded-xl md:rounded-[1.5rem] px-8 md:px-12 h-9 md:h-11 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all data-[state=active]:bg-red-500 data-[state=active]:text-white">
                    Batch War Room
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
           </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "single" ? (
            <motion.div
              key="single"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {/* Main Input Engine */}
              <div className="max-w-4xl mx-auto">
                <motion.div 
                  className="p-1.5 rounded-[48px] bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/10 shadow-2xl relative"
                >
                  <div className="bg-[#0c0d12]/90 backdrop-blur-3xl rounded-[44px] p-8 md:p-12 space-y-10">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 border border-red-400/30 shadow-lg shadow-red-600/20">
                       <Zap className="w-3.5 h-3.5 text-white" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest">Infiltration Active</span>
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                           <label className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Target Intelligence Stream</label>
                           <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] px-3 py-1 text-emerald-500/50">{content.length} chars</Badge>
                        </div>
                        <Textarea 
                          placeholder="Paste the competitor's caption, script, or post here for deep-dive structural analysis..."
                          className="min-h-[150px] md:min-h-[220px] p-6 md:p-8 rounded-[32px] bg-black/40 border-white/5 focus:border-red-500/40 text-base md:text-xl font-medium text-white placeholder:text-white/10 resize-none transition-all shadow-inner leading-relaxed"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Theater of War</label>
                          <Select value={platform} onValueChange={setPlatform}>
                            <SelectTrigger className="h-14 rounded-2xl bg-white/[0.03] border-white/10 text-white/80 font-bold hover:bg-white/[0.06] transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-panel-premium border-white/10">
                              <SelectItem value="Instagram">Instagram</SelectItem>
                              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                              <SelectItem value="Twitter">Twitter (X)</SelectItem>
                              <SelectItem value="YouTube">YouTube</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Target Language</label>
                            <LanguageSelector 
                              value={language} 
                              onChange={setLanguage} 
                              isFreeUser={isFreeUser}
                            />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Your Contextual Domain</label>
                          <Input 
                            placeholder="e.g. SaaS Growth" 
                            value={niche} 
                            onChange={(e) => setNiche(e.target.value)}
                            className="h-14 rounded-2xl bg-white/[0.03] border-white/10 text-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Strategic Objective</label>
                        <Input 
                          placeholder="What specific outcome do you want to beat them at?" 
                          value={goal} 
                          onChange={(e) => setGoal(e.target.value)}
                          className="h-14 rounded-2xl bg-white/[0.03] border-white/10 text-white font-bold"
                        />
                      </div>

                      <Button 
                        className="w-full h-16 md:h-20 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xl md:text-2xl font-black rounded-3xl shadow-2xl shadow-red-600/30 group transition-all"
                        onClick={analyzeCompetitor}
                        disabled={analyzing || !content}
                      >
                        {analyzing ? (
                          <div className="flex items-center gap-3">
                             <RefreshCw className="h-7 w-7 animate-spin" />
                             <span>DECODING ENEMY STRUCTURE...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                             <ShieldAlert className="h-7 w-7 group-hover:rotate-12 transition-transform" />
                             <span className="tracking-widest uppercase">Analyze & Outperform</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Results Panel - Stretched Grid */}
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-16 pt-8"
                  >
                    {/* The Opportunity Banner */}
                    <div className="p-10 rounded-[3.5rem] bg-gradient-to-br from-red-500 via-rose-600 to-orange-600 shadow-2xl shadow-red-500/20 relative overflow-hidden group min-h-[200px] flex flex-col justify-center">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                      <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                         <Target className="h-80 w-80 text-white" />
                      </div>
                      <div className="relative space-y-4">
                         <Badge className="bg-white/20 text-white border-none px-5 py-2 text-xs font-black uppercase tracking-[0.3em] mb-2">Strategic Infiltration Point</Badge>
                         <h3 className="text-4xl md:text-5xl font-black text-white leading-tight max-w-4xl tracking-tight">{result.yourOpportunity}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <Card className="bg-white/[0.03] border-white/10 rounded-[2.5rem] border-l-8 border-l-emerald-500 shadow-2xl">
                        <CardHeader className="p-8 pb-4">
                          <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-4 text-emerald-400">
                             <TrendingUp className="h-6 w-6" /> Force Multipliers
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-4">
                          {result.competitorStrengths.map((s: string, i: number) => (
                            <div key={i} className="flex gap-5 p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-base font-bold text-emerald-100/70 leading-relaxed shadow-inner">
                               <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />
                               {s}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Card className="bg-white/[0.03] border-white/10 rounded-[2.5rem] border-l-8 border-l-rose-500 shadow-2xl">
                        <CardHeader className="p-8 pb-4">
                          <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-4 text-rose-500">
                             <TrendingDown className="h-6 w-6" /> Structural Gaps
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-4">
                          {result.competitorWeaknesses.map((w: string, i: number) => (
                            <div key={i} className="flex gap-5 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-base font-bold text-rose-100/70 leading-relaxed shadow-inner">
                               <Trash2 className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                               {w}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-8">
                       <div className="flex items-center gap-4 justify-center md:justify-start">
                          <Brain className="h-8 w-8 text-red-500" />
                          <h3 className="text-2xl font-black uppercase tracking-[0.3em] text-white/90">Psychological Architecture</h3>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {result.psychologicalTriggers.map((t: any, i: number) => (
                            <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.04] border border-white/10 hover:border-red-500/30 transition-all group cursor-default shadow-xl h-full flex flex-col justify-between">
                               <span className="text-lg font-black text-red-400 group-hover:scale-105 transition-transform block mb-3">{t.trigger}</span>
                               <p className="text-sm text-muted-foreground leading-relaxed italic font-medium">"{t.howTheyUsedIt}"</p>
                            </div>
                          ))}
                       </div>
                    </div>

                    <Card className="bg-zinc-950 border-white/10 rounded-[4rem] shadow-[0_0_80px_rgba(239,68,68,0.1)] overflow-hidden relative group">
                       <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500" />
                       <div className="p-12 md:p-16 space-y-12 relative">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                             <div className="space-y-3">
                                <Badge className="bg-red-500 text-white font-black uppercase tracking-[0.3em] text-[10px] px-5 py-1.5 rounded-full">Elite Directives</Badge>
                                <h3 className="text-5xl md:text-6xl font-black text-white tracking-tighter italic">Your Superior Version</h3>
                             </div>
                             <div className="flex gap-4">
                                <Button size="icon" variant="ghost" className="h-16 w-16 rounded-[1.5rem] bg-white/5 hover:bg-white/10 text-red-400 border border-white/10" onClick={() => copyText(result.superiorVersion.body)}>
                                   <Copy className="h-7 w-7" />
                                </Button>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 gap-12">
                            <div className="p-10 md:p-12 rounded-[3rem] bg-red-500/5 border border-red-500/10 space-y-6 shadow-inner relative overflow-hidden">
                               <div className="absolute top-0 right-0 p-8 opacity-5">
                                  <Sparkles className="h-24 w-24 text-red-500" />
                               </div>
                               <span className="text-xs font-black uppercase tracking-[0.4em] text-red-500 bg-red-500/10 px-5 py-2 rounded-full">The Dominant Hook</span>
                               <p className="text-4xl md:text-5xl font-black leading-tight text-white tracking-tight italic">{result.superiorVersion.hook}</p>
                            </div>
                            
                            <div className="space-y-6 px-4">
                               <span className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground italic">Narrative Overhaul</span>
                               <p className="text-2xl leading-[1.6] text-white/90 whitespace-pre-wrap font-medium tracking-tight selection:bg-red-500/40">{result.superiorVersion.body}</p>
                            </div>

                            <div className="p-10 md:p-12 rounded-[3rem] bg-white/[0.02] border border-white/5 space-y-6 border-l-4 border-l-red-500">
                               <span className="text-xs font-black uppercase tracking-[0.4em] text-red-400">Terminal CTA</span>
                               <p className="text-3xl font-black italic text-red-400 leading-tight">"{result.superiorVersion.cta}"</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-white/10">
                             <div className="flex items-start gap-6">
                                <div className="p-5 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg"><Sparkles className="h-7 w-7" /></div>
                                <div>
                                   <span className="text-xs font-black uppercase text-amber-500 block mb-2 tracking-widest">Unfair Advantage</span>
                                   <p className="text-base text-muted-foreground leading-relaxed font-medium">{result.superiorVersion.whyItsBetter}</p>
                                </div>
                             </div>
                             <div className="flex items-start gap-6">
                                <div className="p-5 rounded-3xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-lg"><Zap className="h-7 w-7" /></div>
                                <div>
                                   <span className="text-xs font-black uppercase text-cyan-500 block mb-2 tracking-widest">Killer Differentiator</span>
                                   <p className="text-base text-muted-foreground leading-relaxed font-medium">{result.keyDifferentiator}</p>
                                </div>
                             </div>
                          </div>

                          <Button 
                            className="w-full h-20 bg-white text-black font-black text-2xl rounded-3xl shadow-[0_20px_50px_rgba(255,255,255,0.1)] hover:scale-[1.01] transition-all group active:scale-95"
                            onClick={() => setLocation(`/generate?hook=${encodeURIComponent(result.superiorVersion.hook)}`)}
                          >
                             DEPLOY AUTHORITATIVE CAMPAIGN <ChevronRight className="ml-3 h-8 w-8 group-hover:translate-x-2 transition-transform" />
                          </Button>
                       </div>
                    </Card>
                  </motion.div>
                ) : (
                   <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-32 flex flex-col items-center justify-center text-center space-y-12"
                   >
                      <div className="relative">
                         <div className="absolute inset-0 bg-red-500/20 blur-[120px] rounded-full" />
                         <div className="p-16 rounded-[4rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl relative">
                            <BarChart3 className="h-40 w-40 text-white/5 animate-pulse" />
                         </div>
                      </div>
                      <div className="space-y-4 max-w-md mx-auto">
                         <h3 className="text-4xl font-black text-white/40 italic">Digital War Room Offline</h3>
                         <p className="text-xl text-muted-foreground font-medium leading-relaxed">Enter competitor intelligence above to architect your structural outperformance plan.</p>
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="batch"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              <div className="max-w-[1400px] mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {batchItems.map((item, i) => (
                      <Card key={i} className="bg-white/[0.03] border-white/10 rounded-[3rem] overflow-hidden group hover:border-red-500/30 transition-all shadow-2xl relative">
                         <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8 flex flex-row justify-between items-center">
                            <Input 
                              value={item.label} 
                              onChange={(e) => updateBatchItem(i, "label", e.target.value)}
                              className="h-10 bg-transparent border-none p-0 text-xl font-black focus-visible:ring-0 text-red-500 tracking-tight"
                            />
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" onClick={() => removeBatchItem(i)}>
                               <Trash2 className="h-5 w-5" />
                            </Button>
                         </CardHeader>
                         <CardContent className="p-8">
                            <Textarea 
                              placeholder="Paste content piece for cross-comparison..." 
                              className="min-h-[250px] bg-white/[0.02] border-white/5 rounded-2xl text-base leading-relaxed p-6 resize-none focus-visible:ring-red-500/30"
                              value={item.content}
                              onChange={(e) => updateBatchItem(i, "content", e.target.value)}
                            />
                         </CardContent>
                      </Card>
                   ))}
                   {batchItems.length < 3 && (
                      <button 
                        className="border-2 border-dashed border-white/10 rounded-[3rem] h-full min-h-[400px] flex flex-col items-center justify-center gap-6 hover:border-red-500/30 transition-all text-muted-foreground hover:text-white group bg-white/[0.01] hover:bg-white/[0.03] shadow-inner"
                        onClick={addBatchItem}
                      >
                         <div className="p-6 rounded-[2rem] bg-white/5 group-hover:scale-110 transition-transform shadow-xl">
                            <Plus className="h-12 w-12" />
                         </div>
                         <span className="font-black uppercase tracking-[0.3em] text-sm">Add Intel Unit</span>
                      </button>
                   )}
                </div>

                <div className="flex justify-center pt-10">
                   <Button 
                     className="h-24 px-24 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 font-black text-3xl rounded-[2.5rem] shadow-2xl shadow-red-600/40 group transition-all"
                     onClick={analyzeBatch}
                     disabled={batchAnalyzing || batchItems.length < 2}
                   >
                      {batchAnalyzing ? <RefreshCw className="mr-4 h-10 w-10 animate-spin" /> : <Layers className="mr-4 h-10 w-10 group-hover:scale-110 transition-transform" />}
                      {batchAnalyzing ? "PROCESSING WAR ROOM DATA..." : "INITIATE BATCH COMPARE"}
                   </Button>
                </div>

                {batchResults.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
                     {batchResults.map((r, i) => (
                        <Card key={i} className="bg-white/[0.03] border-white/10 rounded-[3rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 shadow-2xl border-l-4 border-l-red-500" style={{ animationDelay: `${i * 150}ms` }}>
                           <CardHeader className="bg-red-500/10 border-b border-red-500/20 p-8">
                              <CardTitle className="text-2xl font-black text-red-400">{r.label}</CardTitle>
                           </CardHeader>
                           <CardContent className="p-10 space-y-10">
                              <div className="space-y-4">
                                 <span className="text-[10px] font-black uppercase text-red-500 tracking-[0.3em] bg-red-500/10 px-4 py-1.5 rounded-full">Strategic Strengths</span>
                                 <p className="text-base text-muted-foreground font-medium leading-relaxed">{r.analysis.strengths}</p>
                              </div>
                              <div className="space-y-4 pt-6 border-t border-white/5">
                                 <span className="text-[10px] font-black uppercase text-rose-500 tracking-[0.3em] bg-rose-500/10 px-4 py-1.5 rounded-full">Structural Vulnerabilities</span>
                                 <p className="text-base text-muted-foreground font-medium leading-relaxed">{r.analysis.weaknesses}</p>
                              </div>
                              <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 relative group shadow-inner">
                                 <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <Sparkles className="h-16 w-16 text-indigo-400" />
                                 </div>
                                 <span className="text-[10px] font-black uppercase text-indigo-400 block mb-3 tracking-[0.3em]">Master Outclass Hook</span>
                                 <p className="text-lg font-black italic text-white leading-tight">"{r.analysis.superior_hook}"</p>
                              </div>
                           </CardContent>
                        </Card>
                     ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
