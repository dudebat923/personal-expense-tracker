# Errors and Validation

A complete reference for handling validation and errors in a production-ready way. The goal is consistent, user-friendly feedback without exposing technical details, stack traces, or internal state.

---

## Guiding Principles

- **Validate with Zod everywhere input crosses a boundary.** Every Server Action, API route handler, and any client-side form that calls one must parse its input through a Zod schema before using it.
- **Schemas live in one place and are shared.** Define schemas in `lib/schemas/`. Import them on both the client (for live validation feedback) and the server (for authoritative validation before any data access).
- **Server Actions return typed results — they do not throw for expected errors.** Throwing from a Server Action reaches the nearest `error.tsx` boundary, which is appropriate for unexpected failures. Expected failures (invalid input, duplicate email, not found) must be returned as a typed `ActionResult` so the form can display them.
- **Never send raw errors to the client.** `error.message` from a caught `Error` often contains database messages, stack traces, or internal paths. Map errors to safe strings before returning or rendering them.
- **All visible error messages use the Alert component.** Inline field errors use the error state defined in `docs/ui.md`. Banner-level errors (action failures, network errors) use the Alert markup defined in this document.

---

## Zod Schema Conventions

### File Structure

```
lib/
  schemas/
    expense.ts       # Schemas for expense inputs
    category.ts      # Schemas for category inputs
    auth.ts          # Schemas for login / registration inputs
```

One file per resource domain. Export named schemas, not a default. Keep schemas in `lib/schemas/` — not colocated with components — so they can be imported by both client components and server-only code without hitting the "server-only" import barrier.

### Defining a Schema

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

### Rules

| Rule | Rationale |
|---|---|
| Always pass a human-readable message to every validator | Zod's default messages mention type names and are not suitable for users |
| Keep messages short, sentence-cased, and ending with a period | Consistent with the rest of the UI copy |
| Export the inferred type alongside the schema | Avoids a separate interface that can drift out of sync |
| Never call `.strict()` on schemas used with `FormData` | FormData often includes extra browser-generated fields |

---

## Server Action Pattern

Server Actions are the primary mutation path. They must return a typed `ActionResult` rather than throwing for expected failures.

### `ActionResult` Type

Define this type once and share it across all Server Actions.

```ts
// lib/types.ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
```

- `error` is a single user-facing message summarizing the failure ("Failed to save expense.")
- `fieldErrors` mirrors Zod's `fieldErrors` shape — a map of field name to an array of messages — and is used to show inline errors on specific form fields

### Server Action Implementation

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

  // 3. Persist
  try {
    await connectDB()
    const expense = await Expense.create({
      userId: session.user.id,
      ...parsed.data,
    })
    return { success: true, data: { id: expense._id.toString() } }
  } catch (err) {
    // Log the real error server-side; never send it to the client
    console.error("[createExpense]", err)
    return { success: false, error: "Failed to save expense. Please try again." }
  }
}
```

### What to Throw vs. What to Return

| Situation | Handling |
|---|---|
| Unauthenticated caller | Return `{ success: false, error: "..." }` |
| Zod validation failure | Return with `fieldErrors` populated |
| Resource not found | Return `{ success: false, error: "..." }` |
| Database / network error | `console.error` the real error, return a safe message |
| Programmer error (unrecoverable) | `throw` — reaches `error.tsx` which shows a fallback UI |

Never throw an `Error` whose `.message` comes from a database driver, filesystem, or third-party SDK. Those messages contain internal details.

---

## API Route Pattern

Route handlers follow the same principle: validate with Zod, return structured JSON errors, never expose raw messages.

```ts
// app/api/transactions/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { NextResponse } from "next/server"
import { createExpenseSchema } from "@/lib/schemas/expense"
import { connectDB } from "@/lib/db"
import { Expense } from "@/lib/models/Expense"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  try {
    await connectDB()
    const expense = await Expense.create({ userId: session.user.id, ...parsed.data })
    return NextResponse.json({ id: expense._id.toString() }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/transactions]", err)
    return NextResponse.json(
      { error: "Failed to create transaction." },
      { status: 500 }
    )
  }
}
```

### HTTP Status Codes

| Status | When to use |
|---|---|
| `400` | Malformed request (unparseable JSON, missing required top-level fields) |
| `401` | No valid session |
| `403` | Session is valid but the caller doesn't own the resource |
| `404` | Resource not found (also used when the caller doesn't own it — avoid leaking existence) |
| `422` | Zod validation failed — well-formed request but semantically invalid |
| `500` | Unexpected server error — log the real cause, return a safe message |

---

## Alert Component

All banner-level error messages — form submission failures, network errors, permission errors — use the Alert component. There is no third-party component library; the markup below is the canonical implementation.

### Variants

**Error (red) — use for action failures and validation summaries:**
```html
<div role="alert" class="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
  <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
  </svg>
  <p class="text-sm text-red-700 dark:text-red-300">Something went wrong. Please try again.</p>
