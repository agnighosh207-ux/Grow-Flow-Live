import React, { useState } from "react";
import { RefreshCw, Sparkles, Copy, Download, ArrowRight, ArrowLeft, Instagram, Linkedin, Twitter, Youtube, FileText, Mail, CheckCircle2, Zap, Brain, ChevronRight, Share2, Layers, Smartphone, MousePointer2 } from "lucide-react";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
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
import { useQueryClient } from "@tanstack/react-query";

const formats = [
  { id: "instagram_caption", label: "Instagram", icon: <Instagram className="h-6 w-6" />, color: "from-pink-500 to-rose-500 shadow-pink-500/20" },
  { id: "linkedin_post", label: "LinkedIn", icon: <Linkedin className="h-6 w-6" />, color: "from-blue-600 to-indigo-600 shadow-blue-600/20" },
  { id: "twitter_thread", label: "Twitter (X)", icon: <Twitter className="h-6 w-6" />, color: "from-sky-400 to-blue-400 shadow-sky-400/20" },
  { id: "youtube_script", label: "YouTube", icon: <Youtube className="h-6 w-6" />, color: "from-red-500 to-orange-500 shadow-red-500/20" },
  { id: "blog_post", label: "Blog Post", icon: <FileText className="h-6 w-6" />, color: "from-emerald-500 to-teal-500 shadow-emerald-500/20" },
  { id: "newsletter", label: "Newsletter", icon: <Mail className="h-6 w-6" />, color: "from-purple-500 to-violet-500 shadow-purple-500/20" },
];

