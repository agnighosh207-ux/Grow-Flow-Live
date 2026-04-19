import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Loader2, Sparkles, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { format, startOfWeek, addDays, getMonth, endOfMonth, startOfMonth, isSameDay } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CalendarItem {
  id: number;
  date: string;
  idea: string;
  platform: string;
  contentType: string;
  status: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data, isLoading, error } = useQuery<{ calendar: CalendarItem[] }>({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      const res = await fetch("/api/calendar");
      if (!res.ok) throw new Error("Failed to load calendar");
      return res.json();
    },
  });

  const calendarItems = data?.calendar || [];

  const nextMonth = () => {
    setCurrentDate(addDays(currentDate, 31)); // simple jump ahead
  };

  const prevMonth = () => {
    setCurrentDate(addDays(currentDate, -31));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);

  const renderCells = () => {
    const days = [];
    let day = startDate;
    let formattedDate = "";

    for (let i = 0; i < 42; i++) {
      const cloneDay = day;
      const isCurrentMonth = getMonth(day) === getMonth(currentDate);
      const itemsForDay = calendarItems.filter((item) => isSameDay(new Date(item.date), cloneDay));

      days.push(
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.01 }}
          key={day.toISOString()}
          className={`min-h-[120px] p-2 flex flex-col border border-white/[0.05] relative rounded-xl transition-all duration-300 ${
            isCurrentMonth ? "bg-white/[0.02] hover:bg-white/[0.04]" : "opacity-30 mix-blend-overlay"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-sm font-semibold mb-2 ${isCurrentMonth ? "text-white/80" : "text-white/40"}`}>
              {format(day, "d")}
            </span>
            {itemsForDay.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pointer-events-auto">
            {itemsForDay.map((item) => (
              <div 
                key={item.id} 
                className="text-[10px] leading-tight flex flex-col rounded-md p-1.5 border border-white/5 bg-black/20 hover:bg-black/40 hover:border-violet-500/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-violet-300 drop-shadow flex items-center gap-1">
                    {item.platform === "Twitter" && <span className="text-blue-400">Twt</span>}
                    {item.platform === "LinkedIn" && <span className="text-blue-500">Lnk</span>}
                    {item.platform === "Instagram" && <span className="text-pink-500">Ig</span>}
                    {item.platform === "YouTube Shorts" && <span className="text-red-500">YT</span>}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-white/30 group-hover:text-white/60">{item.contentType}</span>
                </div>
                <span className="text-white/70 line-clamp-2">{item.idea}</span>
              </div>
            ))}
          </div>
        </motion.div>
      );
      day = addDays(day, 1);
    }
    return days;
  };

  return (
    <div className="w-full text-white/90 font-sans p-6 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto relative z-10 pt-10">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-violet-400" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Content Calendar
              </h1>
            </div>
            <p className="text-white/50 text-sm">Visualize your 30-day strategy and track scheduled posts.</p>
          </div>

          <div className="flex items-center gap-4 bg-white/[0.02] border border-white/10 rounded-xl p-2 backdrop-blur-md">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-white/10 text-white/70">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="w-32 text-center font-bold text-white/90">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-white/10 text-white/70">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="bg-white/[0.015] border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl relative">
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center flex-col gap-4">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
              <div className="text-white/50 font-medium">Loading your schedule...</div>
            </div>
          ) : error ? (
            <div className="h-[600px] flex items-center justify-center flex-col gap-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <div className="text-red-400 font-medium">Failed to load calendar data.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-4 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-bold uppercase tracking-widest text-violet-300/70">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {renderCells()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
