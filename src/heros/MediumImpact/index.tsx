import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

export const MediumImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const hasMedia = media && typeof media === 'object'

  return (
    <div className="container mb-8">
      <div className="relative -mx-4 text-white md:-mx-8 2xl:-mx-16" data-theme="dark">
        {hasMedia ? (
          <>
            <Media
              imgClassName="w-full object-cover md:max-h-[70vh]"
              priority
              resource={media}
              videoClassName="w-full object-cover md:max-h-[70vh]"
            />
            {/* Darkroom scrim keeps the overlaid copy legible on the emulsion (md+) */}
            <div
              className="hero-scrim pointer-events-none absolute inset-0 hidden md:block"
              aria-hidden
            />
          </>
        ) : (
          /* Nothing in the gate — fall back to the tungsten obsidian gradient */
          <div className="hero-media-fallback aspect-[16/9] w-full md:max-h-[70vh]" aria-hidden />
        )}
        {/* Copy overlays the print from md up; stacks below the film on mobile.
            Padding mirrors the bleed, so it stays aligned to the container in
            both modes; the obsidian band keeps white type readable on
            light-themed pages. */}
        <div className="relative z-10 bg-[var(--obsidian)] px-4 py-6 md:absolute md:inset-x-0 md:bottom-0 md:bg-transparent md:px-8 md:pb-10 md:pt-24 2xl:px-16">
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

      {media && typeof media === 'object' && media?.caption && (
        <div className="mt-3">
          <RichText data={media.caption} enableGutter={false} />
        </div>
      )}
      {/*<hr />*/}
    </div>
  )
}
