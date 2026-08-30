import { cn } from "@/lib/utils/cn";

export interface PageSkeletonProps {
  hasStats?: boolean;
  hasTable?: boolean;
  className?: string;
}

export function PageSkeleton({ hasStats = false, hasTable = true, className }: PageSkeletonProps) {
  return (
    <div className={cn("space-y-6 max-w-7xl mx-auto animate-pulse", className)}>
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 dark:bg-slate-800 rounded" />
          <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-96 max-w-full bg-gray-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 bg-gray-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-10 w-36 bg-gray-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* Optional Stats Grid */}
      {hasStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-gray-200 dark:bg-slate-800 rounded" />
                <div className="h-8 w-8 bg-gray-200 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="h-7 w-16 bg-gray-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Optional Table Skeleton */}
      {hasTable && (
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="h-10 w-72 max-w-full bg-gray-200 dark:bg-slate-800 rounded-xl" />
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="h-10 w-32 bg-gray-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-10 w-32 bg-gray-200 dark:bg-slate-800 rounded-xl" />
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-slate-800 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-40 bg-gray-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-28 bg-gray-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 dark:bg-slate-800 rounded-full hidden sm:block" />
                <div className="h-8 w-24 bg-gray-200 dark:bg-slate-800 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
