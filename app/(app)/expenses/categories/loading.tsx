export default function CategoriesLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8 animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="h-9 w-36 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>

      <div className="flex flex-col gap-6">
        {/* User categories card skeleton */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 animate-pulse">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="flex gap-2">
                  <div className="h-7 w-7 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  <div className="h-7 w-7 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Default categories card skeleton */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 animate-pulse">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-5 w-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
