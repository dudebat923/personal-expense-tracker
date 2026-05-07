# React & Next.js Best Practices

Production-ready patterns for this codebase. Rules are ordered by impact. **CRITICAL** items affect performance by 2–10×; lower tiers offer incremental gains.

---

## 1. Eliminating Waterfalls — CRITICAL

Sequential async operations are the single largest source of avoidable latency. Treat every `await` as a question: *does the next line actually need this result before it can start?*

### Check cheap conditions before async flags

Evaluate synchronous guards before kicking off async work. If an early return is possible, skip the fetch entirely.

```ts
// bad — always awaits the flag even when condition is false
const flag = await getFeatureFlag('new-dashboard')
if (!user.isAdmin) return null

// good — skip the async call on the fast path
if (!user.isAdmin) return null
const flag = await getFeatureFlag('new-dashboard')
```

### Defer `await` until the value is actually needed

Move `await` into the branch that uses the value. Code paths that don't need the result skip the wait.

```ts
// bad
const config = await fetchConfig()
if (req.method === 'GET') return cachedResponse

// good
if (req.method === 'GET') return cachedResponse
const config = await fetchConfig()
```

### Parallelize independent operations with `Promise.all`

Every independent fetch should start at the same time. Sequential awaits compound latency; parallel awaits do not.

```ts
// bad — 3 round trips
const user = await getUser(id)
const prefs = await getPreferences(id)
const notifications = await getNotifications(id)

// good — 1 round trip
const [user, prefs, notifications] = await Promise.all([
  getUser(id),
  getPreferences(id),
  getNotifications(id),
])
```

### Parallelize nested dependent fetches

When fetching a list of items and each item needs a follow-up call, chain inside each item's promise — don't wait for all items to resolve before fetching their children.

```ts
// bad — nested waterfalls
const chats = await getChats(userId)
const chatsWithAuthors = await Promise.all(
  chats.map(async chat => {
    const user = await getUser(chat.authorId) // blocked until all chats arrive
    return { ...chat, author: user }
  })
)

// good — chained per item
const chatsWithAuthors = await Promise.all(
  chatIds.map(id =>
    getChat(id).then(chat => getUser(chat.authorId).then(author => ({ ...chat, author })))
  )
)
```

### Use strategic `<Suspense>` boundaries

Wrap async Server Components in `<Suspense>` so their parent renders immediately and the loading state is shown without blocking the rest of the tree.

```tsx
<Suspense fallback={<DashboardSkeleton />}>
  <ExpenseSummary /> {/* fetches its own data */}
</Suspense>
```

---

## 2. Bundle Size Optimization — CRITICAL

Large bundles slow first loads and cold starts. Cold starts on serverless functions are directly proportional to bundle size.

### Import from source files, not barrel files

Barrel files (`index.ts` re-exporting everything) force the bundler to include the entire module even when you need one export. Import directly.

```ts
// bad — pulls in entire library
import { formatCurrency } from '@/lib/utils'

// good — imports only what's needed
import { formatCurrency } from '@/lib/utils/formatCurrency'
```

Next.js 13.5+ automatically optimizes `node_modules` via `optimizePackageImports` in `next.config.ts`, but your own barrel files are not covered.

### Dynamically import heavy components

Components above ~300 KB should be loaded on demand with `next/dynamic`. This keeps the initial JS bundle small.

```ts
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <p>Loading editor…</p>,
})
```

### Defer non-critical third-party scripts

Analytics, chat widgets, and logging libraries are not needed for first render. Load them after hydration.

```ts
import dynamic from 'next/dynamic'

const Analytics = dynamic(() => import('@/components/Analytics'), { ssr: false })
```

Or use `next/script` with `strategy="lazyOnload"`.

### Preload on user intent, not on mount

Start loading a heavy module when the user signals intent (hover, focus), not eagerly on page load.

```tsx
<button
  onMouseEnter={() => import('@/components/ExpenseChart')}
  onClick={openChart}
>
  View Chart
</button>
```

### Use explicit, statically analyzable import paths

Dynamic import paths that use variables cause the bundler to include broad file sets. Use explicit maps instead.

```ts
// bad — bundler includes all files matching the pattern
const mod = await import(`./charts/${chartType}`)

// good — explicit map; bundler includes only listed files
const loaders = {
  bar: () => import('./charts/BarChart'),
  pie: () => import('./charts/PieChart'),
}
const mod = await loaders[chartType]()
```

---

## 3. Server-Side Performance — HIGH

### Treat Server Actions like public API routes

Every Server Action must validate input, authenticate the caller, and authorize the operation — in that order. Never trust that the caller is who they claim to be.

