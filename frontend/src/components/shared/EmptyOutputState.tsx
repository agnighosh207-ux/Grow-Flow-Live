import { Sparkles } from "lucide-react";

interface EmptyOutputStateProps {
  title?: string;
  description?: string;
  suggestions?: string[];
  onSuggestionClick?: (s: string) => void;
}

export function EmptyOutputState({
  title = "Your output will appear here",
  description = "Fill in the details above and click generate",
  suggestions = [],
  onSuggestionClick,
}: EmptyOutputStateProps) {
  return (
    <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-12 px-6 text-center"
      style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.01)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <Sparkles className="w-5 h-5" style={{ color: 'var(--text-disabled)' }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{title}</p>
      <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>{description}</p>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {suggestions.map(s => (
            <button key={s} onClick={() => onSuggestionClick?.(s)}
              className="text-[10px] px-3 py-1.5 rounded-full border transition-all hover:border-[rgba(94,106,210,0.4)] hover:text-[#8B91E3]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
