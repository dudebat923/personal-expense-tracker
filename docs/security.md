# Security

A complete reference for keeping secrets, credentials, and sensitive data out of the codebase, out of client bundles, and out of logs. These are non-negotiable minimums for a production deployment.

---

## Guiding Principles

- **Secrets never touch the codebase.** No API key, database credential, token, or password appears in any committed file — not in source code, not in comments, not in configuration files.
- **The client bundle is public.** Every byte sent to the browser can be read by anyone. Treat `NEXT_PUBLIC_` variables as published data, because they are.
- **Logs are not a safe place for secrets.** Application logs are often aggregated, forwarded, and retained indefinitely. Never log a value you would not publish.
- **The `.env.local` file is the only place development secrets live — and it is never committed.**
- **Defense in depth.** Multiple layers (`.gitignore`, pre-commit hooks, secret scanning) protect against accidental exposure. No single layer is sufficient on its own.

---

## Environment Variables

### Files and Their Purpose

Next.js loads environment variable files in a defined order. Only `.env.local` is the right place for secrets in development.

| File | Committed to git | Purpose |
|---|---|---|
| `.env` | Yes | Non-secret defaults shared across all environments (e.g., `NODE_ENV=development`). Never put secrets here. |
| `.env.local` | **Never** | Development secrets — `MONGODB_URI`, `NEXTAUTH_SECRET`, API keys. Overrides `.env`. |
| `.env.production` | Yes | Non-secret production defaults. Never put secrets here — use your deployment platform's secret manager instead. |
| `.env.development` | Yes | Non-secret development-only settings. Never put secrets here. |

The rule is simple: if the value is a secret, it belongs only in `.env.local` (local dev) or your deployment platform's environment variable store (production). It does not belong in any committed file.

### Required Variables for This Project

```bash
# .env.local — never commit this file

# NextAuth — signs and verifies all JWTs
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<32-byte-random-secret>

# Required in production (inferred automatically in local dev)
NEXTAUTH_URL=https://your-domain.com

# MongoDB connection string — includes username and password
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
```

These three variables contain authentication and database credentials. They must never appear in any file tracked by git.

### `NEXT_PUBLIC_` Prefix Rules

Any variable prefixed with `NEXT_PUBLIC_` is inlined into the JavaScript bundle at build time and sent to every browser that loads the page. Treat these as public.

```bash
# Safe — this is intentionally public
NEXT_PUBLIC_APP_NAME=Expense Tracker

# NEVER do this — the secret is now in every user's browser
NEXT_PUBLIC_MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_NEXTAUTH_SECRET=...
NEXT_PUBLIC_API_KEY=sk-...
```

If you are unsure whether a variable should be `NEXT_PUBLIC_`, the answer is almost always no. Server-side code can read any environment variable. Only add the prefix when the client component explicitly needs the value for a non-sensitive, user-facing purpose.

---

## `.gitignore` Configuration

The repository root `.gitignore` must include the following entries. Verify they are present before the first commit.

```gitignore
# Environment variable files — secrets live here
.env.local
.env*.local

# Never commit real env files, only the example
.env.production.local
.env.development.local
.env.test.local

# Next.js build output — may contain inlined env values
.next/

# Dependency directories
node_modules/

# OS artifacts
.DS_Store
Thumbs.db
```

