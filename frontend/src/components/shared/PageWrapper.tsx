import { ReactNode } from "react";

interface PageWrapperProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const maxWidthMap = {
  sm: "max-w-2xl",
  md: "max-w-4xl", 
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-full",
};

export function PageWrapper({ children, maxWidth = "xl", className = "" }: PageWrapperProps) {
  return (
    <div className={`w-full mx-auto space-y-6 pb-8 ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}
