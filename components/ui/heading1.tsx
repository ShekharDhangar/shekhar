import React from "react"
import { cn } from "@/lib/utils"
import { BaseText } from "./base-text"

interface Heading1Props {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Heading1({ children, color, className }: Heading1Props) {
  return (
    <BaseText
      as="span"
      color={color}
      className={cn("text-4xl font-extrabold tracking-tight lg:text-5xl", className)}
    >
      {children}
    </BaseText>
  )
}

