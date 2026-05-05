import type { Metadata } from 'next'
import { DM_Sans, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: 'variable',  // variable font — one file covers all weights
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Weave by Creative Renaissance — Studio management for photographers',
  description:
    'Sessions, invoicing, payments, staff, and client management in one clean workspace. Built for photography studios by Creative Renaissance.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
}

// Runs synchronously before paint — prevents flash of wrong theme
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = document.documentElement;
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      d.classList.add('dark');
    } else {
      d.classList.remove('dark');
    }
  } catch(e){}
})();
`

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const theme = cookieStore.get('theme')?.value
  const isDark = theme === 'dark'

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${geistMono.variable} h-full antialiased${isDark ? ' dark' : ''}`}
      suppressHydrationWarning
    >
      <head>
        {/* Injected before React hydration to avoid theme flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}
