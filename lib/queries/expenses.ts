import "server-only"

import { connectDB } from "@/lib/db"
import { Expense } from "@/lib/models/Expense"

export type ExpenseRow = {
  id: string
  amountCents: number
  description: string
  categoryId: string
  date: string
}

function toDateString(val: unknown): string {
  if (val instanceof Date) return val.toISOString().split("T")[0]
  return String(val).split("T")[0]
}

export async function getExpenses(userId: string): Promise<ExpenseRow[]> {
  await connectDB()
  const docs = await Expense.find({ userId }).sort({ date: -1 }).lean()
  return docs.map((doc) => ({
    id: doc._id.toString(),
    amountCents: doc.amountCents,
    description: doc.description ?? "",
    categoryId: doc.categoryId.toString(),
    date: toDateString(doc.date),
  }))
}

export async function getExpenseById(
  id: string,
  userId: string
): Promise<ExpenseRow | null> {
  await connectDB()
  const doc = await Expense.findOne({ _id: id, userId }).lean()
  if (!doc) return null
  return {
    id: doc._id.toString(),
    amountCents: doc.amountCents,
    description: doc.description ?? "",
    categoryId: doc.categoryId.toString(),
    date: toDateString(doc.date),
  }
}
