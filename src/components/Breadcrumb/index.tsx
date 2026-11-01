'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

/**
 * Current-page crumb for the header bar (see the (frontend) layout): it rides
 * right after the brand label, so the rail reads `SELECTED WORKS // Albums` on
 * `/albums` and `SELECTED WORKS // Posts // Packard 014` on a story. Slugs are
 * the source of the names — hyphens read as spaces and `uppercase` keeps them
 * in the same mono chrome as the hand-set labels. The home route has no crumbs,
 * so nothing renders and the brand stands alone; the ` // ` divider rides along
 * with the crumb for the same reason.
 */
export const Breadcrumb: React.FC = () => {
  const crumb = usePathname()
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replaceAll('-', ' '))
    .join(' / ')

  if (!crumb) return null

  return (
    <span className="uppercase">
      {' // '}
      {crumb}
    </span>
  )
}
