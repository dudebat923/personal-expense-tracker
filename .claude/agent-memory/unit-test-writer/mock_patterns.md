---
name: Mock patterns
description: Established jest.mock patterns for this codebase's key dependencies
type: project
---

## server-only

Stubbed via `moduleNameMapper` in `jest.config.js`:
```js
"^server-only$": "<rootDir>/__mocks__/server-only.ts"
```
The stub file is `__mocks__/server-only.ts` — just `export {};`.

## @/lib/db (connectDB)

```ts
jest.mock("@/lib/db", () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));
```

## @/lib/models/User

```ts
jest.mock("@/lib/models/User", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));
```
`findOne` returns a Mongoose-style chainable `.lean()` mock:
```ts
mockFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(someDoc) });
```

## bcryptjs

```ts
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
// compare: mockResolvedValue(true/false as never)
// hash: mockResolvedValue("$2b$12$hashed" as never)
```

## next-auth (getServerSession)

```ts
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));
```

## next/navigation (redirect)

```ts
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));
// In tests that expect redirect to stop execution, make it throw:
mockRedirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
```

## next-auth/middleware (withAuth) — proxy.ts strategy

The middleware file calls `withAuth(middlewareFn, options)`. We capture both
arguments via the mock, then test the two inner functions directly:

```ts
jest.mock("next-auth/middleware", () => ({
  withAuth: jest.fn((middlewareFn, options) => {
    capturedMiddleware = middlewareFn;
    capturedOptions = options;
    return jest.fn();
  }),
}));
require("@/proxy"); // triggers the withAuth call
// Then test capturedMiddleware(...) and capturedOptions.callbacks.authorized(...)
```

## authOptions callbacks — extraction pattern

```ts
// Get authorize from the provider:
const provider = authOptions.providers[0] as { options?: { authorize?: ... } };
const authorize = provider.options?.authorize;

// Get jwt/session callbacks:
const jwtCallback = authOptions.callbacks?.jwt;
const sessionCallback = authOptions.callbacks?.session;
```
Call with `as any` for the parameter cast, then assert on the typed return value.

## console.error suppression

When testing error paths that intentionally log (e.g., `registerUser` catch block):
```ts
consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
// restore in afterEach
```

**Why:** Keeps Jest output clean without changing source code.
**How to apply:** Use in any `describe` block that exercises a catch branch with console.error.
