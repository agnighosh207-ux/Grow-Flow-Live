import React, { useState } from "react";
import { GitBranch, Sparkles, Copy, Loader2, ArrowRight, TrendingUp, AlertCircle, RefreshCw, Trophy, Lightbulb, Zap, Users, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

export default function ABTestPage() {
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [niche, setNiche] = useState("Business");
  const [tone, setTone] = useState("Educational");
  const [audienceA, setAudienceA] = useState("");
  const [audienceB, setAudienceB] = useState("");
  
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!idea || !audienceA || !audienceB) {
      toast({ variant: "destructive", title: "Please fill all required fields" });
      return;
    }
    
    setGenerating(true);
    setResult(null);
    try {
      const { data } = await api.post("/ab-test/generate", {
        idea, platform, niche, tone, audienceA, audienceB
      });
      setResult(data);
    } catch (err) {
      toast({ variant: "destructive", title: "A/B test generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 max-w-[1400px] mx-auto space-y-16 pb-32">
      {/* Premium Header */}
      <header className="relative py-12 px-8 rounded-[3rem] overflow-hidden border border-white/5 bg-zinc-950/40 backdrop-blur-3xl shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8 text-center md:text-left">
            <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-cyan-500 shadow-[0_0_50px_rgba(79,70,229,0.4)] transform -rotate-3 animate-pulse-subtle">
              <GitBranch className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-black tracking-tighter text-white">
                A/B <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent italic">Duel</span>
              </h1>
              <p className="text-zinc-400 text-xl font-medium tracking-tight">
                AI-driven split testing for maximum engagement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
             <div className="flex -space-x-4">
                {[1,2,3].map(i => <div key={i} className={`w-10 h-10 rounded-full border-2 border-zinc-950 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500`}>A{i}</div>)}
             </div>
             <p className="text-sm font-bold text-zinc-300">Simulate <span className="text-cyan-400">10,000+</span> impressions</p>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div 
            key="form" 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Context */}
            <div className="lg:col-span-7 space-y-8">
              <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden group">
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Core Hook / Idea
                    </label>
                    <div className="relative">
                      <Textarea 
                        placeholder="What's your primary hook or content idea? (e.g. 5 secrets to scaling your SaaS...)" 
                        value={idea} 
                        onChange={(e) => setIdea(e.target.value)}
                        className="bg-black/40 border-white/5 min-h-[180px] rounded-[2rem] text-xl font-bold p-8 focus:ring-indigo-500/50 transition-all placeholder:text-white/10"
                      />
                      <div className="absolute bottom-6 right-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{idea.length} / 3000</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Platform</label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger className="bg-black/40 border-white/5 h-16 rounded-2xl font-black text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-2xl">
                          <SelectItem value="Instagram">Instagram</SelectItem>
                          <SelectItem value="Twitter">Twitter (X)</SelectItem>
                          <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                          <SelectItem value="YouTube Shorts">YouTube Shorts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Niche</label>
                      <Input 
                        placeholder="e.g. AI Business" 
                        value={niche} 
                        onChange={(e) => setNiche(e.target.value)}
                        className="bg-black/40 border-white/5 h-16 rounded-2xl font-black text-lg"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tone</label>
                      <Input 
                        placeholder="e.g. Aggressive" 
                        value={tone} 
                        onChange={(e) => setTone(e.target.value)}
                        className="bg-black/40 border-white/5 h-16 rounded-2xl font-black text-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Audiences */}
            <div className="lg:col-span-5 space-y-8">
              <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden h-full flex flex-col">
                <CardContent className="p-10 space-y-10 flex-1">
                   <div className="space-y-6">
                      <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white">A</div>
                           <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Audience Segment A</label>
                        </div>
                        <Input 
                          placeholder="e.g. Junior developers" 
                          value={audienceA} 
                          onChange={(e) => setAudienceA(e.target.value)}
                          className="bg-black/40 border-white/5 h-14 rounded-xl font-bold"
                        />
                      </div>

                      <div className="relative flex justify-center py-2">
                         <div className="absolute inset-y-0 left-1/2 w-px bg-white/5 -translate-x-1/2" />
                         <div className="relative z-10 w-10 h-10 rounded-full bg-zinc-950 border border-white/5 flex items-center justify-center text-[10px] font-black text-zinc-500">VS</div>
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-cyan-500/5 border border-cyan-500/10 space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-black text-white">B</div>
                           <label className="text-xs font-black uppercase tracking-widest text-cyan-400">Audience Segment B</label>
                        </div>
                        <Input 
                          placeholder="e.g. Senior tech leads" 
                          value={audienceB} 
                          onChange={(e) => setAudienceB(e.target.value)}
                          className="bg-black/40 border-white/5 h-14 rounded-xl font-bold"
                        />
                      </div>
                   </div>

                   <Button 
                    className="w-full h-24 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-2xl font-black rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-1 active:translate-y-0.5 group"
                    onClick={handleGenerate}
                    disabled={generating || !idea || !audienceA || !audienceB}
                  >
                    {generating ? (
                      <div className="flex items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        <span>PREDICTING WINNER...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <Zap className="h-8 w-8 text-cyan-400 group-hover:scale-125 transition-transform" />
                        <span>RUN DUEL SIMULATION</span>
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="results" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="space-y-12"
          >
            {/* Massive Prediction Banner */}
            <div className="relative group">
              <div className={`absolute -inset-1 bg-gradient-to-r ${result.prediction.winner === 'A' ? 'from-indigo-500 to-transparent' : result.prediction.winner === 'B' ? 'from-transparent to-cyan-500' : 'from-indigo-500 to-cyan-500'} rounded-[4rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000`} />
              <div className={`relative p-12 rounded-[4rem] border shadow-2xl overflow-hidden flex flex-col lg:flex-row items-center gap-12 ${
                result.prediction.winner === 'A' ? 'bg-indigo-950/20 border-indigo-500/30' : 
                result.prediction.winner === 'B' ? 'bg-cyan-950/20 border-cyan-500/30' : 
                'bg-zinc-900/40 border-white/10'
              }`}>
                 <div className={`p-10 rounded-[3rem] ${
                   result.prediction.winner === 'A' ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_50px_rgba(99,102,241,0.2)]' :
                   result.prediction.winner === 'B' ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.2)]' :
                   'bg-zinc-500/20 text-zinc-400'
                 }`}>
                   {result.prediction.winner !== 'too_close' ? <Trophy className="w-20 h-20" /> : <GitBranch className="w-20 h-20" />}
                 </div>
                 <div className="flex-1 space-y-8 text-center lg:text-left">
                    <div className="space-y-2">
                       <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">AI Verdict</span>
                       <h2 className="text-6xl font-black text-white tracking-tighter">
                        {result.prediction.winner === 'A' ? "Version A Dominates" : 
                         result.prediction.winner === 'B' ? "Version B Wins Out" : 
                         "Statistical Deadlock"}
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <p className="text-lg font-bold text-white/70">Simulation Confidence</p>
                         <span className="text-3xl font-black text-white">{result.prediction.confidence}%</span>
                      </div>
                      <div className="w-full h-6 bg-black/40 rounded-full overflow-hidden flex p-1 border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${result.prediction.winner === 'A' ? result.prediction.confidence : result.prediction.winner === 'too_close' ? 50 : 100 - result.prediction.confidence}%` }} 
                          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
                        />
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${result.prediction.winner === 'B' ? result.prediction.confidence : result.prediction.winner === 'too_close' ? 50 : 100 - result.prediction.confidence}%` }} 
                          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)]" 
                        />
                      </div>
                    </div>
                    
                    <p className="text-xl font-medium text-white/60 leading-relaxed max-w-3xl">{result.prediction.reasoning}</p>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/5">
                        <AlertCircle className="w-5 h-5 text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-200"><span className="text-white/40">Key Delta:</span> {result.prediction.keyDifference}</span>
                      </div>
                      <Button variant="ghost" onClick={() => setResult(null)} className="text-zinc-500 hover:text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl border border-white/5">
                        <RefreshCw className="w-4 h-4 mr-2" /> New Simulation
                      </Button>
                    </div>
                 </div>
              </div>
            </div>

            {/* Battle Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-950 border-4 border-white/5 flex items-center justify-center text-xl font-black text-white/20 shadow-2xl backdrop-blur-3xl">VS</div>
               </div>

               {/* Version A */}
               <Card className={`group bg-zinc-900/40 border-white/5 rounded-[3.5rem] overflow-hidden transition-all duration-500 ${result.prediction.winner === 'A' ? 'ring-2 ring-indigo-500 shadow-[0_30px_100px_rgba(99,102,241,0.1)] scale-[1.02]' : 'opacity-80'}`}>
                 <div className="p-10 space-y-8">
                   <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-[8px] font-black text-white">A</div>
                           <h3 className="text-3xl font-black text-white tracking-tight italic">Variant A</h3>
                        </div>
                        <p className="text-indigo-400/60 text-xs font-bold uppercase tracking-widest italic">{result.versionA.audienceTarget}</p>
                      </div>
                      {result.prediction.winner === 'A' && <div className="px-4 py-1.5 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-indigo-500/20">PREDICTED WINNER</div>}
                   </div>

                   <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 relative group/hook transition-all hover:bg-black/60">
                     <p className="text-3xl font-black text-white leading-tight">{result.versionA.hook}</p>
                     <Button size="icon" variant="ghost" className="absolute -top-4 -right-4 bg-indigo-600 text-white rounded-xl shadow-xl opacity-0 group-hover/hook:opacity-100 transition-all hover:scale-110" onClick={() => copyText(result.versionA.hook)}>
                       <Copy className="w-4 h-4" />
                     </Button>
                   </div>

                   <div className="p-2 space-y-6">
                     <p className="whitespace-pre-wrap text-zinc-400 leading-relaxed font-medium text-lg">{result.versionA.content}</p>
                     
                     <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div className="space-y-2">
                           <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">Primary Trigger</span>
                           <div className="flex items-center gap-2">
                              <Target className="w-3 h-3 text-indigo-400" />
                              <p className="text-sm font-black text-white">{result.versionA.psychologicalTrigger}</p>
                           </div>
                        </div>
                        <div className="space-y-2 text-right">
                           <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">Growth Index</span>
                           <p className="text-sm font-black text-indigo-400">{result.versionA.predictedStrength}</p>
                        </div>
                     </div>
                   </div>
                 </div>
               </Card>

               {/* Version B */}
               <Card className={`group bg-zinc-900/40 border-white/5 rounded-[3.5rem] overflow-hidden transition-all duration-500 ${result.prediction.winner === 'B' ? 'ring-2 ring-cyan-500 shadow-[0_30px_100px_rgba(6,182,212,0.1)] scale-[1.02]' : 'opacity-80'}`}>
                 <div className="p-10 space-y-8">
                   <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-lg bg-cyan-500 flex items-center justify-center text-[8px] font-black text-white">B</div>
                           <h3 className="text-3xl font-black text-white tracking-tight italic">Variant B</h3>
                        </div>
                        <p className="text-cyan-400/60 text-xs font-bold uppercase tracking-widest italic">{result.versionB.audienceTarget}</p>
                      </div>
                      {result.prediction.winner === 'B' && <div className="px-4 py-1.5 rounded-full bg-cyan-500 text-white text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-cyan-500/20">PREDICTED WINNER</div>}
                   </div>

                   <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 relative group/hook transition-all hover:bg-black/60">
                     <p className="text-3xl font-black text-white leading-tight">{result.versionB.hook}</p>
                     <Button size="icon" variant="ghost" className="absolute -top-4 -right-4 bg-cyan-600 text-white rounded-xl shadow-xl opacity-0 group-hover/hook:opacity-100 transition-all hover:scale-110" onClick={() => copyText(result.versionB.hook)}>
                       <Copy className="w-4 h-4" />
                     </Button>
                   </div>

                   <div className="p-2 space-y-6">
                     <p className="whitespace-pre-wrap text-zinc-400 leading-relaxed font-medium text-lg">{result.versionB.content}</p>
                     
                     <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                        <div className="space-y-2">
                           <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">Primary Trigger</span>
                           <div className="flex items-center gap-2">
                              <Target className="w-3 h-3 text-cyan-400" />
                              <p className="text-sm font-black text-white">{result.versionB.psychologicalTrigger}</p>
                           </div>
                        </div>
                        <div className="space-y-2 text-right">
                           <span className="text-[10px] uppercase font-black tracking-widest text-zinc-600">Growth Index</span>
                           <p className="text-sm font-black text-cyan-400">{result.versionB.predictedStrength}</p>
                        </div>
                     </div>
                   </div>
                 </div>
               </Card>
            </div>

            {/* Hybrid Content */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="relative p-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-[3.5rem] shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                <div className="bg-zinc-950 p-12 rounded-[3.4rem] space-y-8 flex flex-col lg:flex-row items-center gap-12">
                   <div className="relative shrink-0">
                      <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 animate-pulse" />
                      <div className="relative w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-500">
                        <Lightbulb className="w-12 h-12" />
                      </div>
                   </div>
                   <div className="flex-1 space-y-4 text-center lg:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                         <Zap className="w-3 h-3 text-amber-500" />
                         <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">The Golden Ratio Hybrid</span>
                      </div>
                      <h3 className="text-4xl font-black text-white italic tracking-tighter leading-tight">
                        "{result.hybridVersion.hook}"
                      </h3>
                      <p className="text-amber-200/50 font-bold italic text-lg leading-relaxed">{result.hybridVersion.note}</p>
                   </div>
                   <Button size="lg" className="h-20 px-10 bg-amber-500 hover:bg-amber-600 text-black font-black text-xl rounded-2xl shadow-xl shadow-amber-500/20 shrink-0 transform transition-transform hover:scale-105 active:scale-95" onClick={() => copyText(result.hybridVersion.hook)}>
                     <Copy className="mr-3 h-6 w-6" /> COPY GOLDEN HOOK
                   </Button>
                </div>
              </div>
            </motion.div>

            <div className="flex justify-center pt-8">
               <button onClick={() => setResult(null)} className="group flex items-center gap-3 text-zinc-500 hover:text-white transition-colors py-4 px-10 rounded-full border border-white/5 bg-white/5 hover:bg-white/10">
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                  <span className="font-black uppercase tracking-widest text-sm">Reset Duel Simulation</span>
               </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
