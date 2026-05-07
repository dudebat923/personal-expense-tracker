# Routing Specification

A complete reference for how routes are structured and protected in this application. All routing uses the Next.js App Router (`app/` directory) with file-system conventions.

---

## Guiding Principles

- **File-system is the router.** Every route is a folder inside `app/`. The URL is determined by the folder path — no manual route registration.
- **Resources and features drive naming.** Folder names reflect what the user is doing or the resource being acted on: `transactions/`, `categories/`, `settings/` — not implementation terms like `views/` or `pages/`.
- **All app routes are protected by default.** The middleware at `middleware.ts` enforces authentication on every non-excluded path before any page or layout runs. Individual pages do not check authentication independently (though a defensive `getServerSession` check is acceptable as a belt-and-suspenders guard).
- **Route groups keep the URL clean.** Parenthesized folders like `(app)` and `(auth)` organize files without appearing in the URL.
- **Layouts are shared structure, not wrappers for auth.** The `(app)/layout.tsx` provides the app shell (sidebar, nav). Authentication itself is enforced by middleware — not by layout code.

---

## Route Groups

Route groups are folders whose name is wrapped in parentheses. They do not affect the URL path; they exist purely to organize files and share layouts between a subset of routes.

### `(auth)` — Public Routes

Pages under `(auth)` are accessible without a session. The middleware excludes these from the authentication check (via the matcher pattern — see `docs/auth.md`). Authenticated users who navigate here are redirected to `/dashboard`.

```
app/
  (auth)/
    login/
      page.tsx          → /login
    signup/
      page.tsx          → /signup
```

### `(app)` — Protected Routes

All pages under `(app)` require a valid session. The middleware blocks unauthenticated requests before they reach any file here. The shared `layout.tsx` in this group renders the app shell (sidebar, mobile nav, header) that wraps every protected page.

```
app/
  (app)/
    layout.tsx          → App shell layout (sidebar + main area)
    dashboard/
      page.tsx          → /dashboard
    transactions/
      page.tsx          → /transactions
    categories/
      page.tsx          → /categories
    settings/
      page.tsx          → /settings
```

---

## File Conventions

Each route segment can contain these special files. Only `page.tsx` is required; the others are optional.

| File | Purpose |
|---|---|
| `page.tsx` | The UI rendered at that URL. Making the route publicly accessible. |
| `layout.tsx` | Shared wrapping UI for this segment and all children. Persists across navigations within the segment. |
| `loading.tsx` | Automatic Suspense boundary shown while `page.tsx` is streaming. |
| `error.tsx` | Error boundary for runtime errors within the segment. Must be a Client Component (`"use client"`). |
| `not-found.tsx` | Rendered when `notFound()` is called from within the segment. |

### When to add each file

- **`loading.tsx`**: add it to any route that fetches data server-side. It renders immediately while the page streams in, eliminating layout shift.
- **`error.tsx`**: add it to top-level protected routes (`(app)/`) so runtime errors don't crash the entire app. A single `error.tsx` in `(app)/` covers all child routes unless overridden.
- **`not-found.tsx`**: add it where a resource may not exist — for example, `transactions/[id]/not-found.tsx` when a transaction ID is invalid or belongs to another user.

---

## Dynamic Routes

Dynamic segments are folder names wrapped in square brackets. The segment value is passed to the page as a prop.

```
app/
  (app)/
    transactions/
      page.tsx          → /transactions
      [id]/
        page.tsx        → /transactions/:id   (view / edit a single transaction)
    categories/
      page.tsx          → /categories
      [id]/
        page.tsx        → /categories/:id
```

### Accessing params in a page

```tsx
// app/(app)/transactions/[id]/page.tsx
export default async function TransactionPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  const transaction = await Transaction.findOne({ _id: params.id, userId: session!.user.id })
  if (!transaction) notFound()
  // ...
}
```

Always filter by both `_id` and `userId`. If the document doesn't exist or belongs to another user, call `notFound()` — never return a 403 that leaks resource existence.

---

## API Routes

API routes live under `app/api/` and follow the same file-system convention. The special file is `route.ts` (not `page.tsx`). Each exported function name maps to an HTTP method.

### Structure