```ts
'use server'

export async function deleteExpense(id: string) {
  if (!id || typeof id !== 'string') throw new Error('Invalid input')
  const session = await getSession()
  if (!session) throw new Error('Unauthenticated')
  const expense = await db.expenses.findById(id)
  if (expense.userId !== session.userId) throw new Error('Forbidden')
  await db.expenses.delete(id)
}
```

### Pass only the fields the client actually needs

Each prop serialized across an RSC boundary adds bytes to the HTML response. Select only what the client component renders.

```tsx
// bad — serializes entire DB record
<ExpenseRow expense={expense} />

// good — serializes only rendered fields
<ExpenseRow
  id={expense.id}
  amount={expense.amount}
  label={expense.label}
/>
```

### Deduplicate per-request async work with `React.cache()`

Wrap async functions that may be called multiple times within a single request. React deduplicates calls with the same arguments.

```ts
import { cache } from 'react'

export const getSession = cache(async () => {
  return await auth()
})
```

Do not use inline objects as arguments — they create new references and will not hit the cache.

### Schedule non-blocking post-response work with `after()`

Logging, analytics, and notifications do not need to block the response. Use `after()` to run them after the response is sent.

```ts
import { after } from 'next/server'

export async function POST(req: Request) {
  const data = await saveExpense(req)
  after(async () => {
    await logAuditEvent({ action: 'expense.created', data })
  })
  return Response.json(data)
}
```

### Hoist static I/O to module level

Config files, fonts, and static assets read with `fs` should be loaded once at module initialization — not on every request.

```ts
// bad — reads file on every request
export async function GET() {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
}

// good — reads once at startup
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))

export async function GET() {
  // config already available
}
```

### Avoid shared mutable module state for request data

Module-level mutable variables are shared across concurrent requests in the same process. Store request-scoped data in the render tree via props or `React.cache()`.

```ts
// bad — race condition under concurrent requests
let currentUser: User | null = null

// good — scoped to request via React.cache
export const getCurrentUser = cache(async () => getSession())
```

### Compose components to enable parallel server fetches

When two components fetch independent data, keep them as siblings — not parent/child — so their fetches run concurrently.

```tsx
// bad — Header fetch blocks Sidebar fetch
async function Layout() {
  const headerData = await fetchHeaderData()
  return (
    <Header data={headerData}>
      <Sidebar /> {/* fetch doesn't start until Header resolves */}
    </Header>
  )
}

// good — fetches start in parallel
async function Layout() {
  return (
    <>
      <Header />
      <Sidebar />
    </>
  )
}
```

---

## 4. Client-Side Data Fetching — MEDIUM-HIGH

### Use SWR for client data

`useSWR` automatically deduplicates requests across component instances, handles caching, and revalidates on focus. Prefer it over `useEffect` + `fetch`.

```ts
import useSWR from 'swr'

function ExpenseList() {
  const { data, error, isLoading } = useSWR('/api/expenses', fetcher)
}
```

Use `useSWRMutation` for writes (POST, PATCH, DELETE).

### Use passive event listeners for scroll and touch handlers

Add `{ passive: true }` whenever the listener does not call `preventDefault()`. This lets the browser scroll immediately without waiting for JS.

```ts
useEffect(() => {
  const handler = (e: TouchEvent) => { /* read, don't prevent */ }
  window.addEventListener('touchmove', handler, { passive: true })
  return () => window.removeEventListener('touchmove', handler)
}, [])
```

### Version and minimize `localStorage` data

Always version keys so schema migrations are possible. Store only the fields you actually read. Wrap in `try/catch` — storage throws in private browsing and when disabled.

```ts
const STORAGE_KEY = 'expense-filters:v2'

function saveFilters(filters: FilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: filters.category,
      dateRange: filters.dateRange,
    }))
  } catch {
    // storage unavailable
  }
}
```

---

## 5. Re-render Optimization — MEDIUM

### Derive state during render — do not store computed values in state

Computed values stored in state require extra renders to stay in sync. Derive them directly.

```ts
// bad
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(`${firstName} ${lastName}`), [firstName, lastName])

// good
const fullName = `${firstName} ${lastName}`
```

### Do not define components inside components

A component defined inside another component gets a new type on every render, causing React to unmount and remount it completely.

```tsx
// bad
function ExpensePage() {
  function Row({ item }) { return <tr>…</tr> } // new type every render
  return <table>{items.map(i => <Row key={i.id} item={i} />)}</table>
}

// good — defined at module level
function Row({ item }: { item: Expense }) { return <tr>…</tr> }

function ExpensePage() {
  return <table>{items.map(i => <Row key={i.id} item={i} />)}</table>
}
```

