import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench } from "lucide-react";

export function MaintenanceOverlay() {
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const handleMaintenance = () => {
      // Check if user is an admin by seeing if we are currently impersonating or on admin page
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/admin")) {
        // Admin gets a pass to avoid being locked out of the dashboard
        return;
      }
      setIsMaintenance(true);
    };
    
    window.addEventListener("maintenance-mode", handleMaintenance);
    return () => window.removeEventListener("maintenance-mode", handleMaintenance);
  }, []);

  return (
    <AnimatePresence>
      {isMaintenance && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#0b0416] p-6 text-center"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-[120px]" />
          </div>

          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="relative z-10 max-w-lg bg-[#100726]/80 backdrop-blur-2xl border border-violet-500/30 p-10 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.15)] flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <Wrench className="w-10 h-10 text-violet-400" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mb-4 text-center">
              GrowFlow is Upgrade Bound
            </h1>
            
            <p className="text-white/60 text-lg mb-8 max-w-sm leading-relaxed text-center">
              We're polishing the gears and adding fresh updates. We'll be back in just a few minutes.
            </p>
            
            <div className="w-12 h-1 bg-violet-500/40 rounded-full overflow-hidden">
              <motion.div 
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="w-full h-full bg-violet-400"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
