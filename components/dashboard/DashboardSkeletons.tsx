export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 animate-pulse"
        >
          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
        </div>
      ))}
    </div>
  )
}

export function SpendingByCategorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 animate-pulse">
      <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-5" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecentExpensesListSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 animate-pulse">
      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-5" />
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-1 py-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-2.5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}
