'use client'
import NextImage from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { placeholderBlur } from '@/components/Media/ImageMedia'
import type { RollFrame } from '@/components/AlbumRoll'
import { getMediaUrl } from '@/utilities/getMediaUrl'

/**
 * Loupe geometry (DESIGN.md §4.2) — an 11rem brass ring, the aperture reading
 * the plate at twice its printed size, cursor-relative.
 */
const LOUPE_DIAMETER = 176
const LOUPE_MAGNIFICATION = 2

/** Damped spring lag for the ring (§4.2: lerp(current, target, 0.12)). */
const LOUPE_LAG = 0.12

/**
 * Full-resolution src of a frame at the given moment — used by both the
 * enlarged plate and the grain inside the loupe's aperture.
 */
const frameSrc = (frame: RollFrame): string => getMediaUrl(frame.url, frame.updatedAt)

/**
 * Loupe — §4.2 click-to-enlarge, Screen 4 in the spec:
 *
 *  - Throwing a frame opens it enlarged on an obsidian light table, entered
 *    through the §4.3 emulsion develop.
 *  - With a mouse over the negative, the circular brass loupe ring follows the
 *    cursor with a damped spring lag (`lerp(current, target, 0.12)`), and the
 *    grain inside its aperture moves inversely at the loupe's magnification,
 *    sub-pixel crisp (the full-resolution source, not the optimized roll img).
 *  - A soft amber reticle labels it `8X LOUPE` on a 2-second breath cycle.
 *  - ‹ › step through the roll (buttons and arrow keys), Esc or a click on the
 *    light table closes it.
 *
 * The loupe is a pointer-only instrument (`matchMedia('(pointer: fine)')`);
 * touch reads the enlarged frame and pages it with the chevrons. All motion
 * stays on transform/opacity/filter (§5: GPU-only), and the respiratory
 * animations are zeroed by the global `prefers-reduced-motion` guardrail —
 * under it the ring also snaps instead of trailing.
 */
