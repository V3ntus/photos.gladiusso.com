import type { Block } from 'payload'

export const FilmStrip: Block = {
  slug: 'filmStrip',
  interfaceName: 'FilmStripBlock',
  labels: {
    plural: 'Film Strips',
    singular: 'Film Strip',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Strip Title',
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      required: true,
      label: 'Selected Media',
    },
  ],
}
