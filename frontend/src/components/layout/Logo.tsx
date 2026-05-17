import { TrendingUp } from "lucide-react";

interface LogoProps {
  readonly size?: "sm" | "md" | "lg";
  readonly showText?: boolean;
}

const ICON_SIZES = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

const INNER_ICONS = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const TEXT_SIZES = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true }: LogoProps) {
  const iconSize = ICON_SIZES[size];
  const innerIcon = INNER_ICONS[size];
  const textSize = TEXT_SIZES[size];

  return (
    <div className="flex items-center gap-2 select-none">
      <div className={`${iconSize} rounded-xl bg-gradient-to-br from-[#5E6AD2] to-indigo-700 flex items-center justify-center shadow-lg shadow-[rgba(94,106,210,0.40)]`}>
        <TrendingUp className={`${innerIcon} text-white`} strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={`font-extrabold ${textSize} tracking-tight leading-none`}>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">Grow</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5E6AD2] to-indigo-400">Flow</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/60 to-white/40"> AI</span>
        </span>
      )}
    </div>
  );
}
