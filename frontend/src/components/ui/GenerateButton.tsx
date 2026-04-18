import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button'; // Assuming Shadcn UI

interface GenerateButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => Promise<void>;
  idleText?: string;
  loadingText?: string;
  className?: string;
}

export function GenerateButton({
  onClick,
  idleText = "Generate Content",
  loadingText = "AI is thinking...",
  className,
  disabled,
  ...props
}: GenerateButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'busy'>('idle');
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(10);
  
  const progressAnimationRef = useRef<number | undefined>(undefined);
  const startTimestampRef = useRef<number | undefined>(undefined);

  const startProgress = () => {
    setProgress(0);
    const duration = 5000; // 5 seconds
    const targetProgress = 90; // Go up to 90%

    const animate = (timestamp: number) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const elapsed = timestamp - startTimestampRef.current;
      
      const newProgress = Math.min((elapsed / duration) * targetProgress, targetProgress);
      setProgress(newProgress);

      if (elapsed < duration) {
        progressAnimationRef.current = requestAnimationFrame(animate);
      }
    };

    progressAnimationRef.current = requestAnimationFrame(animate);
  };

  const handleGenerate = async () => {
    if (status !== 'idle' || disabled) return;
    
    setStatus('loading');
    startTimestampRef.current = undefined;
    startProgress();

    try {
      await onClick();
      // On success, reset state safely
      if (progressAnimationRef.current !== undefined) {
        cancelAnimationFrame(progressAnimationRef.current);
      }
      setProgress(100);
      setTimeout(() => setStatus('idle'), 500); 
    } catch (error: any) {
      if (progressAnimationRef.current !== undefined) cancelAnimationFrame(progressAnimationRef.current);
      
      const statusMatch = error?.response?.status === 429 || error?.message?.includes('429');
      if (statusMatch || error?.message?.includes('busy') || error?.message?.includes('temporarily unavailable')) {
        setStatus('busy');
        setCountdown(10);
      } else {
        // Normal error fallback
        setStatus('idle');
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'busy' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (status === 'busy' && countdown === 0) {
      setStatus('idle');
    }
    return () => clearTimeout(timer);
  }, [status, countdown]);

  useEffect(() => {
    return () => {
      if (progressAnimationRef.current !== undefined) cancelAnimationFrame(progressAnimationRef.current);
    };
  }, []);

  return (
    <Button
      onClick={handleGenerate}
      disabled={status !== 'idle' || disabled}
      className={cn(
        "relative overflow-hidden w-full h-12 transition-all duration-300 group",
        status === 'idle' ? "bg-violet-600 hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:-translate-y-0.5" : "",
        status === 'busy' ? "bg-red-950/80 border border-red-500/50 text-red-200" : "",
        status === 'loading' ? "bg-violet-900 border border-violet-500/50" : "",
        className
      )}
      {...props}
    >
      {/* Loading Progress Bar Background */}
      {status === 'loading' && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-violet-600/40 to-fuchsia-500/40 transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250px_250px] [animation:shimmer_2s_infinite]" />
        </div>
      )}

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2 font-semibold">
        {status === 'idle' && (
          <>
            <Sparkles className="w-5 h-5 text-violet-300 group-hover:animate-pulse" />
            {idleText}
          </>
        )}

        {status === 'loading' && (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-violet-300" />
            <span className="animate-pulse">{loadingText}</span>
          </>
        )}

        {status === 'busy' && (
          <>
            <AlertCircle className="w-5 h-5 text-red-400" />
            System Busy - Wait {countdown}s
          </>
        )}
      </span>
    </Button>
  );
}
