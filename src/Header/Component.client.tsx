'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  data: Header
}

/**
 * Left navigation rail (DESIGN.md §2.1).
 *
 * The top bar is now a fixed left sidebar: brand on top, the numbered CMS
 * nav in the middle (with the sliding gold bullet + amber highlight bar),
 * and a small theme control at the bottom. The main column is offset to
 * the right by the body's flex row (see the (frontend) layout).
 *
 * Styling lives in `.dr-sidebar` / `.nav-item` / `.nav-indicator` in
 * `globals.css` so the §2.1 indicator easing and §4.1 frame-tag glint can
 * reuse the motion/palette tokens and the §5 reduced-motion guardrail.
 */
export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  return (
    <aside className="dr-sidebar" {...(theme ? { 'data-theme': theme } : {})}>
      <Link href="/" className="dr-sidebar__brand" aria-label="Home">
        <Logo
          loading="eager"
          priority="high"
          variant="square_alt"
          className="invert dark:invert-0"
        />
      </Link>

      <hr />

      <span className="nav-item invisible md:visible">INDEX // CATALOG</span>

      <HeaderNav data={data} />

      {/*<div className="dr-footer">*/}
      {/*  <ThemeSelector />*/}
      {/*</div>*/}
    </aside>
  )
}
