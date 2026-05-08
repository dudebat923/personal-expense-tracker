"use server"

import { revalidatePath } from "next/cache"
import { connectDB } from "@/lib/db"
import { Category } from "@/lib/models/Category"
import { Expense } from "@/lib/models/Expense"
import { getSession } from "@/lib/session"
import { createCategorySchema, updateCategorySchema } from "@/lib/schemas/category"
import type { ActionResult } from "@/lib/types"

export async function createCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session) return { success: false, error: "You must be signed in." }

  const parsed = createCategorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await connectDB()
    const category = await Category.create({
      userId: session.user.id,
      name: parsed.data.name,
      isDefault: false,
    })
    revalidatePath("/expenses/categories")
    revalidatePath("/expenses")
    return { success: true, data: { id: category._id.toString() } }
  } catch (err) {
    const isDuplicate = (err as { code?: number }).code === 11000
    if (isDuplicate) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { name: ["A category with this name already exists."] },
      }
    }
    console.error("[createCategory] failed", {
      userId: session.user.id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to create category. Please try again." }
  }
}

export async function updateCategory(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: "You must be signed in." }

  const parsed = updateCategorySchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  try {
    await connectDB()
    const result = await Category.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { name: parsed.data.name } },
      { new: true }
    )
    if (!result) return { success: false, error: "Category not found." }
    revalidatePath("/expenses/categories")
    revalidatePath("/expenses")
    return { success: true, data: undefined }
  } catch (err) {
    const isDuplicate = (err as { code?: number }).code === 11000
    if (isDuplicate) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { name: ["A category with this name already exists."] },
      }
    }
    console.error("[updateCategory] failed", {
      userId: session.user.id,
      id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to update category. Please try again." }
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session) return { success: false, error: "You must be signed in." }

  try {
    await connectDB()
    const inUse = await Expense.countDocuments({
      userId: session.user.id,
      categoryId: id,
    })
    if (inUse > 0) {
      return {
        success: false,
        error: `This category is used by ${inUse} expense${inUse === 1 ? "" : "s"} and cannot be deleted.`,
      }
    }
    const result = await Category.deleteOne({ _id: id, userId: session.user.id })
    if (result.deletedCount === 0) return { success: false, error: "Category not found." }
    revalidatePath("/expenses/categories")
    revalidatePath("/expenses")
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteCategory] failed", {
      userId: session.user.id,
      id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to delete category. Please try again." }
  }
}
