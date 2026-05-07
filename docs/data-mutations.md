# Data Mutations

A complete reference for how data changes are handled in this application. All mutations go through Next.js Server Actions. There are no client-side fetch calls for mutations, no extra API routes for write operations, and no generic `FormData` passing. Every action accepts a strongly typed, Zod-validated input.

---

## Guiding Principles

- **Server Actions are the only mutation path.** Creating, updating, and deleting records happens exclusively in `"use server"` functions. Client components call these functions directly — they never call `fetch('/api/...')` for mutations.
- **No generic `FormData`.** Actions accept typed objects, not raw `FormData`. The client component extracts values from the form, constructs a typed object, validates it with Zod, and passes the result to the action.
- **Zod validates on both sides.** The client validates for instant feedback before the network round-trip. The server re-validates authoritatively before touching the database. The client result is never trusted.
- **Actions return `ActionResult<T>`, never throw for expected errors.** Throwing from a Server Action reaches the nearest `error.tsx` boundary. Expected failures (validation errors, duplicates, not-found) are returned as a typed result the component can render.
- **Every action authenticates and authorizes.** No action touches data without first confirming a session and confirming the resource belongs to the session user.

---

## File Structure

Actions are colocated with the routes that own them, in an `_actions.ts` file within that route segment.

```
app/
  (app)/
    transactions/
      _actions.ts      # createExpense, updateExpense, deleteExpense
      page.tsx
      [id]/
        page.tsx
    categories/
      _actions.ts      # createCategory, updateCategory, deleteCategory
      page.tsx
lib/
  schemas/
    expense.ts         # Zod schemas — shared by client and server
    category.ts
    auth.ts
  types.ts             # ActionResult<T>
```

Keep schema files in `lib/schemas/` so they can be imported by both Client Components (for pre-validation) and server-only action files without hitting the `server-only` import barrier.

---

## `ActionResult<T>` Type

Define this once in `lib/types.ts` and import it in every action.

```ts
// lib/types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

- `error` is a single safe, user-facing string summarizing the failure.
- `fieldErrors` mirrors Zod's `flatten().fieldErrors` shape — a map of field name to an array of messages — used to show inline errors on specific form fields.
- Never put `error.message` from a caught exception into either field. That string may contain database queries, internal file paths, or other sensitive details.

---

## Zod Schema Conventions

Schemas live in `lib/schemas/`, one file per resource domain. Export named schemas and inferred types. Never export a default.

```ts
// lib/schemas/expense.ts
import { z } from "zod"

export const createExpenseSchema = z.object({
  amountCents: z
    .number({ invalid_type_error: "Amount must be a number." })
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
  note: z.string().max(500, "Note must be 500 characters or fewer.").optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
```

Rules:
- Always pass a human-readable message to every validator — Zod's default messages are not user-friendly.
- Export the inferred type alongside the schema — this avoids a separate interface that can drift.
- Never call `.strict()` on schemas used alongside form inputs — extra fields from browser autofill will cause false failures.

---

## Server Action Pattern

Every action follows the same three-step structure: authenticate, validate, persist.

```ts
// app/(app)/transactions/_actions.ts
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { connectDB } from "@/lib/db"
import { Expense } from "@/lib/models/Expense"
import { createExpenseSchema } from "@/lib/schemas/expense"
import type { ActionResult } from "@/lib/types"

export async function createExpense(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  // 1. Authenticate
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: "You must be signed in." }

  // 2. Validate
  const parsed = createExpenseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // 3. Persist — userId always comes from the session, never from the input
  try {
    await connectDB()
    const expense = await Expense.create({
      userId: session.user.id,
      ...parsed.data,
    })
    return { success: true, data: { id: expense._id.toString() } }
  } catch (err) {
    console.error("[createExpense] failed to insert expense", {
      userId: session.user.id,
      errorName: (err as Error).name,
    })
    return { success: false, error: "Failed to save expense. Please try again." }
  }
}
```

### Update actions — always include `userId` in the query filter

```ts
export async function updateExpense(
  id: string,
  input: unknown
): Promise<ActionResult<void>> {
  const session = await getServerSession(authOptions)
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
    // userId in the filter prevents cross-user writes
    const result = await Expense.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: parsed.data },
      { new: true }
    )
    if (!result) return { success: false, error: "Expense not found." }
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[updateExpense] failed", { userId: session.user.id, id, errorName: (err as Error).name })
    return { success: false, error: "Failed to update expense. Please try again." }
  }
}
```

### Delete actions

```ts
export async function deleteExpense(id: string): Promise<ActionResult<void>> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, error: "You must be signed in." }

  try {
    await connectDB()
    const result = await Expense.deleteOne({ _id: id, userId: session.user.id })
    if (result.deletedCount === 0) return { success: false, error: "Expense not found." }
    return { success: true, data: undefined }
  } catch (err) {
    console.error("[deleteExpense] failed", { userId: session.user.id, id, errorName: (err as Error).name })
    return { success: false, error: "Failed to delete expense. Please try again." }
  }
}
```

---

## Client Component Pattern

The Client Component owns the form state and handles the full lifecycle: extract → validate client-side → call action → handle result.

```tsx
"use client"

