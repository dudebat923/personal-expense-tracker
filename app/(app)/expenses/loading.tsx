export default function ExpensesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-900/70 px-4 py-3 flex gap-6">
          {[64, 192, 96, 64, 32].map((w, i) => (
            <div
              key={i}
              className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
        <div className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3 animate-pulse">
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0" />
              <div className="h-3 flex-1 max-w-xs bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
              <div className="h-7 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
