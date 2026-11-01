'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme('dark')
  })

  const hasMedia = media && typeof media === 'object'

  return (
    <div
      className="relative text-white md:flex md:min-h-[70vh] md:max-h-[54rem] md:items-center md:justify-center"
      data-theme="dark"
    >
      <div className="relative min-h-[60vh] md:absolute md:inset-0">
        {hasMedia ? (
          <>
            <Media
              fill
              imgClassName="pointer-events-none select-none object-cover"
              priority
              resource={media}
              videoClassName="h-full w-full object-cover"
            />
            {/* Darkroom scrim keeps the overlaid copy legible on the emulsion (md+) */}
            <div
              className="hero-scrim pointer-events-none absolute inset-0 hidden md:block"
              aria-hidden
            />
          </>
        ) : (
          /* Nothing in the gate — fall back to the tungsten obsidian gradient */
          <div className="hero-media-fallback pointer-events-none absolute inset-0" aria-hidden />
        )}
      </div>
      {/* Copy overlays the print from md up; stacks below the film on mobile.
          The obsidian band keeps white type readable on light-themed pages. */}
      <div className="container relative z-10 bg-[var(--obsidian)] py-8 mt-32 md:mb-8 md:bg-transparent md:py-0">
        <div className="max-w-[36.5rem]">
          {richText && <RichText className="mb-6" data={richText} enableGutter={false} />}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="flex gap-4">
              {links.map(({ link }, i) => {
                return (
                  <li key={i}>
                    <CMSLink {...link} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
