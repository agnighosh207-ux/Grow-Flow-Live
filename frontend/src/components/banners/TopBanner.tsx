import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

export function TopBanner() {
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ["activeAnnouncements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements/active");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 60000, // Check every minute
  });

  const announcements = data?.announcements || (data?.announcement ? [data.announcement] : []);

  if (!announcements.length) return null;

  const bgColors: Record<string, string> = {
    info: "bg-blue-600/30 border-blue-500/50 text-blue-100",
    warning: "bg-amber-600/30 border-amber-500/50 text-amber-100",
    success: "bg-emerald-600/30 border-emerald-500/50 text-emerald-100",
    error: "bg-red-600/30 border-red-500/50 text-red-100",
  };

  return (
    <div className="flex flex-col">
      {announcements.map((announcement: any) => {
        if (closedIds.has(announcement.id)) return null;
        const currentStyle = bgColors[announcement.theme] || bgColors.info;
        
        return (
          <div key={announcement.id} className={`relative z-50 border-b px-4 py-2 flex items-center justify-center text-sm font-medium ${currentStyle}`}>
            <div className="flex-1 text-center">{announcement.message}</div>
            <button 
              onClick={() => {
                const newSet = new Set(closedIds);
                newSet.add(announcement.id);
                setClosedIds(newSet);
              }} 
              className="p-1 hover:bg-black/20 rounded-md transition-colors absolute right-2"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
