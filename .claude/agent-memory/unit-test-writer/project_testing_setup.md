---
name: Project testing setup
description: Jest 29 + ts-jest configuration details, file layout, and key gotchas for this Next.js 16 project
type: project
---

## Framework choices

- **Runner:** Jest 29 (`jest`, `jest-environment-jsdom`, `ts-jest`, `@types/jest`)
- **React testing:** `@testing-library/react` v16, `@testing-library/jest-dom` v6, `@testing-library/user-event` v14
- **Config file:** `jest.config.js` (plain JS, not `.ts`) — ts-node is NOT installed; using a `.ts` config fails without it
- **Test environment:** `node` (default); jsdom would be needed for browser-heavy component tests but is not the default

## Key configuration

- Path alias `@/*` → `<rootDir>/*` via `moduleNameMapper`
- `server-only` package stubbed via `moduleNameMapper` → `<rootDir>/__mocks__/server-only.ts` (empty export)
- ts-jest transform uses `{ jsx: "react-jsx", module: "commonjs" }` tsconfig overrides so tests work without modifying the main tsconfig

## Test file layout

- All tests live under `__tests__/` mirroring the source tree:
  - `__tests__/lib/schemas/auth.test.ts`
  - `__tests__/lib/authOptions.test.ts`
  - `__tests__/app/(auth)/actions.test.ts`
  - `__tests__/app/(app)/layout.test.tsx`
  - `__tests__/proxy.test.ts`
- `testMatch` pattern: `**/__tests__/**/*.test.ts` and `**/__tests__/**/*.test.tsx`

## npm scripts added

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

**Why:** No test runner existed at project start; scaffolded during the authentication feature test pass.
**How to apply:** Run `npm test` to execute all tests. Coverage report available via `npm run test:coverage`.