import { useState, useTransition } from "react"
import { createExpenseSchema } from "@/lib/schemas/expense"
import { createExpense } from "./_actions"

export function ExpenseForm() {
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Construct a typed object — never pass FormData to the action
    const input = {
      description: formData.get("description") as string,
      amountCents: Number(formData.get("amountCents")),
      categoryId: formData.get("categoryId") as string,
      date: formData.get("date") as string,
    }

    // Client-side pre-validation for instant feedback
    const parsed = createExpenseSchema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[]>)
      return
    }

    setFieldErrors({})
    setFormError(null)

    startTransition(async () => {
      const result = await createExpense(parsed.data)
      if (!result.success) {
        setFormError(result.error)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      }
      // on success: close modal, revalidate list, etc.
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Banner error — shown above the submit button */}
      {formError && <ErrorAlert message={formError} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <input
          id="description"
          name="description"
          type="text"
          aria-describedby={fieldErrors.description ? "description-error" : undefined}
          aria-invalid={fieldErrors.description ? "true" : undefined}
          className={`block w-full rounded-lg border px-3 py-2 text-sm ... ${
            fieldErrors.description
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-300 focus:ring-indigo-600"
          }`}
        />
        {fieldErrors.description && (
          <p id="description-error" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.description[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="... disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving…" : "Save Expense"}
      </button>
    </form>
  )
}
```

### Rules for the client side

| Rule | Rationale |
|---|---|
| Always use `useTransition` — never manual `isLoading` state | `isPending` from `useTransition` handles loading state, errors, and concurrent mode correctly |
| Never pass `FormData` to the action | Generic `FormData` bypasses type safety and Zod inference. Extract values and construct a typed object first |
| Pre-validate on the client before calling the action | Instant feedback without a network round-trip; the server still re-validates authoritatively |
| Show the banner error above the submit button, not at the top of the form | Users have already read the form and are focused at the bottom |
| Show one error per field — `fieldErrors.field[0]` | Multiple messages per field overwhelm; the first is always the most actionable |
| Disable submit only while `isPending` | Never disable submit to prevent attempts — only prevent duplicate submissions |

---

## Cache Revalidation

After a successful mutation, stale data on other routes needs to be cleared. Use `revalidatePath` or `revalidateTag` inside the Server Action after the database write.

```ts
import { revalidatePath } from "next/cache"

export async function createExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  // ... authenticate, validate, persist ...

  revalidatePath("/dashboard")        // clears the dashboard cache
  revalidatePath("/transactions")     // clears the transactions list cache
  return { success: true, data: { id: expense._id.toString() } }
}
```

Use `revalidateTag` when multiple routes share the same data and you want to invalidate them all at once:

```ts
import { revalidateTag } from "next/cache"

// When fetching: unstable_cache(fn, ["expenses"], { tags: ["expenses"] })
// When mutating:
revalidateTag("expenses")
```

After the client receives a successful `ActionResult`, call `router.refresh()` to re-render Server Components in the current route with fresh data — even if `revalidatePath` was already called, `router.refresh()` ensures the current page updates immediately without a full navigation.

```ts
startTransition(async () => {
  const result = await createExpense(input)
  if (result.success) {
    router.refresh()
    onClose()
  }
})
```

---

## Optimistic Updates

For list views where perceived speed matters, use `useOptimistic` to show the change before the server responds.

```tsx
"use client"

import { useOptimistic, useTransition } from "react"
import { deleteExpense } from "./_actions"

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [isPending, startTransition] = useTransition()
  const [optimisticExpenses, removeOptimistic] = useOptimistic(
    expenses,
    (state, deletedId: string) => state.filter(e => e.id !== deletedId)
  )

  function handleDelete(id: string) {
    startTransition(async () => {
      removeOptimistic(id)          // immediately removes from UI
      const result = await deleteExpense(id)
      if (!result.success) {
        // React automatically reverts on error; show a toast
      }
    })
  }

  return (
    <ul>
      {optimisticExpenses.map(expense => (
        <li key={expense.id}>
          {expense.description}
          <button onClick={() => handleDelete(expense.id)}>Delete</button>
        </li>
      ))}
    </ul>
  )
}
```

Only use `useOptimistic` for deletions and status toggles — operations where the local result is clear without waiting for the server. For creates and updates where the server-assigned `id` or transformed values are needed in the UI, wait for the server response.

---

## What NOT to Do

### Never pass `FormData` to a Server Action

```ts
// bad — FormData is untyped; the action cannot enforce a schema
export async function createExpense(formData: FormData) {
  const amount = formData.get("amount") // type: FormDataEntryValue | null
}

