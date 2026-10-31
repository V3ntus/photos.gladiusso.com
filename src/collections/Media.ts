import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  folders: true,
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      name: 'shutter',
      type: 'text',
      label: 'Shutter',
      admin: {
        description: 'Shutter speed as exposed, e.g. 1/125 or 1"',
      },
    },
    {
      name: 'aperture',
      type: 'text',
      label: 'Aperture',
      admin: {
        description: 'f-number without the stroke, e.g. 2.8 (rendered as ƒ/2.8)',
      },
    },
    {
      name: 'iso',
      type: 'number',
      label: 'ISO',
      admin: {
        description: 'Film speed as exposed, e.g. 400',
      },
    },
    {
      name: 'camera',
      type: 'text',
      label: 'Camera',
      admin: {
        description: 'Body, e.g. Leica M6',
      },
    },
    {
      name: 'lens',
      type: 'text',
      label: 'Lens',
      admin: {
        description: 'Glass, e.g. 50mm Summit',
      },
    },
  ],
  upload: {
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
