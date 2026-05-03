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
        yourGoal: goal
      });
      setResult(data);
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
        items: validItems, niche, platform
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
    <div className="min-h-screen bg-transparent p-4 md:p-8 space-y-12 max-w-[1600px] mx-auto pb-32">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-2xl shadow-emerald-500/20 transform -rotate-6">
              <Target className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/30 bg-clip-text text-transparent">
                Competitor Intelligence
              </h1>
              <p className="text-emerald-400/80 text-xl font-bold italic">
                Analyze any content. Build something better.
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1.5 rounded-3xl border border-white/10 backdrop-blur-3xl shadow-2xl">
          <TabsList className="bg-transparent h-14">
            <TabsTrigger value="single" className="rounded-2xl px-10 h-11 font-black text-sm uppercase tracking-widest transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
              Single Scan
            </TabsTrigger>
            <TabsTrigger value="batch" className="rounded-2xl px-10 h-11 font-black text-sm uppercase tracking-widest transition-all data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
              Batch War Room
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <AnimatePresence mode="wait">
        <TabsContent value="single" className="mt-0 space-y-12">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
            {/* Input Panel */}
            <div className="xl:col-span-5 space-y-8">
              <Card className="bg-white/[0.03] border-white/10 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
                  <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <Zap className="h-6 w-6 text-emerald-400" />
                    Target Intelligence
                  </CardTitle>
                  <CardDescription className="text-base font-medium">Paste the content you want to outclass.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex justify-between">
                      Raw Intelligence
                      <span className="text-emerald-500/50">{content.length} chars</span>
                    </label>
                    <Textarea 
                      placeholder="Paste the competitor's caption, script, or post here..."
                      className="min-h-[350px] bg-white/[0.02] border-white/10 rounded-2xl text-lg p-6 focus-visible:ring-emerald-500/50 leading-relaxed resize-none transition-all focus:bg-white/[0.04]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Theater of War</label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white">
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                          <SelectItem value="Twitter">Twitter (X)</SelectItem>
                          <SelectItem value="YouTube">YouTube</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Domain</label>
                      <Input 
                        placeholder="e.g. SaaS Growth" 
                        value={niche} 
                        onChange={(e) => setNiche(e.target.value)}
                        className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Strategic Objective</label>
                    <Input 
                      placeholder="What outcome do you want to beat them at?" 
                      value={goal} 
                      onChange={(e) => setGoal(e.target.value)}
                      className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold"
                    />
                  </div>

                  <Button 
                    className="w-full h-20 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-2xl font-black rounded-3xl shadow-2xl shadow-emerald-600/30 group transition-all"
                    onClick={analyzeCompetitor}
                    disabled={analyzing || !content}
                  >
                    {analyzing ? <RefreshCw className="mr-3 h-7 w-7 animate-spin" /> : <ShieldAlert className="mr-3 h-7 w-7 group-hover:rotate-12 transition-transform" />}
                    {analyzing ? "DECODING STRATEGY..." : "ANALYZE & OUTPERFORM"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="xl:col-span-7 h-full">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-10"
                  >
                    <div className="p-8 rounded-[3rem] bg-gradient-to-r from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/20 relative overflow-hidden group min-h-[160px] flex flex-col justify-center">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                      <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                         <Target className="h-64 w-64 text-white" />
                      </div>
                      <div className="relative space-y-3">
                         <Badge className="bg-white/20 text-white border-none px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] mb-2">The Opportunity</Badge>
                         <h3 className="text-3xl font-black text-white leading-tight max-w-2xl">{result.yourOpportunity}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="bg-white/[0.03] border-white/10 rounded-3xl border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-3 text-emerald-400">
                             <TrendingUp className="h-5 w-5" /> Force Multipliers
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {result.competitorStrengths.map((s: string, i: number) => (
                            <div key={i} className="flex gap-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-sm font-medium text-emerald-100/70 leading-relaxed">
                               <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                               {s}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <Card className="bg-white/[0.03] border-white/10 rounded-3xl border-l-4 border-l-rose-500">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-base font-black uppercase tracking-widest flex items-center gap-3 text-rose-500">
                             <TrendingDown className="h-5 w-5" /> Structural Gaps
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {result.competitorWeaknesses.map((w: string, i: number) => (
                            <div key={i} className="flex gap-4 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 text-sm font-medium text-rose-100/70 leading-relaxed">
                               <Trash2 className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                               {w}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <Brain className="h-6 w-6 text-emerald-500" />
                          <h3 className="text-xl font-black uppercase tracking-widest text-white/80">Psychological Architecture</h3>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {result.psychologicalTriggers.map((t: any, i: number) => (
                            <div key={i} className="p-5 rounded-3xl bg-white/[0.04] border border-white/5 hover:border-emerald-500/30 transition-all group cursor-default h-full flex flex-col justify-between">
                               <span className="text-sm font-black text-emerald-400 group-hover:scale-105 transition-transform block mb-2">{t.trigger}</span>
                               <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{t.howTheyUsedIt}"</p>
                            </div>
                          ))}
                       </div>
                    </div>

                    <Card className="bg-zinc-950 border-white/10 rounded-[3rem] shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden relative group">
                       <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                       <div className="p-10 space-y-10 relative">
                          <div className="flex justify-between items-start">
                             <div className="space-y-2">
                                <Badge className="bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px] px-3">Priority One</Badge>
                                <h3 className="text-4xl font-black text-white">Your Superior Version</h3>
                             </div>
                             <div className="flex gap-3">
                                <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 text-emerald-400" onClick={() => copyText(result.superiorVersion.body)}>
                                   <Copy className="h-5 w-5" />
                                </Button>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 gap-10">
                            <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                               <span className="text-xs font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">The Viral Hook</span>
                               <p className="text-3xl font-black leading-tight text-white">{result.superiorVersion.hook}</p>
                            </div>
                            
                            <div className="space-y-4 px-4">
                               <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">The Narrative Structure</span>
                               <p className="text-xl leading-relaxed text-white/80 whitespace-pre-wrap">{result.superiorVersion.body}</p>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 space-y-4">
                               <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Direct Call to Action</span>
                               <p className="text-2xl font-black italic text-emerald-400">"{result.superiorVersion.cta}"</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                             <div className="flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500"><Sparkles className="h-5 w-5" /></div>
                                <div>
                                   <span className="text-xs font-black uppercase text-amber-500 block mb-1">Strategic Advantage</span>
                                   <p className="text-sm text-muted-foreground leading-relaxed">{result.superiorVersion.whyItsBetter}</p>
                                </div>
                             </div>
                             <div className="flex items-start gap-4">
                                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500"><Zap className="h-5 w-5" /></div>
                                <div>
                                   <span className="text-xs font-black uppercase text-cyan-500 block mb-1">Unfair Differentiator</span>
                                   <p className="text-sm text-muted-foreground leading-relaxed">{result.keyDifferentiator}</p>
                                </div>
                             </div>
                          </div>

                          <Button 
                            className="w-full h-16 bg-white text-black font-black text-xl rounded-2xl shadow-2xl hover:scale-[1.02] transition-all"
                            onClick={() => setLocation(`/generate?hook=${encodeURIComponent(result.superiorVersion.hook)}`)}
                          >
                             Deploy Full Campaign <ChevronRight className="ml-2 h-6 w-6" />
                          </Button>
                       </div>
                    </Card>
                  </motion.div>
                ) : (
                   <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full min-h-[600px] flex flex-col items-center justify-center text-center space-y-8"
                   >
                      <div className="relative">
                         <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
                         <div className="p-12 rounded-[3.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl relative">
                            <BarChart3 className="h-32 w-32 text-white/10 animate-pulse" />
                         </div>
                      </div>
                      <div className="space-y-3 max-w-sm">
                         <h3 className="text-3xl font-black text-white/40">War Room Ready</h3>
                         <p className="text-muted-foreground font-medium">Paste the competitor intelligence on the left to begin the structural analysis.</p>
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-0 space-y-12">
           <div className="max-w-6xl mx-auto space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {batchItems.map((item, i) => (
                    <Card key={i} className="bg-white/[0.03] border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-emerald-500/30 transition-all">
                       <CardHeader className="bg-white/[0.02] border-b border-white/5 p-6 flex flex-row justify-between items-center">
                          <Input 
                            value={item.label} 
                            onChange={(e) => updateBatchItem(i, "label", e.target.value)}
                            className="h-10 bg-transparent border-none p-0 text-lg font-black focus-visible:ring-0 text-emerald-400"
                          />
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" onClick={() => removeBatchItem(i)}>
                             <Trash2 className="h-5 w-5" />
                          </Button>
                       </CardHeader>
                       <CardContent className="p-6">
                          <Textarea 
                            placeholder="Paste content piece here..." 
                            className="min-h-[250px] bg-white/[0.02] border-white/10 rounded-2xl text-sm leading-relaxed p-5 resize-none focus-visible:ring-emerald-500/30"
                            value={item.content}
                            onChange={(e) => updateBatchItem(i, "content", e.target.value)}
                          />
                       </CardContent>
                    </Card>
                 ))}
                 {batchItems.length < 3 && (
                    <button 
                      className="border-2 border-dashed border-white/10 rounded-[2.5rem] h-full min-h-[350px] flex flex-col items-center justify-center gap-5 hover:border-emerald-500/30 transition-all text-muted-foreground hover:text-white group bg-white/[0.01] hover:bg-white/[0.03]"
                      onClick={addBatchItem}
                    >
                       <div className="p-5 rounded-3xl bg-white/5 group-hover:scale-110 transition-transform">
                          <Plus className="h-10 w-10" />
                       </div>
                       <span className="font-black uppercase tracking-widest text-sm">Add Competitor Unit</span>
                    </button>
                 )}
              </div>

              <div className="flex justify-center pt-6">
                 <Button 
                   className="h-24 px-20 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 font-black text-2xl rounded-3xl shadow-2xl shadow-emerald-600/40"
                   onClick={analyzeBatch}
                   disabled={batchAnalyzing || batchItems.length < 2}
                 >
                    {batchAnalyzing ? <RefreshCw className="mr-4 h-8 w-8 animate-spin" /> : <Layers className="mr-4 h-8 w-8" />}
                    {batchAnalyzing ? "COMPILING WAR ROOM DATA..." : "INITIATE BATCH COMPARE"}
                 </Button>
              </div>

              {batchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {batchResults.map((r, i) => (
                      <Card key={i} className="bg-white/[0.03] border-white/10 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                         <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20 p-6">
                            <CardTitle className="text-xl font-black text-emerald-400">{r.label}</CardTitle>
                         </CardHeader>
                         <CardContent className="p-8 space-y-8">
                            <div className="space-y-3">
                               <span className="text-xs font-black uppercase text-emerald-500 tracking-widest">Strengths</span>
                               <p className="text-sm text-muted-foreground leading-relaxed">{r.analysis.strengths}</p>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-white/5">
                               <span className="text-xs font-black uppercase text-rose-500 tracking-widest">Weaknesses</span>
                               <p className="text-sm text-muted-foreground leading-relaxed">{r.analysis.weaknesses}</p>
                            </div>
                            <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 relative group">
                               <div className="absolute top-0 right-0 p-4 opacity-5">
                                  <Sparkles className="h-10 w-10" />
                               </div>
                               <span className="text-[10px] font-black uppercase text-indigo-400 block mb-2 tracking-widest">Superior Hook</span>
                               <p className="text-base font-black italic text-white leading-tight">"{r.analysis.superior_hook}"</p>
                            </div>
                         </CardContent>
                      </Card>
                   ))}
                </div>
              )}
           </div>
        </TabsContent>
      </AnimatePresence>
    </div>
  );
}
