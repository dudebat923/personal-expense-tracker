export type ColorPair = { light: string; dark: string }

export const CHART_COLORS: Record<string, ColorPair> = {
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

export const SERIES_COLORS: Record<string, ColorPair> = {
  primary:  { light: "#4f46e5", dark: "#6366f1" },
  income:   { light: "#059669", dark: "#34d399" },
  expense:  { light: "#dc2626", dark: "#f87171" },
  warning:  { light: "#d97706", dark: "#fbbf24" },
}

export const CHROME_COLORS: Record<string, ColorPair> = {
  grid:         { light: "#e2e8f0", dark: "#1e293b" },
  tick:         { light: "#64748b", dark: "#94a3b8" },
  tooltipBg:    { light: "#0f172a", dark: "#f8fafc" },
  tooltipText:  { light: "#f8fafc", dark: "#0f172a" },
  tooltipBorder:{ light: "#1e293b", dark: "#e2e8f0" },
}

export type ColorMode = "light" | "dark"

export function resolve(pair: ColorPair, mode: ColorMode) {
  return pair[mode]
}
