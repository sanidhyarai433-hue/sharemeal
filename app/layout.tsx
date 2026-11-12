import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SiteMotion } from './site-motion'

export const metadata: Metadata = {
  title: 'SHAREMEAL — Good Food. Greater Impact.',
  description: 'SHAREMEAL connects surplus food with the communities who need it. Rescue food, share hope, and make every meal count.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#faf9f5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SiteMotion>{children}</SiteMotion>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
