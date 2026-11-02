'use client'

import type { FilmStripBlock as FilmStripBlockProps, Media as MediaDoc } from '@/payload-types'

import { cn } from '@/utilities/ui'
import React, { useEffect, useRef } from 'react'

import { Media } from '../../components/Media'

/**
 * Continuous film strip — featured negative rail (DESIGN.md §3.2).
 *
 * The selected negatives sit on an obsidian strip whose sprocket bands are
 * part of the film, so scrubbing pans frames and sprockets together. The
 * strip is a horizontal scrub viewport: grab, wheel or touch pan slides it
 * 1:1 with `scroll-snap` settling each frame into view. Wheel and touch pan
 * natively; the grab is wired by hand below, because a browser only pans an
 * `overflow` scroller on wheel and touch — and its default answer to a
 * mousedown on a negative is to start towing the `<img>` out of the page.
 * Frames are
 * "plates"
 * (§4.1 `photo-plate` hover lift + `photo-plate__img` zoom) and carry the
 * glinting amber frame-number tag (`▶ 01A`-style, §4.1) and a grease-pencil
 * sleeve note (`film-strip__spec`: shutter · aperture · ISO · camera · lens)
 * read from each media document's own optional exposure fields, unset ones
 * keeping their placeholder rules (`—`). Frames are sized
 * hero-scale and cropped to 4/3, the Academy gate of sprocketed film. The
 * strip signals its scrub affordance — grab cursor, edges fading into
 * obsidian where the film continues, fixed tungsten gate ticks at the
 * `scroll-snap` settling point, and chevrons pinned to the scrollport ends
 * (`film-strip__chevron-start` / `film-strip__chevron-end`) while film
 * overflows. All motion is transform-only; the global
 * prefers-reduced-motion guardrail in globals.css applies.
 */

/** `▶ 01A`, `▶ 01B`, … `▶ 02A` — the darkroom frame numbering. */
const frameTag = (index: number) => {
  const number = Math.floor(index / 26) + 1
  const letter = String.fromCharCode(65 + (index % 26))

  return `▶ ${String(number).padStart(2, '0')}${letter}`
}

/**
 * The sleeve note prints around the gate, never over the negative: the
 * exposure triangle (shutter · ƒ/aperture · ISO) on the band above, the
 * kit (camera · lens) on the band below. Unset fields keep their
 * placeholder rules (`—`, `ƒ/—`, `ISO —`).
 */

/** `1/125 · ƒ/2.8 · ISO 400` — the exposure triangle, on the top band. */
const specTriangle = (frame: MediaDoc) => {
  return [
    frame.shutter ?? '\u2014',
    frame.aperture != null ? `ƒ/${frame.aperture}` : 'ƒ/\u2014',
    frame.iso != null ? `ISO ${frame.iso}` : 'ISO \u2014',
  ].join(' \u00b7 ')
}

/** `Leica M6 · 50mm` — body and glass, on the bottom band. */
const specKit = (frame: MediaDoc) => {
  return [frame.camera ?? '\u2014', frame.lens ?? '\u2014'].join(' \u00b7 ')
}

/** Class the scrub sets while the pointer holds the film (see globals.css). */
const SCRUB_CLASS = 'film-strip__scroll--scrub'

type Props = FilmStripBlockProps & {
  className?: string
  disableInnerContainer?: boolean
}

