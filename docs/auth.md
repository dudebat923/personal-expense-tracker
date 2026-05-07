# Authentication Specification

A complete reference for implementing authentication in the personal expense tracker using NextAuth v4 (latest stable). NextAuth owns all authentication concerns: session lifecycle, token signing, CSRF protection, and redirect behavior. Application code is responsible for enforcing data ownership on every data access.

---

## Guiding Principles

- **NextAuth is the authority.** Never write custom session logic, roll your own tokens, or store auth state in cookies manually.
- **All app routes are protected by default.** The middleware denies unauthenticated requests before they reach any page or Server Component. Individual routes are not responsible for checking authentication.
- **Identity is server-enforced.** `session.user.id` is read from the signed JWT on every request — never from query parameters, request bodies, or client-supplied headers.
- **Data isolation is enforced at the query level.** Every MongoDB query that touches user-owned data includes `{ userId: session.user.id }` as a filter. Trusting the client to supply a userId is a security defect.
- **Passwords are never stored.** The `passwordHash` field in the `User` model holds a bcrypt hash (cost factor 12). The plaintext password is discarded immediately after hashing.

---

## Package Installation

```bash
npm install next-auth bcryptjs
npm install --save-dev @types/bcryptjs
```

Use `next-auth` (no tag) to get the latest v4 stable release.

---

## File Structure

```
lib/
  authOptions.ts                       # NextAuth config — single source of truth
middleware.ts                          # Route protection (runs on every request)
app/
  api/
    auth/
      [...nextauth]/
        route.ts                       # Exposes NextAuth HTTP handlers
  (auth)/
    login/page.tsx                     # Public sign-in page
    signup/page.tsx                    # Public registration page
  (app)/
    layout.tsx                         # Protected layout (wraps all app pages)
    dashboard/page.tsx
    transactions/page.tsx
    ...
```

The `(auth)` and `(app)` route groups are parenthesized so they don't appear in URLs. Pages under `(app)/` are protected automatically by the middleware. Pages under `(auth)/` are public.

`authOptions` lives in `lib/` rather than the route handler so it can be imported by both the route handler and any Server Component that calls `getServerSession`.

---

