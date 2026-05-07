# UI Design Specification

A complete reference for building the personal expense tracker UI using only Tailwind CSS utility classes. No custom CSS, no third-party component libraries. All visual output comes from Tailwind classes applied directly to standard HTML elements.

---

## Guiding Principles

- **Tailwind-only:** Every style is expressed as a Tailwind class. Never write `style={{}}` props or custom CSS rules.
- **Mobile-first:** All layouts start at the smallest breakpoint and expand upward using `sm:`, `md:`, `lg:` prefixes.
- **Dark mode:** Use `dark:` variants throughout. Dark mode follows the OS preference via `prefers-color-scheme` (already configured in `globals.css`).
- **Accessibility:** Sufficient color contrast, visible focus rings, semantic HTML, and ARIA labels where needed.
- **Data density:** Financial UIs need clear numbers and compact layouts — prioritize legibility over decoration.

---

## Color System

The palette is drawn entirely from Tailwind's built-in color scale. No custom colors.

### Semantic Roles

| Role | Light mode | Dark mode | Usage |
|---|---|---|---|
| **Background** | `bg-white` | `dark:bg-slate-950` | Page background |
| **Surface** | `bg-slate-50` | `dark:bg-slate-900` | Cards, panels, sidebars |
| **Surface raised** | `bg-white` | `dark:bg-slate-800` | Modals, dropdowns, popovers |
| **Border** | `border-slate-200` | `dark:border-slate-700` | Dividers, card edges |
| **Border subtle** | `border-slate-100` | `dark:border-slate-800` | Row separators |
| **Text primary** | `text-slate-900` | `dark:text-slate-50` | Headings, labels |
| **Text secondary** | `text-slate-500` | `dark:text-slate-400` | Captions, metadata |
| **Text muted** | `text-slate-400` | `dark:text-slate-600` | Placeholders, disabled |
| **Primary** | `bg-indigo-600` | `dark:bg-indigo-500` | Primary actions, active state |
| **Primary hover** | `hover:bg-indigo-700` | `dark:hover:bg-indigo-400` | |
| **Primary text** | `text-indigo-600` | `dark:text-indigo-400` | Links, accent text |
| **Income/Positive** | `text-emerald-600` | `dark:text-emerald-400` | Income amounts |
| **Expense/Negative** | `text-red-600` | `dark:text-red-400` | Expense amounts |
| **Warning** | `text-amber-600` | `dark:text-amber-400` | Budget warnings |
| **Info** | `text-sky-600` | `dark:text-sky-400` | Informational callouts |

### Category Badge Colors

Each expense category gets a consistent pill color. Use `bg-{color}-100 text-{color}-700 dark:bg-{color}-900/40 dark:text-{color}-300`.

| Category | Color |
|---|---|
| Food & Dining | `rose` |
| Transport | `sky` |
| Housing | `violet` |
| Entertainment | `amber` |
| Health | `emerald` |
| Shopping | `pink` |
| Utilities | `slate` |
| Travel | `cyan` |
| Other | `gray` |

---

## Typography

Geist Sans is already loaded via `next/font/google` and exposed as `--font-geist-sans`. The CSS theme in `globals.css` maps it to `--font-sans`, making it the default for all prose. Apply the font variable class on `<html>` (already done in `layout.tsx`).

### Scale

| Element | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50` |
| Section heading | `text-lg font-semibold text-slate-900 dark:text-slate-50` |
| Card title | `text-base font-medium text-slate-900 dark:text-slate-50` |
| Body | `text-sm text-slate-700 dark:text-slate-300` |
| Caption / metadata | `text-xs text-slate-500 dark:text-slate-400` |
| Monospaced amount | `font-mono text-sm tabular-nums` |
| Large KPI amount | `font-mono text-3xl font-bold tabular-nums tracking-tight` |

Always use `tabular-nums` on currency figures so columns stay vertically aligned.

---

## Spacing & Layout

### App Shell

```
<div class="min-h-screen bg-white dark:bg-slate-950">
  <!-- Sidebar + main split (desktop) / stack (mobile) -->
  <div class="flex h-screen overflow-hidden">
    <aside>...</aside>
    <main class="flex-1 overflow-y-auto">...</main>
  </div>
