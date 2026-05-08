import type { DashboardSummary } from "@/lib/queries/expenses"

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function pctChange(current: number, previous: number): string | null {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(0)}% vs last month`
}

type Props = { summary: DashboardSummary }

export function SummaryCards({ summary }: Props) {
  const { thisMonth, lastMonth } = summary

  const delta = pctChange(thisMonth.totalCents, lastMonth.totalCents)
  const deltaPositive = lastMonth.totalCents > 0 && thisMonth.totalCents <= lastMonth.totalCents
  const deltaColor = deltaPositive
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"

  const topCategory = thisMonth.byCategory[0]

  const now = new Date()
  const dayOfMonth = now.getDate()
  const dailyAvgCents =
    dayOfMonth > 0 && thisMonth.totalCents > 0
      ? Math.round(thisMonth.totalCents / dayOfMonth)
      : 0

  const tiles = [
    {
      label: "This Month",
      value: formatCurrency(thisMonth.totalCents),
      sub: delta ? (
        <span className={deltaColor}>{delta}</span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">No prior data</span>
      ),
    },
    {
      label: "Last Month",
      value: formatCurrency(lastMonth.totalCents),
      sub: (
        <span className="text-slate-400 dark:text-slate-500">
          {lastMonth.count} transaction{lastMonth.count !== 1 ? "s" : ""}
        </span>
      ),
    },
    {
      label: "Transactions",
      value: String(thisMonth.count),
      sub: (
        <span className="text-slate-400 dark:text-slate-500">This month</span>
      ),
    },
    {
      label: topCategory ? "Top Category" : "Top Category",
      value: topCategory ? topCategory.categoryName : "—",
      sub: topCategory ? (
        <span className="text-slate-400 dark:text-slate-500">
          {formatCurrency(topCategory.totalCents)} spent
        </span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">No data yet</span>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {tile.label}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50 truncate">
            {tile.value}
          </p>
          <p className="mt-1 text-xs font-medium">{tile.sub}</p>
        </div>
      ))}
    </div>
  )
}
