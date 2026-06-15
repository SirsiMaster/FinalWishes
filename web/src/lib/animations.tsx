/**
 * FinalWishes Animation Utilities
 *
 * Shared motion primitives for the Royal Neo-Deco design system.
 * Import these throughout the app for consistent, premium micro-interactions.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useSpring, useMotionValue, type Variants } from 'framer-motion'

// ─── Scroll Reveal ──────────────────────────────────────────────────────────
// Wrap any content to fade/slide in when it enters the viewport.

interface ScrollRevealProps {
  children: ReactNode
  /** Direction to slide from. Default: 'up' */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  /** Delay in seconds. Default: 0 */
  delay?: number
  /** Duration in seconds. Default: 0.6 */
  duration?: number
  /** Distance to travel in px. Default: 40 */
  distance?: number
  /** Trigger once or every time. Default: true */
  once?: boolean
  className?: string
}

const directionOffset = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
}

export function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 40,
  once = true,
  className,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: '-50px' })
  const offset = directionOffset[direction]

  return (
    <motion.div
      ref={ref}
      initial={{
        opacity: 0,
        x: offset.x * distance,
        y: offset.y * distance,
      }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : undefined}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger Children ───────────────────────────────────────────────────────
// Wraps a list of items to stagger their entrance.

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-30px' })

  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

// ─── Animated Counter ───────────────────────────────────────────────────────
// Numbers count up when they enter the viewport.

interface AnimatedCounterProps {
  /** Target value to count to */
  value: number
  /** Duration in seconds. Default: 1.5 */
  duration?: number
  /** Prefix (e.g. "$") */
  prefix?: string
  /** Suffix (e.g. "%", "K", "B+") */
  suffix?: string
  /** Decimal places. Default: 0 */
  decimals?: number
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1.5,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [isInView, value, motionValue])

  useEffect(() => {
    const unsubscribe = spring.on('change', (v) => {
      setDisplay(v.toFixed(decimals))
    })
    return unsubscribe
  }, [spring, decimals])

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  )
}

// ─── Hover Card ─────────────────────────────────────────────────────────────
// 3D tilt + glow effect on hover. Wrap any card content.

interface HoverCardProps {
  children: ReactNode
  className?: string
  /** Glow color. Default: rgba(200,169,81,0.15) (gold) */
  glowColor?: string
  /** Max tilt angle in degrees. Default: 4 */
  tiltDeg?: number
}

export function HoverCard({
  children,
  className = '',
  glowColor = 'rgba(200,169,81,0.15)',
  tiltDeg = 4,
}: HoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -tiltDeg
    const rotateY = ((x - centerX) / centerX) * tiltDeg

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    card.style.boxShadow = `0 20px 40px ${glowColor}`
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
    card.style.boxShadow = ''
  }

  return (
    <div
      ref={cardRef}
      role="presentation"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transition: 'transform 0.2s ease-out, box-shadow 0.3s ease-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

// ─── Gold Shimmer Loading ───────────────────────────────────────────────────
// Premium loading skeleton with gold shimmer sweep.

export function GoldShimmer({ className = '', height = '1rem' }: { className?: string; height?: string }) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        height,
        background: 'linear-gradient(90deg, rgba(19,51,120,0.1) 0%, rgba(200,169,81,0.15) 50%, rgba(19,51,120,0.1) 100%)',
        backgroundSize: '200% 100%',
        animation: 'goldShimmer 1.8s ease-in-out infinite',
      }}
    />
  )
}

// ─── Particle Burst ─────────────────────────────────────────────────────────
// Golden particle explosion for success states (create estate, sign doc, etc.)

export function useParticleBurst() {
  const burst = (x: number, y: number) => {
    const count = 20
    const container = document.createElement('div')
    container.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999`
    document.body.appendChild(container)

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div')
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
      const velocity = 80 + Math.random() * 120
      const size = 4 + Math.random() * 6
      const hue = 40 + Math.random() * 20 // gold range

      particle.style.cssText = `
        position:absolute;
        left:${x}px;top:${y}px;
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:hsl(${hue}, 70%, 55%);
        pointer-events:none;
        will-change:transform,opacity;
      `
      container.appendChild(particle)

      const dx = Math.cos(angle) * velocity
      const dy = Math.sin(angle) * velocity

      particle.animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy + 40}px) scale(0)`, opacity: 0 },
        ],
        {
          duration: 600 + Math.random() * 400,
          easing: 'cubic-bezier(0, 0.9, 0.57, 1)',
          fill: 'forwards',
        }
      )
    }

    setTimeout(() => container.remove(), 1200)
  }

  return burst
}

// ─── Page Transition Wrapper ────────────────────────────────────────────────
// Fade + slight upward slide for route transitions.

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