</div>
```

### Page Content Width

Wrap page content in a max-width container with consistent horizontal padding:

```
<div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
```

Use `max-w-5xl` (1024px) for content-heavy views (transactions list) and `max-w-2xl` for focused views (add/edit form, settings).

### Grid Layouts

KPI row — 2 columns on mobile, 4 on desktop:
```
<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
```

Two-column form layout on wide screens:
```
<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
```

---

## Components

### Sidebar Navigation

A fixed-width left sidebar visible on `md:` and above. On mobile it collapses to a bottom tab bar or slide-in drawer.

```html
<!-- Desktop sidebar -->
<aside class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 dark:bg-slate-950">
  <div class="flex flex-col flex-1 overflow-y-auto px-4 py-6">
    <!-- Logo -->
    <div class="flex items-center gap-2 mb-8 px-2">
      <span class="text-white font-semibold text-lg">Expense Tracker</span>
    </div>

    <!-- Nav links -->
    <nav class="flex flex-col gap-1">
      <!-- Active link -->
      <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white bg-slate-700 dark:bg-slate-800">
        <!-- icon --> Dashboard
      </a>
      <!-- Inactive link -->
      <a href="#" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-800 transition-colors">
        <!-- icon --> Transactions
      </a>
    </nav>
  </div>
</aside>
```

Mobile navigation bar — pinned to the bottom, icon + label:

```html
<nav class="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex">
  <a href="#" class="flex flex-1 flex-col items-center justify-center py-3 text-xs font-medium text-indigo-600 dark:text-indigo-400 gap-1">
    <!-- icon -->
    Dashboard
  </a>
  <a href="#" class="flex flex-1 flex-col items-center justify-center py-3 text-xs font-medium text-slate-500 dark:text-slate-400 gap-1">
    <!-- icon -->
    Transactions
  </a>
</nav>
```

### Card

The primary surface for grouping content.

```html
<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
  ...
</div>
```

For a tighter card (stat tiles):
```html
<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
```

### KPI / Stat Tile

```html
<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
  <p class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Spent</p>
  <p class="mt-2 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">$1,248.00</p>
  <p class="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">↓ 8% vs last month</p>
</div>
```

### Transaction Row

Used in list views. Alternating hover state, full-bleed dividers.

```html
<ul class="divide-y divide-slate-100 dark:divide-slate-800">
  <li class="flex items-center gap-4 px-1 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer">
    <!-- Category icon -->
    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400 text-sm">
      🍔
    </div>

    <!-- Description + date -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">Chipotle</p>
      <p class="text-xs text-slate-500 dark:text-slate-400">Food & Dining · May 6</p>
    </div>

    <!-- Amount -->
    <span class="font-mono text-sm font-semibold tabular-nums text-red-600 dark:text-red-400 flex-shrink-0">
      -$14.75
    </span>
  </li>
</ul>
```

### Buttons

**Primary action:**
```html
<button class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
  Add Expense
</button>
```

**Secondary (outlined):**
```html
<button class="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 active:bg-slate-100 transition-colors">
  Cancel
</button>
```

**Ghost (text-only):**
```html
<button class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors">
  Edit
</button>
```

**Destructive:**
```html
<button class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:bg-red-800 transition-colors">
  Delete
</button>
```

**Icon button (square):**
```html
<button class="rounded-lg p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors" aria-label="Edit transaction">
  <!-- icon -->
</button>
```

Button sizing modifiers: `px-3 py-1.5 text-xs` (small), `px-4 py-2 text-sm` (default), `px-5 py-2.5 text-base` (large).

### Form Elements

All form fields follow the same visual language: `rounded-lg border` with a consistent focus ring.

**Text / Number input:**
```html
<div class="flex flex-col gap-1.5">
  <label for="amount" class="text-sm font-medium text-slate-700 dark:text-slate-300">
    Amount
  </label>
  <div class="relative">
    <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none text-sm">$</span>
    <input
      id="amount"
      type="number"
      min="0"
      step="0.01"
      placeholder="0.00"
      class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-7 pr-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
    />
  </div>
  <!-- Optional hint -->
  <p class="text-xs text-slate-500 dark:text-slate-400">Enter the full transaction amount.</p>
