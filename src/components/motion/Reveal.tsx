'use client'

import { cn } from '@/utilities/ui'
import React, { useEffect, useRef, useState } from 'react'

interface RevealProps {
  as?: React.ElementType
  className?: string
  children: React.ReactNode
}

/**
 * Emulsion-develop scroll reveal (DESIGN.md §4.3).
 *
 * Children begin "undeveloped" (faint, blurred, nudged down) and, on first
 * entering the viewport, run the `emulsion-develop` animation to full
 * exposure. The observer disconnects after the first reveal, so the effect
 * never replays on scroll-away/back.
 */
export const Reveal: React.FC<RevealProps> = ({ as: Tag = 'div', className, children }) => {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // No IntersectionObserver support: show immediately rather than hide content.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={cn('reveal', visible && 'is-visible', className)}
    >
      {children}
    </Tag>
  )
}
