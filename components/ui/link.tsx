import React from "react"
import { cn } from "@/lib/utils"
import { BaseText } from "./base-text"

interface LinkProps {
  href: string
  children: React.ReactNode
  className?: string
  color?: string
}

export function Link({ href, children, className, color }: LinkProps) {
  return (
    <BaseText
      as="a"
      href={href}
      color={color}
      className={cn(
        !color && "text-primary hover:text-primary/80",
        "underline underline-offset-4 transition-colors",
        className
      )}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </BaseText>
  )
}

