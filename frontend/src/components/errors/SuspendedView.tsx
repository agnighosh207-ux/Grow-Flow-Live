import { motion } from "framer-motion";
import { AlertTriangle, Clock, ShieldAlert, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuspendedView() {
  return (
    <div className="min-h-screen bg-[#060213] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Red Warning Glare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg bg-[#0a041c] border border-red-500/20 shadow-2xl shadow-red-900/20 rounded-2xl p-8 relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-white text-center mb-2 tracking-tight">
          Account Suspended
        </h1>
        
        <p className="text-red-200/60 text-center text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          Our Fair Use Guardian detected automated abuse or severe rate-limit violations associated with this account.
        </p>
        
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-semibold">Violation Detected</p>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">
                Repeated attempts to bypass hourly generation limits or use bot-net scripts.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <Clock className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-sm font-semibold">Appeal Status</p>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">
                Appeals take approx. 24-48 hours. Human review required.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <a href="mailto:support@growflowai.space?subject=Fair Use Ban Appeal&body=Please describe why your account was generating non-human speeds:" className="w-full">
            <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <Mail className="w-4 h-4 mr-2" />
              Request Appeal Review
            </Button>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
