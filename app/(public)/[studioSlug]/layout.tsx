import { notFound } from 'next/navigation'
import { fetchStorefront } from '@/lib/domains/public/services'
import { buildTheme } from '@/lib/studio-theme'

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}` // For HSL we actually need HSL, but for new tailwind v4, RGB might work or we can calculate it.
}

// Shadcn UI uses HSL for colors, so we must convert Hex to HSL
function hexToHsl(hex: string) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default async function StudioStorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ studioSlug: string }>
}) {
  const { studioSlug } = await params
  const studio = await fetchStorefront(studioSlug)

  if (!studio) {
    notFound()
  }

  const theme = buildTheme(studio.theme)
  const primaryHsl = hexToHsl(theme.primary)
  const bgHsl = hexToHsl(theme.bg)

  // Compute text colors (foreground) based on background luminance
  const r = parseInt(theme.bg.slice(1, 3), 16)
  const g = parseInt(theme.bg.slice(3, 5), 16)
  const b = parseInt(theme.bg.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const isDarkBg = luminance < 0.5

  const fgHsl = isDarkBg ? '0 0% 95%' : '0 0% 5%'
  const mutedHsl = isDarkBg ? '0 0% 15%' : '0 0% 95%'
  const borderHsl = isDarkBg ? '0 0% 20%' : '0 0% 90%'
  
  // Compute primary-foreground
  const pr = parseInt(theme.primary.slice(1, 3), 16)
  const pg = parseInt(theme.primary.slice(3, 5), 16)
  const pb = parseInt(theme.primary.slice(5, 7), 16)
  const primaryLuminance = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255
  const primaryFgHsl = primaryLuminance > 0.5 ? '0 0% 5%' : '0 0% 95%'

  return (
    <div 
      className="min-h-screen antialiased flex flex-col"
      style={{
        '--background': bgHsl,
        '--foreground': fgHsl,
        '--primary': primaryHsl,
        '--primary-foreground': primaryFgHsl,
        '--muted': mutedHsl,
        '--muted-foreground': isDarkBg ? '0 0% 65%' : '0 0% 40%',
        '--border': borderHsl,
        '--card': isDarkBg ? '0 0% 8%' : '0 0% 100%',
        '--card-foreground': fgHsl,
        '--radius': `${theme.radius}px`,
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        fontFamily: theme.serif ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, sans-serif'
      } as React.CSSProperties}
    >
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  )
}
