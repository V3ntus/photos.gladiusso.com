'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React from 'react'

import type { FolderInterface as AlbumDoc, Media as MediaDoc } from '@/payload-types'

import { Media } from '@/components/Media'

export type AlbumCardData = {
  album?: AlbumDoc
  /** Route to the album's subpage; derived from the slug when not given. */
  href?: string
  cover?: MediaDoc | null
  frames?: number | null
}

/**
 * Album plate — one folder of negatives, dressed like the archive's §4.1 plate
 * (`photo-plate` chrome + hover lift, `photo-plate__img` exposure zoom). The
 * lead frame fills the gate, the album name sets under it, and the frame
 * count rides the grease-pencil band (`NN FRAMES`) that glints tungsten while
 * the plate is hovered, echoing the film strip's frame tag (§3.2). The plate
 * routes to the album's own subpage via `useClickableCard` + `Link`, as the
 * post card links to its route; the full roll prints there.
 */
export const AlbumCard: React.FC<{
  className?: string
  doc?: AlbumCardData
}> = (props) => {
  const { className, doc } = props
  const { card, link } = useClickableCard<HTMLElement>({})

  if (!doc) return null

  const { album, href, cover, frames } = doc
  const { name, description, slug } = album || {}
  const to = href ?? (slug ? `/albums/${slug}` : undefined)

  return (
    <article className={cn('photo-plate', className)} ref={card.ref}>
      <div className="relative w-full">
        {!cover && <div className="">No cover</div>}
        {cover && (
          <Media
            fill
            loading="lazy"
            resource={cover}
            size="(max-width: 48rem) 300px, (max-width: 64rem) 400px, 500px"
            imgClassName={cn('photo-plate__img', 'w-full h-full object-cover')}
          />
        )}
      </div>
      <div className="p-4">
        {name &&
          (to ? (
            <div className="prose">
              <h3>
                <Link className="not-prose" href={to} ref={link.ref}>
                  {name}
                </Link>
              </h3>
            </div>
          ) : (
            <div className="prose">
              <h3>{name}</h3>
            </div>
          ))}
        {frames != null && (
          <div className="mt-2 album-card__frames">
            {frames} {frames === 1 ? 'frame' : 'frames'}
          </div>
        )}
        {description && <p className="mt-2 album-card__note">{description}</p>}
      </div>
    </article>
  )
}
