'use client'
import { cn } from '@/utilities/ui'
import NextImage from 'next/image'
import React, { useCallback, useState } from 'react'

import type { Media as MediaDoc } from '@/payload-types'

import { getMediaUrl } from '@/utilities/getMediaUrl'
import { placeholderBlur } from '@/components/Media/ImageMedia'
import { Reveal } from '@/components/motion/Reveal'
import { Loupe } from '@/components/Loupe'

/**
 * Roll frame — the serializable slice of a media doc the roll and loupe paint:
 * the image payload (`filename`, which the built-in upload `url` field's
 * afterRead hook needs to generate its path, dimensions, mime, alt, `updatedAt`
 * cache tag) plus the five exposure fields. Full albums are long, so the
 * subpage maps every frame down to exactly this and nothing more.
 */
export type RollFrame = Pick<
  MediaDoc,
  'id' | 'alt' | 'filename' | 'mimeType' | 'url' | 'width' | 'height' | 'updatedAt'
> & {
  shutter?: string | null
  /** Stored without the stroke — painted as `ƒ/2.8`. */
  aperture?: string | null
  iso?: number | null
  camera?: string | null
  lens?: string | null
}

export type AlbumRollData = {
  name?: string | null
  description?: string | null
  frames?: RollFrame[] | null
}

/** Widths to answer at — the roll gate is capped at 56rem in globals.css. */
const rollImageSize = '(max-width: 64rem) 100vw, 56rem'

/**
 * Exposure band under one frame — the grease-pencil line listing shutter,
 * aperture (stored without the stroke, painted `ƒ/2.8`), film speed, body and
 * glass. Present fields only; an unrecorded exposure paints no band.
 */
const exposureBand = (frame: RollFrame): string => {
  const parts: string[] = []

  if (frame.shutter) parts.push(frame.shutter)
  if (frame.aperture) parts.push(`ƒ/${frame.aperture}`)
  if (frame.iso) parts.push(`ISO ${frame.iso}`)
  if (frame.camera) parts.push(frame.camera)
  if (frame.lens) parts.push(frame.lens)

  return parts.join(' · ')
}

/**
 * Album roll — one folder printed full size in a single column (§4.3 editorial
 * scroll) on the album's subpage. Each frame is the §4.1 `photo-plate` chrome
 * (hover lift + exposure zoom), now clickable: a pointer down on a frame
 * throws it onto the §4.2 loupe — the full-resolution negative enlarged under
 * a brass magnifier. Nothing to link here; the loupe owns the click.
 */
export const AlbumRoll: React.FC<{
  className?: string
  doc: AlbumRollData
  /** Lead frame is above the fold's LCP candidate: fetch eagerly. */
  priority?: boolean
}> = ({ className, doc, priority = false }) => {
  const { frames, name } = doc
  const [loupeIndex, setLoupeIndex] = useState<number | null>(null)

  const openLoupe = useCallback((index: number) => setLoupeIndex(index), [])
  const closeLoupe = useCallback(() => setLoupeIndex(null), [])

  if (!name || !frames || frames.length === 0) return null

  return (
    <React.Fragment>
      <section className={cn('album-roll', className)} id="album-roll" aria-label={name}>
        <Reveal className="album-roll__gate">
          {frames.map((frame, index) => {
            const exposure = exposureBand(frame)
            const eager = priority && index === 0

            return (
              <figure className="album-roll__frame photo-plate" key={frame.id}>
                <button
                  aria-label={`Enlarge frame: ${frame.alt || `frame ${index + 1}`}`}
                  className="album-roll__open"
                  onClick={() => openLoupe(index)}
                  type="button"
                >
                  <NextImage
                    // Sizing lives on `.album-roll__img` — the easel cap in
                    // globals.css owns width/height so portrait frames fit.
                    alt={frame.alt || ''}
                    className="album-roll__img"
                    height={frame.height ?? undefined}
                    loading={eager ? undefined : 'lazy'}
                    placeholder="blur"
                    blurDataURL={placeholderBlur}
                    priority={eager}
                    quality={100}
                    sizes={rollImageSize}
                    src={getMediaUrl(frame.url, frame.updatedAt)}
                    width={frame.width ?? undefined}
                  />
                </button>
                {exposure && <figcaption className="album-roll__exif">{exposure}</figcaption>}
              </figure>
            )
          })}
        </Reveal>
      </section>

      {loupeIndex !== null && <Loupe close={closeLoupe} frames={frames} start={loupeIndex} />}
    </React.Fragment>
  )
}
