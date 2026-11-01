import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'

import { anyone } from './access/anyone'
import { authenticated } from './access/authenticated'
import { slugField } from 'payload'

import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  collections: [Pages, Posts, Media, Categories, Users],
  // Media folders double as photo albums, so the hidden `payload-folders`
  // collection Payload builds for `folders: true` in src/collections/Media.ts
  // is widened here: `read: anyone` lets the albums grid render for anonymous
  // visitors (folder docs default to logged-in-only access), the `slug` is
  // auto-generated from the folder `name` so an album has a stable URL, and
  // `description` carries the darkroom note printed under the cover. `debug`
  // un-hides the collection in /admin, which is what makes that copy editable.
  folders: {
    debug: true,
    collectionOverrides: [
      ({ collection }) => ({
        ...collection,
        access: {
          create: authenticated,
          delete: authenticated,
          read: anyone,
          update: authenticated,
        },
        fields: [
          ...collection.fields,
          slugField({
            position: 'sidebar',
            required: false,
            useAsSlug: 'name',
          }),
          {
            name: 'description',
            type: 'textarea',
            label: 'Album Note',
            admin: {
              description: 'One or two lines shown beneath the album cover.',
              position: 'sidebar',
            },
          },
        ],
      }),
    ],
  },
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