// good — typed input, validated with Zod
export async function createExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createExpenseSchema.safeParse(input)
}
```

### Never call `fetch` from a Client Component to mutate data

```ts
// bad — bypasses Server Actions, requires a separate API route, no type safety
async function handleSubmit() {
  await fetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

// good — call the Server Action directly
startTransition(async () => {
  const result = await createExpense(input)
})
```

### Never create API routes for mutations

Route handlers (`app/api/.../route.ts`) are appropriate for data that external clients must access (webhooks, third-party integrations, mobile apps). For mutations that originate from this app's own UI, Server Actions are always preferred — they colocate the logic with the feature, enforce type safety end-to-end, and do not require a separate HTTP contract.

### Never trust the client for `userId`

```ts
// bad — attacker can supply any userId
export async function createExpense(input: { userId: string; ... }) {
  await Expense.create({ userId: input.userId, ... })
}

// good — userId always comes from the session
export async function createExpense(input: unknown) {
  const session = await getServerSession(authOptions)
  await Expense.create({ userId: session.user.id, ... })
}
```

### Never return raw error messages to the client

```ts
// bad — may contain database query text, internal paths, or credentials
catch (err) {
  return { success: false, error: (err as Error).message }
}

// good — safe string, real error logged server-side
catch (err) {
  console.error("[createExpense]", { errorName: (err as Error).name, userId })
  return { success: false, error: "Failed to save expense. Please try again." }
}
```

---

## Quick Reference

| Scenario | Handling |
|---|---|
| Unauthenticated caller | Return `{ success: false, error: "..." }` immediately |
| Zod validation failure | Return with `fieldErrors` populated |
| Resource not found or wrong owner | Return `{ success: false, error: "..." }` — same message for both to avoid leaking existence |
| Database / network error | `console.error` the real error, return a safe message |
| Programmer error (unrecoverable) | `throw` — reaches `error.tsx` |
| Successful mutation | `revalidatePath(...)` then return `{ success: true, data: ... }` |
| Client receives success | Call `router.refresh()` to sync Server Components |
| Client receives `fieldErrors` | Show inline per-field errors using `fieldErrors.field[0]` |
| Client receives `error` (no fields) | Show banner Alert above the submit button |
