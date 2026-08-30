import { cn } from "@/lib/utils/cn";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs animate-pulse",
        className
      )}
    >
      {/* Table Header Filter Bar */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="h-10 w-72 max-w-full bg-gray-200 dark:bg-slate-800 rounded-xl" />
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-10 w-28 bg-gray-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-10 w-28 bg-gray-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>

      {/* Table Column Titles */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 text-xs">
        <div className="col-span-4 h-4 w-24 bg-gray-200 dark:bg-slate-800 rounded" />
        <div className="col-span-3 h-4 w-20 bg-gray-200 dark:bg-slate-800 rounded hidden md:block" />
        <div className="col-span-3 h-4 w-16 bg-gray-200 dark:bg-slate-800 rounded hidden sm:block" />
        <div className="col-span-2 h-4 w-12 bg-gray-200 dark:bg-slate-800 rounded ml-auto" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="p-4 px-6 grid grid-cols-12 gap-4 items-center">
            <div className="col-span-12 sm:col-span-4 flex items-center gap-3">
              <div className="h-9 w-9 bg-gray-200 dark:bg-slate-800 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-4 w-32 bg-gray-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-20 bg-gray-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="col-span-3 hidden md:block">
              <div className="h-4 w-28 bg-gray-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="col-span-3 hidden sm:block">
              <div className="h-6 w-20 bg-gray-200 dark:bg-slate-800 rounded-full" />
            </div>
            <div className="col-span-12 sm:col-span-2 flex justify-end gap-2">
              <div className="h-8 w-8 bg-gray-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
