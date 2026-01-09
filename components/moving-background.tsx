"use client"

import React, { useEffect, useRef } from "react"

// --- CONFIGURATION ---
const CONFIG = {
  PARTICLES: {
    COUNT: 190,           // Total number of shapes
    MAGNET_RADIUS: 300,   // Distance to start pulling shapes
    MAGNET_FORCE: 1.05,   // Acceleration towards mouse
    MAGNET_FRICTION: 0.92, // Friction when following 
    FLOW_FRICTION: 0.995, // Friction when drifting freely
    MIN_SPEED: 0.5,       // Minimum drift speed
    MAX_SPEED: 8.0,       // Maximum speed cap
    CONNECTION_DIST: 150, // Distance for connection web
    CLUSTER_MIN_SIZE: 10, // Min objects for a group glow
    REPEL_FORCE: 0.02,    // Tiny repulsion to prevent corner clumping
    TEXT_REPEL_PADDING: 0, // Extra padding around content boundary (0 = use exact boundary)
    TEXT_MAX_PARTICLES: 5, // Max particles allowed near text when mouse is nearby
  }
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotationSpeed: number
  points: { x: number, y: number }[]
  state: "floating" | "caught" 
}

export function MovingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: 0, y: 0, active: false })
  const particles = useRef<Particle[]>([])
  const nextId = useRef(0)
  const textBoxes = useRef<DOMRect[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    // Update content boundary position periodically
    const updateTextBoxes = () => {
      const contentBoundary = document.getElementById('content-boundary')
      if (contentBoundary) {
        const rect = contentBoundary.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          textBoxes.current = [rect]
        }
      }
    }

    updateTextBoxes()
    const textUpdateInterval = setInterval(updateTextBoxes, 1000) // Update every second

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", resize)
    resize()

    const createShape = () => {
      const sides = 3 + Math.floor(Math.random() * 3)
      return Array.from({ length: sides }, () => ({
        x: Math.random() - 0.5,
        y: Math.random() - 0.5,
      }))
    }

    const spawnParticle = (edge = false) => {
      let x, y, vx, vy
      const speed = CONFIG.PARTICLES.MIN_SPEED + Math.random() * 1.2

      if (edge) {
        const side = Math.floor(Math.random() * 4)
        if (side === 0) { // Top
          x = Math.random() * canvas.width; y = -50
          vx = (Math.random() - 0.5) * 1.5; vy = speed 
        } 
        else if (side === 1) { // Right
          x = canvas.width + 50; y = Math.random() * canvas.height
          vx = -speed; vy = (Math.random() - 0.5) * 1.5
        } 
        else if (side === 2) { // Bottom
          x = Math.random() * canvas.width; y = canvas.height + 50
          vx = (Math.random() - 0.5) * 1.5; vy = -speed
        } 
        else { // Left
          x = -50; y = Math.random() * canvas.height
          vx = speed; vy = (Math.random() - 0.5) * 1.5
        }
      } else {
        x = Math.random() * canvas.width
        y = Math.random() * canvas.height
        vx = (Math.random() - 0.5) * 2
        vy = (Math.random() - 0.5) * 2
      }

      return {
        id: nextId.current++,
        x, y, vx, vy,
        size: 10 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        points: createShape(),
        state: "floating" as const,
      }
    }

    particles.current = Array.from({ length: 80 }, () => spawnParticle())

    const draw = () => {
      time += 0.005
      
      const style = getComputedStyle(document.documentElement)
      const background = style.getPropertyValue("--background").trim()
      const foreground = style.getPropertyValue("--foreground").trim()
      const isDark = document.documentElement.classList.contains("dark")
      
      ctx.fillStyle = `hsl(${background})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const color = isDark 
        ? `hsla(${foreground.split(" ").join(",")}, 0.2)` 
        : `rgba(0, 0, 0, 0.3)`

      if (particles.current.length < CONFIG.PARTICLES.COUNT && Math.random() > 0.92) {
        particles.current.push(spawnParticle(true))
      }

      // Clustering Logic
      const adj = new Map<number, number[]>()
      particles.current.forEach(p => adj.set(p.id, []))

      // Check content box state for particle limiting
      let particleCountInBox = 0
      let isMouseNearBox = false
      let contentBox: DOMRect | null = null

      if (mouse.current.active && textBoxes.current.length > 0) {
        const rect = textBoxes.current[0]
        const boxCenterX = (rect.left + rect.right) / 2
        const boxCenterY = (rect.top + rect.bottom) / 2
        const mouseDistToBox = Math.sqrt(
          (mouse.current.x - boxCenterX) ** 2 + 
          (mouse.current.y - boxCenterY) ** 2
        )
        
        if (mouseDistToBox < 350) {
          isMouseNearBox = true
          contentBox = rect
          // Count particles in box
          particleCountInBox = particles.current.filter(p => 
            p.x > rect.left && p.x < rect.right && p.y > rect.top && p.y < rect.bottom
          ).length
        }
      }

      // --- PARTICLES & Connections ---
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i]
        
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.rotationSpeed

        const dx = mouse.current.x - p.x
        const dy = mouse.current.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        // Check if we should apply magnetic force
        let canAttract = true
        if (isMouseNearBox && contentBox && particleCountInBox >= CONFIG.PARTICLES.TEXT_MAX_PARTICLES) {
          // If limit reached and particle is OUTSIDE the box, don't attract it
          const isParticleInBox = p.x > contentBox.left && p.x < contentBox.right && 
                                   p.y > contentBox.top && p.y < contentBox.bottom
          if (!isParticleInBox) {
            canAttract = false
          }
        }
        
        if (mouse.current.active && dist < CONFIG.PARTICLES.MAGNET_RADIUS && canAttract) {
          const force = (CONFIG.PARTICLES.MAGNET_RADIUS - dist) / CONFIG.PARTICLES.MAGNET_RADIUS
          p.vx += (dx / dist) * force * CONFIG.PARTICLES.MAGNET_FORCE
          p.vy += (dy / dist) * force * CONFIG.PARTICLES.MAGNET_FORCE
          p.rotationSpeed += force * 0.02
          
          p.vx *= CONFIG.PARTICLES.MAGNET_FRICTION
          p.vy *= CONFIG.PARTICLES.MAGNET_FRICTION
          p.state = "caught"
        } else {
          p.vx *= CONFIG.PARTICLES.FLOW_FRICTION
          p.vy *= CONFIG.PARTICLES.FLOW_FRICTION
          p.state = "floating"
        }

        p.rotationSpeed *= 0.95

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed < CONFIG.PARTICLES.MIN_SPEED) { 
          p.vx *= 1.02; p.vy *= 1.02 
        }
        else if (speed > CONFIG.PARTICLES.MAX_SPEED) { 
          p.vx *= 0.95; p.vy *= 0.95 
        }

        p.rotationSpeed *= 0.95

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.scale(p.size, p.size)
        ctx.beginPath()
        ctx.moveTo(p.points[0].x, p.points[0].y)
        for (let j = 1; j < p.points.length; j++) {
          ctx.lineTo(p.points[j].x, p.points[j].y)
        }
        ctx.closePath()
        ctx.strokeStyle = color
        ctx.lineWidth = isDark ? 0.05 : 0.04
        ctx.stroke()
        ctx.restore()

        if (p.x < -200 || p.x > canvas.width + 200 || p.y < -200 || p.y > canvas.height + 200) {
          particles.current.splice(i, 1); continue
        }

        for (let j = i - 1; j >= 0; j--) {
          const p2 = particles.current[j]
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2)
          if (d < CONFIG.PARTICLES.CONNECTION_DIST) {
            // Build adjacency map for clustering
            adj.get(p.id)?.push(p2.id)
            adj.get(p2.id)?.push(p.id)

            // Tiny repulsion to keep them from clumping into static blobs
            if (d < 30) {
              const rx = (p.x - p2.x) / d * CONFIG.PARTICLES.REPEL_FORCE
              const ry = (p.y - p2.y) / d * CONFIG.PARTICLES.REPEL_FORCE
              p.vx += rx; p.vy += ry
              p2.vx -= rx; p2.vy -= ry
            }

            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y)
            const lineOpacity = (isDark ? 0.2 : 0.15) * (1 - d / CONFIG.PARTICLES.CONNECTION_DIST)
            ctx.strokeStyle = isDark 
              ? `hsla(${foreground.split(" ").join(",")}, ${lineOpacity})`
              : `rgba(0, 0, 0, ${lineOpacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Find Clusters using DFS
      const visited = new Set<number>()
      const clusters: { x: number, y: number }[] = []

      particles.current.forEach(p => {
        if (!visited.has(p.id)) {
          const stack = [p.id]
          const component: number[] = []
          while (stack.length > 0) {
            const currId = stack.pop()!
            if (!visited.has(currId)) {
              visited.add(currId)
              component.push(currId)
              const neighbors = adj.get(currId) || []
              neighbors.forEach(n => { if (!visited.has(n)) stack.push(n) })
            }
          }

          if (component.length >= CONFIG.PARTICLES.CLUSTER_MIN_SIZE) {
            // Calculate center of mass for this cluster
            let sumX = 0, sumY = 0
            component.forEach(id => {
              const part = particles.current.find(pt => pt.id === id)
              if (part) { sumX += part.x; sumY += part.y }
            })
            clusters.push({ x: sumX / component.length, y: sumY / component.length })
          }
        }
      })

      // Dispatch event with both cluster centers and individual particles
      window.dispatchEvent(new CustomEvent("cluster-glow", { 
        detail: { 
          clusters, 
          particles: particles.current.map(p => ({ x: p.x, y: p.y })),
          active: true 
        } 
      }));

      animationFrameId = requestAnimationFrame(draw)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      mouse.current.active = true
    }

    window.addEventListener("mousemove", handleMouseMove)
    
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("canvas-ready"))
    })

    draw()

    return () => {
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrameId)
      clearInterval(textUpdateInterval)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[-1] pointer-events-none"
    />
  )
}
