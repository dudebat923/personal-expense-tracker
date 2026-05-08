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
        display: false,
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