export default function RepurposePage() {
  const [step, setStep] = useState(1);
  const [sourceFormat, setSourceFormat] = useState("instagram_caption");
  const [sourceContent, setSourceContent] = useState("");
  const [targetFormats, setTargetFormats] = useState<string[]>([]);
  const [tone, setTone] = useState("Professional");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("English");
  const [repurposing, setRepurposing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const toggleTarget = (formatId: string) => {
    if (formatId === sourceFormat) return;
    if (targetFormats.includes(formatId)) {
      setTargetFormats(targetFormats.filter(f => f !== formatId));
    } else {
      if (targetFormats.length >= 4) {
        toast({ variant: "destructive", title: "Limit reached", description: "You can select up to 4 target formats." });
        return;
      }
      setTargetFormats([...targetFormats, formatId]);
    }
  };

  const startRepurposing = async () => {
    setRepurposing(true);
    try {
      const { data } = await api.post("/repurpose", {
        sourceContent,
        sourceFormat,
        targetFormats,
        tone,
        niche,
        language
      });
      setResult(data);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    } catch (err) {
      toast({ variant: "destructive", title: "Repurposing failed" });
    } finally {
      setRepurposing(false);
    }
  };

  const downloadAll = () => {
    if (!result) return;
    let text = `REPURPOSE REPORT\nCore Insight: ${result.coreInsight}\n\n`;
    Object.entries(result.repurposed).forEach(([format, data]: [string, any]) => {
      text += `--- ${format.toUpperCase()} ---\n${data.content}\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repurposed-content.txt";
    a.click();
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <PageWrapper maxWidth="xl" className="space-y-12 pb-32">
      <FeatureGuideBanner 
        toolKey="repurpose" 
        title="Content Repurposer" 
        icon={<Share2 className="w-5 h-5 text-cyan-400" />}
        tagline="One piece of content. Every platform. Master the multi-channel algorithm by automatically adapting your message."
        whatYouGet={["Platform-specific adaptations", "Core insight extraction", "Cross-platform export (.txt)"]}
        whenToUse="Use this when you have a winning piece of content (like a blog post or viral tweet) and want to milk it for all its worth on other platforms."
        proTip="Always start with your longest/most detailed piece of content as the 'Source'. It gives the AI more 'meat' to work with for the adaptations."
        planRequired="Creator"
      />
      <div className="flex flex-col gap-8">
        <PageHeader 
          icon={<RefreshCw/>} 
          iconBg="bg-teal-500/10" 
          iconColor="text-teal-400" 
          title="Content Repurposer" 
          subtitle="One video. Infinite posts."
          badge="Creator"
          action={
            <div className="hidden md:flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-3xl shadow-2xl">
               {[1, 2, 3].map(i => (
                 <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-500 ${step === i ? 'bg-cyan-600 text-white font-black shadow-lg scale-105' : 'text-white/20'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step === i ? 'bg-white text-cyan-600' : 'bg-white/5 text-white/20'}`}>{i}</div>
                    <span className="text-[10px] uppercase tracking-widest">{i === 1 ? 'Source' : i === 2 ? 'Distribute' : 'Results'}</span>
                 </div>
               ))}
            </div>
          }
        />
        {/* Mobile Progress Bar */}
        <div className="flex md:hidden items-center justify-between gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
           {[1, 2, 3].map(i => (
             <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-500 shrink-0 ${step === i ? 'bg-cyan-600 text-white font-black' : 'text-white/20'}`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${step === i ? 'bg-white text-cyan-600' : 'bg-white/5 text-white/20'}`}>{i}</div>
                <span className="text-[8px] uppercase tracking-widest whitespace-nowrap">{i === 1 ? 'Source' : i === 2 ? 'Distribute' : 'Results'}</span>
             </div>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="space-y-12"
          >
            <Card className="bg-white/[0.02] border-white/10 backdrop-blur-[100px] rounded-[3.5rem] overflow-hidden shadow-[0_0_80px_rgba(79,70,229,0.1)] relative">
               <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                  <Share2 className="h-64 w-64" />
               </div>
               
               <CardContent className="p-6 md:p-12 space-y-8 md:space-y-12 relative">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-12">
                     <div className="xl:col-span-5 space-y-6 md:space-y-8">
                        <div className="space-y-4">
                           <label className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Original Format</label>
                           <div className="grid grid-cols-2 gap-3">
                              {formats.map(f => (
                                <button
                                  key={f.id}
                                  onClick={() => setSourceFormat(f.id)}
                                  className={`flex items-center gap-3 md:gap-4 p-4 md:p-5 rounded-2xl border-2 transition-all group ${sourceFormat === f.id ? 'bg-indigo-600/10 border-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/20 hover:bg-white/5'}`}
                                >
                                  <div className={`${sourceFormat === f.id ? 'text-indigo-400' : 'text-white/20 group-hover:text-white/40'} transition-colors`}>{f.icon}</div>
                                  <span className="text-sm font-black uppercase tracking-widest">{f.label}</span>
                                </button>
                              ))}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                           <div className="space-y-3">
                              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Brand Voice</label>
                              <Select value={tone} onValueChange={setTone}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold text-base">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-white/10 text-white">
                                   <SelectItem value="Professional">Professional</SelectItem>
                                   <SelectItem value="Casual">Casual</SelectItem>
                                   <SelectItem value="Witty">Witty</SelectItem>
                                   <SelectItem value="Storyteller">Storyteller</SelectItem>
                                   <SelectItem value="Authority">Authority</SelectItem>
                                </SelectContent>
                              </Select>
                           </div>
                           <div className="space-y-3">
                              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Niche</label>
                              <Input 
                                placeholder="e.g. Crypto Trading" 
                                value={niche} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNiche(e.target.value)}
                                className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold text-base"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="xl:col-span-7 space-y-4">
                        <div className="flex justify-between items-end">
                           <label className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground italic">Input Intelligence Stream</label>
                           <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] h-6 px-3">{sourceContent.length} / 3000</Badge>
                        </div>
                        <Textarea 
                          placeholder="Paste your original caption, script, or blog post here for multi-channel transformation..."
                          className="min-h-[300px] md:min-h-[450px] bg-white/[0.02] border-white/10 rounded-[2rem] md:rounded-[2.5rem] text-base md:text-xl p-6 md:p-10 focus-visible:ring-indigo-500/50 leading-relaxed resize-none shadow-inner"
                          value={sourceContent}
                          onChange={(e) => setSourceContent(e.target.value)}
                        />
                     </div>
                  </div>

                  <Button 
                    className="w-full h-16 md:h-24 bg-white text-black font-black text-xl md:text-3xl rounded-[1.5rem] md:rounded-[2.5rem] hover:scale-[1.01] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95"
                    onClick={() => setStep(2)}
                    disabled={sourceContent.length < 50}
                  >
                    CONTINUE TO DISTRIBUTION <ChevronRight className="ml-2 md:ml-3 h-6 w-6 md:h-10 md:w-10" />
                  </Button>
               </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-12"
          >
             <div className="text-center space-y-4">
                <h2 className="text-5xl font-black italic">Select Destinations</h2>
                <p className="text-muted-foreground text-xl font-medium">Choose up to 4 algorithms to conquer with this content.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {formats.map(f => {
                  const isSource = f.id === sourceFormat;
                  const isSelected = targetFormats.includes(f.id);
                  return (
                    <Card 
                      key={f.id}
                      onClick={() => !isSource && toggleTarget(f.id)}
                      className={`relative overflow-hidden cursor-pointer transition-all duration-500 border-2 rounded-[3rem] group ${isSource ? 'opacity-30 grayscale pointer-events-none border-white/5' : isSelected ? 'border-indigo-500 bg-indigo-600/10 scale-105 shadow-2xl shadow-indigo-600/20' : 'border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'}`}
                    >
                       <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                          <div className={`p-6 rounded-[2rem] bg-gradient-to-br ${f.color} text-white group-hover:rotate-12 transition-transform duration-500`}>
                             {f.icon}
                          </div>
                          <div>
                            <h3 className="font-black text-2xl tracking-tight">{f.label}</h3>
                            <p className="text-xs uppercase font-black tracking-[0.2em] text-muted-foreground mt-2">
                              {isSource ? 'ACTIVE SOURCE' : 'DEPLOY TARGET'}
                            </p>
                          </div>
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-6 right-6 text-indigo-400 bg-white/5 p-2 rounded-full backdrop-blur-xl border border-white/10"
                            >
                               <CheckCircle2 className="h-8 w-8" />
                            </motion.div>
                          )}
                          {!isSource && !isSelected && (
                            <div className="absolute top-6 right-6 text-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                               <MousePointer2 className="h-8 w-8" />
                            </div>
                          )}
                       </CardContent>
                    </Card>
                  );
                })}
             </div>

             <div className="flex gap-6 max-w-3xl mx-auto pt-10">
                <Button variant="ghost" className="h-20 px-12 text-white/40 hover:text-white font-black text-xl rounded-3xl" onClick={() => setStep(1)}>
                   <ArrowLeft className="mr-3 h-6 w-6" /> BACK
                </Button>
                <Button 
                  className="flex-1 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-2xl rounded-3xl shadow-2xl shadow-indigo-600/30 group transition-all"
                  onClick={startRepurposing}
                  disabled={targetFormats.length === 0 || repurposing}
                >
                   {repurposing ? <RefreshCw className="mr-4 h-8 w-8 animate-spin" /> : <Zap className="mr-4 h-8 w-8 group-hover:scale-110 transition-transform" />}
                   {repurposing ? 'CONSTRUCTING...' : `INITIATE MULTI-TRANSFORM`}
                </Button>
             </div>
          </motion.div>
        )}

        {step === 3 && result && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-12"
          >
             <Card className="bg-white/[0.03] border-white/10 p-10 rounded-[3rem] flex flex-col md:flex-row gap-10 items-center shadow-2xl border-l-8 border-l-indigo-500">
                <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                   <Brain className="h-14 w-14 text-indigo-400" />
                </div>
                <div className="space-y-3 text-center md:text-left">
                   <span className="text-xs font-black uppercase tracking-[0.4em] text-indigo-500">Master Core Insight</span>
                   <p className="text-3xl font-black text-white leading-tight italic">"{result.coreInsight}"</p>
                   <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                      <Badge variant="outline" className="bg-white/5 border-white/10 px-4 py-1 text-xs font-bold text-white/50">{result.repurposeStrategy}</Badge>
                      <span className="text-indigo-400/40 text-xs font-black tracking-widest uppercase">Repurpose Engine v2.0</span>
                   </div>
                </div>
             </Card>

             <Tabs defaultValue={targetFormats[0]} className="space-y-10">
                <TabsList className="bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl h-20 w-full flex items-center justify-between shadow-2xl">
                   {targetFormats.map(f => (
                     <TabsTrigger key={f} value={f} className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white transition-all gap-3 mx-1">
                        {formats.find(fmt => fmt.id === f)?.icon}
                        <span className="hidden lg:inline">{formats.find(fmt => fmt.id === f)?.label}</span>
                     </TabsTrigger>
                   ))}
                </TabsList>

                {targetFormats.map(f => {
                  const data = result.repurposed[f];
                  const fmt = formats.find(fmt => fmt.id === f);
                  return (
                    <TabsContent key={f} value={f} className="mt-0">
                       <Card className="bg-zinc-950 border-white/10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.5)] rounded-[3.5rem]">
                          <div className={`h-2.5 w-full bg-gradient-to-r ${fmt?.color}`} />
                          <CardContent className="p-16 space-y-12">
                             <div className="relative group">
                                <div className="absolute -top-10 -left-10 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                   {fmt?.icon && React.cloneElement(fmt.icon as any, { className: "h-32 w-32" })}
                                </div>
                                <p className="text-2xl leading-[1.6] font-medium text-white/90 whitespace-pre-wrap selection:bg-indigo-500/40 tracking-tight">
                                   {data.content}
                                </p>
                             </div>
                             
                             <div className="pt-12 border-t border-white/5 flex flex-col xl:flex-row justify-between items-center gap-10">
                                <div className="flex items-start gap-5 max-w-2xl">
                                   <div className="p-3 rounded-2xl bg-white/5 text-white/20"><Layers className="h-6 w-6" /></div>
                                   <div className="space-y-2">
                                      <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Adaptation Logic</span>
                                      <p className="text-sm text-muted-foreground font-medium italic leading-relaxed">"{data.adaptationNote}"</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0">
                                   <div className="text-right hidden sm:block">
                                      <p className="text-xs font-black uppercase text-white/20 tracking-widest">Payload Size</p>
                                      <p className="text-xl font-black text-white">{data.wordCount} Words</p>
                                   </div>
                                   <Button 
                                     className="h-20 px-12 bg-white text-black font-black text-xl rounded-3xl hover:scale-[1.02] transition-all shadow-xl active:scale-95" 
                                     onClick={() => copyText(data.content)}
                                   >
                                      <Copy className="mr-3 h-6 w-6" /> COPY CONTENT
                                   </Button>
                                </div>
                             </div>
                          </CardContent>
                       </Card>
                    </TabsContent>
                  );
                })}
             </Tabs>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-10">
                <Button variant="outline" className="h-20 border-white/10 bg-white/5 text-white font-black text-xl rounded-3xl hover:bg-white/10 transition-all shadow-xl" onClick={downloadAll}>
                   <Download className="mr-3 h-7 w-7" /> EXPORT ALL (.TXT)
                </Button>
                <Button 
                  className="h-20 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xl rounded-3xl shadow-2xl shadow-emerald-600/30 hover:scale-[1.02] transition-all"
                  onClick={() => setLocation(`/generate?idea=${encodeURIComponent(result.coreInsight)}`)}
                >
                   <Sparkles className="mr-3 h-7 w-7" /> BUILD CAMPAIGN
                </Button>
             </div>

             <div className="flex justify-center pt-8">
                <Button variant="link" className="text-muted-foreground hover:text-white font-black text-xs uppercase tracking-[0.4em] transition-all group" onClick={() => { setStep(1); setResult(null); }}>
                   Transform New Asset <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                </Button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
