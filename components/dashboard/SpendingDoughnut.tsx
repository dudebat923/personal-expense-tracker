"use client"
import { Doughnut } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, type TooltipItem } from "chart.js"
import { useColorMode } from "@/hooks/useColorMode"
import type { CategorySpend } from "@/lib/queries/expenses"

ChartJS.register(ArcElement, Tooltip)

const COLORS: Record<string, { light: string; dark: string }> = {
  "Food & Dining": { light: "#f43f5e", dark: "#fb7185" },
  "Transport":     { light: "#0ea5e9", dark: "#38bdf8" },
  "Housing":       { light: "#8b5cf6", dark: "#a78bfa" },
  "Entertainment": { light: "#f59e0b", dark: "#fbbf24" },
  "Health":        { light: "#10b981", dark: "#34d399" },
  "Shopping":      { light: "#ec4899", dark: "#f472b6" },
  "Utilities":     { light: "#64748b", dark: "#94a3b8" },
  "Travel":        { light: "#06b6d4", dark: "#22d3ee" },
  "Other":         { light: "#6b7280", dark: "#9ca3af" },
}

const FALLBACK = ["#f43f5e", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899", "#06b6d4"]

type Props = { byCategory: CategorySpend[]; totalCents: number }

export function SpendingDoughnut({ byCategory, totalCents }: Props) {
  const mode = useColorMode()

  const backgroundColor = byCategory.map((c, i) => {
    const pair = COLORS[c.categoryName]
    return pair ? pair[mode] : FALLBACK[i % FALLBACK.length]
  })

  const data = {
    labels: byCategory.map((c) => c.categoryName),
    datasets: [
      {
        data: byCategory.map((c) => c.totalCents / 100),
        backgroundColor,
        borderWidth: 2,
        borderColor: mode === "dark" ? "#0f172a" : "#ffffff",
        hoverOffset: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"doughnut">) => {
            const val = ctx.raw as number
            const pct = totalCents > 0 ? ((val / (totalCents / 100)) * 100).toFixed(1) : "0"
            const formatted = new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(val)
            return ` ${formatted}  (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className="relative h-64 w-full" aria-label="Doughnut chart showing spending by category">
      <Doughnut data={data} options={options} />
    </div>
  )
}
