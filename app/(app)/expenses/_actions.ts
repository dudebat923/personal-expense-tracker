"use server"

import { revalidatePath } from "next/cache"
import { connectDB } from "@/lib/db"
import { Expense } from "@/lib/models/Expense"
import { getSession } from "@/lib/session"
import { createExpenseSchema, updateExpenseSchema } from "@/lib/schemas/expense"
import type { ActionResult } from "@/lib/types"

export async function createExpense(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: "You must be signed in." }

  const parsed = createExpenseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await connectDB()
    const expense = await Expense.create({
      userId: session.user.id,
      categoryId: parsed.data.categoryId,
      amountCents: parsed.data.amountCents,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
    })
    revalidatePath("/expenses")
    revalidatePath("/dashboard")
    return { success: true, data: { id: expense._id.toString() } }
  } catch (err) {
    console.error("[createExpense] failed", {
      userId: session.user.id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to save expense. Please try again." }
  }
}

export async function updateExpense(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: "You must be signed in." }

  const parsed = updateExpenseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await connectDB()
    const result = await Expense.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      {
        $set: {
          categoryId: parsed.data.categoryId,
          amountCents: parsed.data.amountCents,
          description: parsed.data.description,
          date: new Date(parsed.data.date),
        },
      },
      { new: true }
    )
    if (!result) return { success: false, error: "Expense not found." }
    revalidatePath("/expenses")
    revalidatePath("/dashboard")
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[updateExpense] failed", {
      userId: session.user.id,
      id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to update expense. Please try again." }
  }
}

export async function deleteExpense(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: "You must be signed in." }

  try {
    await connectDB()
    const result = await Expense.deleteOne({ _id: id, userId: session.user.id })
    if (result.deletedCount === 0) return { success: false, error: "Expense not found." }
    revalidatePath("/expenses")
    revalidatePath("/dashboard")
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteExpense] failed", {
      userId: session.user.id,
      id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to delete expense. Please try again." }
  }
}
