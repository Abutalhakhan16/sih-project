import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/lib/theme/ThemeContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Co-opServe — Services that put people first',
  description: 'A worker-owned marketplace for trusted local services, fair work, and shared prosperity.',
  generator: 'Co-opServe',
  icons: {
    icon: '/placeholder-logo.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1714' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
