import React, { useState, useEffect } from "react";
import { User, Sparkles, Instagram, Twitter, Linkedin, Youtube, Share2, Copy, Smartphone, Save, Check, RefreshCw, Mic, Layout, MessageSquare, Target, Award, Brain, Terminal, Shield, ChevronRight, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";

const formats = [
  { id: "instagram", label: "Instagram", icon: <Instagram className="h-5 w-5" />, limit: 150 },
  { id: "twitter", label: "Twitter (X)", icon: <Twitter className="h-5 w-5" />, limit: 160 },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-5 w-5" />, limit: 220 },
  { id: "youtube", label: "YouTube", icon: <Youtube className="h-5 w-5" />, limit: 1000 },
  { id: "tiktok", label: "TikTok", icon: <Share2 className="h-5 w-5" />, limit: 80 },
  { id: "linkinbio", label: "Link-in-Bio", icon: <Layout className="h-5 w-5" />, limit: 200 },
  { id: "brandStatement", label: "Brand Intel", icon: <Shield className="h-5 w-5" />, limit: 500 },
  { id: "elevator30sec", label: "30s Pitch", icon: <Mic className="h-5 w-5" />, limit: 500 },
  { id: "elevator60sec", label: "60s Pitch", icon: <Mic className="h-5 w-5" />, limit: 1000 },
];

export default function CreatorProfilePage() {
  const [formData, setFormData] = useState({
    name: "",
    niche: "Business",
    mainTopic: "",
    achievement: "",
    targetAudience: "",
    tone: "professional" as const,
    language: "English",
    formats: ["instagram", "twitter", "linkedin"] as string[]
  });

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("instagram");
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);

  const { toast } = useToast();

  const handleFormatToggle = (id: string) => {
    const newFormats = formData.formats.includes(id)
      ? formData.formats.filter(f => f !== id)
      : formData.formats.length < 6 ? [...formData.formats, id] : formData.formats;
    
    if (formData.formats.length >= 6 && !formData.formats.includes(id)) {
      toast({ variant: "destructive", title: "Limit reached", description: "Select up to 6 formats." });
    } else {
      setFormData({ ...formData, formats: newFormats });
    }
  };

  const generateProfile = async () => {
    if (!formData.name || formData.formats.length === 0) {
      toast({ variant: "destructive", title: "Missing fields", description: "Name and at least one format are required." });
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/bio/generate", formData);
      setResult(data);
      const firstFormat = Object.keys(data)[0];
      if (firstFormat) setActiveTab(firstFormat);
    } catch (err) {
      toast({ variant: "destructive", title: "Generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  const saveToProfile = () => {
    if (!result) return;
    localStorage.setItem("creator_profile_bios", JSON.stringify({ ...result, timestamp: Date.now() }));
    toast({ title: "Saved to Profile", description: "Your branding assets are stored locally." });
  };

  // Elevator pitch practice
  useEffect(() => {
    if (!practiceMode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        const sentences = (result[activeTab]?.script || "").split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
        setPracticeIndex(prev => (prev + 1) % sentences.length);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [practiceMode, result, activeTab]);

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 space-y-12 max-w-[1600px] mx-auto pb-32">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/5 pb-10">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-[2rem] bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/30 transform -rotate-3">
            <User className="h-10 w-10 text-white" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
              Creator Profile Suite
            </h1>
            <p className="text-cyan-400/80 text-xl font-bold italic tracking-wide">
              Your brand identity, engineered for every platform.
            </p>
          </div>
        </div>
        
        <Button onClick={saveToProfile} variant="outline" className="h-14 px-10 border-white/10 bg-white/5 text-white font-black text-lg rounded-2xl hover:bg-white/10 shadow-xl transition-all hidden md:flex">
           <Save className="mr-2 h-6 w-6 text-purple-500" /> Save All Assets
        </Button>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        {/* Left Panel: Persona Config */}
        <div className="xl:col-span-4 space-y-8">
          <Card className="bg-white/[0.03] border-white/10 backdrop-blur-[100px] shadow-2xl rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
              <CardTitle className="text-2xl font-black flex items-center gap-3">
                <Terminal className="h-6 w-6 text-purple-400" />
                Persona Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Master Alias</label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Elena Vance"
                  className="bg-white/[0.02] border-white/10 h-14 rounded-2xl text-lg font-bold focus:ring-purple-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Domain</label>
                  <Select value={formData.niche} onValueChange={(v) => setFormData({...formData, niche: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white">
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Tech">Technology</SelectItem>
                      <SelectItem value="Creative">Creative Arts</SelectItem>
                      <SelectItem value="Health">Health & Wellness</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Aesthetic</label>
                  <Select value={formData.tone} onValueChange={(v: any) => setFormData({...formData, tone: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white">
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="bold">Bold & Edgy</SelectItem>
                      <SelectItem value="funny">Humorous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-400" /> Core Narrative
                </label>
                <Input 
                  value={formData.mainTopic}
                  onChange={(e) => setFormData({...formData, mainTopic: e.target.value})}
                  placeholder="e.g. Future of Generative Art"
                  className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-400" /> Authority Proof
                </label>
                <Input 
                  value={formData.achievement}
                  onChange={(e) => setFormData({...formData, achievement: e.target.value})}
                  placeholder="e.g. Featured in NYT, TEDx Speaker"
                  className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold"
                />
              </div>

              <div className="space-y-6 pt-6 border-t border-white/5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Deployment Targets (Max 6)</label>
                <div className="grid grid-cols-3 gap-3">
                   {formats.map(f => (
                     <button
                        key={f.id}
                        onClick={() => handleFormatToggle(f.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-3 group ${formData.formats.includes(f.id) ? 'bg-purple-600/10 border-purple-600 text-white shadow-xl shadow-purple-600/10' : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/20'}`}
                     >
                        <div className={`${formData.formats.includes(f.id) ? 'text-purple-400' : 'text-white/20 group-hover:text-white/40'} transition-colors`}>{f.icon}</div>
                        <span className="text-[10px] font-black uppercase tracking-tight truncate w-full text-center">{f.label}</span>
                     </button>
                   ))}
                </div>
              </div>

              <Button 
                className="w-full h-20 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-2xl font-black rounded-3xl shadow-2xl shadow-cyan-600/30 transition-all active:scale-95 group"
                onClick={generateProfile}
                disabled={generating || !formData.name}
              >
                {generating ? <RefreshCw className="mr-3 h-7 w-7 animate-spin" /> : <Sparkles className="mr-3 h-7 w-7 group-hover:scale-110 transition-transform" />}
                {generating ? "SYNTHESIZING..." : "BUILD BRAND SUITE"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Assets Display */}
        <div className="xl:col-span-8">
           <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-10"
                >
                   <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
                      <TabsList className="bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl h-20 w-full flex items-center justify-between shadow-2xl">
                         {formData.formats.map(f => (
                           <TabsTrigger key={f} value={f} className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all gap-3 mx-1">
                              {formats.find(fmt => fmt.id === f)?.icon}
                              <span className="hidden lg:inline">{formats.find(fmt => fmt.id === f)?.label}</span>
                           </TabsTrigger>
                         ))}
                      </TabsList>

                      {formData.formats.map(f => {
                         const data = result[f];
                         if (!data) return null;
                         const limit = formats.find(fmt => fmt.id === f)?.limit || 100;
                         const isElevator = f.startsWith("elevator");

                         return (
                           <TabsContent key={f} value={f} className="mt-0">
                              {isElevator ? (
                                <Card className="bg-zinc-950 border-white/10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] rounded-[3.5rem]">
                                   <CardHeader className="flex flex-col md:flex-row justify-between items-center bg-white/[0.02] border-b border-white/5 p-10 gap-6">
                                      <div className="text-center md:text-left">
                                         <CardTitle className="text-4xl font-black italic">{f === "elevator30sec" ? "30-Second" : "60-Second"} Master Pitch</CardTitle>
                                         <CardDescription className="text-lg font-medium">Engineered for verbal impact and retention.</CardDescription>
                                      </div>
                                      <div className="flex items-center gap-5 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 shadow-inner">
                                         <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">Practice Mode</span>
                                         <Switch checked={practiceMode} onCheckedChange={(v) => { setPracticeMode(v); setPracticeIndex(0); }} />
                                      </div>
                                   </CardHeader>
                                   <CardContent className="p-16 space-y-12">
                                      <div className="bg-white/[0.02] p-12 rounded-[3.5rem] border border-white/5 relative group min-h-[300px] flex items-center justify-center">
                                         <div className="absolute top-10 right-10 opacity-5 group-hover:scale-125 transition-transform duration-[2s]">
                                            <Mic className="h-48 w-48" />
                                         </div>
                                         {practiceMode ? (
                                           <div className="space-y-12 text-center">
                                              <motion.p 
                                                key={practiceIndex}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="text-5xl font-black leading-tight text-white selection:bg-purple-500/40"
                                              >
                                                 {data.script.split(/[.!?]+/).filter((s:string) => s.trim().length > 0)[practiceIndex]}
                                              </motion.p>
                                              <p className="text-xs text-purple-500 animate-pulse font-black tracking-[0.5em] uppercase">TAP [SPACE] TO CONTINUE</p>
                                           </div>
                                         ) : (
                                           <p className="text-2xl leading-[1.6] font-medium text-white/90 whitespace-pre-wrap selection:bg-purple-500/40 text-center max-w-4xl italic">
                                              {data.script}
                                           </p>
                                         )}
                                      </div>
                                      <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-t border-white/5 pt-10">
                                         <div className="flex gap-4">
                                            <Badge variant="outline" className="h-12 px-6 rounded-2xl border-white/10 text-lg font-black">{data.wordCount} Words</Badge>
                                            <Badge variant="outline" className="h-12 px-6 rounded-2xl border-purple-500/20 bg-purple-500/5 text-purple-400 text-lg font-black">{f === "elevator30sec" ? "28s" : "58s"} est.</Badge>
                                         </div>
                                         <Button className="h-20 px-12 bg-white text-black font-black text-xl rounded-3xl shadow-2xl hover:scale-[1.02] transition-all" onClick={() => { navigator.clipboard.writeText(data.script); toast({ title: "Copied" }); }}>
                                            <Copy className="mr-3 h-6 w-6" /> COPY FULL SCRIPT
                                         </Button>
                                      </div>
                                   </CardContent>
                                </Card>
                              ) : f === "linkinbio" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                                   <Card className="bg-white/[0.03] border-white/10 p-12 rounded-[3.5rem] space-y-10 shadow-2xl border-l-8 border-l-purple-600">
                                      <div className="space-y-8">
                                         <div className="space-y-3">
                                            <span className="text-xs font-black uppercase text-purple-400 tracking-widest">Master Headline</span>
                                            <p className="text-4xl font-black text-white leading-tight italic">"{data.headline}"</p>
                                         </div>
                                         <div className="space-y-3">
                                            <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Compelling Subtext</span>
                                            <p className="text-xl text-muted-foreground font-medium leading-relaxed italic">"{data.subheadline}"</p>
                                         </div>
                                         <div className="pt-6">
                                            <Button className="w-full h-16 bg-white text-black font-black rounded-2xl uppercase tracking-[0.3em] text-sm shadow-xl">
                                               {data.cta}
                                            </Button>
                                         </div>
                                      </div>
                                   </Card>
                                   <div className="flex flex-col items-center justify-center opacity-10 space-y-6">
                                      <Layout className="h-48 w-48" />
                                      <span className="text-2xl font-black uppercase tracking-[0.5em]">Mockup v2.0</span>
                                   </div>
                                </div>
                              ) : f === "brandStatement" ? (
                                <div className="space-y-10">
                                   <Card className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border-white/10 p-16 rounded-[4rem] relative overflow-hidden shadow-2xl">
                                      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                         <Shield className="h-64 w-64" />
                                      </div>
                                      <div className="relative space-y-10">
                                         <div className="space-y-4">
                                            <span className="text-xs font-black uppercase tracking-[0.4em] text-purple-400">Core Positioning Statement</span>
                                            <p className="text-5xl font-black leading-[1.1] text-white selection:bg-purple-500/40">{data.statement}</p>
                                         </div>
                                         <div className="space-y-4 pt-10 border-t border-white/5">
                                            <span className="text-xs font-black uppercase tracking-[0.4em] text-muted-foreground italic">The One-Liner</span>
                                            <p className="text-3xl font-black italic text-purple-300/60 leading-tight">"{data.oneLiner}"</p>
                                         </div>
                                      </div>
                                   </Card>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                   {/* Phone Mockup */}
                                   <div className="lg:col-span-5 flex justify-center">
                                      <div className="bg-zinc-950 border-[10px] border-zinc-900 rounded-[4rem] p-6 aspect-[9/19] w-full max-w-[400px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] relative overflow-hidden ring-1 ring-white/10">
                                         <div className="absolute top-0 left-0 right-0 h-10 bg-zinc-900 flex justify-center items-center">
                                            <div className="w-24 h-6 bg-black rounded-full" />
                                         </div>
                                         <div className="mt-12 space-y-8">
                                            <div className="flex gap-6 items-center">
                                               <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-4 border-black shadow-xl" />
                                               <div className="space-y-2">
                                                  <p className="font-black text-lg text-white">@{formData.name.toLowerCase().replace(/\s/g, "")}</p>
                                                  <Badge className="bg-purple-500/20 text-purple-400 border-none text-[10px] h-5 px-3 font-black uppercase tracking-widest">Authority Creator</Badge>
                                               </div>
                                            </div>
                                            <div className="space-y-4 px-2">
                                               <p className="text-sm leading-relaxed text-white/90 whitespace-pre-wrap font-medium">
                                                  {data.bio}
                                               </p>
                                               <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs bg-indigo-500/5 p-2 rounded-lg">
                                                  <Share2 className="h-3 w-3" />
                                                  <span>linkin.bio/{formData.name.toLowerCase().replace(/\s/g, "")}</span>
                                               </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                               {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-white/[0.03] rounded-2xl border border-white/5" />)}
                                            </div>
                                         </div>
                                      </div>
                                   </div>

                                   {/* Bio Intelligence */}
                                   <div className="lg:col-span-7 flex flex-col justify-center space-y-12">
                                      <div className="space-y-5">
                                         <div className="flex justify-between items-end">
                                            <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Payload Compliance</span>
                                            <span className={`text-xl font-black ${data.bio.length > limit ? 'text-rose-500' : 'text-emerald-500'}`}>{data.bio.length} <span className="text-white/20 text-sm">/ {limit}</span></span>
                                         </div>
                                         <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${Math.min(100, (data.bio.length / limit) * 100)}%` }}
                                              className={`h-full rounded-full ${data.bio.length > limit ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} 
                                            />
                                         </div>
                                      </div>

                                      <Card className="bg-white/[0.02] border-white/10 p-8 rounded-[2.5rem] flex gap-8 items-center group overflow-hidden relative">
                                         <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:scale-125 transition-transform duration-700">
                                            <Brain className="h-32 w-32" />
                                         </div>
                                         <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-400 shadow-inner">
                                            <Sparkles className="h-8 w-8" />
                                         </div>
                                         <div className="space-y-1 relative">
                                            <span className="text-xs font-black uppercase text-purple-400 tracking-widest">Algorithmic Insight</span>
                                            <p className="text-base text-muted-foreground font-medium italic leading-relaxed">"{data.tip}"</p>
                                         </div>
                                      </Card>

                                      <div className="grid grid-cols-1 gap-6">
                                         <Button className="h-24 bg-white text-black font-black rounded-3xl text-3xl shadow-2xl hover:scale-[1.02] transition-all" onClick={() => { navigator.clipboard.writeText(data.bio); toast({ title: "Copied" }); }}>
                                            <Copy className="mr-4 h-8 w-8" /> COPY MASTER BIO
                                         </Button>
                                         <Button variant="outline" className="h-16 border-white/10 bg-white/5 text-white/40 font-black text-xl rounded-2xl hover:bg-white/10 hover:text-white transition-all">
                                            <BarChart2 className="mr-3 h-6 w-6" /> ANALYZE RETENTION
                                         </Button>
                                      </div>
                                   </div>
                                </div>
                              )}
                           </TabsContent>
                         );
                      })}
                   </Tabs>

                   <div className="flex justify-center pt-10">
                      <Button onClick={saveToProfile} className="h-20 px-16 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-2xl rounded-3xl shadow-2xl shadow-purple-600/30 hover:scale-105 transition-all active:scale-95">
                         <Save className="mr-3 h-8 w-8" /> ARCHIVE FULL BRAND SUITE
                      </Button>
                   </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[600px] flex flex-col items-center justify-center text-center space-y-10"
                >
                   <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/20 blur-[120px] rounded-full" />
                      <div className="p-16 rounded-[4.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-3xl relative animate-in zoom-in duration-1000">
                         <User className="h-32 w-32 text-white/5 animate-pulse" />
                      </div>
                   </div>
                   <div className="space-y-4 max-w-sm">
                      <h3 className="text-3xl font-black text-white/40 italic">Identity Matrix Offline</h3>
                      <p className="text-muted-foreground font-medium text-lg leading-relaxed">Configure your persona on the left to synthesize your cross-platform branding architecture.</p>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
