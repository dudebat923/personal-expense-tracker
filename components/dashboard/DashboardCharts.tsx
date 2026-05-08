"use client"
import dynamic from "next/dynamic"
import type { MonthlyPoint, DailyPoint } from "@/lib/queries/expenses"

function ChartSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <div className={`${className} w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse`} />
  )
}

const MonthlyBarChart = dynamic(
  () => import("@/components/dashboard/MonthlyBarChart").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const SpendingTrendLine = dynamic(
  () => import("@/components/dashboard/SpendingTrendLine").then((m) => m.SpendingTrendLine),
  { ssr: false, loading: () => <ChartSkeleton className="h-56" /> }
)

type Props = {
  monthlyHistory: MonthlyPoint[]
  dailySpend: DailyPoint[]
  monthLabel: string
}

export function DashboardCharts({ monthlyHistory, dailySpend, monthLabel }: Props) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-4">
          Monthly Spending
        </h2>
        <MonthlyBarChart data={monthlyHistory} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-4">
          {monthLabel} — Daily Trend
        </h2>
        <SpendingTrendLine data={dailySpend} />
      </div>
    </div>
  )
}
