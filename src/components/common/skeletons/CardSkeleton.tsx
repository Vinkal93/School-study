import { cn } from "@/lib/utils/cn";

export interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse",
        className
      )}
    >
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-gray-200 dark:bg-slate-800 rounded" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-slate-800 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <div className="h-4 w-20 bg-gray-200 dark:bg-slate-800 rounded" />
            <div className="h-9 w-28 bg-gray-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
