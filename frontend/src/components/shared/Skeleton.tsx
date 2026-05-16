import { cn } from "@/lib/utils";

export function Skeleton({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-white/5", className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 p-6 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-8 w-1/3 mt-4" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, actionLabel }: Readonly<{
  icon: any;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}>) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-white/20" />
      </div>
      <h3 className="text-white/60 font-semibold text-lg mb-1">{title}</h3>
      <p className="text-white/30 text-sm max-w-xs">{description}</p>
      {action && actionLabel && (
        <button onClick={action} className="mt-4 text-sm text-[#8B91E3] underline underline-offset-4 hover:text-[#8B91E3]">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
