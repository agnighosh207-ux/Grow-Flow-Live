import React, { useState, useEffect } from "react";
import { PageWrapper } from "@/components/shared/PageWrapper";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, MessageSquare, Shield, Zap, CheckCircle2, 
  Trash2, Plus, Loader2, Wand2, ArrowRight, UserCircle
} from "lucide-react";
import FeatureGuideBanner from "@/components/shared/FeatureGuideBanner";

export default function BrandVoicePage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [samples, setSamples] = useState<string[]>(["", "", ""]);
  const [analyzing, setAnalyzing] = useState(false);

  const [personas, setPersonas] = useState<any[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  const fetchPersonas = async () => {
    setVoicesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/brand-voice/personas", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPersonas(data.personas || []);
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to load personas" });
    } finally {
      setVoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: { samplePosts: string[] }) => {
      const token = await getToken();
      const res = await fetch("/api/brand-voice/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Analysis failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Voice Profile Created!", description: "Your unique brand voice has been analyzed and saved." });
      fetchPersonas();
      setAnalyzing(false);
      setSamples(["", "", ""]);
    },
    onError: () => {
      toast({ title: "Analysis Failed", description: "Try again with different samples.", variant: "destructive" });
      setAnalyzing(false);
    }
  });

  const handleAddSample = () => setSamples([...samples, ""]);
  const handleRemoveSample = (index: number) => {
    if (samples.length <= 3) return;
    setSamples(samples.filter((_, i) => i !== index));
  };
  const handleSampleChange = (index: number, val: string) => {
    const newSamples = [...samples];
    newSamples[index] = val;
    setSamples(newSamples);
  };

  const handleAnalyze = () => {
    const validSamples = samples.filter(s => s.trim().length > 50);
    if (validSamples.length < 3) {
      toast({ title: "More content needed", description: "Please provide at least 3 detailed posts (50+ characters each).", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    createMutation.mutate({ samplePosts: validSamples });
  };

  const [showGuide, setShowGuide] = useState(false);

  return (
    <PageWrapper maxWidth="lg" className="py-12 space-y-16">
      <FeatureGuideBanner
        toolKey="voice"
        title="Brand Voice Cloning"
        icon={<UserCircle className="w-5 h-5 text-[#8B91E3]" />}
        tagline="Generate content that sounds exactly like you. No more generic 'AI-sounding' posts."
        whatYouGet={["Linguistic DNA analysis", "Tone & length detection", "AI-generated voice profile", "Consistent brand persona"]}
        whenToUse="Use this first to teach the AI your writing style. Once cloned, select this profile during content generation."
        proTip="The more samples you provide, the better the clone. Try to use your 5-10 best performing posts."
        planRequired="Starter"
        forceOpen={showGuide}
      />
      
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tight">Clone Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-indigo-900">Brand Voice</span></h1>
          <button 
            onClick={() => setShowGuide(prev => !prev)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group mt-2"
          >
            <Sparkles className="w-4 h-4 text-white/40 group-hover:text-[#8B91E3]" />
          </button>
        </div>
        <p className="text-white/40 text-lg max-w-2xl mx-auto font-medium">
          Paste your best-performing posts and let our AI analyze your linguistic DNA. 
          Generate content that sounds exactly like you, every single time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Input Side */}
        <div className="space-y-8">
          <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white italic flex items-center gap-2">
                <MessageSquare className="text-[#8B91E3]" />
                Your Best Posts
              </h2>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Min 3 Samples</span>
            </div>

            <div className="space-y-4">
              {samples.map((sample, i) => (
                <div key={i} className="relative group">
                  <Textarea
                    placeholder={`Paste Sample Post #${i + 1}...`}
                    value={sample}
                    onChange={(e) => handleSampleChange(i, e.target.value)}
                    className="min-h-[120px] rounded-2xl bg-black/40 border-white/10 focus:border-[rgba(94,106,210,0.50)] transition-all resize-none p-4 text-sm"
                  />
                  {samples.length > 3 && (
                    <button 
                      onClick={() => handleRemoveSample(i)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleAddSample}
                className="flex-1 rounded-xl border-white/10 hover:bg-white/5 text-white/60 font-bold"
              >
                <Plus size={16} className="mr-2" /> Add Sample
              </Button>
              <Button 
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex-[2] rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white font-black shadow-glow disabled:opacity-50"
              >
                {analyzing ? (
                  <><Loader2 className="mr-2 animate-spin" /> Analyzing Linguistic DNA...</>
                ) : (
                  <><Wand2 className="mr-2" /> CREATE MY VOICE PROFILE</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Profiles Side */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-white italic flex items-center gap-2">
            <UserCircle className="text-[#8B91E3]" />
            Saved Voice Profiles
          </h2>
          
          <AnimatePresence mode="popLayout">
            {voicesLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-40 rounded-3xl bg-white/5 animate-pulse" />)}
              </div>
            ) : personas?.length > 0 ? (
              personas.map((v: any, i: number) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 rounded-3xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 space-y-4 relative overflow-hidden group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white italic">{v.voiceName}</h3>
                      <p className="text-xs text-[rgba(139,145,227,0.70)] font-bold uppercase tracking-widest">Active Profile</p>
                    </div>
                    <div className="p-2 rounded-xl bg-[rgba(94,106,210,0.10)] text-[#8B91E3]">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Tone</p>
                      <p className="text-sm text-white/80 font-medium">{v.tone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Post Length</p>
                      <p className="text-sm text-white/80 font-medium">{v.postLength}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">AI Description</p>
                    <p className="text-xs text-white/50 leading-relaxed italic line-clamp-2">"{v.aiDescription}"</p>
                  </div>

                  <div className="absolute inset-0 bg-[rgba(94,106,210,0.5)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>No brand voices yet</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-disabled)' }}>
                  Create a brand voice to make AI always write in your style
                </p>
                <button onClick={() => { document.querySelector('textarea')?.focus(); }}
                  className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: '#5E6AD2' }}>
                  Create Your First Voice
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
