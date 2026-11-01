import type { Block } from 'payload'

export const Albums: Block = {
  slug: 'albums',
  interfaceName: 'AlbumsBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Albums Title',
    },
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        {
          label: 'Collection',
          value: 'collection',
        },
        {
          label: 'Individual Selection',
          value: 'selection',
        },
      ],
    },
    {
      name: 'sort',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      defaultValue: '-createdAt',
      label: 'Sort Albums By',
      options: [
        {
          label: 'Name (A–Z)',
          value: 'name',
        },
        {
          label: 'Newest First',
          value: '-createdAt',
        },
        {
          label: 'Oldest First',
          value: 'createdAt',
        },
        {
          label: 'Recently Updated',
          value: '-updatedAt',
        },
      ],
    },
    {
      name: 'limit',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
        step: 1,
      },
      defaultValue: 10,
      label: 'Limit',
    },
    {
      name: 'selectedAlbums',
      type: 'relationship',
      relationTo: ['payload-folders'],
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'selection',
      },
      hasMany: true,
      label: 'Selection',
    },
  ],
  labels: {
    plural: 'Albums',
    singular: 'Albums Grid',
  },
}
