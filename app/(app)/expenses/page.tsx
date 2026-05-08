import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getExpenses } from "@/lib/queries/expenses"
import { getCategories } from "@/lib/queries/categories"
import { ExpensesClient } from "@/components/expenses/ExpensesClient"

export default async function ExpensesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const [expenses, categories] = await Promise.all([
    getExpenses(session.user.id),
    getCategories(session.user.id),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <ExpensesClient expenses={expenses} categories={categories} />
    </div>
  )
}
