import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'A curated collection of photographic essays; captures of ordinary life around us, celebrating The Author.',
  images: [
    {
      url: `${getServerSideURL()}/header.png`,
    },
  ],
  siteName: "Joe & Danielle's Photo Journal",
  title: "Joe & Danielle's Photo Journal",
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