## NextAuth Configuration (`lib/authOptions.ts`)

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user._id.toString(), name: user.name, email: user.email };
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
```

### Key decisions

| Decision | Rationale |
|---|---|
| `strategy: "jwt"` | No session table in MongoDB. The signed JWT is the session — stateless and self-contained. |
| `id` in JWT | The user's MongoDB `_id` (as a string) is embedded in the token at sign-in. Every subsequent request resolves the owner without a database round-trip. |
| `authorize` returns `null` on failure | NextAuth treats `null` as an auth failure and redirects to the `signIn` page. Never throw from `authorize`. |
| `bcrypt.compare` | Constant-time comparison prevents timing attacks. Cost factor 12 is used at registration (see below). |

---

## TypeScript Session Augmentation

Place this in a `types/next-auth.d.ts` file at the project root so the augmentation is picked up globally.

```ts
import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
  }
}
```

This makes `session.user.id` typed as `string` everywhere without casting, and ensures the `id` field on the JWT token is recognized by TypeScript.

---

## Route Handler (`app/api/auth/[...nextauth]/route.ts`)

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

This file only wires up the handler. All configuration lives in `lib/authOptions.ts`.

---

## Middleware (`middleware.ts`)

Place this file at the project root. It runs on every matched request before any page or API route.

```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuthenticated = !!req.nextauth.token;

    if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.png$).*)",
  ],
};
```

### Behavior

| Condition | Result |
|---|---|
| Unauthenticated request to any matched path | `withAuth` redirects to `/login?callbackUrl=<original-url>` (uses `pages.signIn` from `authOptions`) |
| Authenticated request to `/login` or `/signup` | Redirect to `/dashboard` |
| Authenticated request to any app route | Pass through |
| Requests to `/api/auth/*` | Always pass through (excluded by matcher) |
| Requests to `_next/static`, `_next/image`, `favicon.ico` | Always pass through (excluded by matcher) |

The `authorized` callback returning `!!token` means any request without a valid JWT is denied before the middleware function runs. The middleware function itself only handles the secondary case — redirecting already-authenticated users away from auth pages.

The matcher pattern is intentionally broad. Every route except Next.js internals and NextAuth's own API passes through the middleware, so protection is opt-out (excluded in the matcher pattern) rather than opt-in.

---

## Accessing the Session

### In a Server Component or Layout

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login"); // belt-and-suspenders; middleware already blocks this

  const userId = session.user.id;
  // ...
}
```

Always pass `authOptions` to `getServerSession`. Calling it without arguments returns `null` in App Router.

The `redirect()` call is a defensive fallback. The middleware already prevents unauthenticated access, but the check costs nothing and prevents data leaks if the middleware matcher is ever misconfigured.

### In a Server Action

```ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function createExpense(data: unknown) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  const userId = session.user.id;
  // insert with userId attached — see Data Ownership section
}
```

### In a Route Handler (`app/api/.../route.ts`)

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  // ...
}
```

Never access the session in a Client Component by calling `getServerSession`. Client Components use the `useSession` hook from `next-auth/react` for display purposes only — never to authorize data access.

---

## Data Ownership Enforcement

Every model that stores user data has a `userId` field indexed for lookup performance. The enforcement rule is:

> **Every read, write, update, and delete operation must include `{ userId }` as a query filter, where `userId` comes from `session.user.id`.**

### Reading

```ts
const expenses = await Expense.find({ userId, date: { $gte: start, $lte: end } })
  .sort({ date: -1 })
  .lean();
```

### Creating

```ts
const expense = await Expense.create({
  userId,          // always from session, never from the request body
  categoryId,
  amountCents,
  description,
  date,
});
```

### Updating

```ts
const result = await Expense.findOneAndUpdate(
  { _id: expenseId, userId },   // userId in the filter prevents cross-user writes
  { $set: { amountCents, description } },
  { new: true }
);
if (!result) return notFound(); // expense doesn't exist or belongs to another user
```

### Deleting

```ts
const result = await Expense.deleteOne({ _id: expenseId, userId });
if (result.deletedCount === 0) return notFound();
```

The pattern is always `{ _id: resourceId, userId }`. If the `userId` doesn't match, MongoDB returns no documents — the caller receives a 404, not a 403. This avoids leaking the existence of other users' resources.

### Categories

Categories are either global defaults (`userId: null, isDefault: true`) or user-created. Queries must always include both:

```ts
const categories = await Category.find({
  $or: [{ userId }, { isDefault: true }],
}).lean();
```

User-created categories can only be modified by their owner:

```ts
await Category.findOneAndUpdate(
  { _id: categoryId, userId },   // isDefault categories are implicitly excluded
  { $set: { name } }
);
```

---

## User Registration

Registration is handled by a Server Action, not by NextAuth. After the user is created, redirect to `/login`. The login page then calls `signIn` on the client.

```ts
"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  await connectDB();

  const existing = await User.findOne({ email });
  if (existing) throw new Error("Email already in use");

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash });

  redirect("/login");
}
```

For a smoother UX (auto-sign-in after registration), the signup page can be a Client Component that calls the Server Action, then immediately calls `signIn("credentials", { email, password })` from `next-auth/react` on success.

The `bcrypt.hash` cost factor of **12** is the minimum recommended for 2025+. Keep it consistent — `bcrypt.compare` works correctly regardless of the cost factor that was used when hashing.

---

## Sign Out

Sign-out uses the client-side `signOut` function from `next-auth/react`.

```tsx
"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="..."
    >
      Sign out
    </button>
  );
}
```

`signOut` calls the `/api/auth/signout` endpoint, clears the session cookie, and redirects to `callbackUrl`. No additional server-side handling is needed.

---

## Environment Variables

Add to `.env.local`. Never commit this file.

```bash
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<random-32-byte-secret>

# Required in production — the canonical URL of the deployment
NEXTAUTH_URL=https://your-domain.com

# MongoDB connection string (already required by lib/db.ts)
MONGODB_URI=<connection-string>
```

`NEXTAUTH_SECRET` signs and verifies JWTs. Rotating it invalidates all active sessions. `NEXTAUTH_URL` is required in production deployments; in local development Next.js infers it automatically.

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is set in production and is at least 32 bytes of random data.
- [ ] `NEXTAUTH_URL` is set to the canonical production URL.
- [ ] `MONGODB_URI` is not exposed in any client bundle (`NEXT_PUBLIC_` prefix is never used for it).
- [ ] Every Server Action and Route Handler calls `getServerSession(authOptions)` and checks for a session before touching data.
- [ ] All data queries include `{ userId: session.user.id }` — grep for `Expense.find(`, `Category.find(`, `findOneAndUpdate(`, `deleteOne(` to verify.
- [ ] Passwords are hashed with bcrypt cost 12 before storage; plaintext passwords are never logged or persisted.
- [ ] The `types/next-auth.d.ts` augmentation is in place so TypeScript enforces `session.user.id` as a `string`.
- [ ] The middleware matcher covers all non-static, non-auth routes; run `next build` and verify no route is reachable without a valid session.