```
app/
  api/
    auth/
      [...nextauth]/
        route.ts        → NextAuth handler (GET + POST). Never modify this file.
    transactions/
      route.ts          → GET /api/transactions, POST /api/transactions
      [id]/
        route.ts        → GET /api/transactions/:id, PATCH /api/transactions/:id, DELETE /api/transactions/:id
    categories/
      route.ts          → GET /api/categories, POST /api/categories
      [id]/
        route.ts        → PATCH /api/categories/:id, DELETE /api/categories/:id
```

### Route handler shape

```ts
// app/api/transactions/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // fetch with userId from session — never from query params or body
  const userId = session.user.id
  const transactions = await Transaction.find({ userId }).lean()
  return NextResponse.json(transactions)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  // validate, then create with userId from session
}
```

Every route handler must call `getServerSession` and check for a session — even though the middleware already blocks unauthenticated requests. The middleware matcher excludes `api/auth/*`; any other API route could theoretically be reached directly if the matcher is misconfigured.

---

## Middleware and Route Protection

Authentication is enforced in `middleware.ts` at the project root. It runs before any route handler, page, or layout.

- **Unauthenticated request → any matched path:** redirected to `/login?callbackUrl=<original-url>`
- **Authenticated request → `/login` or `/signup`:** redirected to `/dashboard`
- **Authenticated request → any `(app)` route:** passed through
- **Any request → `api/auth/*`, `_next/*`, static assets:** always passed through (excluded by matcher)

The middleware matcher is intentionally broad — it covers everything except Next.js internals and NextAuth's own endpoints. Adding a new route under `(app)/` requires no middleware changes; it is protected automatically.

See `docs/auth.md` for the full middleware implementation.

---

## Full File Tree

The intended route structure for the application. Expand as features are added; do not create routes that don't correspond to a user-facing resource or action.

```
app/
├── globals.css
├── favicon.ico
├── layout.tsx                        Root layout (html, body, fonts)
│
├── (auth)/                           Public — no session required
│   ├── login/
│   │   └── page.tsx                  /login
│   └── signup/
│       └── page.tsx                  /signup
│
├── (app)/                            Protected — session required
│   ├── layout.tsx                    App shell (sidebar, nav)
│   ├── error.tsx                     Top-level error boundary
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  /dashboard
│   │   └── loading.tsx
│   │
│   ├── transactions/
│   │   ├── page.tsx                  /transactions  (list)
│   │   ├── loading.tsx
│   │   └── [id]/
│   │       ├── page.tsx              /transactions/:id  (detail / edit)
│   │       └── not-found.tsx
│   │
│   ├── categories/
│   │   ├── page.tsx                  /categories
│   │   └── loading.tsx
│   │
│   └── settings/
│       └── page.tsx                  /settings
│
└── api/
    ├── auth/
    │   └── [...nextauth]/
    │       └── route.ts              NextAuth handler
    ├── transactions/
    │   ├── route.ts                  GET (list), POST (create)
    │   └── [id]/
    │       └── route.ts              GET, PATCH, DELETE
    └── categories/
        ├── route.ts                  GET (list), POST (create)
        └── [id]/
            └── route.ts              PATCH, DELETE
```

---

## Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Route folders | lowercase, hyphen-separated | `transactions/`, `budget-summary/` |
| Dynamic segments | camelCase noun inside brackets | `[id]`, `[categoryId]` |
| Page files | always `page.tsx` | `page.tsx` |
| Layout files | always `layout.tsx` | `layout.tsx` |
| API route files | always `route.ts` | `route.ts` |
| Route groups | noun describing the access tier | `(app)`, `(auth)` |

**Do not** use verbs in route folder names. Routes represent resources, not actions.

```
/transactions/new     ✓   (the "new transaction" resource)
/transactions/create  ✗   (a verb — belongs in a button, not a URL)
/add-transaction      ✗   (action phrasing)
```

---

## Adding a New Route — Checklist

1. Determine if the route is public or protected. If protected, place it under `(app)/`.
2. Name the folder after the resource (noun, lowercase, hyphenated).
3. Create `page.tsx`. For pages that fetch data, also create `loading.tsx`.
4. If the page can encounter a missing resource, create `not-found.tsx` and call `notFound()` from the page when applicable.
5. If the page needs an API route, add `app/api/<resource>/route.ts` following the handler shape above.
6. Verify the new route appears in the sidebar navigation (`(app)/layout.tsx`).
7. Confirm no new middleware changes are needed — protected routes are covered automatically.
