import type { CategorySpend } from "@/lib/queries/expenses"

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "bg-rose-500",
  "Transport": "bg-sky-500",
  "Housing": "bg-violet-500",
  "Entertainment": "bg-amber-500",
  "Health": "bg-emerald-500",
  "Shopping": "bg-pink-500",
  "Utilities": "bg-slate-500",
  "Travel": "bg-cyan-500",
  "Other": "bg-gray-500",
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

type Props = {
  byCategory: CategorySpend[]
  totalCents: number
}

export function SpendingByCategory({ byCategory, totalCents }: Props) {
  const hasData = byCategory.length > 0

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-5">
        Spending by Category
      </h2>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400 text-xl">
            📊
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            No spending this month
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add an expense to see your breakdown.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byCategory.map((cat) => {
            const pct = totalCents > 0 ? (cat.totalCents / totalCents) * 100 : 0
            const barColor = CATEGORY_COLORS[cat.categoryName] ?? "bg-indigo-500"

            return (
              <div key={cat.categoryId} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {cat.categoryName}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums font-mono">
                    {formatCurrency(cat.totalCents)}{" "}
                    <span className="text-slate-400 dark:text-slate-600">
                      ({pct.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-300 motion-reduce:transition-none`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
