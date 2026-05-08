# Charts & Visualizations

A complete reference for implementing charts using `react-chartjs-2` in this Next.js application. All charts must be fully responsive, visually consistent with the design system defined in `docs/ui.md`, and client-side only.

---

## Prerequisites

Install the required packages:

```bash
npm install react-chartjs-2 chart.js
```

`react-chartjs-2` wraps Chart.js and requires Chart.js components to be registered before use. Always register only what you need to keep bundle size minimal.

---

## Guiding Principles

- **Client-only:** Chart.js manipulates the DOM directly. All chart components must be marked `"use client"` and must never render during SSR. Use `dynamic` imports with `ssr: false` when embedding in server components.
- **Responsive by default:** Set `responsive: true` and `maintainAspectRatio: false` on every chart, then control height via the wrapper element, not the canvas.
- **Theme-aware:** Charts must respect both light and dark modes. Derive colors from the same semantic palette used throughout the app (see [Color System](#color-system) below). Never hardcode `#ffffff` or `#000000` — use the palette constants.
- **No inline styles for colors:** Color values in chart options are hex/rgb strings (Chart.js does not accept Tailwind classes). Define them as named constants so they can be updated in one place.
- **Accessible:** Always provide an `aria-label` on the `<div>` wrapping the chart. Supplement every chart with a textual summary (KPI tiles or a legend table) so the data is available without the graphic.
- **Motion:** Disable animations when `prefers-reduced-motion` is active (see [Animations](#animations)).

---

## Color System

These constants mirror the Tailwind semantic palette from `docs/ui.md`. Import from a shared file (e.g., `lib/chart-theme.ts`) so every chart uses the same values.

```ts
// lib/chart-theme.ts

export const CHART_COLORS = {
  // Category series — matches badge colors in ui.md
  "Food & Dining": { light: "#f43f5e", dark: "#fb7185" },  // rose-500 / rose-400
  "Transport":     { light: "#0ea5e9", dark: "#38bdf8" },  // sky-500 / sky-400
  "Housing":       { light: "#8b5cf6", dark: "#a78bfa" },  // violet-500 / violet-400
  "Entertainment": { light: "#f59e0b", dark: "#fbbf24" },  // amber-500 / amber-400
  "Health":        { light: "#10b981", dark: "#34d399" },  // emerald-500 / emerald-400
  "Shopping":      { light: "#ec4899", dark: "#f472b6" },  // pink-500 / pink-400
  "Utilities":     { light: "#64748b", dark: "#94a3b8" },  // slate-500 / slate-400
  "Travel":        { light: "#06b6d4", dark: "#22d3ee" },  // cyan-500 / cyan-400
  "Other":         { light: "#6b7280", dark: "#9ca3af" },  // gray-500 / gray-400
} as const

// Generic sequential palette for time-series lines, bars, etc.
export const SERIES_COLORS = {
  primary:  { light: "#4f46e5", dark: "#6366f1" },  // indigo-600 / indigo-500
  income:   { light: "#059669", dark: "#34d399" },  // emerald-600 / emerald-400
  expense:  { light: "#dc2626", dark: "#f87171" },  // red-600 / red-400
  warning:  { light: "#d97706", dark: "#fbbf24" },  // amber-600 / amber-400
} as const

// Grid, tick, and tooltip chrome
export const CHROME_COLORS = {
  grid:        { light: "#e2e8f0", dark: "#1e293b" },  // slate-200 / slate-800
  tick:        { light: "#64748b", dark: "#94a3b8" },  // slate-500 / slate-400
  tooltipBg:   { light: "#0f172a", dark: "#f8fafc" },  // slate-900 / slate-50
  tooltipText: { light: "#f8fafc", dark: "#0f172a" },  // slate-50 / slate-900
  tooltipBorder:{ light: "#1e293b", dark: "#e2e8f0" }, // slate-800 / slate-200
} as const

export type ColorMode = "light" | "dark"

/** Resolve a color pair to the correct value for the current mode. */
export function resolve(pair: { light: string; dark: string }, mode: ColorMode) {
  return pair[mode]
}
```

### Detecting Dark Mode

Use a hook to read `prefers-color-scheme` at runtime so chart options stay reactive:

```ts
// hooks/useColorMode.ts
"use client"
import { useEffect, useState } from "react"
import type { ColorMode } from "@/lib/chart-theme"

export function useColorMode(): ColorMode {
  const [mode, setMode] = useState<ColorMode>("light")

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setMode(mq.matches ? "dark" : "light")

    const handler = (e: MediaQueryListEvent) => setMode(e.matches ? "dark" : "light")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return mode
}
```

---

## Chart Component Pattern

Every chart follows the same structural pattern:

1. `"use client"` directive at the top
2. Register the required Chart.js components once at module level
3. Wrap the `<canvas>` in a sized `<div>` — never size the canvas directly
4. Derive all colors from `useColorMode` + the palette constants
5. Expose no inline `style` for visual properties other than the wrapper height

### Wrapper & Sizing

Control chart height with a fixed-height wrapper. Use Tailwind height utilities — never pass `height` or `width` to the Chart component itself.

```tsx
{/* Standard chart card wrapper */}
<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
  <h2 className="text-base font-medium text-slate-900 dark:text-slate-50 mb-4">
    Chart Title
  </h2>
  {/* Height wrapper — adjust h-* to suit the chart type */}
  <div className="relative h-64 w-full">
    <MyChart ... />
  </div>
</div>
```

Recommended heights by chart type:

| Chart type | Default height | Notes |
|---|---|---|
| Doughnut / Pie | `h-64` (256 px) | Increase to `h-72` when a legend is beside the chart |
| Bar (vertical) | `h-64` | Increase to `h-80` for many categories |
| Line | `h-56` | Taller for detailed time-series: `h-72` |
| Horizontal bar | auto via rows | Set `h-auto` and let the dataset length drive height |

---

## Base Options

Define a function that returns the shared base options, parameterized by color mode. Apply these to every chart and extend with chart-specific overrides.

```ts
// lib/chart-options.ts
import { CHROME_COLORS, resolve, type ColorMode } from "./chart-theme"

export function baseOptions(mode: ColorMode) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: prefersReducedMotion() ? 0 : 300,
    },
    plugins: {
      legend: {
        display: false, // render a custom HTML legend instead (see below)
      },
      tooltip: {
        backgroundColor: resolve(CHROME_COLORS.tooltipBg, mode),
        titleColor: resolve(CHROME_COLORS.tooltipText, mode),
        bodyColor: resolve(CHROME_COLORS.tooltipText, mode),
        borderColor: resolve(CHROME_COLORS.tooltipBorder, mode),
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: import("chart.js").TooltipItem<never>) =>
            ` ${ctx.formattedValue}`,
        },
      },
    },
  } as const
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
```

---

## Animations

Disable animations for users who have requested reduced motion. This is handled in `baseOptions` above via `animation.duration: 0`. For datasets that update on re-render, also set:

```ts
options: {
  animation: {
    duration: prefersReducedMotion() ? 0 : 300,
  },
  transitions: {
    active: { animation: { duration: prefersReducedMotion() ? 0 : 150 } },
  },
}
```

---

## Chart Types

### Doughnut Chart — Spending by Category

Used on the Dashboard to show the percentage breakdown of spending per category.

**Registration:**
```ts
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
ChartJS.register(ArcElement, Tooltip, Legend)
```

**Component:**
```tsx
"use client"
import { Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js"
import { useColorMode } from "@/hooks/useColorMode"
import { CHART_COLORS, resolve } from "@/lib/chart-theme"
import { baseOptions } from "@/lib/chart-options"

ChartJS.register(ArcElement, Tooltip)

type CategorySpend = { categoryName: string; totalCents: number }

type Props = {
  byCategory: CategorySpend[]
  totalCents: number
}

export function SpendingDoughnut({ byCategory, totalCents }: Props) {
  const mode = useColorMode()

  const data = {
    labels: byCategory.map((c) => c.categoryName),
    datasets: [
      {
        data: byCategory.map((c) => c.totalCents / 100),
        backgroundColor: byCategory.map((c) => {
          const pair = CHART_COLORS[c.categoryName as keyof typeof CHART_COLORS]
          return pair ? resolve(pair, mode) : "#6b7280"
        }),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }

  const options = {
    ...baseOptions(mode),
    cutout: "70%",
    plugins: {
      ...baseOptions(mode).plugins,
      tooltip: {
        ...baseOptions(mode).plugins.tooltip,
        callbacks: {
          label: (ctx: import("chart.js").TooltipItem<"doughnut">) => {
            const pct = totalCents > 0
              ? ((ctx.raw as number) * 100 / (totalCents / 100)).toFixed(1)
              : "0"
            return ` $${(ctx.raw as number).toFixed(2)}  (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div
      className="relative h-64 w-full"
      aria-label="Doughnut chart showing spending by category"
    >
      <Doughnut data={data} options={options} />
    </div>
  )
}
```

**Center label (optional):** To display the total in the doughnut hole, use a Chart.js plugin or overlay a centered `<div>` using `absolute inset-0 flex items-center justify-center pointer-events-none`.

---

### Bar Chart — Monthly Spending

Used to compare spending across months or compare income vs. expenses over time.

**Registration:**
```ts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js"
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)
```

**Component:**
```tsx
"use client"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js"
import { useColorMode } from "@/hooks/useColorMode"
import { SERIES_COLORS, CHROME_COLORS, resolve } from "@/lib/chart-theme"
import { baseOptions } from "@/lib/chart-options"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

type MonthlyPoint = { label: string; expenseCents: number; incomeCents?: number }

type Props = { data: MonthlyPoint[] }

export function MonthlyBarChart({ data }: Props) {
  const mode = useColorMode()

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Expenses",
        data: data.map((d) => d.expenseCents / 100),
        backgroundColor: resolve(SERIES_COLORS.expense, mode) + "cc", // 80% opacity
        borderRadius: 4,
        borderSkipped: false,
      },
      ...(data.some((d) => d.incomeCents != null)
        ? [
            {
              label: "Income",
              data: data.map((d) => (d.incomeCents ?? 0) / 100),
              backgroundColor: resolve(SERIES_COLORS.income, mode) + "cc",
              borderRadius: 4,
              borderSkipped: false,
            },
          ]
        : []),
    ],
  }

  const options = {
    ...baseOptions(mode),
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: resolve(CHROME_COLORS.tick, mode),
          font: { size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: resolve(CHROME_COLORS.grid, mode),
          drawBorder: false,
        },
        ticks: {
          color: resolve(CHROME_COLORS.tick, mode),
          font: { size: 11 },
          callback: (value: number | string) => `$${value}`,
        },
        border: { display: false },
      },
    },
  }

  return (
    <div
      className="relative h-64 w-full"
      aria-label="Bar chart showing monthly spending"
    >
      <Bar data={chartData} options={options} />
    </div>
  )
}
```

---

### Line Chart — Spending Trend

Used to show spending over time (daily or weekly within a month).

**Registration:**
```ts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js"
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)
```

**Component:**
```tsx
"use client"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js"
import { useColorMode } from "@/hooks/useColorMode"
import { SERIES_COLORS, CHROME_COLORS, resolve } from "@/lib/chart-theme"
import { baseOptions } from "@/lib/chart-options"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

