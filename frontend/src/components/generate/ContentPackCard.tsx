import { useState } from "react";
import { motion } from "framer-motion";
import { Wand2, Brain, Activity, Target, Lock, Crown, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SectionCardProps {
  icon: any;
  title: string;
  badge?: string;
  color: string;
  children?: React.ReactNode;
  locked?: boolean;
  lockedReason?: string;
}

function SectionCard({
  icon: Icon,
  title,
  badge,
  color,
  children,
  locked,
  lockedReason,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border ${locked ? "bg-white/[0.01] border-white/5" : "bg-white/[0.035] border-white/10 hover:border-white/15 transition-all shadow-xl"}`}
    >
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${locked ? "border-white/5" : "border-white/8"}`}>
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-sm font-black tracking-tight uppercase ${locked ? "text-white/30" : "text-white/90"}`}>{title}</span>
        {badge && (
          <span className={`ml-auto text-[9px] px-2.5 py-1 rounded-lg border font-black tracking-widest uppercase ${locked ? "bg-white/4 text-white/20 border-white/8" : "bg-[#5E6AD2]/12 text-[#8B91E3] border-[rgba(94,106,210,0.4)]/20"}`}>
            {badge}
          </span>
        )}
        {locked && <Lock className="w-4 h-4 text-white/20 ml-auto" />}
      </div>
      <div className={`p-6 ${locked ? "opacity-40" : ""}`}>
        {locked ? (
          <div className="text-center py-8">
            <Crown className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-white/20 text-xs font-black uppercase tracking-widest">{lockedReason || "Unlock to access"}</p>
          </div>
        ) : children}
      </div>
    </motion.div>
  );
}

function CopyBtn({ text, label, size = "default" }: { text: string; label?: string, size?: "default" | "xs" }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = () => { 
    navigator.clipboard.writeText(text); 
    setCopied(true); 
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000); 
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white ${size === "xs" ? "text-[9px]" : "text-xs"} transition-all shrink-0 border border-white/5`}>
      {copied ? <><Check className="w-3 h-3 text-emerald-400" />{label || "Copied!"}</> : <><Copy className="w-3 h-3" />{label || "Copy"}</>}
    </button>
  );
}

export function ContentPackCard({ result, onSave }: { result: any; onSave: () => void }) {
  const [activeTab, setActiveTab] = useState<"blueprint" | "kit">("kit");
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-white/5 p-1 rounded-2xl w-full max-w-sm border border-white/5">
          {[
            { id: "kit", label: "The Kit", icon: Wand2 },
            { id: "blueprint", label: "The Blueprint", icon: Brain }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === tab.id 
                  ? "bg-[#5E6AD2] text-white shadow-lg shadow-[rgba(94,106,210,0.20)]" 
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={onSave}
          className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
         >
          Save Ecosystem
        </button>
      </div>

      {activeTab === "blueprint" && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <SectionCard icon={Activity} title="Strategic Context" color="bg-emerald-500/10 text-emerald-300">
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-2">Market Sentiment</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.whyThisWorksNow}</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest mb-2">Audience Psychology</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.targetAudiencePsychology}</p>
                    </div>
                 </div>
              </SectionCard>
              <SectionCard icon={Target} title="Competitive Edge" color="bg-[#5E6AD2]/10 text-[#8B91E3]">
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] font-black text-[#8B91E3]/80 uppercase tracking-widest mb-2">Unfair Advantage</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.competitorGap}</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black text-[#8B91E3]/80 uppercase tracking-widest mb-2">Core Value Prop</h4>
                       <p className="text-sm text-white/80 leading-relaxed font-medium">{result.marketAnalysis?.painPointAddressed}</p>
                    </div>
                 </div>
              </SectionCard>
           </div>
        </motion.div>
      )}

      {activeTab === "kit" && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="space-y-8">
           {result.instagram && (
            <SectionCard icon={() => <span className="text-xl">📸</span>} title="Instagram Ecosystem" color="bg-pink-500/10 text-pink-300">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-pink-400/60 uppercase tracking-widest mb-3">Conversion Caption</h4>
                  <div className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-black/20 border border-white/5">
                    <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap flex-1">{result.instagram.caption}</p>
                    <CopyBtn text={result.instagram.caption} />
                  </div>
                </div>
                {result.instagram.storyStrategy && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.instagram.storyStrategy.map((s: string, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/60">
                        <span className="font-black text-pink-400 block mb-1 uppercase tracking-tighter">Slide {i+1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
           )}
           {result.twitter && (
            <SectionCard icon={() => <span className="text-xl">🐦</span>} title="Viral X Thread" color="bg-sky-500/10 text-sky-300">
              <div className="space-y-4">
                {result.twitter.thread.map((t: string, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-black/20 border border-white/5 group">
                    <span className="text-[10px] text-white/20 font-black mt-1">{i + 1}</span>
                    <p className="text-white/85 text-sm flex-1 leading-relaxed">{t}</p>
                    <CopyBtn text={t} />
                  </div>
                ))}
              </div>
            </SectionCard>
           )}
        </motion.div>
      )}
    </div>
  );
}
