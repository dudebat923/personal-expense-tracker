# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation First

Before implementing any feature, read every file in the `docs/` directory that is relevant to the work. Treat those files as the authoritative specification — the code must conform to them, not the other way around.

- **UI work** (components, layouts, styling): read `docs/ui.md` in full before writing a single class or element.
- **New features or pages**: check `docs/` for any doc that covers the domain (data model, API design, auth, etc.) before writing code.
- If no doc covers the area you are about to touch, implement using existing patterns in the codebase and note the gap — do not invent conventions.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test framework is configured yet.

## Architecture

**Stack:** Next.js 16.2.5 · React 19 · Tailwind CSS 4 · TypeScript (strict)

> **Important:** Next.js 16.2.5 has breaking changes from earlier versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for current APIs and conventions. Heed deprecation notices.

**Routing:** App Router (`app/` directory). All layouts and pages use the file-system convention — `layout.tsx` wraps `page.tsx` at each route segment.

**Styling:** Tailwind CSS 4 via PostCSS. No `tailwind.config.*` file — configuration is done in CSS using `@theme` if needed.

**Path alias:** `@/*` resolves to the project root, so `import Foo from "@/components/Foo"` works from anywhere.

**Fonts:** Geist Sans and Geist Mono are loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables (`--font-geist-sans`, `--font-geist-mono`).

**Current state:** The app is a blank Next.js template. No expense-tracking logic, database, or API routes exist yet.
