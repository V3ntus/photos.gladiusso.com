---
name: payload-cms
description: "Use when building with Payload CMS 3.x inside a Next.js app — payload.config.ts, collections and globals, fields, collection and field access control, hooks (beforeChange, afterChange, context to stop loops), the Local API with getPayload and overrideAccess, generated types, Postgres migrations, drafts, and the v4 beta changes."
license: MIT
---

# Payload CMS

Makes the agent build Payload 3.x the way it is meant to run today: installed inside a Next.js
app, configured in TypeScript, queried through the typed Local API, and secured with access
functions that actually run on every path that reads or writes data.

## When to Use This Skill
- Adding Payload to an existing Next.js App Router project, or scaffolding a new one
- Modelling collections, globals, relationships, uploads and localized fields
- Writing access control (who can read, create, update, delete) and field-level permissions
- Adding hooks: slugs, derived fields, revalidation, syncing to search or email
- Querying content from Server Components, route handlers or scripts with the Local API
- Running schema migrations for Postgres or SQLite before deploying

Standalone headless CMS: see `strapi`; hosted content with GROQ: see `sanity-cms`.

## Workflow
1. Check versions first: Payload 3.x needs Node 20.18.1+ and a supported Next.js release (the
   install docs list exact 15.x and 16.x ranges; not every patch works). Use pnpm or npm, not Yarn 1.
2. New project: `npx create-payload-app`. Existing app: install `payload`, `@payloadcms/next`,
   one adapter (`@payloadcms/db-postgres`, `@payloadcms/db-mongodb` or `@payloadcms/db-sqlite`),
   plus `@payloadcms/richtext-lexical` and `sharp` if you need rich text and image resizing.
3. Copy the `(payload)` route group from the blank template into `app/`, move your own pages into
   a separate group such as `app/(frontend)` with its own root layout, wrap `next.config.mjs` with
   `withPayload`, and add the `@payload-config` path alias in `tsconfig.json`.
4. Define collections in `src/collections/*.ts` and register them in `payload.config.ts`.
5. Run `pnpm payload generate:types` after every schema change and commit `payload-types.ts`.
6. Postgres/SQLite: develop with push mode, then `pnpm payload migrate:create <name>` when the
   feature is done; review the file; deploy with `payload migrate && next build`.

## Config and a Collection
```ts
// src/payload.config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import sharp from 'sharp';
import { Users } from './collections/Users';
import { Posts } from './collections/Posts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: { user: Users.slug },
  collections: [Users, Posts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET!,
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL! } }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  sharp,
});
```

```ts
// src/collections/Posts.ts
import type { Access, CollectionConfig, FieldAccess } from 'payload';

const admin = (user: any) => Boolean(user?.roles?.includes('admin'));
const isAdmin: Access = ({ req: { user } }) => admin(user);
const isAdminField: FieldAccess = ({ req: { user } }) => admin(user);

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', '_status', 'updatedAt'] },
  versions: { drafts: true },
  access: {
    read: ({ req: { user } }) => (user ? true : { _status: { equals: 'published' } }), // Where query
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => (!user ? false : admin(user) || { author: { equals: user.id } }),
    delete: isAdmin,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'author', type: 'relationship', relationTo: 'users', required: true },
    { name: 'content', type: 'richText' },
    { name: 'readingTime', type: 'number', admin: { readOnly: true } },
    {
      name: 'internalNotes', type: 'textarea',
      access: { read: isAdminField, update: isAdminField }, // field access: boolean only
    },
  ],
  hooks: {
    beforeChange: [({ data, operation }) => {
      if (operation === 'create' && data.title && !data.slug) {
        data.slug = data.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return data;
    }],
  },
};
```

## Access Control
- Collection `read`, `update` and `delete` may return `true`, `false` or a Where query; the query
  is merged into every find, so it filters lists as well as single documents.
- `create` gets `data`; `update` gets `id` and `data`; auth collections add `admin`/`unlock`.
- Field-level `access.read/create/update` return booleans; a denied read strips the field.
- Access runs for REST, GraphQL and the admin panel. In Payload 3 the Local API skips it by
  default (`overrideAccess` defaults to `true`). Payload v4 (beta in October 2026) flips that
  default to `false`, so pass the option explicitly now and the upgrade will not change behaviour.

## Local API
```ts
// app/(frontend)/posts/page.tsx — a Server Component
import { getPayload } from 'payload';
import config from '@payload-config';
import { headers as getHeaders } from 'next/headers';

export default async function PostsPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await getHeaders() });

  const posts = await payload.find({
    collection: 'posts',
    where: { _status: { equals: 'published' } },
    sort: '-createdAt',
    limit: 20,
    depth: 1,                      // populate author one level
    select: { title: true, slug: true, author: true },
    overrideAccess: false,         // enforce the read rule for this user
    user,
  });
  return <ul>{posts.docs.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```
Other calls: `findByID`, `create`, `update` (by `id` or `where`), `delete`, `count`, `findGlobal`,
`updateGlobal`. Inside hooks and access functions use `req.payload`, never a new instance.

## Hooks Without Loops or Broken Transactions
```ts
import type { CollectionAfterChangeHook } from 'payload';
import { revalidatePath } from 'next/cache';

export const syncReadingTime: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context.skipReadingTime) return doc;                // set by our own update below
  const minutes = Math.ceil(JSON.stringify(doc.content ?? '').length / 1500);
  await req.payload.update({
    collection: 'posts',
    id: doc.id,
    data: { readingTime: minutes },
    req,                                                  // same transaction
    context: { skipReadingTime: true },
  });
  revalidatePath(`/posts/${doc.slug}`);
  return doc;
};
```
- `beforeValidate`/`beforeChange` mutate `data` (on update it holds only changed fields; read the
  id from `originalDoc`). Use `afterChange` for side effects that need the saved `id`.
- Always pass `req` to nested Local API calls inside hooks; otherwise they run outside the
  request transaction and can deadlock or commit half a change.
- Keep slow external calls (email, search indexing) out of the transaction: queue them with
  Payload's jobs queue or run them after the response.

## Rules
- Read secrets from env (`PAYLOAD_SECRET`, `DATABASE_URL`); never commit them.
- Set `overrideAccess: false` plus `user` on every Local API call that serves user-specific data.
- Regenerate types after schema edits and type Local API results with the generated interfaces.
- Never mix push mode and migrations on the same database; production uses migrations only.
- Leave the `(payload)` route files untouched. Index fields you filter or sort on (`index: true`), and keep `depth` as low as the page needs.

## Common Mistakes
- **Data leaks from Server Components**: Local API calls skip access by default; add `overrideAccess: false, user`.
- **Infinite hook loop**: an `afterChange` that updates its own collection without a `context` flag re-triggers itself.
- **"Relation does not exist" in production**: schema changed but no migration was created or run; run `payload migrate:create` and `payload migrate`.
- **Two root layouts clash**: frontend pages left beside `(payload)` instead of in their own route group.
- **Huge responses**: default depth populates relationships recursively; set `depth` and `select`.
- **Hook returns nothing**: `beforeChange` must return `data` (or a modified copy) or changes are lost.

## Verify
- `pnpm payload generate:types` and `pnpm tsc --noEmit` pass with no errors.
- `pnpm payload migrate:status` shows no pending migrations before deploy.
- Test access: an anonymous `GET /api/posts` returns only published docs; a non-admin `PATCH`
  of someone else's post returns 403; the same checks via the Local API with `overrideAccess: false`.
- Create and update a post in `/admin` and confirm the hook ran once (check the slug and logs).

