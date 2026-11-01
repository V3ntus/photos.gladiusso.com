import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import type { FolderInterface as AlbumDoc, Media as MediaDoc } from '@/payload-types'

import { AlbumBackLink } from '@/components/AlbumBackLink'
import { AlbumRoll, RollFrame } from '@/components/AlbumRoll'
import { AlbumScrollCue } from '@/components/AlbumScrollCue'
import PageClient from './page.client'

/**
 * Album subpage — one folder printed in full (/albums/<slug>).
 *
 * The archive's plate routes here; the whole roll paints §4.3 editorial style
 * (single column, oldest first) and every frame throws onto the §4.2 loupe.
 * Pages render on demand and re-generate with the default `dynamicParams`
 * semantics, so newly created albums (and freshly added frames) get picked up
 * per request — media has no revalidate hook of its own to do it for us,
 * and no per-request freshness is lost that matters for an album print.
 */

/**
 * Every field the roll/loupe paint, mirroring the archive block's `select`:
 * the image payload plus the five exposure fields, with `caption` richText
 * and the eight rendered `sizes` left out of every frame read.
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
 * Every album. Its slug is the route key and nothing else is needed here.
 */
export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })

  const albums = await payload.find({
    collection: 'payload-folders',
    draft: false,
    limit: 1000,
    // Anonymous-safe: folder reading is widened to `anyone` for albums, so the
    // access rule (not an override) decides what renders.
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return albums.docs
    .filter((album) => Boolean(album.slug))
    .map(({ slug }) => ({ slug: String(slug) }))
}

const queryAlbumBySlug = async ({
  payload,
  slug,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  slug: string
}): Promise<AlbumDoc | null> => {
  const result = await payload.find({
    collection: 'payload-folders',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      updatedAt: true,
      createdAt: true,
    },
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return (result.docs?.[0] as AlbumDoc | undefined) || null
}

/**
 * Every frame on the roll — the full negative, not a bounded window. Oldest
 * first to match the ordered contact sheet.
 */
const queryRolls = async ({
  payload,
  albumId,
}: {
  payload: Awaited<ReturnType<typeof getPayload>>
  albumId: number
}): Promise<MediaDoc[]> => {
  const painted = await payload.find({
    collection: 'media',
    depth: 0,
    // No pagination: the full album prints on one page (images lazy-load).
    limit: 0,
    overrideAccess: false,
    select: frameSelect,
    sort: 'createdAt',
    where: {
      folder: {
        equals: albumId,
      },
    },
  })

  return painted.docs as MediaDoc[]
}

const buildFrame = (frame: MediaDoc): RollFrame => ({
  id: frame.id,
  alt: frame.alt,
  filename: frame.filename,
  mimeType: frame.mimeType,
  url: frame.url,
  width: Number(frame.width),
  height: Number(frame.height),
  updatedAt: frame.updatedAt,
  shutter: frame.shutter,
  aperture: frame.aperture,
  iso: frame.iso,
  camera: frame.camera,
  lens: frame.lens,
})

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Album({ params: paramsPromise }: Args) {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const payload = await getPayload({ config: configPromise })

  const album = await queryAlbumBySlug({ payload, slug: decodedSlug })

  if (!album) notFound()

  const painted = await queryRolls({ payload, albumId: album.id })
  const frames = painted.map(buildFrame)
  const countLabel =
    frames.length === 1 ? '1 frame · oldest first' : `${frames.length} frames · oldest first`

  return (
    <article className="album-page pt-4 pb-24">
      <PageClient />

      <header className="album-page__header container min-h-[87dvh] flex flex-col items-center justify-between">
        <AlbumBackLink className="album-page__back" />
        <span>
          {album.name && <h1 className="album-page__title">{album.name}</h1>}
          <p className="album-page__meta">{countLabel}</p>
          {album.description && <p className="album-page__intro">{album.description}</p>}
        </span>
        <div>
          {/* Scroll cue down to the first frame; nothing to scroll to without one. */}
          {frames.length > 0 && <AlbumScrollCue />}
        </div>
      </header>

      <AlbumRoll
        doc={{ name: album.name || 'Album', description: album.description, frames }}
        priority
      />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const decodedSlug = decodeURIComponent(slug)
  const payload = await getPayload({ config: configPromise })
  const album = await queryAlbumBySlug({ payload, slug: decodedSlug })

  const title = album?.name
  const description = album?.description ?? undefined

  return {
    title: title ? `${title}` : 'Album',
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}