### Use functional `setState` updates to avoid stale closures

Reading state inside a callback creates a stale closure. The functional form always receives the current value.

```ts
// bad — stale closure if count changes between render and click
const increment = useCallback(() => setCount(count + 1), [count])

// good — no dependency on count in scope
const increment = useCallback(() => setCount(c => c + 1), [])
```

### Use lazy `useState` initialization for expensive defaults

Pass a function to `useState` when the initial value is expensive to compute. The function runs only once.

```ts
// bad — parses JSON on every render
const [settings, setSettings] = useState(
  JSON.parse(localStorage.getItem('settings') || '{}')
)

// good — runs once
const [settings, setSettings] = useState(
  () => JSON.parse(localStorage.getItem('settings') || '{}')
)
```

### Narrow `useEffect` dependencies to primitives

Specifying an object as a dependency re-runs the effect whenever any property changes, including ones the effect doesn't use. Destructure to primitives.

```ts
// bad — re-runs whenever user object reference changes
useEffect(() => { fetchProfile(user.id) }, [user])

// good — only re-runs when id changes
useEffect(() => { fetchProfile(user.id) }, [user.id])
```

### Extract module-level defaults for memoized components

If a memoized component has a non-primitive default parameter, a new reference is created on every render of the parent, breaking memoization.

```ts
// bad — new function reference on every parent render
const Table = memo(function Table({ onSort = () => {} }) { … })

// good — stable reference
const NOOP = () => {}
const Table = memo(function Table({ onSort = NOOP }) { … })
```

### Use `startTransition` for non-urgent updates

Mark updates that don't need to be immediately reflected (filter changes, tab switches) as transitions. This keeps input and other urgent updates responsive.

```ts
import { useTransition } from 'react'

const [isPending, startTransition] = useTransition()

function handleCategoryChange(category: string) {
  startTransition(() => setSelectedCategory(category))
}
```

### Use `useDeferredValue` to keep input responsive during expensive renders

The input updates immediately; the expensive derived list renders when the browser is idle.

```ts
const query = useSearchParams().get('q') ?? ''
const deferredQuery = useDeferredValue(query)

const results = useMemo(
  () => expenses.filter(e => e.label.includes(deferredQuery)),
  [expenses, deferredQuery]
)
```

### Use `useRef` for values that don't drive rendering

State triggers re-renders. If you're tracking a value that only matters in callbacks or effects (scroll position, interval ID, previous value), use `useRef`.

```ts
const scrollY = useRef(0)

useEffect(() => {
  const handler = () => { scrollY.current = window.scrollY }
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])
```

---

## 6. Rendering Performance — MEDIUM

### Always use ternary for conditional rendering when the falsy value could render

`&&` renders `0`, `NaN`, and `""` as visible text nodes. Use `? :` when the left side may be falsy but renderable.

```tsx
// bad — renders "0" when count is zero
{count && <Badge>{count}</Badge>}

// good
{count > 0 ? <Badge>{count}</Badge> : null}
```

### Use `useTransition` instead of manual loading state

`useTransition` provides `isPending` automatically, handles errors correctly, and batches updates without the extra `useState`.

```ts
const [isPending, startTransition] = useTransition()

function handleSubmit() {
  startTransition(async () => {
    await saveExpense(form)
    router.push('/expenses')
  })
}
```

### Use `defer` or `next/script` for non-critical scripts

Inline or synchronously loaded scripts block HTML parsing and delay FCP. Always defer.

```tsx
import Script from 'next/script'

<Script src="https://example.com/widget.js" strategy="lazyOnload" />
```

### Suppress expected hydration mismatches intentionally

Use `suppressHydrationWarning` only for values that are *intentionally* different between server and client (timestamps, locale-formatted numbers). Never use it to silence real bugs.

```tsx
<time suppressHydrationWarning>{new Date().toLocaleTimeString()}</time>
```

### Prevent hydration mismatch without flickering for persisted UI state

Use an inline `<script>` to synchronously apply persisted values (theme, locale) before React hydrates, rather than a `useEffect` that fires after paint.

```html
<script dangerouslySetInnerHTML={{
  __html: `document.documentElement.dataset.theme = localStorage.getItem('theme') ?? 'light'`
}} />
```

---

## 7. JavaScript Performance — LOW-MEDIUM

### Build index maps for repeated lookups

`.find()` is O(n) per call. Build a `Map` once and look up in O(1).