export const FilmStrip: React.FC<Props> = (props) => {
  const { className, media, title } = props

  const frames = (Array.isArray(media) ? media : media ? [media] : []).filter(
    (frame) => typeof frame === 'object',
  ) as MediaDoc[]

  const scrollRef = useRef<HTMLDivElement | null>(null)

  /**
   * Grab-to-scrub (§3.2 "cursor drag: 1:1 smooth scrub with elastic
   * snap-to-frame"). While the pointer holds the film the `.film-strip__scroll`
   * release of `scroll-snap` (the `SCRUB_CLASS`) lets the rail track the hand
   * exactly, and on release the rail glides to the nearest gate and the class
   * comes off, handing the rail back to native snapping. A click — a grip
   * without travel — points: the frame the viewer pressed is the one the
   * settle glides into the gate. All of it lives in
   * refs — a grip writes `scrollLeft` straight to the node at pointer rate,
   * never through state — and mouse/pen only: touch pans and snaps natively.
   */
  useEffect(() => {
    const el = scrollRef.current

    if (!el) return

    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let pointerId: number | null = null
    let scrubbing = false
    /** Distinguishes a grip from a click: under 3px we never took the film. */
    let moved = false
    let startX = 0
    let startScroll = 0
    /** Release velocity in px/frame (scroll space, i.e. already negated). */
    let velocity = 0
    let lastX = 0
    let lastTime = 0
    /** Frame under the grip at `pointerdown` — a click pulls it to the gate. */
    let grippedFrame: Element | null = null

    const stopSpring = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    /** Take the scrub class off — `scroll-snap` resumes on its own terms. */
    const handBack = () => {
      el.classList.remove(SCRUB_CLASS)
    }

    /** The exact gate for a frame — scroll position that centers it. */
    const gateFor = (frame: HTMLElement) => {
      return frame.offsetLeft + frame.offsetWidth / 2 - el.clientWidth / 2
    }

    /** The nearest frame's gate — where a grip release settles. */
    const nearestGate = () => {
      let target: number | null = null
      let best = Infinity

      el.querySelectorAll<HTMLElement>('.film-strip__frame').forEach((frame) => {
        const position = gateFor(frame)
        const distance = Math.abs(position - el.scrollLeft)

        if (distance < best) {
          best = distance
          target = position
        }
      })

      return target
    }

    /**
     * Elastic settle (§3.2 "elastic snap-to-frame") — the closed-form time
     * response of one critically damped spring from release to gate: flick
     * inertia and the snap glide are the same motion, seeded with the
     * pointer's release velocity, so there is no seam between the hand
     * leaving the film and the frame parking in the gate. Driving the analytic
     * curve from a release timestamp (rather than accumulating a state
     * integrator per frame) makes the glide identical at any frame rate and
     * monotonic — a smooth slow-in, never overshooting a frame. `ω` sets the
     * pace (~0.7s per snap). A click (grip without travel) passes its own
     * frame's gate — the negative the viewer pointed at is the one the spring
     * pulls into the gate. The reduced-motion guardrail bookmarks the frame
     * instead of gliding it.
     */
    const settle = (target: number | null = nearestGate()) => {
      const p0 = el.scrollLeft

      if (target == null || Math.abs(target - p0) < 1) {
        handBack()
        return
      }

      if (reducedMotion()) {
        el.scrollLeft = target
        handBack()
        return
      }

      const omega = 5.5 // critically damped: rest by ~0.7s, no overshoot
      const gap = target - p0
      // Seed with the release velocity (px/frame → px/s); a still hand
      // glides from a standstill.
      const v0 = Math.abs(velocity) > 2 ? velocity * 60 : 0
      const started = performance.now()

      /** Position and velocity of the damped response at time `t` seconds. */
      const response = (t: number) => {
        const decay = Math.exp(-omega * t)

        return {
          p: p0 + v0 * t * decay + gap * (1 - (1 + omega * t) * decay),
          v: v0 * (1 - omega * t) * decay + gap * omega * omega * t * decay,
        }
      }

      const tick = (now: number) => {
        const t = Math.min((now - started) / 1000, 1.8)
        const { p, v } = response(t)

        // Don't wind the curve up against the film's ends.
        const max = el.scrollWidth - el.clientWidth
        el.scrollLeft = Math.max(0, Math.min(p, max))

        // Inside the gate and slow enough to stop — park it exactly.
        if (Math.abs(target - p) < 0.75 && Math.abs(v) < 8) {
          el.scrollLeft = target
          handBack()
          return
        }

        // Sentry: converge on the gate however long the tail still is.
        if (t >= 1.8) {
          el.scrollTo({ behavior: 'auto', left: target })
          handBack()
          return
        }

        raf = requestAnimationFrame(tick)
      }

      raf = requestAnimationFrame(tick)
    }

    const onPointerDown = (e: PointerEvent) => {
      // Touch pans natively; only the mouse/pen hand needs the grip.
      if (e.pointerType === 'touch' || e.button !== 0) return

      // A new grip cancels any settle still playing.
      stopSpring()

      pointerId = e.pointerId
      scrubbing = true
      moved = false
      grippedFrame = e.target instanceof Element ? e.target.closest('.film-strip__frame') : null
      startX = e.clientX
      startScroll = el.scrollLeft
      lastX = e.clientX
      lastTime = e.timeStamp
      velocity = 0
      el.classList.add(SCRUB_CLASS)
      el.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!scrubbing || e.pointerId !== pointerId) return

      // 1:1 tracking, plus a low-passed velocity for the release flick.
      const dt = e.timeStamp - lastTime

      if (dt > 0) {
        velocity = 0.8 * velocity + 0.2 * (-(e.clientX - lastX) / dt) * (1000 / 60)
        lastX = e.clientX
        lastTime = e.timeStamp
      }

      const dx = e.clientX - startX

      if (!moved && Math.abs(dx) > 3) moved = true

      if (moved) {
        el.scrollLeft = startScroll - dx
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!scrubbing || e.pointerId !== pointerId) return

      scrubbing = false
      pointerId = null

      // A click without travel points at a negative — the spring pulls that
      // one into the gate; a grip release (or bare-film click) still settles
      // to the nearest.
      const clicked = !moved && grippedFrame instanceof HTMLElement ? grippedFrame : null
      settle(clicked ? gateFor(clicked) : undefined)
    }

    const onDragStart = (e: DragEvent) => {
      // The negatives are cargo-free: don't let the OS tow an `<img>` out of
      // the strip mid-scrub. (Backs up the `-webkit-user-drag: none` in CSS.)
      e.preventDefault()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('dragstart', onDragStart)

    return () => {
      stopSpring()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('dragstart', onDragStart)
      el.classList.remove(SCRUB_CLASS)
    }
  }, [])

  if (!frames.length) return null

  return (
    <div className={cn('w-full', className)}>
      {title && <p className="film-strip__title">{title}</p>}
      <div className="film-strip">
        <div className="film-strip__scroll" ref={scrollRef}>
          <div className="film-strip__rail">
            <span aria-hidden="true" className="film-strip__chevron-start">
              ◀
            </span>
            {frames.map((frame, index) => {
              return (
                <div className="film-strip__frame photo-plate" key={index}>
                  <span className="film-strip__spec film-strip__spec-top">
                    {specTriangle(frame)}
                  </span>
                  <div className="film-strip__plate">
                    <Media
                      fill
                      loading="lazy"
                      resource={frame}
                      size="(max-width: 48rem) 480px, (max-width: 64rem) 640px, (max-width: 80rem) 800px, 960px"
                      imgClassName={cn('film-strip__img', 'photo-plate__img')}
                    />
                  </div>
                  <span className="film-strip__spec film-strip__spec-bottom">
                    <span className="film-strip__tag">{frameTag(index)}</span>
                    {specKit(frame)}
                  </span>
                </div>
              )
            })}
            <span aria-hidden="true" className="film-strip__chevron-end">
              ▶
            </span>
          </div>
        </div>
        <div aria-hidden="true" className="film-strip__gate" />
      </div>
    </div>
  )
}
