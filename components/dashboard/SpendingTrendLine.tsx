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
import type { DailyPoint } from "@/lib/queries/expenses"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

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
        backgroundColor: lineColor + "1a",
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
    <div className="relative h-56 w-full" aria-label="Line chart showing daily spending trend">
      <Line data={chartData} options={options} />
    </div>
  )
}