</div>
```

**Warning (amber) — use for non-blocking cautions (approaching budget limit, etc.):**
```html
<div role="alert" class="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
  <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
  </svg>
  <p class="text-sm text-amber-700 dark:text-amber-300">You are approaching your monthly budget limit.</p>
</div>
```

**Success (emerald) — use sparingly; prefer the Toast for transient confirmations:**
```html
<div role="alert" class="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
  <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
  </svg>
  <p class="text-sm text-emerald-700 dark:text-emerald-300">Changes saved successfully.</p>
</div>
```

**Info (sky) — use for contextual guidance:**
```html
<div role="alert" class="flex gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
  <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600 dark:text-sky-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
  </svg>
  <p class="text-sm text-sky-700 dark:text-sky-300">Amounts are stored in cents to avoid floating-point errors.</p>
</div>
```

### Alert with Title

When the message needs a heading (e.g., a validation summary with multiple items):

```html
<div role="alert" class="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
  <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
    <!-- error icon path -->
  </svg>
  <div class="flex flex-col gap-1">
    <p class="text-sm font-semibold text-red-700 dark:text-red-300">Please fix the following errors:</p>
    <ul class="list-disc pl-4 text-sm text-red-700 dark:text-red-300 space-y-0.5">
      <li>Amount must be greater than zero.</li>
      <li>Category is required.</li>
    </ul>
  </div>
</div>
```

---

## Form Error Handling

Forms combine inline field errors (per-field, below the input) with a banner error (above the submit button) when the action itself fails.

### Inline Field Error

The error state for inputs is defined in `docs/ui.md`. The pattern: add `border-red-500 focus:ring-red-500` to the input and render an error paragraph beneath it.

```tsx
<div class="flex flex-col gap-1.5">
  <label for="description" class="text-sm font-medium text-slate-700 dark:text-slate-300">
    Description
  </label>
  <input
    id="description"
    name="description"
    type="text"
    class="block w-full rounded-lg border border-red-500 bg-white dark:bg-slate-800 px-3 py-2 text-sm
           text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500
           focus:border-transparent transition"
    aria-describedby="description-error"
    aria-invalid="true"
  />
  <p id="description-error" class="text-xs text-red-600 dark:text-red-400">
    Description is required.
  </p>
</div>
```

Use `aria-describedby` pointing to the error paragraph's `id` and `aria-invalid="true"` on the input so screen readers announce the error when the field is focused.

### Complete Form with Error Handling (Client Component)

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

    // Client-side pre-validation for instant feedback
    const input = {
      description: formData.get("description"),
      amountCents: Number(formData.get("amountCents")),
      categoryId: formData.get("categoryId"),
      date: formData.get("date"),
    }

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
    })
  }

  return (
    <form onSubmit={handleSubmit} class="flex flex-col gap-5" noValidate>
      {/* Banner error — shown only on action failure */}
      {formError && (
        <div role="alert" class="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p class="text-sm text-red-700 dark:text-red-300">{formError}</p>
        </div>
      )}

      {/* Description field */}
      <div class="flex flex-col gap-1.5">
        <label for="description" class="text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <input
          id="description"
          name="description"
          type="text"
          class={`block w-full rounded-lg border bg-white dark:bg-slate-800 px-3 py-2 text-sm
            text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:border-transparent transition
            ${fieldErrors.description
              ? "border-red-500 focus:ring-red-500"
              : "border-slate-300 dark:border-slate-600 focus:ring-indigo-600"
            }`}
          aria-describedby={fieldErrors.description ? "description-error" : undefined}
          aria-invalid={fieldErrors.description ? "true" : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" class="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.description[0]}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2
               text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline
               focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600
               active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving…" : "Save Expense"}
      </button>
    </form>
  )
}
```

### Rules for Form Error UX

