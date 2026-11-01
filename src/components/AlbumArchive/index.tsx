import { cn } from '@/utilities/ui'
import React from 'react'

import { AlbumCard, AlbumCardData } from '@/components/AlbumCard'
import { AlbumRoll } from '@/components/AlbumRoll'
import { Reveal } from '@/components/motion/Reveal'

export type Props = {
  albums: AlbumCardData[]
}

/**
 * Album archive — one §4.1 plate per folder on the archive grid, followed by
 * every album's roll printed in grid order below it. A plate's `album-<slug>`
 * anchor links straight down to its roll; rolls are always in the document,
 * so the jump lands on content that is already there (and develops in through
 * the roll's own `Reveal` on first entry).
 */
export const AlbumArchive: React.FC<Props> = ({ albums }) => {
  return (
    <div className={cn('container')}>
      <div>
        <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-y-4 gap-x-4 lg:gap-y-8 lg:gap-x-8 xl:gap-x-8">
          {albums?.map((result, index) => {
            if (typeof result === 'object' && result !== null) {
              return (
                <Reveal as="div" className="col-span-4" key={result.album?.id ?? index}>
                  <AlbumCard className="h-full" doc={result} />
                </Reveal>
              )
            }

            return null
          })}
        </div>
      </div>

      {albums && albums.length > 0 && (
        <div className="album-rolls">
          {albums.map((roll, index) => (
            <AlbumRoll key={roll.album?.id ?? index} doc={roll} priority={index === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
