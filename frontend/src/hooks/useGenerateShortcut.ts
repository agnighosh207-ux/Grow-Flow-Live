import { useEffect } from "react";

export function useGenerateShortcut(onGenerate: () => void, disabled = false) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !disabled) {
        e.preventDefault();
        onGenerate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onGenerate, disabled]);
}