type DailyPoint = { label: string; totalCents: number }
type Props = { data: DailyPoint[] }

export function SpendingTrendLine({ data }: Props) {
  const mode = useColorMode()
  const lineColor = resolve(SERIES_COLORS.primary, mode)

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.totalCents / 100),
        borderColor: lineColor,
        backgroundColor: lineColor + "1a", // ~10% opacity fill
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: lineColor,
        fill: true,
        tension: 0.3,
      },
    ],
  }

  const options = {
    ...baseOptions(mode),
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: resolve(CHROME_COLORS.tick, mode),
          font: { size: 11 },
          maxTicksLimit: 8,
        },
        border: { display: false },
      },
      y: {
        grid: { color: resolve(CHROME_COLORS.grid, mode) },
        ticks: {
          color: resolve(CHROME_COLORS.tick, mode),
          font: { size: 11 },
          callback: (value: number | string) => `$${value}`,
        },
        border: { display: false },
      },
    },
  }

  return (
    <div
      className="relative h-56 w-full"
      aria-label="Line chart showing spending trend"
    >
      <Line data={chartData} options={options} />
    </div>
  )
}
```

---

## Legends

Do **not** use Chart.js's built-in legend (`legend.display: false` in `baseOptions`). Render a custom HTML legend instead — it is easier to style consistently with the app's design system, keyboard-accessible, and avoids canvas-rendering issues on high-DPI screens.

```tsx
type LegendItem = { label: string; color: string; value: string }

