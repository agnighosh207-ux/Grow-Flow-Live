import React, { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Zap, Instagram, Twitter, Check, X, Info, RefreshCw, History, ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { useLocation } from "wouter";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyOutputState } from "@/components/shared/EmptyOutputState";

import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { useSubscriptionStatus } from "@/hooks/useSubscription";

interface PredictionResult {
 overallScore: number;
 algorithmScore: number;
 hookScore: number;
 retentionScore: number;
 ctaScore: number;
 verdict: string;
 verdictReason: string;
 algorithmSignals: { signal: string; impact: "positive" | "negative" | "neutral"; explanation: string }[];
 hookAnalysis: { strength: string; issue: string | null; improvedVersion: string };
 retentionPoints: { moment: string; risk: string }[];
 topFix: string;
 improvedVersion: string;
 platformSpecificTips: string[];
 platform?: string;
 timestamp?: number;
}

export default function PredictorPage() {
 const [content, setContent] = useState("");
 const [platform, setPlatform] = useState("Instagram");
 const [niche, setNiche] = useState("General");
 const [contentType, setContentType] = useState("Post");
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<PredictionResult | null>(null);
 const { toast } = useToast();
 const [, setLocation] = useLocation();
 const queryClient = useQueryClient();

 const [language, setLanguage] = useState(localStorage.getItem("preferred_language") || "English");

 useEffect(() => {
  localStorage.setItem("preferred_language", language);
 }, [language]);

 usePageTitle("Viral Score");

 const { data: sub } = useSubscriptionStatus();
 const isFreeUser = !sub?.planType || sub.planType === "free";

 const { data: history = [] } = useQuery({
  queryKey: ["predictor-history"],
  queryFn: () => api.get("/predictor/history").then(r => r.data),
  staleTime: 5 * 60 * 1000,
 });

 const handlePredict = async () => {
  if (content.length < 50) {
   toast({ variant: "destructive", title: "Content too short", description: "Please paste at least 50 characters." });
   return;
  }
  setLoading(true);
  try {
   const { data } = await api.post("/predictor/analyze", { content, platform, niche, contentType, language });
   const newResult = { ...data, platform, timestamp: Date.now() };
   setResult(newResult);
   
   queryClient.invalidateQueries({ queryKey: ["predictor-history"] });
   queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
  } catch (err) {
   toast({ variant: "destructive", title: "Prediction failed", description: "AI service unavailable." });
  } finally {
   setLoading(false);
  }
 };

 const getScoreColor = (score: number) => {
  if (score < 40) return "text-red-500 stroke-red-500";
  if (score < 70) return "text-amber-500 stroke-amber-500";
  return "text-emerald-500 stroke-emerald-500";
 };

 const ScoreCircle = ({ score, label, size = "md" }: { score: number, label: string, size?: "sm" | "md" }) => {
  const radius = size === "md" ? 45 : 20;
  const strokeWidth = size === "md" ? 8 : 4;
  const center = size === "md" ? 50 : 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
   <div className="flex flex-col items-center justify-center">
    <svg width={center * 2} height={center * 2} className="transform -rotate-90">
     <circle cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-muted/10" />
     <motion.circle
      initial={{ strokeDashoffset: circumference }}
      animate={{ strokeDashoffset: offset }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      cx={center} cy={center} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent"
      strokeDasharray={circumference} className={getScoreColor(score)}
     />
    </svg>
    <span className={`font-black mt-1 ${size === "md" ? "text-2xl" : "text-sm"} ${getScoreColor(score)}`}>{score}</span>
    <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{label}</span>
   </div>
  );
 };

 const [showGuide, setShowGuide] = useState(false);

 return (
  <PageWrapper maxWidth="lg" className="pb-24 md:pb-8 space-y-10">
   <FeatureGuideBanner 
    toolKey="predictor" 
    title="Viral Predictor" 
    icon={<TrendingUp className="w-5 h-5 text-[#8B91E3]" />}
    tagline="Know if your post will flop before you hit publish. Our AI simulates the algorithm's reaction."
    whatYouGet={["Virality score (0-100)", "Hook strength audit", "Algorithm signal analysis"]}
    whenToUse="Use this right before you post. If your score is below 70, use the suggested 'Top Fix' to improve it."
    proTip="The 'Improved Version' provided in the results isn't just a suggestion — it's optimized for the specific platform's current algorithm."
    planRequired="Infinity"
    forceOpen={showGuide}
   />
   <PageHeader 
    icon={<TrendingUp/>} 
    iconBg="bg-emerald-500/10" 
    iconColor="text-emerald-400" 
    title="Viral Predictor" 
    subtitle="Predict performance before you post."
    badge="Infinity"
    onInfoClick={() => setShowGuide(prev => !prev)}
   />

   <Tabs defaultValue="predict" className="space-y-6">
    <TabsList className="bg-muted/50 p-1 overflow-x-auto no-scrollbar whitespace-nowrap w-full flex justify-start">
     <TabsTrigger value="predict" className="flex-1 md:flex-none px-6 md:px-8 h-10 md:h-12 text-sm md:text-base">Analyze Post</TabsTrigger>
     <TabsTrigger value="history" className="flex-1 md:flex-none px-6 md:px-8 h-10 md:h-12 text-sm md:text-base flex gap-2">
      <History className="h-4 w-4" />
      History ({history.length})
     </TabsTrigger>
    </TabsList>

    <TabsContent value="predict" className="space-y-8">
     <Card className="border-indigo-500/10 shadow-lg overflow-hidden">
      <CardContent className="p-0">
       <div className="p-8 space-y-6">
        <div className="space-y-2">
         <div className="flex justify-between items-end">
          <label className="text-sm font-bold">Content for Prediction</label>
          <span className={`text-xs ${content.length > 2000 ? 'text-red-500' : 'text-muted-foreground'}`}>
           {content.length}/2000
          </span>
         </div>
         <Textarea
          placeholder="Paste your caption, tweet, post, or script here..."
          className="min-h-[120px] md:min-h-[200px] text-base md:text-lg border-indigo-500/10 focus-visible:ring-indigo-500 bg-indigo-500/[0.01]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
         />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="space-y-2">
          <label className="text-sm font-bold">Platform</label>
          <Select value={platform} onValueChange={setPlatform}>
           <SelectTrigger className="bg-muted/30 h-12 text-base">
            <SelectValue />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="Instagram">Instagram</SelectItem>
            <SelectItem value="Twitter">Twitter</SelectItem>
            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
            <SelectItem value="YouTube">YouTube</SelectItem>
           </SelectContent>
          </Select>
         </div>
         <div className="space-y-2">
          <label className="text-sm font-bold">Niche</label>
          <Select value={niche} onValueChange={setNiche}>
           <SelectTrigger className="bg-muted/30 h-12 text-base">
            <SelectValue />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="Fitness">Fitness</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Tech">Tech</SelectItem>
            <SelectItem value="Motivation">Motivation</SelectItem>
            <SelectItem value="Business">Business</SelectItem>
            <SelectItem value="General">General</SelectItem>
           </SelectContent>
          </Select>
         </div>
         <div className="space-y-2">
          <label className="text-sm font-bold">Type</label>
          <Select value={contentType} onValueChange={setContentType}>
           <SelectTrigger className="bg-muted/30 h-12 text-base">
            <SelectValue />
           </SelectTrigger>
           <SelectContent>
            <SelectItem value="Post">Post / Tweet</SelectItem>
            <SelectItem value="Caption">Instagram Caption</SelectItem>
            <SelectItem value="Script">Video Script</SelectItem>
            <SelectItem value="Hook">Just a Hook</SelectItem>
           </SelectContent>
          </Select>
         </div>
         <div className="space-y-2">
          <label className="text-sm font-bold">Content Language</label>
          <LanguageSelector 
           value={language} 
           onChange={setLanguage} 
           isFreeUser={isFreeUser}
          />
         </div>
        </div>

        <Button
         onClick={handlePredict}
         disabled={loading || content.length < 50}
         className="w-full h-14 md:h-16 bg-indigo-600 hover:bg-indigo-700 text-base md:text-lg font-bold shadow-xl shadow-indigo-600/20"
        >
         {loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
         Predict Performance
        </Button>
       </div>
      </CardContent>
     </Card>

     {!loading && !result && (
       <motion.div
        key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
       >
        <EmptyOutputState
          title="Viral score will appear here"
          description="Paste your content above to predict its viral potential"
        />
       </motion.div>
      )}
      {false && !loading && !result && (
      <motion.div
       key="empty"
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center py-12 px-6 text-center min-h-[400px]"
      >
       <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
        <Sparkles className="w-5 h-5" style={{ color: "var(--text-disabled)" }} />
       </div>
       <p className="text-white/25 text-sm font-medium">Your prediction analysis will appear here</p>
       <p className="text-white/15 text-xs mt-1">Paste your content above and hit Predict Performance</p>
      </motion.div>
     )}
     <AnimatePresence>
      {result && (
       <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 pb-20"
       >
        {/* Result Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-1 p-8 flex flex-col items-center justify-center text-center bg-card">
          <ScoreCircle score={result.overallScore} label="Overall Score" size="md" />
          <p className="text-xs text-center mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            Score above 70 = likely to perform well · Below 50 = needs improvement
          </p>
          <Badge className={`mt-4 px-4 py-1 text-sm font-bold ${result.verdict === 'High Performer' ? 'bg-emerald-500' : result.verdict === 'Average' ? 'bg-amber-500' : 'bg-red-500'}`}>
           {result.verdict}
          </Badge>
          <p className="mt-4 text-sm font-medium text-muted-foreground">{result.verdictReason}</p>
         </Card>

         <Card className="lg:col-span-2 p-8 grid grid-cols-2 md:grid-cols-4 gap-6 content-center">
          <ScoreCircle score={result.algorithmScore} label="Algorithm" size="sm" />
          <ScoreCircle score={result.hookScore} label="Hook" size="sm" />
          <ScoreCircle score={result.retentionScore} label="Retention" size="sm" />
          <ScoreCircle score={result.ctaScore} label="CTA" size="sm" />
         </Card>
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
           <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
           Algorithm Signals
          </h3>
          <div className="space-y-3">
           {result.algorithmSignals.map((sig: any, i: number) => (
            <div key={i} className="p-4 rounded-xl border bg-card flex gap-4">
             <div className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${sig.impact === 'positive' ? 'bg-emerald-500/10 text-emerald-500' : sig.impact === 'negative' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>
              {sig.impact === 'positive' ? <Check className="h-3 w-3" /> : sig.impact === 'negative' ? <X className="h-3 w-3" /> : <Info className="h-3 w-3" />}
             </div>
             <div>
              <h4 className="font-bold text-sm">{sig.signal}</h4>
              <p className="text-xs text-muted-foreground">{sig.explanation}</p>
             </div>
            </div>
           ))}
          </div>

          <Card className="border-amber-500/30 bg-amber-500/[0.02]">
           <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
             <Info className="h-5 w-5 text-amber-500" />
             Top Fix
            </CardTitle>
           </CardHeader>
           <CardContent>
            <p className="text-lg font-black text-amber-700 leading-tight">
             "{result.topFix}"
            </p>
           </CardContent>
          </Card>
         </div>

         <div className="space-y-6">
          <h3 className="text-xl font-bold">Hook Analysis</h3>
          <Card className="p-6 space-y-4">
           <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Strength</span>
            <p className="text-sm font-medium">{result.hookAnalysis.strength}</p>
           </div>
           {result.hookAnalysis.issue && (
            <div>
             <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">The Issue</span>
             <p className="text-sm font-medium text-red-600">{result.hookAnalysis.issue}</p>
            </div>
           )}
           <div className="p-4 rounded-xl bg-[rgba(94,106,210,0.10)] border border-[rgba(94,106,210,0.20)] space-y-2">
            <span className="text-[10px] font-bold text-[#8B91E3] uppercase tracking-widest">Improved Hook</span>
            <p className="text-lg font-black text-white leading-tight">"{result.hookAnalysis.improvedVersion}"</p>
            <Button variant="link" className="p-0 h-auto text-[#8B91E3] text-xs font-bold" onClick={() => navigator.clipboard.writeText(result.hookAnalysis.improvedVersion)}>
             COPY THIS HOOK
            </Button>
           </div>
          </Card>

          <h3 className="text-xl font-bold">Improved Version</h3>
          <Card className="p-6 bg-slate-900 text-slate-100 border-none shadow-2xl space-y-4">
           <div className="text-sm leading-relaxed whitespace-pre-wrap opacity-90">{result.improvedVersion}</div>
           <div className="flex gap-2 pt-4">
            <Button className="flex-1 bg-white text-slate-900 hover:bg-white/90 font-bold" onClick={() => navigator.clipboard.writeText(result.improvedVersion)}>
             Copy Full Post
            </Button>
            <Button variant="outline" className="flex-1 border-white/20 hover:bg-white/10" onClick={() => setLocation(`/generate?idea=${encodeURIComponent(result.improvedVersion)}`)}>
             Use as Base
            </Button>
           </div>
          </Card>
         </div>
        </div>

        <div className="bg-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-8 overflow-hidden relative">
         <TrendingUp className="absolute -left-4 -bottom-4 h-40 w-40 text-white/10" />
         <div className="relative space-y-2">
          <h3 className="text-2xl font-bold">{platform} Algorithm Strategy</h3>
          <ul className="space-y-2">
           {result.platformSpecificTips.map((tip: string, i: number) => (
            <li key={i} className="flex gap-2 items-start text-sm font-medium">
             <Check className="h-5 w-5 shrink-0 mt-0.5" />
             {tip}
            </li>
           ))}
          </ul>
         </div>
         <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50 font-black h-14 px-8 rounded-2xl relative z-10" onClick={() => { setContent(""); setResult(null); window.scrollTo(0,0); }}>
          Analyze Next Post
         </Button>
        </div>
       </motion.div>
      )}
     </AnimatePresence>
    </TabsContent>

    <TabsContent value="history">
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {history.map((h: any, i: number) => (
       <Card key={i} className="hover:border-indigo-500/50 cursor-pointer transition-all group" onClick={() => { setResult(h); window.scrollTo(0, 0); }}>
        <CardContent className="p-6 space-y-4">
         <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
           {h.platform === "Instagram" && <Instagram className="h-4 w-4 text-pink-500" />}
           {h.platform === "Twitter" && <Twitter className="h-4 w-4 text-sky-500" />}
           <span className="text-[10px] font-bold uppercase">{h.platform}</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{new Date((h as any).createdAt || h.timestamp!).toLocaleDateString()}</span>
         </div>
         <div className="flex items-center gap-4">
          <span className={`text-3xl font-black ${getScoreColor(h.overallScore)}`}>{h.overallScore}</span>
          <div>
           <div className="text-sm font-bold truncate max-w-[150px]">{h.verdict}</div>
           <div className="text-[10px] text-muted-foreground uppercase">{h.verdictReason.substring(0, 30)}...</div>
          </div>
         </div>
         <Button variant="ghost" className="w-full h-8 text-[10px] font-bold group-hover:bg-indigo-500 group-hover:text-white border-dashed border">
          VIEW FULL ANALYSIS <ArrowRight className="ml-2 h-3 w-3" />
         </Button>
        </CardContent>
       </Card>
      ))}
     </div>
     {history.length === 0 && (
      <div className="text-center py-20 opacity-50">
       <History className="h-20 w-20 mx-auto" />
       <h2 className="text-xl font-bold mt-4">No analysis history yet</h2>
      </div>
     )}
    </TabsContent>
   </Tabs>
  </PageWrapper>
 );
};
