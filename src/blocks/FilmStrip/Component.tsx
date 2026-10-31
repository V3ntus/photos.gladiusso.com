import type { FilmStripBlock as FilmStripBlockProps, Media as MediaDoc } from '@/payload-types'

import { cn } from '@/utilities/ui'
import React from 'react'

import { Media } from '../../components/Media'

/**
 * Continuous film strip — featured negative rail (DESIGN.md §3.2).
 *
 * The selected negatives sit on an obsidian strip whose sprocket bands are
 * part of the film, so scrubbing pans frames and sprockets together. The
 * strip is a horizontal scrub viewport: cursor drag, wheel or touch pan
 * slides it 1:1 with `scroll-snap` settling each frame into view. Frames are
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

type Props = FilmStripBlockProps & {
  className?: string
  disableInnerContainer?: boolean
}

export const FilmStrip: React.FC<Props> = (props) => {
  const { className, media, title } = props

  const frames = (Array.isArray(media) ? media : media ? [media] : []).filter(
    (frame) => typeof frame === 'object',
  ) as MediaDoc[]

  if (!frames.length) return null

  return (
    <div className={cn('w-full', className)}>
      {title && <p className="film-strip__title">{title}</p>}
      <div className="film-strip">
        <div className="film-strip__scroll">
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