- Show the banner error above the submit button, not at the top of the form — users have already read the form and are focused at the bottom.
- Show at most one error message per field — display `fieldErrors.description[0]` rather than mapping over all messages.
- Clear field errors on successful re-submission, not on every keystroke — avoid erasing error state before the user has corrected the field.
- Never disable the submit button to prevent submission attempts; disable it only while `isPending` to prevent duplicate submissions.

---

## Error Boundaries (`error.tsx`)

Next.js catches thrown errors inside Server Components and Client Components and renders the nearest `error.tsx` boundary. This is appropriate for **unexpected errors** — database connection failures, unhandled exceptions, programming errors — not for user-facing validation feedback.

### Placement

Place a single `error.tsx` in `app/(app)/` to catch all unexpected errors within protected pages. Override it at a more specific segment only if a page needs different fallback UI.

```
app/
  (app)/
    error.tsx       ← catches all unexpected errors in protected routes
    dashboard/
      page.tsx
    transactions/
      page.tsx
```

### Implementation

`error.tsx` must be a Client Component. It receives the `Error` object and a `reset` function.

```tsx
// app/(app)/error.tsx
"use client"

import { useEffect } from "react"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to an error tracking service (e.g., Sentry) in production
    console.error(error)
  }, [error])

  return (
    <div class="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 text-red-500 text-2xl">
        {/* exclamation icon */}
      </div>
      <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-50">
        Something went wrong
      </h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        An unexpected error occurred. If this keeps happening, please contact support.
      </p>
      <button
        onClick={reset}
        class="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2
               text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
```

**Never render `error.message` or `error.stack` in the UI.** These strings may contain database queries, internal file paths, or other sensitive implementation details. The only error detail that is safe to surface is `error.digest`, which is a Next.js-generated hash suitable for correlating with server logs without exposing underlying data.

---

## Not-Found Pages (`not-found.tsx`)

When a resource does not exist — or exists but belongs to another user — call `notFound()`. This renders the nearest `not-found.tsx`. It is intentionally ambiguous (no 403 / "you don't have access" message) to avoid leaking resource existence.

```tsx
// app/(app)/transactions/[id]/not-found.tsx
import Link from "next/link"

export default function TransactionNotFound() {
  return (
    <div class="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p class="text-5xl font-bold text-slate-200 dark:text-slate-800 select-none">404</p>
      <h2 class="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">
        Transaction not found
      </h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        This transaction does not exist or you do not have access to it.
      </p>
      <Link
        href="/transactions"
        class="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600
               bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200
               shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        Back to Transactions
      </Link>
    </div>
  )
}
```

---

## Production Safety Rules

These rules apply to all server-side code:

1. **Never `console.log` or `console.error` user credentials, tokens, or PII.** Log only the operation name, a safe description, and the error type.
2. **Never return `err.message` directly in an API response or `ActionResult`.** Write an explicit safe string for every error case.
3. **Use `NODE_ENV` checks only for developer tooling (verbose logging, stack traces in the browser console).** Never conditionally expose stack traces to the client based on environment — assume the client is always hostile.
4. **Wrap all third-party calls (database, external APIs) in `try/catch`.** Let unexpected errors surface through `error.tsx` only after logging them.
5. **Log errors at the call site with enough context to reproduce the failure.** Include the operation name and any safe identifiers (userId, resource type). Never include raw request bodies.

```ts
// Good — safe server-side logging
try {
  await Expense.create({ userId, ...data })
} catch (err) {
  console.error("[createExpense] failed to insert expense", { userId, err })
  return { success: false, error: "Failed to save expense. Please try again." }
}

// Bad — leaks internal details to the client
catch (err) {
  return { success: false, error: (err as Error).message }
}
```

---

## Quick Reference

| Scenario | How to handle |
|---|---|
| User submits invalid form data | Zod `safeParse` → return `fieldErrors` from Server Action → inline field errors + banner Alert |
| Server Action hits database error | `console.error` the real error → return safe `error` string → banner Alert |
| Unexpected thrown error in Server Component | Bubble to `error.tsx` boundary — show generic fallback, log the `digest` |
| Resource not found or access denied | Call `notFound()` — render `not-found.tsx` |
| API route receives invalid JSON | Return `{ error: "Invalid JSON." }` with status 400 |
| API route Zod failure | Return `{ error: "...", fieldErrors: {...} }` with status 422 |
| Unauthenticated API request | Return `{ error: "Unauthorized" }` with status 401 |
| Transient success confirmation | Toast component from `docs/ui.md` — auto-dismisses after 4 seconds |
| Non-blocking warning (over budget) | Amber Alert embedded in the relevant page section |
