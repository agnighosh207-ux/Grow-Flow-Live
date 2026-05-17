import { Link } from "wouter";
import { Compass, ArrowRight, Home, Sparkles, Flame, Brain, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-black selection:bg-[#5E6AD2]/30 selection:text-white"
    >
      {/* Decorative background gradients */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-tr from-[#5E6AD2]/10 to-indigo-900/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-gradient-to-tr from-pink-500/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative w-full max-w-xl z-10">
        <div
          className="rounded-[3rem] p-8 md:p-12 border border-white/8 backdrop-blur-3xl shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500 ease-out"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            boxShadow: "0 20px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Subtle top border illumination */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8B91E3]/30 to-transparent" />
          
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Spinning/floating compass icon */}
            <div
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#5E6AD2] to-indigo-950/40 border border-[rgba(94,106,210,0.30)] flex items-center justify-center shadow-[0_0_30px_rgba(94,106,210,0.25)] hover:scale-110 transition-transform duration-500"
            >
              <Compass className="w-10 h-10 text-[#8B91E3] stroke-[1.5] animate-spin" style={{ animationDuration: '20s' }} />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#8B91E3]">
                404 - Lost in Orbit
              </span>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight italic">
                Cosmic Anomaly Detected
              </h1>
              <p className="text-sm md:text-base text-white/40 max-w-sm mx-auto font-medium leading-relaxed">
                The content path you tried to access does not exist or has migrated to another dimension.
              </p>
            </div>

            {/* Redirection Actions */}
            <div className="w-full pt-4 space-y-4">
              <Link href="/">
                <Button 
                  className="w-full h-14 rounded-2xl bg-[#5E6AD2] hover:bg-[#5E6AD2] text-white font-black text-xs uppercase tracking-widest transition-all duration-300 hover:shadow-[0_0_25px_rgba(94,106,210,0.4)] flex items-center justify-center gap-2 group"
                >
                  <Home className="w-4 h-4" /> 
                  Back to Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                </Button>
              </Link>
            </div>

            {/* Quick Links section */}
            <div className="w-full pt-6 border-t border-white/5">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 text-left">
                Suggested Destinations
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Content Studio", href: "/generate", icon: Sparkles },
                  { label: "Daily Tasks", href: "/daily", icon: Flame },
                  { label: "AI Coach", href: "/coach", icon: Brain },
                  { label: "Calendar", href: "/calendar", icon: Calendar },
                ].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 hover:scale-[1.02] hover:translate-x-0.5 transition-all duration-200 text-left flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-[#5E6AD2]/10 border border-[#5E6AD2]/10 text-[#8B91E3]">
                        <item.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-white/50 group-hover:text-white/80 transition-colors">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
