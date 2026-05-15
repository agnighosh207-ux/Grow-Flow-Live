import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

interface PageHeaderProps {
  icon: ReactNode;
  iconBg?: string;          // tailwind bg class e.g. "bg-cyan-500/10"
  iconColor?: string;       // tailwind text class e.g. "text-cyan-400"
  title: string;
  subtitle: string;
  badge?: string;           // e.g. "Creator" | "Infinity" | "Free"
  badgeColor?: string;      // tailwind gradient classes
  action?: ReactNode;       // optional right-side action button
  onInfoClick?: () => void; // shows/re-shows the feature guide banner
}

export function PageHeader({ icon, iconBg = "bg-violet-500/10", iconColor = "text-violet-400", title, subtitle, badge, badgeColor, action, onInfoClick }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0 border border-white/5`}>
          <div className={`w-5 h-5 md:w-6 md:h-6 ${iconColor}`}>{icon}</div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${badgeColor || "bg-violet-500/10 text-violet-400 border-violet-500/20"}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {action}
        {onInfoClick && (
          <button onClick={onInfoClick} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group" title="What is this tool?">
            <HelpCircle className="w-3.5 h-3.5 text-white/40 group-hover:text-violet-400 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}