```ts
// bad — O(n) per lookup
const getCategory = (id: string) => categories.find(c => c.id === id)

// good — O(1)
const categoryMap = new Map(categories.map(c => [c.id, c]))
const getCategory = (id: string) => categoryMap.get(id)
```

### Combine array iterations

Chaining `.filter().map()` creates intermediate arrays and iterates multiple times. Use `.flatMap()` or a single loop.

```ts
// bad — 2 iterations, 1 intermediate array
const result = expenses
  .filter(e => e.amount > 100)
  .map(e => e.label)

// good — 1 iteration
const result = expenses.flatMap(e => e.amount > 100 ? [e.label] : [])
```

### Hoist `RegExp` creation out of render

Constructing a `RegExp` inside a render function allocates a new object every render. Move it to module scope for static patterns or `useMemo` for dynamic ones.

```ts
// bad — new RegExp every render
function filter(query: string) {
  return items.filter(i => new RegExp(query, 'i').test(i.label))
}

// good — memoized
const pattern = useMemo(() => new RegExp(query, 'i'), [query])
```

### Cache `localStorage` reads

`localStorage` access is synchronous and relatively slow. Read once and cache in a module-level variable; invalidate on the `storage` event.

```ts
let cachedSettings: Settings | null = null

export function getSettings(): Settings {
  if (cachedSettings) return cachedSettings
  try {
    cachedSettings = JSON.parse(localStorage.getItem('settings') ?? '{}')
  } catch {
    cachedSettings = {}
  }
  return cachedSettings!
}
```

### Use `Set` or `Map` for membership tests

`.includes()` and `.find()` are O(n). A `Set` membership test is O(1).

```ts
// bad — O(n) per check
const selectedIds = ['a', 'b', 'c']
if (selectedIds.includes(id)) { … }

// good — O(1)
const selectedIds = new Set(['a', 'b', 'c'])
if (selectedIds.has(id)) { … }
```

### Use `toSorted()` instead of `sort()` for derived state

`.sort()` mutates the original array. `.toSorted()` returns a new array, preventing subtle bugs when the original is used elsewhere.

```ts
const sorted = expenses.toSorted((a, b) => b.amount - a.amount)
```

### Defer non-critical work with `requestIdleCallback`

Analytics, prefetching, and non-urgent logging should not compete with user interactions for the main thread.

```ts
requestIdleCallback(
  () => sendAnalyticsEvent({ page: 'expenses' }),
  { timeout: 2000 }
)
```

---

## 8. Advanced Patterns — LOW

### Initialize singletons at module level, not in effects

Effects run after every mount. Singletons (DB connections, SDK clients, analytics) should initialize once at module load.

```ts
// bad — re-initializes on every component mount
useEffect(() => { analytics.init(key) }, [])

// good — initializes once
import { analytics } from '@/lib/analytics' // initialized in the module
```

### Store stable event handler references in `useRef`

When a callback must be stable (passed to a native event listener, third-party library) but also needs access to current state, store it in a ref.

```ts
const handlerRef = useRef(handler)
useLayoutEffect(() => { handlerRef.current = handler })

useEffect(() => {
  const stable = (e: Event) => handlerRef.current(e)
  window.addEventListener('resize', stable)
  return () => window.removeEventListener('resize', stable)
}, [])
```

### Use `useEffectEvent` for callbacks that capture current state

`useEffectEvent` creates a callback that always has the latest values but is excluded from effect dependency tracking, preventing spurious re-runs.

```ts
import { experimental_useEffectEvent as useEffectEvent } from 'react'

const onScroll = useEffectEvent(() => {
  logScrollPosition(scrollY.current, page) // always current
})

useEffect(() => {
  window.addEventListener('scroll', onScroll)
  return () => window.removeEventListener('scroll', onScroll)
}, []) // no dependency on page or scrollY
```

---

## Quick Reference

| Priority | Area | Rule |
|---|---|---|
| CRITICAL | Waterfalls | Parallelize with `Promise.all`; defer `await` to where it's needed |
| CRITICAL | Bundle | Import from source files; `next/dynamic` for heavy components |
| HIGH | Server | Auth every Server Action; use `React.cache()`; use `after()` |
| MEDIUM-HIGH | Client | SWR for data fetching; version `localStorage` keys |
| MEDIUM | Re-renders | Derive state in render; no components-inside-components; functional `setState` |
| MEDIUM | Rendering | Ternary over `&&`; `useTransition` for non-urgent updates |
| LOW-MEDIUM | JS perf | `Map`/`Set` for lookups; combine iterations; `toSorted()` |
| LOW | Advanced | Module-level singletons; `useRef` for stable handlers |
