import type {
  AlbumsBlock as AlbumsBlockProps,
  FolderInterface as AlbumDoc,
  Media as MediaDoc,
} from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { AlbumArchive } from '@/components/AlbumArchive'
import type { AlbumCardData } from '@/components/AlbumCard'
import { toKebabCase } from '@/utilities/toKebabCase'

/**
 * Albums grid + inline rolls — media folders as photo albums.
 *
 * The archive block's shape (`populateBy` collection / selection, `limit`,
 * curated order) applied to `payload-folders`, the folder collection Payload
 * generates for `folders: true` on the media collection (widened for reading +
 * given an album `slug`/`description` in `src/payload.config.ts`).
 *
 * Frame accounting: each album's count comes from `payload.count`, never from
 * a shared frame basket — one query with `folder: { in: ids }` returns a
 * single oldest-first window, so a hard `limit` truncates every album at once
 * and an album starved out of that window would silently disappear. Here the
 * count is the folder's truth (`totalDocs`); the paint window is per album and
 * bounded (`rollFrameLimit` frames, oldest first, matching the roll order).
 * The cover stays the first frame of that window, and an album whose true
 * count is 0 is not an exhibition, so it is skipped. The media `select` keeps
 * the query off `caption` richText and the eight rendered `sizes` — only what
 * the roll paints.
 *
 * Cards are §4.1 plates (`album-card` reuses the `photo-plate` chrome, hover
 * lift and `photo-plate__img` exposure zoom) laid out by `AlbumArchive` on the
 * archive's grid, each entering through the §4.3 emulsion develop via `Reveal`.
 * A plate links down the page to its roll (`album-<slug>` anchor); one roll
 * per album prints below the grid, in grid order.
 */

/** Frames painted per roll — a window, not the whole roll. */
const rollFrameLimit = 24

/**
 * Only the fields the roll paints: the image payload (`filename` — which the
 * built-in upload `url` field's afterRead hook needs to generate its path —
 * dimensions, mime, alt, `updatedAt` for the Media component's cache tag) plus
 * the five exposure fields and the order key. Keeps `caption` richText and the
 * eight rendered `sizes` out of every frame read.
 */
const frameSelect = {
  alt: true,
  url: true,
  filename: true,
  mimeType: true,
  width: true,
  height: true,
  updatedAt: true,
  // Roll order key and a required `Media` field — the roll is oldest-first.
  createdAt: true,
  shutter: true,
  aperture: true,
  iso: true,
  camera: true,
  lens: true,
} as const

/**
 * Block relationship fields arrive as `{ relationTo, value }` pairs, which the
 * generated types collapse to a bare `FolderInterface` for folder relations, so
 * both shapes are unwrapped here.
 */
const toAlbumDoc = (selection: unknown): AlbumDoc | null => {
  if (typeof selection !== 'object' || selection === null) return null

  const unwrapped = 'value' in selection ? (selection as { value: unknown }).value : selection

  return typeof unwrapped === 'object' && unwrapped !== null ? (unwrapped as AlbumDoc) : null
}

/** `album-<slug>` when the folder has one, else the name in kebab case. */
const albumAnchor = (album: AlbumDoc): string =>
  `album-${album.slug?.trim() || toKebabCase(album.name) || album.id}`

/** One plate + its painted window, exactly what the queries above yield. */
type AlbumCard = {
  album: AlbumDoc
  anchor: string
  cover: MediaDoc | null
  frames: number
  framesWindow: MediaDoc[]
}

type Props = AlbumsBlockProps & {
  id?: string
}

export const AlbumsBlock: React.FC<Props> = async (props) => {
  const { id, limit: limitFromProps, populateBy, selectedAlbums, sort, title } = props

  const payload = await getPayload({ config: configPromise })

  let albums: AlbumDoc[] = []

  if (populateBy === 'collection') {
    const fetchedAlbums = await payload.find({
      collection: 'payload-folders',
      depth: 0,
      limit: limitFromProps || 10,
      // Anonymous-safe: folder reading is widened to `anyone` for albums, so the
      // access rule (not an override) decides what renders.
      overrideAccess: false,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
      sort: sort || undefined,
    })

    albums = fetchedAlbums.docs as AlbumDoc[]
  } else if (selectedAlbums?.length) {
    albums = selectedAlbums.map(toAlbumDoc).filter(Boolean) as AlbumDoc[]
  }

  // A folder curated twice would print two plates sharing one anchor id; keep
  // the first occurrence only.
  albums = albums.filter((album, index) => index === albums.findIndex((a) => a.id === album.id))

  if (!albums.length) return null

  const albumCards: AlbumCardData[] = (
    await Promise.all(
      albums.map(async (album) => {
        const [counted, painted] = await Promise.all([
          payload.count({
            collection: 'media',
            // `media` reads are public; the folder id is the album key.
            overrideAccess: false,
            where: {
              folder: {
                equals: album.id,
              },
            },
          }),
          payload.find({
            collection: 'media',
            depth: 0,
            limit: rollFrameLimit,
            // At depth 0 the folder stays an id, which is the album key we
            // filter on, and `select` narrows the row to the painted fields.
            overrideAccess: false,
            select: frameSelect,
            sort: 'createdAt',
            where: {
              folder: {
                equals: album.id,
              },
            },
          }),
        ])

        // An empty folder is not an exhibition.
        if (!counted.totalDocs) return null

        return {
          album,
          anchor: albumAnchor(album),
          cover: painted.docs.length > 0 ? painted.docs[0] : null,
          frames: counted.totalDocs,
          framesWindow: painted.docs,
        }
      }),
    )
  ).filter((card): card is AlbumCard => card !== null)

  if (!albumCards.length) return null

  return (
    <div className="my-16" id={`block-${id}`}>
      {title && <p className="albums-grid__title">{title}</p>}
      <AlbumArchive albums={albumCards} />
    </div>
  )
}
