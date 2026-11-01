'use client'
import { cn } from '@/utilities/ui'
import React from 'react'

/**
 * Scroll cue — the invitation to run the roll, seated under the album header
 * (§4.3 editorial scroll). Pressing it glides down to the anchor `#album-roll`
 * (the first frame's section); a viewer who asked for reduced motion gets the
 * instant jump instead of the glide (§5 guardrail). The chevron bobs on a
 * soft cycle to signal the affordance — animation only, so the global
 * `prefers-reduced-motion` guardrail stills it, and hover lights it tungsten
 * like the loupe's paging tassels.
 */
export const AlbumScrollCue: React.FC<{
  className?: string
}> = ({ className }) => {
  const scrollDown = () => {
    const target = document.getElementById('album-roll')

    if (!target) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <button
      aria-label="Scroll down to the first frame"
      className={cn('album-scroll-cue', className)}
      onClick={scrollDown}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="album-scroll-cue__chev"
        fill="none"
        height="20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="20"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  )
}
