import {
  SummaryCardsSkeleton,
  SpendingByCategorySkeleton,
  RecentExpensesListSkeleton,
} from "@/components/dashboard/DashboardSkeletons"

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>

      <SummaryCardsSkeleton />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SpendingByCategorySkeleton />
        </div>
        <div className="lg:col-span-2">
          <RecentExpensesListSkeleton />
        </div>
      </div>
    </div>
  )
}
