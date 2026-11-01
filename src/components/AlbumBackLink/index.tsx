'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'

/**
 * "← All albums" — steps back through the app's own history when the plate
 * was clicked from an album archive (Next.js stamps an `idx` on its history
 * entries); a direct hit on the URL falls back to the archive's usual home.
 */
export const AlbumBackLink: React.FC<{
  className?: string
}> = ({ className }) => {
  const router = useRouter()

  const goBack = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Next.js' internal history state indexes browser entries; without one we
    // are a cold load and "where the plate was clicked from" doesn't exist.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0

    if (historyIndex > 0) {
      e.preventDefault()
      router.back()
    }
  }

  return (
    <Link className={className} href="/" onClick={goBack}>
      ← All albums
    </Link>
  )
}
