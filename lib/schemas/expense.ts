import { z } from "zod"

export const createExpenseSchema = z.object({
  amountCents: z
    .number({ error: "Amount must be a number." })
    .int("Amount must be a whole number of cents.")
    .positive("Amount must be greater than zero."),
  description: z
    .string()
    .min(1, "Description is required.")
    .max(120, "Description must be 120 characters or fewer."),
  categoryId: z.string().min(1, "Category is required."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
  type: z.enum(["expense", "income"]).default("expense"),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

export const updateExpenseSchema = createExpenseSchema

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
