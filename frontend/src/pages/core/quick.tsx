import { useState } from "react";
import { Sparkles, Copy, ArrowRight, Loader2, Zap, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

export default function QuickGeneratePage() {
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleQuickGenerate = async () => {
    if (!idea) return;
    setGenerating(true);
    setResult(null);
    try {
      // Direct call to generation API optimized for Instagram
      const { data } = await api.post("/content/generate", {
        idea,
        contentType: "Viral",
        tone: "Aggressive",
        niche: "General",
        language: "English"
      });
      setResult(data);
    } catch (err) {
      toast({ variant: "destructive", title: "Quick Generate Failed" });
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#050110] text-white flex flex-col p-6 font-sans">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col pt-12 gap-8">
        <header className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-cyan-400 fill-cyan-400" />
             </div>
             <h1 className="text-xl font-black uppercase tracking-widest">Quick Flow</h1>
           </div>
           <Link href="/generate">
             <button className="text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white transition-colors">
               Full App
             </button>
           </Link>
        </header>

        <main className="space-y-6">
           <div className="space-y-4">
              <Textarea 
                placeholder="What's your content idea?" 
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                className="bg-white/5 border-white/10 h-40 rounded-[2rem] p-6 text-lg font-bold focus:border-cyan-500/50 transition-all resize-none"
              />
              <Button 
                onClick={handleQuickGenerate}
                disabled={generating || !idea}
                className="w-full h-16 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-cyan-600/20"
              >
                {generating ? <Loader2 className="animate-spin" /> : "INSTANT GENERATE ✨"}
              </Button>
           </div>

           <AnimatePresence>
             {result && result.instagram && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="space-y-4"
               >
                 <div className="p-6 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Instagram Optimized</span>
                       <Button variant="ghost" size="sm" onClick={() => copyText(result.instagram.caption)} className="h-8 rounded-lg bg-white/5 text-[10px] font-black">
                          <Copy className="w-3 h-3 mr-2" /> COPY
                       </Button>
                    </div>
                    <p className="text-base font-medium text-white/90 leading-relaxed whitespace-pre-wrap">
                       {result.instagram.caption}
                    </p>
                 </div>

                 <Link href="/generate">
                   <Button variant="ghost" className="w-full text-white/30 hover:text-white gap-2 h-12">
                     Refine in full app <ArrowRight className="w-4 h-4" />
                   </Button>
                 </Link>
               </motion.div>
             )}
           </AnimatePresence>
        </main>

        <footer className="mt-auto py-8 text-center space-y-4">
           <div className="flex items-center justify-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
              <Smartphone className="w-3 h-3" /> Add to home screen for 1-tap access
           </div>
        </footer>
      </div>
    </div>
  );
}
