# Data Fetching

A complete reference for how data is read in this application. All data fetching happens in Server Components. There are no `fetch` calls inside Client Components, no `useEffect`-driven data loading, and no API routes created solely to serve data to this app's own UI.

---

## Guiding Principles

- **Server Components fetch their own data.** Every `page.tsx` and `layout.tsx` is an `async` Server Component that queries the database directly. Data does not travel from a server route to the client and back again before it can be rendered.
- **No API routes for internal reads.** Route handlers (`app/api/.../route.ts`) are for external consumers — webhooks, third-party integrations. The app's own pages never call `fetch('/api/...')` to load data.
- **No data fetching in Client Components.** Client Components receive data as props from their Server Component parent. They never initiate their own database queries or `fetch` calls to read data.
- **Authorization is enforced at every query.** Every MongoDB query that touches user-owned data includes `{ userId: session.user.id }` as a filter. The session is read from the signed JWT — never from a query parameter, request body, or client-supplied value.
- **`getServerSession` is the identity source.** The user's `id` always comes from `await getServerSession(authOptions)`. If there is no session, execution stops immediately.

---

## File Structure

Query functions are extracted into `lib/queries/` so they can be reused across pages and wrapped with `React.cache()` for per-request deduplication.

```
lib/
  queries/
    expenses.ts          # getExpenses, getExpenseById, getExpenseSummary
    categories.ts        # getCategories
  db.ts                  # connectDB — server-only
  authOptions.ts         # NextAuth config — server-only
app/
  (app)/
    dashboard/
      page.tsx           # calls getExpenseSummary, getCategories
      loading.tsx
    transactions/
      page.tsx           # calls getExpenses
      loading.tsx
      [id]/
        page.tsx         # calls getExpenseById
        not-found.tsx
    categories/
      page.tsx           # calls getCategories
      loading.tsx
```

Query files in `lib/queries/` are server-only. They import `connectDB` and Mongoose models and must begin with `import "server-only"`.

---

## Writing Query Functions

