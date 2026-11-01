import { cn } from '@/utilities/ui'
import React from 'react'

import type { FolderInterface as AlbumDoc, Media as MediaDoc } from '@/payload-types'

import { Media } from '@/components/Media'
import { Reveal } from '@/components/motion/Reveal'

export type AlbumRollData = {
  album?: AlbumDoc
  /** `album-<slug>` id the plate above links to. */
  anchor?: string
  /** True frame count of the album. */
  frames?: number | null
  /** Bounded paint window, oldest first. */
  framesWindow?: MediaDoc[] | null
}

/** Widths hint answering the roll gate width in `globals.css`. */
const rollImageSize = '(max-width: 64rem) 100vw, 56rem'

/**
 * Exposure band under one frame — the grease-pencil line listing shutter,
 * aperture (stored without the stroke, painted `ƒ/2.8`), film speed, body and
 * glass. Present fields only; an unrecorded exposure paints no band.
 */
const exposureBand = (frame: MediaDoc): string => {
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
 * scroll), the frames stacked under the grid the plates link down to. The
 * whole roll is one `Reveal` block (one observer per roll, not per frame), the
 * roll window may be shorter than the album when frames past it weren't
 * painted (`NN of MM frames`), and every frame carries the §4.1 `photo-plate`
 * chrome with the lip left off — nothing to click here, only plate hover.
 */
export const AlbumRoll: React.FC<{
  className?: string
  doc: AlbumRollData
  /** First roll's lead frame is above the fold's LCP candidate: fetch eagerly. */
  priority?: boolean
}> = ({ className, doc, priority = false }) => {
  const { album, anchor, frames, framesWindow } = doc
  const { name } = album || {}

  if (!name || !anchor) return null

  const painted = framesWindow?.length ?? 0
  const total = frames ?? painted

  const countLabel =
    total > painted ? `${painted} of ${total} frames` : total === 1 ? '1 frame' : `${total} frames`

  return (
    <section className={cn('album-roll', className)} id={anchor}>
      <Reveal className="album-roll__gate">
        <header className="album-roll__header">
          <h2 className="album-roll__name">{name}</h2>
          <p className="album-roll__count">{countLabel}</p>
        </header>
        {framesWindow && painted > 0
          ? framesWindow.map((frame, index) => {
              const exposure = exposureBand(frame)
              const eager = priority && index === 0

              return (
                <figure className="album-roll__frame photo-plate" key={frame.id}>
                  <Media
                    // Sizing lives on `.album-roll__img` — the easel cap in
                    // globals.css owns width/height so portrait frames fit.
                    imgClassName="photo-plate__img album-roll__img"
                    loading={eager ? undefined : 'lazy'}
                    priority={eager}
                    resource={frame}
                    size={rollImageSize}
                  />
                  {exposure && <figcaption className="album-roll__exif">{exposure}</figcaption>}
                </figure>
              )
            })
          : null}
      </Reveal>
    </section>
  )
}