</div>
```

**Select:**
```html
<div class="flex flex-col gap-1.5">
  <label for="category" class="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
  <select
    id="category"
    class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition appearance-none"
  >
    <option value="">Select a category</option>
    <option value="food">Food & Dining</option>
  </select>
</div>
```

**Date input:**
```html
<input
  type="date"
  class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
/>
```

**Textarea:**
```html
<textarea
  rows={3}
  placeholder="Optional note..."
  class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition resize-none"
/>
```

**Error state:** add `border-red-500 focus:ring-red-500` and a sibling `<p class="text-xs text-red-600 dark:text-red-400">...</p>`.

### Category Badge / Pill

```html
<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
  Food & Dining
</span>
```

### Badge (generic status)

```html
<!-- Success -->
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Income</span>

<!-- Warning -->
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Over budget</span>

<!-- Neutral -->
<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Draft</span>
```

### Modal / Dialog

Backdrop + centered panel. Animate with `transition` classes (add/remove via state).

```html
<!-- Backdrop -->
<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

<!-- Panel -->
<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
  <div class="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
      <h2 class="text-base font-semibold text-slate-900 dark:text-slate-50">Add Expense</h2>
      <button class="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Close">
        <!-- X icon -->
      </button>
    </div>
    <!-- Body -->
    <div class="px-6 py-5 flex flex-col gap-5">
      <!-- form fields -->
    </div>
    <!-- Footer -->
    <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
      <button class="...secondary button...">Cancel</button>
      <button class="...primary button...">Save</button>
    </div>
  </div>
</div>
```

On mobile the panel slides up from the bottom (`items-end`) like a bottom sheet; on `sm:` it centers as a traditional dialog.

### Empty State

Shown when a list has no items.

```html
<div class="flex flex-col items-center justify-center py-16 px-4 text-center">
  <div class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 text-2xl">
    <!-- icon -->
  </div>
  <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-50">No transactions yet</h3>
  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xs">Add your first expense to start tracking your spending.</p>
  <div class="mt-5">
    <button class="...primary button...">Add Expense</button>
  </div>
</div>
```

### Loading Skeleton

Pulse-animated placeholder blocks that mirror the real layout.

```html
<!-- Stat tile skeleton -->
<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
  <div class="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
  <div class="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
</div>

<!-- Transaction row skeleton -->
<li class="flex items-center gap-4 px-1 py-3 animate-pulse">
  <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
  <div class="flex-1 space-y-2">
    <div class="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
    <div class="h-2.5 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
  </div>
  <div class="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0" />
</li>
```

### Toast / Notification

Fixed to the bottom-right corner. Stack multiple with `flex flex-col gap-2`.

```html
<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
  <div class="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 dark:bg-white px-4 py-3 shadow-lg text-sm text-white dark:text-slate-900 max-w-xs">
    <!-- Success icon -->
    <span class="text-emerald-400 dark:text-emerald-600 flex-shrink-0">✓</span>
    <p class="flex-1">Expense saved successfully.</p>
    <button class="flex-shrink-0 text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-slate-900 transition-colors" aria-label="Dismiss">✕</button>
  </div>
</div>
```

### Progress Bar (Budget indicator)

```html
<div class="flex flex-col gap-1">
  <div class="flex justify-between text-xs">
    <span class="font-medium text-slate-700 dark:text-slate-300">Food & Dining</span>
    <span class="text-slate-500 dark:text-slate-400">$340 / $500</span>
  </div>
  <div class="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
    <div class="h-full rounded-full bg-indigo-500" style={{ width: '68%' }} />
  </div>
</div>
```

When over budget: change bar color to `bg-red-500`.

### Data Table (Transactions)

```html
<div class="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 dark:bg-slate-900/70">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Description</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount</th>
          <th class="px-4 py-3 w-16"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">May 6</td>
          <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-50 max-w-xs truncate">Chipotle</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Food & Dining</span>
          </td>
          <td class="px-4 py-3 text-right font-mono font-semibold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">-$14.75</td>
          <td class="px-4 py-3 text-right">
            <!-- icon button row -->
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Search & Filter Bar

