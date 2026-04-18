import { TrendingUp } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const iconSize = size === "sm" ? "w-7 h-7" : size === "md" ? "w-8 h-8" : "w-10 h-10";
  const innerIcon = size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  const textSize = size === "sm" ? "text-base" : size === "md" ? "text-lg" : "text-2xl";

  return (
    <div className="flex items-center gap-2 select-none">
      <div className={`${iconSize} rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/40`}>
        <TrendingUp className={`${innerIcon} text-white`} strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={`font-extrabold ${textSize} tracking-tight leading-none`}>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">Grow</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">Flow</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/60 to-white/40"> AI</span>
        </span>
      )}
    </div>
  );
}