export const Loupe: React.FC<{
  close: () => void
  frames: RollFrame[]
  /** Index of the frame the click came from. */
  start: number
}> = ({ close, frames, start }) => {
  const [index, setIndex] = useState(start)
  const [mounted, setMounted] = useState(false)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const apertureRef = useRef<HTMLDivElement | null>(null)
  const plateRef = useRef<HTMLImageElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // Raw cursor (target of the lerp) vs. where the ring actually is.
  const target = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const wantsLag = useRef(true)

  const currentFrame = frames[index]
  const exposure = (() => {
    if (!currentFrame) return ''

    const parts: string[] = []

    if (currentFrame.shutter) parts.push(currentFrame.shutter)
    if (currentFrame.aperture) parts.push(`ƒ/${currentFrame.aperture}`)
    if (currentFrame.iso) parts.push(`ISO ${currentFrame.iso}`)
    if (currentFrame.camera) parts.push(currentFrame.camera)
    if (currentFrame.lens) parts.push(currentFrame.lens)

    return parts.join(' · ')
  })()

  const step = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + frames.length) % frames.length)
    },
    [frames.length],
  )

  // Keyboard: arrows page the roll, Esc closes it, while the light table is up.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close, step])

  // Scroll lock — the light table replaces the roll while it is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Focus the close tassel first so keyboard users are in the dialog.
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Portal to the body — fixed positioning anchors to the *nearest* ancestor
  // carrying a transform / filter / will-change, and the §2.1 route
  // transition wrapper keeps its final `translateY(0)` keyframe (animation
  // fill-mode `both`). Inside it, `position: fixed` would size the light
  // table to the whole document instead of the viewport. Portaling past that
  // wrapper puts the loupe top-level, anchored to the real viewport.
  useEffect(() => {
    setMounted(true)
  }, [])

  // Reduced motion: the guardrail in globals.css zeroes the CSS animations;
  // the lagged ring is handled here — a viewer who asked for no motion gets
  // the ring stapled to the cursor instead of trailing it.
  useEffect(() => {
    wantsLag.current = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // The ring ride: one rAF loop lerping toward the cursor and writing
  // transform / background-position straight to the DOM nodes (no re-render
  // per move). Reads before writes per tick; transforms don't touch layout.
  useEffect(() => {
    let raf = 0
    let angling = false
    let hovering = false

    const overPlate = (e: MouseEvent): boolean => {
      const plate = plateRef.current

      if (!plate) return false

      const rect = plate.getBoundingClientRect()

      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      )
    }

    const tick = () => {
      const ring = ringRef.current
      const plate = plateRef.current

      if (ring && plate && angling) {
        const lag = wantsLag.current ? LOUPE_LAG : 1

        current.current.x += (target.current.x - current.current.x) * lag
        current.current.y += (target.current.y - current.current.y) * lag

        ring.style.transform = `translate3d(${current.current.x - LOUPE_DIAMETER / 2}px, ${current.current.y - LOUPE_DIAMETER / 2}px, 0)`

        // Inverted grain: the aperture shows the region under the cursor,
        // magnified — the background slides opposite the ring's travel.
        if (hovering && apertureRef.current) {
          const rect = plate.getBoundingClientRect()

          apertureRef.current.style.backgroundSize = `${rect.width * LOUPE_MAGNIFICATION}px ${rect.height * LOUPE_MAGNIFICATION}px`
          apertureRef.current.style.backgroundPosition = `${LOUPE_DIAMETER / 2 - (current.current.x - rect.left) * LOUPE_MAGNIFICATION}px ${LOUPE_DIAMETER / 2 - (current.current.y - rect.top) * LOUPE_MAGNIFICATION}px`
        }
      }

      raf = requestAnimationFrame(tick)
    }

    const onMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY }

      // Seat the ring on first movement instead of flying it in from 0,0.
      if (!angling) {
        current.current = { ...target.current }
        angling = true
      }

      hovering = overPlate(e)
      ringRef.current?.classList.toggle('is-seated', hovering)
    }

    window.addEventListener('mousemove', onMouseMove)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  if (!currentFrame || !mounted) return null

  return createPortal(
    <div
      aria-label={`Enlarged frame — ${currentFrame.alt || 'negative'}`}
      aria-modal="true"
      className="loupe"
      // The light table is always the darkroom (§4.2) — scoping the design
      // tokens here keeps the loupe obsidian even when the page around it is
      // in the site's light theme (where `--obsidian` reads as paper cream).
      data-theme="dark"
      onClick={close}
      role="dialog"
    >
      <figure className="loupe__stage" key={currentFrame.id} onClick={(e) => e.stopPropagation()}>
        <NextImage
          alt={currentFrame.alt || ''}
          blurDataURL={placeholderBlur}
          className="loupe__plate"
          height={currentFrame.height ?? undefined}
          placeholder="blur"
          priority
          quality={100}
          ref={plateRef as React.RefObject<HTMLImageElement>}
          sizes="100vw"
          src={frameSrc(currentFrame)}
          width={currentFrame.width ?? undefined}
        />

        {exposure && <figcaption className="loupe__exif">{exposure}</figcaption>}
      </figure>

      <div
        className="loupe__ring"
        ref={ringRef}
        style={{ height: LOUPE_DIAMETER, width: LOUPE_DIAMETER }}
      >
        {/* The aperture grain is painted as a background image — its size and
            position hang off the plate's rect in the rAF loop above. */}
        <div
          className="loupe__aperture"
          ref={apertureRef}
          style={{ backgroundImage: `url(${frameSrc(currentFrame)})` }}
        />
        <span aria-hidden className="loupe__tag">
          8X LOUPE
        </span>
      </div>

      {frames.length > 1 && (
        <React.Fragment>
          <button
            aria-label="Previous frame"
            className="loupe__pager loupe__pager--prev"
            onClick={(e) => {
              e.stopPropagation()
              step(-1)
            }}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Next frame"
            className="loupe__pager loupe__pager--next"
            onClick={(e) => {
              e.stopPropagation()
              step(1)
            }}
            type="button"
          >
            ›
          </button>
          <p className="loupe__counter" onClick={(e) => e.stopPropagation()}>
            {index + 1} / {frames.length}
          </p>
        </React.Fragment>
      )}

      <button
        aria-label="Close the loupe"
        autoFocus
        className="loupe__close"
        onClick={(e) => {
          e.stopPropagation()
          close()
        }}
        ref={closeRef}
        type="button"
      >
        ✕
      </button>
    </div>,
    document.body,
  )
}