Committing `.env.local` even once is a significant security event. Even after the file is removed in a later commit, it remains in the git history and must be treated as compromised. See [Credential Compromise Response](#credential-compromise-response).

### `.env.example`

Maintain a `.env.example` file at the project root that lists every required variable with placeholder values and no real secrets. This file is committed to git and serves as setup documentation for new contributors.

```bash
# .env.example — committed to git, no real values

# NextAuth
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=replace-with-32-byte-random-secret
NEXTAUTH_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>
```

Keep `.env.example` in sync with `.env.local` whenever a new variable is added.

---

## Server-Only Code

Next.js can prevent secret-carrying modules from being accidentally imported into client bundles.

### The `server-only` Package

Install the `server-only` package and import it at the top of any module that accesses environment secrets, databases, or authentication logic.

```bash
npm install server-only
```

```ts
// lib/db.ts
import "server-only"

import mongoose from "mongoose"

export async function connectDB() {
  // This file is now guaranteed to never be bundled for the client.
  // Importing it from a Client Component will throw a build-time error.
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI is not defined")
  // ...
}
```

Add `import "server-only"` to:

- `lib/db.ts` — database connection
- `lib/authOptions.ts` — NextAuth configuration
- Any `lib/` module that reads `process.env` for secrets
- Any Server Action file that is not already `"use server"` scoped

### Accessing `process.env` Safely

Read environment variables at the point of use on the server. Never destructure them at the module top level in shared code — if that module is ever imported client-side, the variable reference will be undefined and the key name will appear in the bundle.

```ts
// Good — read at the call site in a server-only module
export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI is not defined")
  await mongoose.connect(uri)
}

// Bad — MONGODB_URI key name appears in the bundle if this module is client-imported
const { MONGODB_URI } = process.env
```

### Validating Environment Variables at Startup

Fail fast if a required secret is missing. Add a startup validation module that runs when the server boots, not on the first request.

```ts
// lib/env.ts
import "server-only"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  mongodbUri: requireEnv("MONGODB_URI"),
  nextauthSecret: requireEnv("NEXTAUTH_SECRET"),
} as const
```

Import `env` from `lib/env.ts` instead of reading `process.env` directly throughout the codebase. This makes it impossible to silently use an undefined secret and centralizes the list of required variables.

---

## Logging Safety

Logs are often sent to third-party aggregation services (Datadog, Logtail, Papertrail) where they may be stored for months, indexed, and accessible to support teams. Treat every log line as semi-public.

### Never Log

- Passwords, password hashes, or password candidates
- Session tokens, JWTs, or NextAuth cookies
- The full MongoDB URI (contains credentials)
- Full request bodies on authentication endpoints
- Credit card numbers, SSNs, or any financial identifiers
- User PII beyond what is strictly necessary for the operation being logged

### Safe Logging Pattern

```ts
// Bad — logs the raw error which may contain the MongoDB URI or credentials
console.error("Database error:", err)

// Bad — logs a request body that may contain a password
console.log("Login attempt:", req.body)

// Good — log the operation, a safe identifier, and the error type only
console.error("[connectDB] connection failed", {
  errorName: (err as Error).name,
  userId: session?.user.id ?? "unauthenticated",
})

// Good — log only what is necessary to diagnose the failure
console.error("[registerUser] failed to create user", {
  email: email.replace(/(?<=.{2}).(?=.*@)/g, "*"), // partially mask before logging
  errorCode: (err as { code?: number }).code,
})
```

### Redacting Sensitive Fields

When logging an object that may contain sensitive fields, explicitly pick only the safe fields rather than logging the whole object.

```ts
// Bad — the full request body may include sensitive fields
console.log("Request body:", body)

// Good — log only the fields safe to record
console.log("Expense submitted:", {
  categoryId: body.categoryId,
  date: body.date,
  // amount is financial data — omit or mask if not needed for debugging
})
```

---

## Production Deployment

### Environment Variable Storage

Never set environment variables by modifying files on a production server. Use your deployment platform's first-class secret management.

| Platform | Where to set secrets |
|---|---|
| Vercel | Project → Settings → Environment Variables. Mark variables as Production / Preview / Development independently. |
| Railway | Service → Variables panel. Secrets are encrypted at rest. |
| Render | Service → Environment → Secret Files or Environment Variables. |
| AWS / GCP / Azure | Use Secrets Manager (AWS), Secret Manager (GCP), or Key Vault (Azure). Never use EC2 user data or environment files on disk. |

On Vercel (the expected deployment target for this stack), set all three required variables — `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `MONGODB_URI` — in the Production environment scope. Preview deployments should use a separate, lower-privilege database and a distinct `NEXTAUTH_SECRET`.

### Generating Secrets

Always generate secrets with a cryptographically secure source. Never reuse secrets across environments.

```bash
# Generate NEXTAUTH_SECRET (32 bytes, base64-encoded)
openssl rand -base64 32

# Generate a random hex string (alternative)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Secret | Recommended length | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | 32+ bytes | Rotating this invalidates all active user sessions |
| Database passwords | 24+ characters, mixed | Set in your MongoDB Atlas cluster, not in code |
| API keys (third-party) | Provided by vendor | Store in platform secret manager, never in code |

### Separate Secrets Per Environment

Use different secrets for production, preview/staging, and local development. This limits the blast radius of a compromised development secret.

```
Production:  NEXTAUTH_SECRET=<secret-A>  MONGODB_URI=<prod-cluster>
Preview:     NEXTAUTH_SECRET=<secret-B>  MONGODB_URI=<staging-cluster>
Development: NEXTAUTH_SECRET=<secret-C>  MONGODB_URI=<local-or-dev-cluster>
```

If `secret-C` from a developer's `.env.local` is leaked, production is not compromised.

### MongoDB Security

- **Use a dedicated database user per environment.** The production user should have read/write access only to the production database. It should not have admin, `listDatabases`, or other cluster-wide permissions.
- **Restrict IP access.** In MongoDB Atlas, configure the IP Access List to allow only your deployment platform's outbound IP ranges, not `0.0.0.0/0`.
- **Never use the Atlas admin credentials in application code.** The connection string in `MONGODB_URI` should belong to a database user, not the Atlas project owner.
- **Rotate credentials immediately if compromised.** Atlas lets you reset a database user's password without downtime.

---

## Pre-Commit Protection

Add a pre-commit hook to catch accidental secret commits before they reach the remote. This is a safety net, not a replacement for discipline.

### Using `detect-secrets`

```bash
# Install (once, globally or in CI)
pip install detect-secrets

# Scan the repo and create a baseline of known non-secrets
detect-secrets scan > .secrets.baseline

# Add to .gitignore awareness — commit the baseline
git add .secrets.baseline
```

Add to `.git/hooks/pre-commit` (or use Husky to manage hooks):

```bash
#!/bin/sh
detect-secrets-hook --baseline .secrets.baseline
```

### Manual Pre-Commit Checklist

Before every commit, verify:

- [ ] `git diff --cached` contains no strings matching `mongodb+srv://`, `sk-`, `Bearer `, or other credential patterns
- [ ] No `.env.local` or `.env*.local` files appear in `git status`
- [ ] No new `NEXT_PUBLIC_` variables expose data that should be server-only
- [ ] Any new `process.env` reads are in server-only files

---

## Secret Scanning in CI

Enable secret scanning on the GitHub repository to catch committed secrets automatically.

1. Go to repository **Settings → Security → Secret scanning**.
2. Enable **Secret scanning** and **Push protection**. Push protection blocks pushes that contain known secret patterns before they are accepted by GitHub.
3. For patterns GitHub does not recognize (custom API keys, internal tokens), add custom patterns under **Secret scanning → Custom patterns**.

Push protection is the highest-value control because it prevents the secret from entering the git history in the first place. GitHub's default patterns cover credentials from over 200 service providers including MongoDB Atlas, Stripe, AWS, and Vercel.

---

## Credential Compromise Response

If a secret is ever committed to git — even briefly, even in a branch that was never merged — treat it as fully compromised. Git history is permanent and is crawled by automated secret-scanning bots within seconds of a push.

### Immediate Actions

1. **Rotate the secret immediately.** Do not wait to assess exposure. Rotation is free and instant:
   - `NEXTAUTH_SECRET`: generate a new value and update it in your deployment platform. This invalidates all active sessions — users will be signed out.
   - `MONGODB_URI` credentials: go to MongoDB Atlas, reset the database user's password, and update the environment variable everywhere.
2. **Revoke and reissue any API keys** from their respective provider dashboards.
3. **Remove the secret from git history** using `git filter-repo` or BFG Repo Cleaner. This does not un-expose it, but it prevents future clones from containing it.

```bash
# Remove a specific file from all history
git filter-repo --path .env.local --invert-paths
```

4. **Force-push to all remotes** after rewriting history. Notify all collaborators to re-clone; their local copies still contain the secret.
5. **Audit access logs** for the compromised credential in your cloud provider and database to determine if it was used before rotation.

Removing the secret from history is important for hygiene but does not undo the exposure. The rotation in step 1 is what stops the bleeding.

---

## Security Checklist

Apply this checklist before every production deployment.

### Secrets and Environment Variables
- [ ] `.env.local` is listed in `.gitignore` and has never been committed
- [ ] `.env.example` is committed with placeholder values and documents every required variable
- [ ] `NEXTAUTH_SECRET` is at least 32 bytes of random data, unique to this environment
- [ ] `NEXTAUTH_URL` is set to the exact canonical production URL (no trailing slash)
- [ ] `MONGODB_URI` credentials belong to a least-privilege database user, not an admin account
- [ ] No secret appears in any `NEXT_PUBLIC_` variable
- [ ] No secret appears in `next.config.ts` or any other committed config file

### Code
- [ ] `import "server-only"` is present in `lib/db.ts`, `lib/authOptions.ts`, and every module that reads secret env vars
- [ ] No Client Component reads `process.env` for a secret variable
- [ ] No API response or `ActionResult` returns a raw `error.message` from a caught exception
- [ ] No `console.log` or `console.error` call outputs passwords, tokens, or full request bodies

### Deployment (Vercel)
- [ ] All three required variables are set in the Production environment scope
- [ ] Preview environment uses a separate `NEXTAUTH_SECRET` and a non-production database
- [ ] GitHub secret scanning with push protection is enabled on the repository
- [ ] MongoDB Atlas IP Access List restricts connections to Vercel's outbound IP ranges
