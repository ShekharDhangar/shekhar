"use client"

import React, { useEffect, useState } from "react"

export function HomeContent({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleReady = () => setIsVisible(true)
    
    // Check if canvas is already ready (just in case)
    // Or just wait for the event
    window.addEventListener("canvas-ready", handleReady)
    
    // Safety timeout: show content after 1 second if event never fires
    const timeout = setTimeout(handleReady, 1000)

    return () => {
      window.removeEventListener("canvas-ready", handleReady)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div className={`transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
  )
}

