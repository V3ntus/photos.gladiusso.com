import { cn } from '@/utilities/ui'
import React from 'react'

import { AlbumCard, AlbumCardData } from '@/components/AlbumCard'
import { Reveal } from '@/components/motion/Reveal'

export type Props = {
  albums: AlbumCardData[]
}

/**
 * Album archive — one §4.1 plate per folder on the archive grid. A plate
 * routes to the album's own subpage (`/albums/<slug>`), where the full roll
 * prints (§4.3); nothing roll-related lives in the archive document itself.
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
    </div>
  )
}
