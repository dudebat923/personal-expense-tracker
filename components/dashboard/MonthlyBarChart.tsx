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
import type { MonthlyPoint } from "@/lib/queries/expenses"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

type Props = { data: MonthlyPoint[] }

export function MonthlyBarChart({ data }: Props) {
  const mode = useColorMode()

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Expenses",
        data: data.map((d) => d.expenseCents / 100),
        backgroundColor: resolve(SERIES_COLORS.expense, mode) + "cc",
        borderRadius: 4,
        borderSkipped: false,
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
    <div className="relative h-64 w-full" aria-label="Bar chart showing monthly spending">
      <Bar data={chartData} options={options} />
    </div>
  )
}
