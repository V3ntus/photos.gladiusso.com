'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useRef } from 'react'

/**
 * "Darkroom Exposure Shift" route transition (DESIGN.md §2.1).
 *
 * On each navigation:
 *  - the wrapper briefly dips in luminance (the enlarger lamp turning down);
 *  - the incoming page (re-keyed by pathname) emerges from deep shadow.
 *
 * Timings/easing come from the --dur-exit / --dur-enter / --ease-* tokens in
 * globals.css (280ms exit / 480ms enter). All motion is transform/opacity only,
 * and disabled under prefers-reduced-motion (see the global guardrail).
 */
export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname()
  const wrapRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    // Skip the lamp-dip on the very first paint (no "previous" screen to dip from).
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    el.classList.add('lamp-dip')
    const timeout = setTimeout(() => {
      el.classList.remove('lamp-dip')
    }, 760) // --dur-exit (280ms) + --dur-enter (480ms)

    return () => clearTimeout(timeout)
  }, [pathname])

  return (
    <div ref={wrapRef}>
      <div key={pathname} className="route-enter">
        {children}
      </div>
    </div>
  )
}
