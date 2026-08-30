import { cn } from "@/lib/utils/cn";

export interface StatsSkeletonProps {
  count?: number;
  className?: string;
}

export function StatsSkeleton({ count = 4, className }: StatsSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse",
        className
      )}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-gray-200 dark:bg-slate-800 rounded" />
            <div className="h-9 w-9 bg-gray-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}
