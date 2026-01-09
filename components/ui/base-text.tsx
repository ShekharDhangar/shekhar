"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface BaseTextProps {
  children: React.ReactNode
  color?: string
  className?: string
  style?: React.CSSProperties
  as?: React.ElementType
  [key: string]: any 
}

function Character({ char, colorStyle, colorClass }: { char: string, colorStyle: any, colorClass: string }) {
  const [isGlowing, setIsGlowing] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const handleGlow = (e: any) => {
      const { clusters, particles, active } = e.detail
      if (!active || !ref.current) {
        setIsGlowing(false)
        return
      }

      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Use squared distances for better performance
      const clusterRadiusSq = 80 * 80
      const singleRadiusSq = 35 * 35 // Tight radius for 2-3 characters

      // 1. Check big clusters (Radius: 80px)
      const isNearCluster = clusters?.some((c: { x: number, y: number }) => {
        const dx = c.x - centerX
        const dy = c.y - centerY
        return (dx * dx + dy * dy) < clusterRadiusSq
      })

      if (isNearCluster) {
        setIsGlowing(true)
        return
      }

      // 2. Check individual particles (Radius: 35px)
      const isNearSingle = particles?.some((p: { x: number, y: number }) => {
        const dx = p.x - centerX
        const dy = p.y - centerY
        return (dx * dx + dy * dy) < singleRadiusSq
      })
      
      setIsGlowing(isNearSingle)
    }

    window.addEventListener("cluster-glow", handleGlow)
    return () => window.removeEventListener("cluster-glow", handleGlow)
  }, [])

  return (
    <span
      ref={ref}
      className={cn(
        colorClass,
        "transition-all duration-500 antialiased inline-block whitespace-pre relative z-10",
        isGlowing ? "text-foreground opacity-100" : "text-foreground opacity-[0.85]"
      )}
      style={{
        ...colorStyle,
        // Ensure color is always set explicitly for Samsung browser compatibility
        color: colorStyle?.color || (isGlowing ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))'),
        textShadow: isGlowing 
          ? "0 0 15px hsla(var(--foreground), 0.4), 0 0 1px currentColor"
          : "0 0 1px currentColor"
      }}
    >
      {char}
    </span>
  )
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

  // Recursive function to process children and split strings into individual Character components
  const processChildren = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      return node.split("").map((char, i) => (
        <Character key={i} char={char} colorStyle={getColorStyle()} colorClass={colorClass} />
      ))
    }
    if (React.isValidElement(node)) {
      return React.cloneElement(node as React.ReactElement, {
        children: processChildren(node.props.children)
      })
    }
    if (Array.isArray(node)) {
      return node.map((child, i) => <React.Fragment key={i}>{processChildren(child)}</React.Fragment>)
    }
    return node
  }

  return (
    <Component
      className={cn("transition-all duration-700 antialiased relative z-10", className)}
      {...props}
    >
      {processChildren(children)}
    </Component>
  )
}
