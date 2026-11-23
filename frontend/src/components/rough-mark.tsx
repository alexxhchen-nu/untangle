import { useEffect, useRef, type ReactNode } from "react"
import { annotate } from "rough-notation"
import type { RoughAnnotation, RoughAnnotationType, RoughPadding } from "rough-notation/lib/model"

interface RoughMarkProps {
  children: ReactNode
  type?: RoughAnnotationType
  color?: string
  strokeWidth?: number
  padding?: RoughPadding
  iterations?: number
  delay?: number
  className?: string
}

// Hand-drawn annotation (https://roughnotation.com) around inline text.
// Draws once on mount; skips the animation when the reader prefers less motion.
export function RoughMark({
  children,
  type = "highlight",
  color = "#fde047",
  strokeWidth = 1,
  padding = 2,
  iterations = 2,
  delay = 0,
  className,
}: RoughMarkProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let annotation: RoughAnnotation | null = null
    const timer = window.setTimeout(() => {
      annotation = annotate(el, {
        type,
        color,
        strokeWidth,
        padding,
        iterations,
        multiline: true,
        animate: !reduceMotion,
        animationDuration: 700,
      })
      annotation.show()
    }, delay)

    return () => {
      window.clearTimeout(timer)
      annotation?.remove()
    }
  }, [type, color, strokeWidth, padding, iterations, delay])

  return (
    <span ref={ref} className={className ? `rough-mark ${className}` : "rough-mark"}>
      {children}
    </span>
  )
}
