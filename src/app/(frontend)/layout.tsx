import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Bodoni_Moda } from 'next/font/google'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Breadcrumb } from '@/components/Breadcrumb'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { RouteTransition } from '@/components/motion/RouteTransition'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

const bodoniModa = Bodoni_Moda({
  weight: '400',
  variable: '--font-bodoni-moda',
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html
      className={cn(GeistSans.variable, GeistMono.variable, bodoniModa.variable)}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <link href="/favicon.png" rel="icon" sizes="64x64" />
      </head>
      <body>
        <Providers>
          {/* Logged-in admin bar spans the top; it is `display:none` for
              anonymous visitors (AdminBar's own CSS), so the row below
              naturally fills the whole height otherwise. */}
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          {/* body is `flex flex-col`: everything below the admin bar is a
              flex row — the sticky left nav rail (DESIGN.md §2.1) and the
              main column (content + footer, which spans only this column). */}
          <div className="flex flex-1">
            <Header />

            <main className="flex min-w-0 flex-1 flex-col">
              <div className="top-0 w-full p-4 flex justify-between text-xs">
                <div className="font-mono text-muted-foreground">
                  <span className="text-primary">SELECTED WORKS</span>
                  {/* The page the visitor is on, named from its route — `SELECTED
                      WORKS // Albums` on `/albums`, nothing on the home route. */}
                  <Breadcrumb />
                </div>
                <span className="font-mono text-muted-foreground">PROOF SHEET</span>
              </div>

              {/* Darkroom Exposure Shift between route changes (DESIGN.md §2.1) */}
              <RouteTransition>{children}</RouteTransition>
              <Footer />
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
