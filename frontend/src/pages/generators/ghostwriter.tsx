import React, { useState, useEffect } from "react";
import { PenTool, Brain, Sparkles, RefreshCw, Copy, Share2, AlertCircle, Wand2, Mic, Fingerprint, ChevronRight, History as HistoryIcon, Settings2, Trash2, X, Check } from "lucide-react";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { useQueryClient } from "@tanstack/react-query";

import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

interface VoiceProfile {
  sentenceStyle: string;
  vocabularyLevel: string;
  toneFingerprint: string;
  signaturePatterns: string[];
  openingStyle: string;
  closingStyle: string;
  uniqueTraits: string[];
  isStale?: boolean;
  daysSinceUpdate?: number;
}

interface GhostHistoryItem {
  id: number;
  idea: string;
  contentType: string;
  createdAt: string;
  content: {
    post: string;
    voiceMatchScore: number;
    wordCount: number;
  }
}

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.1, duration: 0.5 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
};

export default function GhostwriterPage() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram Caption");
  const [length, setLength] = useState("medium");
  const [useVoice, setUseVoice] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [history, setHistory] = useState<GhostHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingTuning, setSavingTuning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "AI Ghostwriter — GrowFlow AI";
  }, []);

  useEffect(() => {
    fetchProfile();
  }, []);

  const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");

  useEffect(() => {
    localStorage.setItem("preferred_language", language);
  }, [language]);

  const { data: sub } = useSubscriptionStatus();
  const isFreeUser = !sub?.planType || sub.planType === "free";

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/ghostwriter/voice-profile");
      setProfile(data);
      if (data) setUseVoice(true);
    } catch (err: any) {
      if (err?.status !== 404 && err?.status !== 403) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load voice profile." });
      }
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get("/ghostwriter/history");
      setHistory(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load history" });
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveTuning = async (updatedProfile: VoiceProfile) => {
    setSavingTuning(true);
    try {
      await api.patch("/ghostwriter/voice-profile", { profile: updatedProfile });
      setProfile(updatedProfile);
      toast({ title: "Profile Updated", description: "Your writing fingerprint has been tuned." });
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed" });
    } finally {
      setSavingTuning(false);
    }
  };

  const analyzeVoice = async () => {
    setAnalyzing(true);
    try {
      const { data } = await api.post("/ghostwriter/analyze-voice");
      setProfile(data.voiceProfile);
      setUseVoice(true);
      toast({ title: "Analysis Successful", description: "Your unique voice fingerprint has been captured." });
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Analysis Failed", 
        description: err.response?.data?.message || "Please generate more content first." 
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const writeContent = async () => {
    if (!topic) return;
    setWriting(true);
    try {
      const { data } = await api.post("/ghostwriter/write", {
        topic,
        platform,
        length,
        useVoice,
        language
      });
      setOutput(data);
      fetchHistory(); // Refresh history after writing
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
    } catch (err) {
      toast({ variant: "destructive", title: "Generation Error", description: "Something went wrong. Please try again." });
    } finally {
      setWriting(false);
    }
  };
  const [showGuide, setShowGuide] = useState(false);

  return (
    <PageWrapper maxWidth="xl" className="pb-24 md:pb-8 relative overflow-x-hidden min-h-screen">
      <FeatureGuideBanner 
        toolKey="ghostwriter" 
        title="AI Ghostwriter" 
        icon={<Brain className="w-5 h-5 text-violet-400" />}
        tagline="Teach the AI your exact brand voice, vocabulary, and rhythm for indistinguishable content."
        whatYouGet={["Voice extraction from text", "Style-matched generations", "Indistinguishable AI content", "Multi-platform export"]}
        whenToUse="Use this when you want AI to write content that sounds exactly like you, rather than generic AI output."
        proTip="The more text you provide (at least 500 words), the better the AI can mimic your specific quirks and sentence structures."
        planRequired="Infinity"
        forceOpen={showGuide}
      />
      <div className="relative z-10 py-12 space-y-12">
        <PageHeader 
          icon={<Brain />}
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-400"
          title="AI Ghostwriter"
          subtitle="Your voice, amplified by intelligence."
          badge="Infinity"
          onInfoClick={() => setShowGuide(prev => !prev)}
          action={
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-x-auto no-scrollbar">
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-white/60 hover:text-white px-3" onClick={fetchHistory}>
                    <HistoryIcon className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
                 </Button>
               </SheetTrigger>
               <SheetContent className="bg-zinc-950 border-white/10 text-white w-full sm:max-w-md">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-white text-2xl font-black">Generation History</SheetTitle>
                    <SheetDescription className="text-zinc-400">Your past ghostwritten masterpieces.</SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-20"><RefreshCw className="animate-spin h-8 w-8 text-rose-500" /></div>
                    ) : history.length === 0 ? (
                      <div className="text-center py-20 text-zinc-500 font-bold">No history yet. Start manifesting!</div>
                    ) : (
                      <div className="space-y-4">
                        {history.map(item => (
                          <Card key={item.id} className="bg-white/5 border-white/10 hover:border-rose-500/50 transition-colors cursor-pointer group" onClick={() => setOutput(item.content)}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex justify-between items-start">
                                <Badge className="bg-rose-500/20 text-rose-400 text-[10px] uppercase">{item.contentType}</Badge>
                                <span className="text-[10px] text-zinc-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm font-bold line-clamp-2 text-zinc-200 group-hover:text-white">{item.idea}</p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                 <Fingerprint className="h-3 w-3 text-emerald-500" />
                                 <span>{item.content.voiceMatchScore}% Match</span>
                                 <span className="ml-auto">{item.content.wordCount} words</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
               </SheetContent>
             </Sheet>

             <Sheet>
               <SheetTrigger asChild disabled={!profile}>
                 <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-white/60 hover:text-white px-3" disabled={!profile}>
                    <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Tuning</span>
                 </Button>
               </SheetTrigger>
               <SheetContent className="bg-zinc-950 border-white/10 text-white w-full sm:max-w-md">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-white text-2xl font-black">Voice Tuning</SheetTitle>
                    <SheetDescription className="text-zinc-400">Manually refine your writing fingerprint.</SheetDescription>
                  </SheetHeader>
                  {profile && (
                    <ScrollArea className="h-[calc(100vh-180px)] pr-4">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Tone Fingerprint</label>
                          <Input 
                            value={profile.toneFingerprint} 
                            onChange={(e) => setProfile({...profile, toneFingerprint: e.target.value})}
                            className="bg-white/5 border-white/10 h-11 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Sentence Style</label>
                          <Input 
                            value={profile.sentenceStyle} 
                            onChange={(e) => setProfile({...profile, sentenceStyle: e.target.value})}
                            className="bg-white/5 border-white/10 h-11 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Vocabulary Level</label>
                          <Input 
                            value={profile.vocabularyLevel} 
                            onChange={(e) => setProfile({...profile, vocabularyLevel: e.target.value})}
                            className="bg-white/5 border-white/10 h-11 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Opening Style</label>
                          <Input 
                            value={profile.openingStyle} 
                            onChange={(e) => setProfile({...profile, openingStyle: e.target.value})}
                            className="bg-white/5 border-white/10 h-11 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Closing Style</label>
                          <Input 
                            value={profile.closingStyle} 
                            onChange={(e) => setProfile({...profile, closingStyle: e.target.value})}
                            className="bg-white/5 border-white/10 h-11 text-base"
                          />
                        </div>
                        <Button 
                          onClick={() => saveTuning(profile)} 
                          className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-12 rounded-xl text-base"
                          disabled={savingTuning}
                        >
                          {savingTuning ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                          Save Changes
                        </Button>
                      </div>
                    </ScrollArea>
                  )}
               </SheetContent>
             </Sheet>
          </div>
        }
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
      >
        {/* Left Column: Voice DNA & Config */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Fingerprint className="h-5 w-5 text-indigo-400" />
                    Voice DNA
                  </CardTitle>
                  {profile && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-black tracking-tighter">
                      Verified
                    </Badge>
                  )}
                </div>
                <CardDescription>Your unique writing fingerprint.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                {!profile ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200/70 leading-relaxed">
                        We need at least 5 generations to build your voice profile. 
                        <span className="block mt-1 font-bold text-amber-500">Train your model to unlock Ghostwriting.</span>
                      </p>
                    </div>
                    <Button 
                      onClick={analyzeVoice} 
                      disabled={analyzing}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 rounded-xl shadow-lg shadow-indigo-600/20"
                    >
                      {analyzing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                      Capture Voice DNA
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase font-black text-muted-foreground block mb-1">Tone</span>
                        <span className="text-sm font-bold text-indigo-300">{profile.toneFingerprint}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase font-black text-muted-foreground block mb-1">Style</span>
                        <span className="text-sm font-bold text-rose-300">{profile.sentenceStyle}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-black text-muted-foreground block tracking-widest">Key Traits</span>
                      <div className="flex flex-wrap gap-2">
                        {profile.uniqueTraits.map(trait => (
                          <Badge key={trait} variant="secondary" className="bg-white/5 text-white/70 hover:bg-white/10 transition-colors">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-indigo-400" />
                          <span className="text-sm font-bold">DNA Mode</span>
                        </div>
                        <Switch 
                          checked={useVoice} 
                          onCheckedChange={setUseVoice}
                          className="data-[state=checked]:bg-indigo-500"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">When enabled, AI strictly adheres to your sentence length, vocabulary, and punctuation patterns.</p>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={analyzeVoice}
                      className="w-full border-white/5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white h-10 rounded-xl"
                    >
                      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                      Refresh Analysis
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Editor & Generation */}
        <div className="lg:col-span-8 space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="bg-white/[0.03] border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <PenTool className="h-64 w-64" />
              </div>
              <CardContent className="p-8 space-y-8 relative">
                {profile?.isStale && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                    <span className="text-amber-400">⚠️</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-400">Voice profile is {profile.daysSinceUpdate} days old</p>
                      <p className="text-[11px] text-white/40">Your writing style may have evolved. Retrain for better accuracy.</p>
                    </div>
                    <button onClick={analyzeVoice} className="ml-auto text-xs text-amber-400 underline hover:text-amber-300 transition-colors">
                      {analyzing ? "Analyzing..." : "Retrain"}
                    </button>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label htmlFor="content-focus" className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      Content Focus
                    </label>
                    <span className="text-[10px] font-bold text-muted-foreground italic">Try: "The future of AI in 2025"</span>
                  </div>
                  <div className="relative">
                    <Textarea 
                      id="content-focus"
                      placeholder="Tell the Ghostwriter what to write about... be as specific as you want." 
                      className="min-h-[120px] md:min-h-[160px] text-base md:text-xl font-medium bg-transparent border-none focus-visible:ring-0 p-0 placeholder:text-white/10 resize-none"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                    <div className="absolute bottom-0 right-0 flex items-center gap-3">
                       <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">{topic.length} characters</span>
                       <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">{topic.trim() ? topic.trim().split(/\s+/).length : 0} words</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-white/5">
                  <div className="space-y-3">
                    <label htmlFor="platform-target" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Platform Target</label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger id="platform-target" className="bg-white/5 border-white/10 h-12 rounded-xl text-white font-bold text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="Instagram Caption">Instagram Caption</SelectItem>
                        <SelectItem value="LinkedIn Post">LinkedIn Post</SelectItem>
                        <SelectItem value="Twitter Thread">Twitter Thread</SelectItem>
                        <SelectItem value="YouTube Description">YouTube Description</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Output Language</label>
                    <LanguageSelector 
                      value={language} 
                      onChange={setLanguage} 
                      isFreeUser={isFreeUser}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Desired Length</label>
                    <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-xl border border-white/5">
                      {["short", "medium", "long"].map(l => (
                        <button
                          key={l}
                          onClick={() => setLength(l)}
                          className={`py-2.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${length === l ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={writeContent} 
                  disabled={writing || !topic}
                  className="w-full h-14 md:h-16 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-base md:text-xl font-black shadow-2xl shadow-rose-600/30 group relative overflow-hidden rounded-2xl"
                >
                  <motion.div 
                    className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
                  />
                  <div className="relative flex items-center justify-center gap-3">
                    {writing ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6 group-hover:scale-125 transition-transform" />}
                    {writing ? "Summoning Voice..." : "Manifest Content"}
                  </div>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

            {!writing && !output && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center py-12 px-6 text-center min-h-[400px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-white/25 text-sm font-medium">Your ghostwritten content will appear here</p>
                <p className="text-white/15 text-xs mt-1">Configure your focus and target on the left and hit Manifest Content</p>
              </motion.div>
            )}
            {output && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <Card className="bg-white/[0.03] border-emerald-500/20 backdrop-blur-3xl overflow-hidden shadow-2xl">
                  <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">DNA Match</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xl font-black text-emerald-400">{output.voiceMatchScore}%</span>
                           <div className="w-24 h-1.5 bg-emerald-500/10 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${output.voiceMatchScore}%` }}
                                className="h-full bg-emerald-500"
                              />
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-emerald-400" onClick={() => {
                              navigator.clipboard.writeText(output.post);
                              toast({ title: "Copied", description: "Content copied to clipboard." });
                            }}>
                              <Copy className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy to Clipboard</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-emerald-400">
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-10">
                    <div className="prose prose-invert max-w-none">
                      <p className="text-xl leading-relaxed font-medium text-white/90 whitespace-pre-wrap selection:bg-rose-500/30">
                        {output.post}
                      </p>
                    </div>
                    
                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex gap-2">
                           <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40">#YourVoice</Badge>
                           <Badge variant="outline" className="bg-white/5 border-white/10 text-white/40">{output.wordCount} Words</Badge>
                        </div>
                        <Button variant="link" className="text-muted-foreground hover:text-white h-auto p-0 flex items-center gap-1">
                          Refined by AI DNA Fingerprint <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