function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="font-medium">{item.label}</span>
          <span className="tabular-nums font-mono text-slate-500 dark:text-slate-500">{item.value}</span>
        </li>
      ))}
    </ul>
  )
}
```

Note: `style={{ backgroundColor }}` is the one acceptable `style` prop here — the color value is dynamic and cannot be expressed as a static Tailwind class.

---

## SSR Safety

Chart.js requires a browser environment. When a chart component is imported into a server component or a page that is server-rendered, wrap it with `next/dynamic`:

```tsx
// In a server component (e.g., app/(app)/dashboard/page.tsx)
import dynamic from "next/dynamic"

const SpendingDoughnut = dynamic(
  () => import("@/components/dashboard/SpendingDoughnut").then((m) => m.SpendingDoughnut),
  { ssr: false, loading: () => <ChartSkeleton /> }
)
```

Provide a `loading` skeleton that matches the chart's height so the layout does not shift on hydration.

### Chart Skeleton

```tsx
// Reuse the pulse-animation pattern from ui.md
function ChartSkeleton({ className = "h-64" }: { className?: string }) {
  return (
    <div className={`${className} w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse`} />
  )
}
```

---

## Tooltips

The base tooltip config in `baseOptions` handles colors and padding. Customize the `callbacks.label` per chart to format currency:

```ts
callbacks: {
  label: (ctx) => {
    const raw = ctx.raw as number
    return ` ${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(raw)}`
  },
  title: (items) => items[0]?.label ?? "",
},
```

For multi-dataset charts, also customize `callbacks.afterLabel` to show percentage of total if relevant.

---

## Accessibility

- Wrap every chart in a `<div>` with a descriptive `aria-label` summarizing what the chart shows.
- Always pair a chart with textual data — KPI tiles, a legend with values, or a summary sentence below the chart.
- Use `role="img"` on the wrapper `<div>` when the chart is purely decorative or its data is fully expressed in adjacent text.
- Do not rely on color alone to distinguish series. Use differing opacity, patterns, or labels.

---

## Performance

- Register only the Chart.js modules you use — tree-shaking works via named imports from `chart.js`.
- Import chart components lazily via `dynamic` (see [SSR Safety](#ssr-safety)) to keep the initial server payload small.
- For charts that update frequently (live data), set `animation.duration: 0` to avoid frame-rate issues.
- Destroy the chart instance on unmount — `react-chartjs-2` handles this automatically; do not call `chart.destroy()` manually.

---

## Conventions Checklist

Before shipping a chart component, verify:

- [ ] `"use client"` directive is present
- [ ] Imported via `dynamic(..., { ssr: false })` at the page/server-component level
- [ ] `responsive: true` and `maintainAspectRatio: false` in options
- [ ] Height controlled by a wrapper `<div>` with a Tailwind `h-*` class
- [ ] Colors sourced from `lib/chart-theme.ts` — no hardcoded hex/rgb literals in the component file
- [ ] `useColorMode()` drives light/dark color selection
- [ ] `animation.duration` respects `prefers-reduced-motion`
- [ ] Built-in Chart.js legend disabled; custom HTML legend rendered separately
- [ ] `aria-label` on the chart wrapper `<div>`
- [ ] A skeleton (`ChartSkeleton`) passed as the `loading` prop to `dynamic`
