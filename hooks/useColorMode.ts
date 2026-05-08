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