Each query function follows the same structure: accept a `userId` parameter (always from the caller's session), connect to the database, run the query with `userId` as a filter, and return a plain object.

```ts
// lib/queries/expenses.ts
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

export async function getExpenses(userId: string): Promise<ExpenseRow[]> {
  await connectDB()
  const docs = await Expense.find({ userId }).sort({ date: -1 }).lean()
  return docs.map(doc => ({
    id: doc._id.toString(),
    amountCents: doc.amountCents,
    description: doc.description,
    categoryId: doc.categoryId.toString(),
    date: doc.date.toISOString().split("T")[0],
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
    description: doc.description,
    categoryId: doc.categoryId.toString(),
    date: doc.date.toISOString().split("T")[0],
  }
}
```

### Rules for query functions

| Rule | Rationale |
|---|---|
| Accept `userId` as an explicit parameter | Makes the authorization contract visible — callers must consciously pass the session user's id |
| Always include `userId` in the MongoDB filter | Prevents any query from returning another user's documents |
| Call `.lean()` on Mongoose queries | Returns plain JS objects instead of Mongoose documents — safe to serialize and pass across the RSC boundary |
| Convert `_id` and `ObjectId` fields to strings | Mongoose ObjectIds are not serializable; convert before returning |
| Return only fields the UI needs | Minimizes the serialized payload sent to the browser |
| Never accept `userId` from a request body or URL param | The caller is a Server Component — it reads `userId` from the session |

---

## Fetching in a Page

Every protected page is an `async` function. It reads the session, extracts `userId`, and passes it to the relevant query functions.

```tsx
// app/(app)/transactions/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import { getExpenses } from "@/lib/queries/expenses"
import { getCategories } from "@/lib/queries/categories"
import { ExpenseList } from "@/components/ExpenseList"

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")  // belt-and-suspenders; middleware already blocks this

  const userId = session.user.id

  const [expenses, categories] = await Promise.all([
    getExpenses(userId),
    getCategories(userId),
  ])

  return <ExpenseList expenses={expenses} categories={categories} />
}
```

Two independent fetches run in parallel with `Promise.all`. Never `await` them sequentially when neither result depends on the other — sequential awaits compound latency.

---

## Fetching a Single Resource

For detail pages, call `notFound()` when the query returns `null`. This covers both the "doesn't exist" and "belongs to another user" cases without leaking resource existence.

```tsx
// app/(app)/transactions/[id]/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { getExpenseById } from "@/lib/queries/expenses"

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const expense = await getExpenseById(params.id, session.user.id)
  if (!expense) notFound()

  return <ExpenseDetail expense={expense} />
}
```

Never return a 403 when a resource is not found for the current user. A 404 (`notFound()`) is correct — it avoids revealing that the resource exists at all. See `docs/auth.md` for the full data ownership pattern.

---

## Deduplicating Session Reads with `React.cache()`

A layout and its child pages both call `getServerSession`. Without deduplication this fires two JWT verifications per request. Wrap the call in `React.cache()` so the result is shared across all Server Components in the same request.

```ts
// lib/session.ts
import "server-only"

import { cache } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export const getSession = cache(() => getServerSession(authOptions))
```

Import `getSession` from `lib/session.ts` instead of calling `getServerSession(authOptions)` directly in pages and query callers.

`React.cache()` deduplicates only within a single render pass — it does not persist across requests. It is safe to call it in every Server Component without worrying about stale data between users.

---

## Caching Across Requests with `unstable_cache`

For data that is expensive to compute and changes infrequently (e.g., default categories that are the same for all users), wrap the query in `unstable_cache` to cache the result across requests.

```ts
import { unstable_cache } from "next/cache"
import { connectDB } from "@/lib/db"
import { Category } from "@/lib/models/Category"

export const getDefaultCategories = unstable_cache(
  async () => {
    await connectDB()
    const docs = await Category.find({ isDefault: true }).lean()
    return docs.map(doc => ({
      id: doc._id.toString(),
      name: doc.name,
      color: doc.color,
    }))
  },
  ["default-categories"],
  { tags: ["categories"], revalidate: 3600 }
)
```

**Only cache data that is not user-specific.** Never pass `userId` into an `unstable_cache` key for the full result set — cache the shared data separately and merge with the user's own data at query time.

```ts
// lib/queries/categories.ts
import "server-only"

import { unstable_cache } from "next/cache"
import { connectDB } from "@/lib/db"
import { Category } from "@/lib/models/Category"
import { getDefaultCategories } from "./defaultCategories"

export async function getCategories(userId: string) {
  await connectDB()
  const [userCategories, defaultCategories] = await Promise.all([
    Category.find({ userId }).lean(),
    getDefaultCategories(),
  ])
  return [
    ...defaultCategories,
    ...userCategories.map(doc => ({
      id: doc._id.toString(),
      name: doc.name,
      color: doc.color,
    })),
  ]
}
```

When a Server Action mutates categories, call `revalidateTag("categories")` to invalidate the cache. See `docs/data-mutations.md` for the full revalidation pattern.

---

## Streaming with `<Suspense>` and `loading.tsx`

Pages that fetch data block the initial HTML response until all queries resolve. Break expensive or independent sections into their own `async` Server Components and wrap them in `<Suspense>` to stream them in without blocking the rest of the page.

### `loading.tsx` (automatic)

Place a `loading.tsx` file next to any `page.tsx` that fetches data. Next.js wraps the page in an implicit `<Suspense>` boundary and shows `loading.tsx` while the page streams.

```tsx
// app/(app)/transactions/loading.tsx
export default function TransactionsLoading() {
  return <TransactionListSkeleton />
}
```

### Manual `<Suspense>` boundaries for independent sections

When a page has multiple independent data sections, break each into its own `async` Server Component so they stream in concurrently.

```tsx
// app/(app)/dashboard/page.tsx
import { Suspense } from "react"
import { SummaryCardsSkeleton, RecentExpensesSkeleton } from "@/components/skeletons"

export default async function DashboardPage() {
  // No data fetching here — each section fetches its own data
  return (
    <div className="grid gap-6">
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <SummaryCards />
      </Suspense>
      <Suspense fallback={<RecentExpensesSkeleton />}>
        <RecentExpenses />
      </Suspense>
    </div>
  )
}
```

```tsx
// Each section is an async Server Component that fetches its own data
async function SummaryCards() {
  const session = await getSession()
  if (!session) return null
  const summary = await getExpenseSummary(session.user.id)
  return <SummaryCardsUI summary={summary} />
}

async function RecentExpenses() {
  const session = await getSession()
  if (!session) return null
  const expenses = await getExpenses(session.user.id)
  return <RecentExpensesUI expenses={expenses} />
}
```

`getSession()` (the `React.cache()` wrapper) means both components share a single JWT verification even though they each call it independently.

---

## Passing Data to Client Components

Server Components pass data to Client Components as props. Only pass what the component actually renders — every extra field adds bytes to the serialized HTML payload.

```tsx
// Server Component — fetches and selects fields
async function ExpenseTableServer() {
  const session = await getSession()
  const expenses = await getExpenses(session!.user.id)

  return (
    <ExpenseTable
      expenses={expenses.map(e => ({
        id: e.id,
        description: e.description,
        amountCents: e.amountCents,
        date: e.date,
      }))}
    />
  )
}

// Client Component — receives props, handles interaction
"use client"

export function ExpenseTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [sortKey, setSortKey] = useState<keyof ExpenseRow>("date")
  // ... sort, filter, render
}
```

Client Components must never trigger their own data reads. If a Client Component needs data that was not passed as a prop, the solution is to lift the fetch into the parent Server Component — not to add a `fetch` call or `useEffect`.

---

## Authorization Checklist

Every page that reads user data must satisfy all of these before any query runs:

1. **Session check** — `const session = await getSession()` followed by `if (!session) redirect("/login")`
2. **`userId` from session** — `const userId = session.user.id` — never from `params`, `searchParams`, or any client-supplied source
3. **`userId` in every query filter** — `{ userId }` is present in every `find`, `findOne`, and `findOneAndUpdate` call
4. **`notFound()` on missing resources** — when a query for a specific resource returns `null`, call `notFound()`, not a 403

---

## What NOT to Do

### Never fetch data inside a Client Component

```tsx
// bad — data leaves the server, makes a round-trip, and arrives back in the browser
"use client"

export function ExpenseList() {
  const [expenses, setExpenses] = useState([])
  useEffect(() => {
    fetch("/api/expenses").then(r => r.json()).then(setExpenses)
  }, [])
}

// good — fetch in the Server Component parent, pass as props
async function ExpenseListServer() {
  const session = await getSession()
  const expenses = await getExpenses(session!.user.id)
  return <ExpenseList expenses={expenses} />
}
```

### Never create an API route just to serve data to a page

```ts
// bad — a GET route handler that only the app's own UI calls
// app/api/expenses/route.ts
export async function GET() {
  const expenses = await getExpenses(userId)
  return NextResponse.json(expenses)
}

// good — call the query function directly from the Server Component
async function TransactionsPage() {
  const expenses = await getExpenses(userId)
  return <ExpenseList expenses={expenses} />
}
```

Route handlers are appropriate for external clients. For the app's own pages, query the database directly.

### Never read `userId` from anywhere but the session

```tsx
// bad — attacker controls params.userId
async function TransactionsPage({ params }: { params: { userId: string } }) {
  const expenses = await getExpenses(params.userId)
}

// bad — attacker controls the query string
async function TransactionsPage({ searchParams }: { searchParams: { userId: string } }) {
  const expenses = await getExpenses(searchParams.userId)
}

// good — userId always comes from the signed JWT
async function TransactionsPage() {
  const session = await getSession()
  const expenses = await getExpenses(session!.user.id)
}
```

### Never await independent queries sequentially

```ts
// bad — 3 serial round-trips
const expenses = await getExpenses(userId)
const categories = await getCategories(userId)
const summary = await getExpenseSummary(userId)

// good — 1 concurrent batch
const [expenses, categories, summary] = await Promise.all([
  getExpenses(userId),
  getCategories(userId),
  getExpenseSummary(userId),
])
```

### Never pass unserialized Mongoose documents as props

```tsx
// bad — Mongoose documents contain methods, circular references, and ObjectIds
const expense = await Expense.findOne({ _id: id, userId })
return <ExpenseDetail expense={expense} />

// good — convert to a plain object with .lean() before passing
const doc = await Expense.findOne({ _id: id, userId }).lean()
const expense = { id: doc._id.toString(), ...doc }
return <ExpenseDetail expense={expense} />
```

---

## Quick Reference

| Scenario | Handling |
|---|---|
| Page needs data | `async` Server Component — call query function directly |
| Multiple independent data needs | `Promise.all([...])` — never sequential `await` |
| Shared data across layout and page | `React.cache()` wrapper so the query runs once per request |
| Infrequently changing shared data | `unstable_cache` with a `tags` key; invalidate in Server Actions |
| Page has slow and fast sections | Separate `async` Server Components wrapped in `<Suspense>` |
| Route has any data fetch | Add `loading.tsx` alongside `page.tsx` |
| Resource may not exist or belong to another user | `notFound()` — never return a 403 |
| Client Component needs data | Pass as props from the Server Component parent — never fetch in the client |
| `userId` source | Always `session.user.id` — never from URL, query string, or request body |
