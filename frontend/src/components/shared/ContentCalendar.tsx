import React from "react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";


export function ContentCalendar({ plan, onSelectDay }: { plan: any[]; onSelectDay: (day: any) => void }) {
  // Map plan items to the calendar using the current month
  const today = new Date();
  
  const contentMap = new Map();
  plan.forEach((item, index) => {
    // Treat day 1 as tomorrow, day 2 as day after tomorrow... (or maybe start today)
    const d = new Date(today);
    d.setDate(today.getDate() + index);
    contentMap.set(format(d, "yyyy-MM-dd"), item);
  });

  const generateDateForIndex = (index: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + index);
    return d;
  };

  const markedDates = plan.map((_, index) => generateDateForIndex(index));

  const modifiers = {
    hasContent: markedDates,
  };

  const modifiersStyles = {
    hasContent: {
      fontWeight: "bold",
      backgroundColor: "rgba(139, 92, 246, 0.15)",
      color: "rgb(196, 181, 253)",
      border: "1px solid rgba(139, 92, 246, 0.4)",
    }
  };

  return (
    <div className="w-full flex justify-center p-6 bg-black/20 rounded-xl border border-white/10 mt-6 relative z-10 custom-calendar">
      <style>{`
        .custom-calendar .rdp {
          --rdp-cell-size: 45px;
          --rdp-accent-color: #8b5cf6;
          --rdp-background-color: rgba(139, 92, 246, 0.2);
          --rdp-accent-color-dark: #7c3aed;
          --rdp-background-color-dark: rgba(124, 58, 237, 0.3);
          --rdp-outline: 2px solid var(--rdp-accent-color);
          --rdp-outline-selected: 2px solid var(--rdp-accent-color);
          margin: 0;
        }
        .custom-calendar .rdp-day_selected { 
          background-color: var(--rdp-accent-color) !important;
          color: white !important;
          font-weight: bold;
        }
        .custom-calendar .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
          background-color: rgba(255,255,255,0.1);
        }
        .custom-calendar .rdp-day {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
          border-radius: 8px;
        }
        .custom-calendar .rdp-head_cell {
          color: rgba(255,255,255,0.4);
          font-weight: 500;
          font-size: 0.75rem;
        }
      `}</style>
      <DayPicker
        mode="single"
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
        onSelect={(date) => {
          if (!date) return;
          const key = format(date, "yyyy-MM-dd");
          const item = contentMap.get(key);
          if (item) onSelectDay(item);
        }}
        showOutsideDays
      />
    </div>
  );
}
