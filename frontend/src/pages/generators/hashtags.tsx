import React, { useState, useEffect } from "react";
import { Hash, Sparkles, Filter, ShieldAlert, CheckCircle2, Copy, Save, Trash2, LayoutGrid, Search, AlertCircle, RefreshCw, Globe, Zap, Smartphone } from "lucide-react";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

import { useSubscriptionStatus } from "@/hooks/useSubscription";
import { LanguageSelector } from "@/components/shared/LanguageSelector";

const containerVariants = {
 hidden: { opacity: 0 },
 visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: { opacity: 1, y: 0 }
};

export default function HashtagsPage() {
 const [activeTab, setActiveTab] = useState("generate");
 const [topic, setTopic] = useState("");
 const [niche, setNiche] = useState("");
 const [platform, setPlatform] = useState("Instagram");
 const [strategy, setStrategy] = useState("mixed");
 const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");

 useEffect(() => {
  localStorage.setItem("preferred_language", language);
 }, [language]);

 const { data: sub } = useSubscriptionStatus();
 const isFreeUser = !sub?.planType || sub.planType === "free";

 const [generating, setGenerating] = useState(false);
 const [result, setResult] = useState<any>(null);

 const [analyzeText, setAnalyzeText] = useState("");
 const [analyzing, setAnalyzing] = useState(false);
 const [analysisResult, setAnalysisResult] = useState<any>(null);

 const [collections, setCollections] = useState<any[]>([]);
 const [loadingCollections, setLoadingCollections] = useState(false);
 const [saveDialogOpen, setSaveDialogOpen] = useState(false);
 const [collectionName, setCollectionName] = useState("");

 const { toast } = useToast();

 useEffect(() => {
  if (activeTab === "collections") fetchCollections();
 }, [activeTab]);

 const fetchCollections = async () => {
  setLoadingCollections(true);
  try {
   const { data } = await api.get("/hashtags/collections");
   setCollections(data);
  } catch (err) {
   console.error(err);
   toast({ variant: "destructive", title: "Failed to load collections" });
  } finally {
   setLoadingCollections(false);
  }
 };

 const generateHashtags = async () => {
  if (!topic) {
   toast({ variant: "destructive", title: "Topic required", description: "Please enter a strategic topic first." });
   return;
  }
  setGenerating(true);
  try {
   const { data } = await api.post("/hashtags/generate", {
    topic, niche, platform, language, strategy
   });
   setResult(data);
   toast({ title: "Intelligence Gathered", description: "Your strategic hashtag set is ready." });
   const { queryClient } = await import("@/lib/queryClient");
   queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
  } catch (err) {
   console.error(err);
   toast({ variant: "destructive", title: "Generation failed" });
  } finally {
   setGenerating(false);
  }
 };

 const analyzeHashtags = async () => {
  if (!analyzeText) return;
  setAnalyzing(true);
  try {
   const { data } = await api.post("/hashtags/analyze", {
    hashtags: analyzeText, platform, niche
   });
   setAnalysisResult(data);
   const { queryClient } = await import("@/lib/queryClient");
   queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
  } catch (err) {
   console.error(err);
   toast({ variant: "destructive", title: "Analysis failed" });
  } finally {
   setAnalyzing(false);
  }
 };

 const saveCollection = async () => {
  if (!collectionName || !result) return;
  try {
   const tags = [...result.primary, ...result.secondary].map(t => t.tag);
   await api.post("/hashtags/save-collection", {
    name: collectionName, platform, tags
   });
   setSaveDialogOpen(false);
   setCollectionName("");
   toast({ title: "Collection saved!" });
  } catch (err) {
   console.error(err);
   toast({ variant: "destructive", title: "Failed to save collection" });
  }
 };

 const deleteCollection = async (id: string) => {
  try {
   await api.delete(`/hashtags/collections/${id}`);
   setCollections(prev => prev.filter(c => c.id !== id));
   toast({ title: "Collection deleted" });
  } catch (err) {
   console.error(err);
   toast({ variant: "destructive", title: "Failed to delete" });
  }
 };

 const copyTags = (tags: string) => {
  navigator.clipboard.writeText(tags);
  toast({ title: "Copied to Clipboard", description: "The hashtag set is ready to paste." });
 };

 const getCompColor = (level: string) => {
  if (level === "low") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (level === "medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
 };

 const [showGuide, setShowGuide] = useState(false);

 return (
  <PageWrapper maxWidth="xl" className="pb-24 md:pb-8 relative overflow-x-hidden min-h-screen">
   <FeatureGuideBanner 
    toolKey="hashtags" 
    title="Hashtag Intelligence" 
    icon={<Hash className="w-5 h-5 text-[#8B91E3]" />}
    tagline="Strategic hashtag sets that bypass low-reach traps and feed the algorithm's specific needs."
    whatYouGet={["Viral hashtag sets", "Competition analysis", "Blacklist protection", "Custom collections"]}
    whenToUse="Use this for every post to maximize discovery. Don't just pick random tags; pick the ones that match your topic's specific momentum."
    proTip="Using 3-5 high-volume tags mixed with 15-20 niche-specific low-competition tags is the current 'sweet spot' for reach."
    planRequired="Creator"
    forceOpen={showGuide}
   />
   <div className="relative z-10 py-12 space-y-12">
    <PageHeader 
     icon={<Hash />}
     iconBg="bg-pink-500/10"
     iconColor="text-pink-400"
     title="Hashtag Intelligence"
     subtitle="Strategy-grade hashtags that drive discovery."
     badge="Creator"
     onInfoClick={() => setShowGuide(prev => !prev)}
    />
    

    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
     <div className="flex justify-center mb-12">
      <div className="bg-white/5 p-1.5 rounded-[2rem] border border-white/10 backdrop-blur-3xl shadow-2xl inline-flex">
       <TabsList className="bg-transparent h-12">
        <TabsTrigger value="generate" className="rounded-2xl px-8 h-9 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black transition-all">
         Generate
        </TabsTrigger>
        <TabsTrigger value="analyze" className="rounded-2xl px-8 h-9 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black transition-all">
         Audit
        </TabsTrigger>
        <TabsTrigger value="collections" className="rounded-2xl px-8 h-9 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black transition-all">
         Library
        </TabsTrigger>
       </TabsList>
      </div>
     </div>

     <AnimatePresence mode="wait">
      <TabsContent value="generate" className="mt-0">
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="grid grid-cols-1 xl:grid-cols-12 gap-12"
       >
        {/* Configuration Card */}
        <div className="xl:col-span-5 space-y-8">
         <Card className="bg-white/[0.03] border-white/10 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden">
          <CardHeader className="p-10 pb-6 border-b border-white/5">
           <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
             <Filter className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
             <CardTitle className="text-2xl font-black">Strategic Intent</CardTitle>
             <CardDescription>Configure your hashtag ecosystem</CardDescription>
            </div>
           </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
           <div className="space-y-4">
            <label htmlFor="post-topic" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">The Post Topic</label>
            <Input 
             id="post-topic"
             placeholder="e.g. 5 Morning Habits for High Performance" 
             value={topic} 
             onChange={(e) => setTopic(e.target.value)}
             className="bg-white/[0.02] border-white/10 h-16 rounded-[1.5rem] text-lg font-bold focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
           </div>
           
           <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
             <label htmlFor="platform-select" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Platform</label>
             <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform-select" className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold text-base">
               <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10">
               <SelectItem value="Instagram">Instagram</SelectItem>
               <SelectItem value="Twitter">Twitter (X)</SelectItem>
               <SelectItem value="YouTube">YouTube</SelectItem>
               <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              </SelectContent>
             </Select>
            </div>
            <div className="space-y-4">
             <label htmlFor="strategy-select" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Strategy</label>
             <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger id="strategy-select" className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold text-base">
               <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10">
               <SelectItem value="growth">Growth Focus</SelectItem>
               <SelectItem value="reach">Reach Focus</SelectItem>
               <SelectItem value="niche">Niche Focus</SelectItem>
               <SelectItem value="mixed">Mixed Strategy</SelectItem>
              </SelectContent>
             </Select>
            </div>
           </div>

           <div className="space-y-4">
            <label htmlFor="target-language" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Target Language</label>
            <div id="target-language">
             <LanguageSelector 
              value={language} 
              onChange={setLanguage} 
              isFreeUser={isFreeUser}
             />
            </div>
           </div>

           <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
            <div className="flex gap-4">
             <Zap className="h-5 w-5 text-indigo-400 shrink-0" />
             <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              For maximum reach, use the "Mixed" strategy. It balances low-competition tags with high-volume exposure tags.
             </p>
            </div>
           </div>

           <Button 
            className="w-full h-20 bg-white text-black hover:bg-zinc-200 text-xl font-black rounded-[2rem] shadow-2xl transition-all disabled:opacity-50"
            onClick={generateHashtags}
            disabled={generating || !topic}
           >
            {generating ? (
             <RefreshCw className="mr-3 h-6 w-6 animate-spin" />
            ) : (
             <Sparkles className="mr-3 h-6 w-6" />
            )}
            {generating ? "ANALYZING ALGORITHM..." : "GENERATE INTELLIGENCE"}
           </Button>
          </CardContent>
         </Card>
        </div>

        {/* Results Column */}
        <div className="xl:col-span-7">
         <AnimatePresence mode="wait">
          {result ? (
           <motion.div 
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
           >
            <Card className="bg-white/[0.03] border-white/10 rounded-[3rem] border-l-[12px] border-l-indigo-600 overflow-hidden shadow-2xl">
             <CardContent className="p-10 flex gap-8 items-start">
              <div className="p-5 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20">
                <ShieldAlert className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 block mb-2">Strategy Directive</span>
               <p className="text-2xl font-bold text-white leading-tight italic">"{result.strategyNote}"</p>
              </div>
             </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-8">
             <Card className="bg-white/[0.03] border-white/10 rounded-[3rem] overflow-hidden p-10 space-y-10">
              <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <Zap className="h-5 w-5 text-indigo-400" />
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Primary Growth Tags</h3>
               </div>
               <div className="flex flex-wrap gap-3">
                {result.primary.map((tag: any) => (
                 <TooltipProvider key={tag.tag}>
                  <Tooltip>
                   <TooltipTrigger asChild>
                    <Badge className={`px-5 py-3 rounded-2xl border text-base font-bold flex items-center gap-3 transition-all cursor-default hover:scale-105 shadow-lg break-all whitespace-normal ${getCompColor(tag.competitionLevel)}`}>
                     #{tag.tag}
                     <span className="text-[9px] font-black uppercase opacity-40 px-2 py-0.5 rounded-full bg-black/20">{tag.category}</span>
                    </Badge>
                   </TooltipTrigger>
                   <TooltipContent className="bg-zinc-950 border-white/10 text-white p-4 rounded-2xl shadow-2xl">
                    <div className="space-y-3 min-w-[150px]">
                      <div className="space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Est. Volume</p>
                       <p className="text-lg font-black text-white">{tag.estimatedPosts}</p>
                      </div>
                      <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                       <span className="text-[9px] uppercase font-black text-muted-foreground">Relevance</span>
                       <span className="text-[10px] font-black text-indigo-400">{tag.relevanceScore}%</span>
                      </div>
                    </div>
                   </TooltipContent>
                  </Tooltip>
                 </TooltipProvider>
                ))}
               </div>
              </div>

              <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <Globe className="h-5 w-5 text-muted-foreground" />
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Secondary Reach Tags</h3>
               </div>
               <div className="flex flex-wrap gap-3">
                {result.secondary.map((tag: any) => (
                 <Badge key={tag.tag} variant="outline" className="px-5 py-3 rounded-2xl border-white/5 bg-white/[0.02] text-white/40 font-bold text-base hover:bg-white/5 hover:text-white/60 transition-all cursor-default">
                  #{tag.tag}
                 </Badge>
                ))}
               </div>
              </div>
             </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="bg-white/[0.03] border-white/10 rounded-[3rem] p-8 space-y-6">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" /> Blacklisted
               </h3>
               <div className="space-y-4">
                {result.avoid.map((a: any) => (
                 <div key={a.tag} className="flex gap-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 items-center">
                  <Trash2 className="h-5 w-5 text-rose-500 shrink-0" />
                  <div>
                   <p className="text-sm font-black text-rose-400">#{a.tag}</p>
                   <p className="text-[10px] text-muted-foreground font-medium leading-tight">{a.reason}</p>
                  </div>
                 </div>
                ))}
               </div>
              </Card>
              <Card className="bg-white/[0.03] border-white/10 rounded-[3rem] p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-150 transition-transform duration-700">
                 <Smartphone className="h-20 w-20" />
               </div>
               <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2 relative z-10">
                 <Smartphone className="h-4 w-4" /> Algorithm Check
               </h3>
               <p className="text-sm text-muted-foreground leading-relaxed italic font-medium pt-4 relative z-10">"{result.platformNote}"</p>
              </Card>
             </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
             <Button className="flex-1 h-20 bg-white text-black font-black text-2xl rounded-[2rem] hover:scale-[1.02] transition-all shadow-2xl" onClick={() => copyTags(result.copyableSet)}>
              <Copy className="mr-3 h-7 w-7" /> COPY FULL SET
             </Button>
             <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
               <Button variant="outline" className="flex-1 h-20 border-white/10 bg-white/5 font-black text-2xl rounded-[2rem] hover:bg-white/10 transition-all">
                <Save className="mr-3 h-7 w-7" /> SAVE SET
               </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/10 text-white rounded-[3rem] p-10 max-w-lg">
               <DialogHeader className="space-y-3">
                <DialogTitle className="text-3xl font-black italic">Archive Collection</DialogTitle>
                <CardDescription className="text-base">Save this growth pack to your private library for reuse.</CardDescription>
               </DialogHeader>
               <div className="py-8 space-y-6">
                <div className="space-y-3">
                  <label htmlFor="collection-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Collection Name</label>
                  <Input 
                  id="collection-name"
                  placeholder="e.g. Q2 Growth Strategy" 
                  value={collectionName} 
                  onChange={(e) => setCollectionName(e.target.value)}
                  className="bg-white/5 border-white/10 h-16 rounded-[1.5rem] text-lg font-bold"
                 />
                </div>
               </div>
               <DialogFooter>
                <Button onClick={saveCollection} className="w-full h-16 bg-white text-black hover:bg-zinc-200 font-black text-xl rounded-2xl transition-all">CONFIRM ARCHIVE</Button>
               </DialogFooter>
              </DialogContent>
             </Dialog>
            </div>
           </motion.div>
          ) : (
           <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center py-12 px-6 text-center min-h-[400px]"
           >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
             <Sparkles className="w-5 h-5" style={{ color: "var(--text-disabled)" }} />
            </div>
            <p className="text-white/25 text-sm font-medium">Your hashtags will appear here</p>
            <p className="text-white/15 text-xs mt-1">Enter your topic on the left and hit Generate</p>
           </motion.div>
          )}
         </AnimatePresence>
        </div>
       </motion.div>
      </TabsContent>

      <TabsContent value="analyze" className="mt-0">
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto space-y-12"
       >
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-3xl rounded-[3rem] overflow-hidden shadow-2xl">
         <CardHeader className="p-10 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
           <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20">
            <Search className="h-6 w-6 text-pink-400" />
           </div>
           <div>
            <CardTitle className="text-2xl font-black">Performance Audit</CardTitle>
            <CardDescription>Scan your current hashtag sets for leaks</CardDescription>
           </div>
          </div>
         </CardHeader>
         <CardContent className="p-10 space-y-10">
          <div className="space-y-4">
            <label htmlFor="hashtag-stream" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Raw Hashtag Stream</label>
            <Textarea 
            id="hashtag-stream"
            placeholder="Paste your current hashtags here... (e.g. #growth #marketing #business)"
            className="min-h-[180px] bg-white/[0.02] border-white/10 rounded-[2rem] text-xl p-8 leading-relaxed resize-none focus:ring-2 focus:ring-pink-500/50 transition-all"
            value={analyzeText}
            onChange={(e) => setAnalyzeText(e.target.value)}
           />
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
             <label htmlFor="platform-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Platform</label>
             <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform-select" className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold">
               <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10">
               <SelectItem value="Instagram">Instagram</SelectItem>
               <SelectItem value="Twitter">Twitter (X)</SelectItem>
               <SelectItem value="YouTube">YouTube</SelectItem>
               <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              </SelectContent>
             </Select>
            </div>
            <div className="space-y-3">
             <label htmlFor="niche-select" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Niche Context</label>
             <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger id="niche-select" className="bg-white/5 border-white/10 h-14 rounded-2xl font-bold">
               <SelectValue placeholder="Niche" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/10">
               <SelectItem value="Fitness">Fitness</SelectItem>
               <SelectItem value="Finance">Finance</SelectItem>
               <SelectItem value="Tech">Tech</SelectItem>
               <SelectItem value="Business">Business</SelectItem>
              </SelectContent>
             </Select>
            </div>
          </div>

          <Button 
           className="w-full h-20 bg-white text-black hover:bg-zinc-200 font-black text-2xl rounded-[2rem] shadow-2xl transition-all"
           onClick={analyzeHashtags}
           disabled={analyzing || !analyzeText}
          >
           {analyzing ? <RefreshCw className="mr-4 h-8 w-8 animate-spin" /> : <Search className="mr-4 h-8 w-8" />}
           {analyzing ? "SCANNING STREAM..." : "EXECUTE PERFORMANCE AUDIT"}
          </Button>
         </CardContent>
        </Card>

        <AnimatePresence>
         {analysisResult && (
          <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-12 pb-24"
          >
           <div className="flex flex-col md:flex-row items-center gap-10 bg-white/[0.03] p-10 rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <CheckCircle2 className="h-32 w-32" />
            </div>
            <div className={`w-32 h-32 shrink-0 rounded-[2.5rem] flex items-center justify-center text-7xl font-black shadow-2xl ${
             analysisResult.grade === "A" ? "bg-emerald-500 text-black" :
             analysisResult.grade === "B" ? "bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/50" :
             analysisResult.grade === "C" ? "bg-amber-500/20 text-amber-500 border-2 border-amber-500/50" :
             "bg-rose-500/20 text-rose-500 border-2 border-rose-500/50"
            }`}>
             {analysisResult.grade}
            </div>
            <div className="space-y-2 text-center md:text-left">
             <h4 className="text-4xl font-black italic">Quality Benchmark</h4>
             <p className="text-xl text-muted-foreground font-medium max-w-xl leading-relaxed">{analysisResult.gradeReason}</p>
            </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-3">
               <ShieldAlert className="h-5 w-5" /> Efficiency Leaks
             </h4>
             <div className="space-y-4">
              {analysisResult.issues.map((issue: any) => (
               <div key={issue.tag} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex gap-6 items-start hover:bg-white/5 transition-all">
                <div className={`p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 ${issue.severity === "high" ? "animate-pulse" : ""}`}>
                  <AlertCircle className={`h-6 w-6 ${issue.severity === "high" ? "text-rose-500" : "text-amber-500"}`} />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black text-white">#{issue.tag}</p>
                  <p className="text-sm text-muted-foreground font-medium leading-tight">{issue.issue}</p>
                </div>
               </div>
              ))}
             </div>
            </div>
            <div className="space-y-6">
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3">
               <Zap className="h-5 w-5" /> Optimizations
             </h4>
             <div className="space-y-4">
              {analysisResult.recommendations.map((rec: string) => (
               <div key={rec} className="flex gap-5 items-start p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
                <CheckCircle2 className="h-6 w-6 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-base text-muted-foreground font-medium leading-relaxed italic">"{rec}"</p>
               </div>
              ))}
             </div>
            </div>
           </div>

           <Card className="bg-gradient-to-br from-indigo-600/20 to-indigo-900/20 border-white/10 rounded-[4rem] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Sparkles className="h-48 w-48 text-white" />
            </div>
            <CardHeader className="p-12 pb-6">
             <CardTitle className="text-3xl font-black italic">Optimized Hash-Stream</CardTitle>
            </CardHeader>
            <CardContent className="p-12 pt-0 space-y-10">
             <p className="text-2xl text-indigo-100 font-bold leading-relaxed tracking-tight">
              {analysisResult.improvedSet}
             </p>
             <Button className="w-full h-20 bg-white text-black font-black text-2xl rounded-[2rem] shadow-2xl hover:scale-[1.02] transition-all" onClick={() => copyTags(analysisResult.improvedSet)}>
              <Copy className="mr-4 h-7 w-7" /> COPY OPTIMIZED STREAM
             </Button>
            </CardContent>
           </Card>
          </motion.div>
         )}
        </AnimatePresence>
       </motion.div>
      </TabsContent>

      <TabsContent value="collections" className="mt-0">
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-12"
       >
         {(() => {
          if (loadingCollections) {
           return <div className="flex justify-center py-40"><RefreshCw className="h-12 w-12 animate-spin text-white/10" /></div>;
          }
          if (collections.length === 0) {
           return (
            <div className="text-center py-40 opacity-20 space-y-8 flex flex-col items-center">
             <div className="p-16 rounded-[5rem] bg-white/5 border border-white/5">
               <LayoutGrid className="h-32 w-32 mx-auto" />
             </div>
             <div className="space-y-2">
               <h3 className="text-4xl font-black italic tracking-tight">Library Empty</h3>
               <p className="text-lg font-medium">Save generated sets to see them here.</p>
             </div>
            </div>
           );
          }
          return (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map(col => (
             <Card key={col.id} className="bg-white/[0.03] border-white/10 rounded-[3rem] group hover:border-indigo-500/30 transition-all overflow-hidden flex flex-col shadow-2xl">
              <CardHeader className="flex flex-row justify-between items-start p-10 pb-6">
               <div>
                <CardTitle className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{col.name}</CardTitle>
                <CardDescription className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground mt-2">{col.platform}</CardDescription>
               </div>
               <Button variant="ghost" size="icon" className="h-12 w-12 text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all rounded-2xl" onClick={() => deleteCollection(col.id)}>
                <Trash2 className="h-6 w-6" />
               </Button>
              </CardHeader>
              <CardContent className="p-10 pt-0 space-y-8 flex-1 flex flex-col justify-between">
               <div className="flex flex-wrap gap-2">
                {col.tags.slice(0, 12).map((t: string) => (
                 <span key={t} className="text-xs font-bold text-white/30 group-hover:text-white/60 transition-colors">#{t}</span>
                ))}
                {col.tags.length > 12 && <span className="text-[10px] font-black text-indigo-500/50">+{col.tags.length - 12} MORE</span>}
               </div>
               <Button variant="secondary" className="w-full h-16 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white hover:text-black transition-all font-black uppercase tracking-[0.15em] text-sm" onClick={() => copyTags(col.tags.join(" "))}>
                 <Copy className="mr-2 h-5 w-5" /> Copy Pack
               </Button>
              </CardContent>
             </Card>
            ))}
           </div>
          );
         })()}
       </motion.div>
      </TabsContent>
     </AnimatePresence>
    </Tabs>
   </div>
  </PageWrapper>
 );
}
