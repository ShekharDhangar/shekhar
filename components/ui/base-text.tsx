import React from "react"
import { cn } from "@/lib/utils"

interface BaseTextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  color?: string
  className?: string
  as?: React.ElementType
}

export function BaseText({ children, color, className, as: Component = "span", style, ...props }: BaseTextProps) {
  const colorClass = color === "chameleon" ? "chameleon-text" : ""
  
  const getColorStyle = () => {
    if (color && color !== "chameleon") {
      const colorMap: Record<string, string> = {
        red: "#ef4444",
        blue: "#3b82f6",
        green: "#22c55e",
        yellow: "#eab308",
        purple: "#a855f7",
        pink: "#ec4899",
        orange: "#f97316",
      }
      const colorValue = colorMap[color.toLowerCase()] || color
      return { ...style, color: colorValue }
    }
    return style
  }

  return (
    <Component
      className={cn(colorClass, className)}
      style={getColorStyle()}
      {...props}
    >
      {children}
    </Component>
  )
}

