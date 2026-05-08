import Link from "next/link"
import type { RecentExpenseRow } from "@/lib/queries/expenses"

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Dining": "🍔",
  "Transport": "🚗",
  "Housing": "🏠",
  "Entertainment": "🎬",
  "Health": "💊",
  "Shopping": "🛍️",
  "Utilities": "💡",
  "Travel": "✈️",
  "Other": "📌",
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  "Food & Dining": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "Transport": "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "Housing": "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "Entertainment": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Health": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Shopping": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "Utilities": "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "Travel": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "Other": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const CATEGORY_ICON_BG: Record<string, string> = {
  "Food & Dining": "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
  "Transport": "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400",
  "Housing": "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  "Entertainment": "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  "Health": "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  "Shopping": "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400",
  "Utilities": "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  "Travel": "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",
  "Other": "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

type Props = { expenses: RecentExpenseRow[] }

export function RecentExpensesList({ expenses }: Props) {
  const hasData = expenses.length > 0

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Recent Expenses
        </h2>
        {hasData && (
          <Link
            href="/expenses"
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            View all
          </Link>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400 text-xl">
            🧾
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            No transactions yet
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add your first expense to start tracking.
          </p>
          <div className="mt-4">
            <Link
              href="/expenses"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors"
            >
              Add Expense
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {expenses.map((expense) => {
            const icon = CATEGORY_ICONS[expense.categoryName] ?? "📌"
            const iconBg =
              CATEGORY_ICON_BG[expense.categoryName] ??
              "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"

            return (
              <li
                key={expense.id}
                className="flex items-center gap-4 px-1 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm ${iconBg}`}
                  aria-hidden="true"
                >
                  {icon}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                    {expense.description || expense.categoryName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {expense.categoryName} · {formatDate(expense.date)}
                  </p>
                </div>

                <span className="font-mono text-sm font-semibold tabular-nums text-red-600 dark:text-red-400 flex-shrink-0">
                  -{formatCurrency(expense.amountCents)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
