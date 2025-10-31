import React from "react"
import { cn } from "@/lib/utils"
import { BaseText } from "./base-text"

interface SmallTextProps {
  children: React.ReactNode
  className?: string
  color?: string
}

export function SmallText({ children, className, color }: SmallTextProps) {
  return (
    <BaseText
      as="p"
      color={color}
      className={cn("text-sm leading-6", className)}
      style={{ marginTop: 0, marginBottom: 0 }}
    >
      {children}
    </BaseText>
  )
}

