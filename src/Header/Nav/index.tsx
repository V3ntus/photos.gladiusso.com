'use client'

import { SearchIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useLayoutEffect, useRef, useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

type NavItem = NonNullable<HeaderType['navItems']>[number]

interface Row {
  key: string
  href: string
  label: string
  /** 1-based frame tag; -1 = home (unnumbered), -2 = search (icon, unnumbered). */
  number: number
  active: boolean
  newTab?: boolean | null
  /** Renders a search icon in the frame-tag slot. */
  search?: boolean
}

/**
 * Resolve a CMS link (Header nav item) to an href, mirroring `CMSLink`.
 * Reference links resolve from their related page/post slug; custom links
 * use their `url`. Anything without a resolvable target falls back home.
 */
const hrefOf = (link: NavItem['link']): string => {
  const { type, reference, url } = link
  if (type === 'reference' && reference) {
    const { relationTo, value } = reference
    const slug =
      typeof value === 'object' && value !== null && 'slug' in value ? (value as { slug: string }).slug : undefined
    if (slug) {
      return relationTo === 'pages' ? `/${slug}` : `/${relationTo}/${slug}`
    }
  }
  return typeof url === 'string' && url ? url : '/'
}

/**
 * Left-rail navigation (DESIGN.md §2.1).
 *
 * An unnumbered "Home" row always leads the rail (active only on the home
 * route). CMS `navItems` follow it top-to-bottom, each tagged with a §4.1
 * "frame tag" number (`01`…`0n`), and an icon-only "Search" row is pinned
 * at the bottom.
 *
 * The active row is tracked from the pathname; the "active gold bullet +
 * yellow highlight bar" (`.nav-indicator`) is driven with a Y-only transform
 * on the §2.1 `transform 380ms cubic-bezier(0.25, 1, 0.5, 1)` easing while
 * labels/numbers cross-fade their color over 240ms. All motion is
 * transform/opacity only, so the §5 prefers-reduced-motion guardrail in
 * `globals.css` disables it for free.
 */
export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const pathname = usePathname()

  const items = data?.navItems || []
  const hrefs = items.map(({ link }) => hrefOf(link))
  const onSearch = pathname === '/search'
  const activeCms = hrefs.findIndex((href) => {
    return Boolean(href) && href !== '/' && (pathname === href || pathname.startsWith(`${href}/`))
  })
  // "Home" is the synthetic entry, active only on the home route itself.
  const isHome = pathname === '/'

  const rows: Row[] = [
    // Home always leads the rail; it's active only on the home route.
    { key: 'home', href: '/', label: 'Home', number: 0, active: isHome },
    ...items.map(({ link }, i) => ({
      key: `item-${i}`,
      href: hrefs[i],
      label: link.label,
      number: i + 1, // 1-based frame tag → 01, 02, …
      active: i === activeCms,
      newTab: link.newTab,
    })),
    // Search is pinned at the bottom (icon-only in compact widths).
    { key: 'search', href: '/search', label: 'Search', number: -2, active: onSearch, search: true },
  ]
  const searchIndex = rows.length - 1
  // Index of the active row within `rows`, or -1 when nothing is active.
  const activeRow = onSearch ? searchIndex : isHome ? 0 : activeCms >= 0 ? activeCms + 1 : -1
  const showIndicator = activeRow >= 0

  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const [offset, setOffset] = useState(0)

  // Center the fixed-height indicator over the active row using only a
  // Y-transform (indicator height 2rem → half is 16px).
  useLayoutEffect(() => {
    const row = itemRefs.current[activeRow]
    if (!row) {
      setOffset(0)
      return
    }
    setOffset(row.offsetTop + row.offsetHeight / 2 - 16)
  }, [activeRow, rows.length])

  return (
    <nav aria-label="Primary" className="dr-nav">
      {/* .nav-indicator sits above content via z-index (10) while .nav-item
          stays clickable (1). It scrolls with .dr-nav. */}
      <div
        aria-hidden
        className="nav-indicator"
        style={{
          transform: `translateY(${offset}px)`,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <span className="nav-indicator__bar" />
        <span className="nav-indicator__bullet" />
      </div>

      {rows.map((row, i) => (
        <Link
          key={row.key}
          ref={(el) => {
            itemRefs.current[i] = el
          }}
          href={row.href}
          target={row.newTab ? '_blank' : undefined}
          rel={row.newTab ? 'noopener noreferrer' : undefined}
          aria-current={row.active ? 'page' : undefined}
          className="nav-item"
          data-active={row.active}
        >
          {row.search ? (
            <span className="nav-item__num">
              <SearchIcon className="size-4" aria-hidden />
            </span>
          ) : (
            <span className="nav-item__num">
              {row.number >= 0 ? String(row.number).padStart(2, '0') : ''}
            </span>
          )}
          <span className={row.search ? 'nav-item__label nav-item__search' : 'nav-item__label'}>
            // {row.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
