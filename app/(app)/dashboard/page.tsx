import Link from "next/link"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getExpenseSummary } from "@/lib/queries/expenses"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory"
import { RecentExpensesList } from "@/components/dashboard/RecentExpensesList"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const summary = await getExpenseSummary(session.user.id)

  const now = new Date()
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {monthLabel} · Welcome back, {session.user.name ?? "there"}
          </p>
        </div>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors"
        >
          Add Expense
        </Link>
      </div>

      {/* KPI tiles */}
      <SummaryCards summary={summary} />

      {/* Category breakdown + Recent expenses */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SpendingByCategory
            byCategory={summary.thisMonth.byCategory}
            totalCents={summary.thisMonth.totalCents}
          />
        </div>
        <div className="lg:col-span-2">
          <RecentExpensesList expenses={summary.recentExpenses} />
        </div>
      </div>
    </div>
  )
}
