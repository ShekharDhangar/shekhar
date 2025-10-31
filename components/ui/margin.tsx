import React from "react"
import { cn } from "@/lib/utils"

interface MarginProps {
  level?: "nano" | "small" | "medium" | "large"
  className?: string
}

export function Margin({ level = "medium", className }: MarginProps) {
  const marginClass = {
    nano: "h-1",      // 0.25rem
    small: "h-4",     // 1rem
    medium: "h-8",    // 2rem
    large: "h-16",    // 4rem
  }[level]

  return <div className={cn(marginClass, className)} aria-hidden="true" />
}

