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

/**
 * Albums grid — media folders as photo albums.
 *
 * The archive block's shape (`populateBy` collection / selection, `limit`,
 * curated order) applied to `payload-folders`, the folder collection Payload
 * generates for `folders: true` on the media collection (widened for reading +
 * given an album `slug`/`description` in `src/payload.config.ts`).
 *
 * Frame accounting: each album's count comes from `payload.count`, never from
 * a shared frame basket — one query with `folder: { in: ids }` returns a
 * single window, so a hard `limit` truncates every album at once and an album
 * starved out of that window would silently disappear. Here the count is the
 * folder's truth (`totalDocs`); the cover is the album's single oldest frame
 * (the roll's lead frame is the archive plate's photo). An album whose true
 * count is 0 is not an exhibition, so it is skipped. The media `select` keeps
 * the query off `caption` richText and the eight rendered `sizes` — the roll
 * on the album's own subpage (`/albums/<slug>`) paints the full roll there,
 * bounded to nothing.
 *
 * Cards are §4.1 plates (`album-card` reuses the `photo-plate` chrome, hover
 * lift and `photo-plate__img` exposure zoom) laid out by `AlbumArchive` on the
 * archive's grid, each entering through the §4.3 emulsion develop via `Reveal`.
 * A plate routes to the album subpage, where the full roll prints.
 */

/**
 * Only the fields the plate paints: the image payload (`filename` — which the
 * built-in upload `url` field's afterRead hook needs to generate its path —
 * dimensions, mime, alt, `updatedAt` for the Media component's cache tag).
 * Keeps `caption` richText and the eight rendered `sizes` out of every frame read.
 */
const frameSelect = {
  alt: true,
  url: true,
  filename: true,
  mimeType: true,
  width: true,
  height: true,
  updatedAt: true,
  createdAt: true,
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

/** One plate: the folder, its cover and its true count — what `AlbumArchive` renders. */
type AlbumCard = {
  album: AlbumDoc
  cover: MediaDoc | null
  frames: number
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
            // Only the cover: the album's single oldest frame, the same
            // frame the subpage's roll leads with.
            limit: 1,
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
          cover: painted.docs.length > 0 ? painted.docs[0] : null,
          frames: counted.totalDocs,
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