```html
<div class="flex flex-col sm:flex-row gap-3">
  <!-- Search input -->
  <div class="relative flex-1">
    <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
      <!-- Search icon -->
    </span>
    <input
      type="search"
      placeholder="Search transactions..."
      class="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
    />
  </div>

  <!-- Filter selects -->
  <select class="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition">
    <option>All categories</option>
  </select>

  <select class="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition">
    <option>This month</option>
    <option>Last month</option>
    <option>Last 3 months</option>
  </select>
</div>
```

### Pagination

```html
<div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3">
  <p class="text-sm text-slate-500 dark:text-slate-400">
    Showing <span class="font-medium text-slate-700 dark:text-slate-300">1–20</span> of <span class="font-medium text-slate-700 dark:text-slate-300">84</span>
  </p>
  <div class="flex gap-1">
    <button class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" disabled>Previous</button>
    <button class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Next</button>
  </div>
</div>
```

---

## Page Layouts

### Dashboard

```
┌──────────────────────────────────────────────────┐
│ Sidebar │  Page header (title + "Add Expense" btn)│
│         │──────────────────────────────────────── │
│         │  KPI tile · KPI tile · KPI tile · KPI  │
│         │──────────────────────────────────────── │
│         │  Spending by category chart (left 60%)  │
│         │  + Recent transactions list (right 40%) │
│         │──────────────────────────────────────── │
│         │  Budget progress bars (full width)      │
└──────────────────────────────────────────────────┘
```

On mobile: sidebar hidden → bottom nav. KPI tiles collapse to 2-col grid. Chart and transactions stack vertically.

### Transactions List

```
┌──────────────────────────────────────────────────┐
│ Sidebar │  "Transactions" heading + "Add" button  │
│         │──────────────────────────────────────── │
│         │  Search + filter bar                    │
│         │──────────────────────────────────────── │
│         │  Data table (full width)                │
│         │──────────────────────────────────────── │
│         │  Pagination                             │
└──────────────────────────────────────────────────┘
```

### Add / Edit Expense (modal or full page)

Use a modal for quick-add from any screen. For editing, use the same modal. Fields: Amount, Description, Category, Date, Note.

---

## Accessibility Checklist

- All interactive elements are reachable by keyboard (Tab order, no `tabindex` traps).
- Focus rings are always visible (`focus-visible:outline` pattern — never `outline-none` without a replacement).
- Color is never the sole means of conveying information (e.g., income/expense rows also differ by sign and symbol, not just green/red).
- Form inputs have associated `<label>` elements using `for`/`id` pairing.
- Icon-only buttons include `aria-label`.
- Modals use `role="dialog"`, `aria-modal="true"`, and trap focus inside while open.
- Images and decorative icons use `aria-hidden="true"`.
- WCAG AA contrast: slate-900 on white = 16:1; slate-500 on white = 4.7:1 (passes AA large text).
- Amount color alone is not the only differentiator — use `-` prefix for expenses and `+` for income.

---

## Transitions & Motion

Keep motion minimal. All transitions are `duration-150` (fast feedback):

```
transition-colors duration-150    /* color, background, border */
transition-opacity duration-150   /* show/hide overlays */
transition-transform duration-200 /* slide-in drawers, dropdown open */
```

Respect the `prefers-reduced-motion` media query. Tailwind's `motion-reduce:` variant disables or reduces animations:

```html
<div class="transition-transform duration-200 motion-reduce:transition-none">
```

---

## Conventions for Implementation

1. **Never inline `style`** for visual properties. The only acceptable use of `style` is for dynamic values that can't be expressed as a static class (e.g., `style={{ width: `${pct}%` }}` for a progress bar).
2. **Compose via `cn()` / `clsx`** when class lists are conditional — keep templates readable.
3. **Icon library:** use Heroicons (`@heroicons/react`) — it ships SVG icons sized to fit `w-5 h-5` by default, matching Tailwind's spacing scale.
4. **No `!important` overrides.** If a class isn't working, fix the specificity root cause.
5. **Dark mode is class-free.** The `dark:` variant responds to `prefers-color-scheme: dark` as configured in `globals.css`. Do not add a `dark` class to `<html>` manually unless implementing a toggle.
6. **Consistent border radius:** cards → `rounded-2xl`, inputs/buttons → `rounded-lg`, badges → `rounded-full`, table wrapper → `rounded-2xl`.
