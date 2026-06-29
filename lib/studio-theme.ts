// ─── Types ────────────────────────────────────────────────────────────────────

export type ThemePreset = 'luxury' | 'modern' | 'minimal' | 'bold'

export type StudioTheme = {
  preset:  ThemePreset
  primary: string   // hex accent color, e.g. "#c9a96e"
  bg:      string   // hex page background, e.g. "#f5f3ef"
  serif:   boolean  // use serif font for headings
  radius:  number   // card border-radius in px (0–32)
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const THEME_PRESETS: Record<ThemePreset, StudioTheme> = {
  luxury:  { preset: 'luxury',  primary: '#c9a96e', bg: '#f5f3ef', serif: true,  radius: 16 },
  modern:  { preset: 'modern',  primary: '#2563eb', bg: '#ffffff', serif: false, radius: 12 },
  minimal: { preset: 'minimal', primary: '#18181b', bg: '#fafafa', serif: false, radius: 8  },
  bold:    { preset: 'bold',    primary: '#e11d48', bg: '#09090b', serif: false, radius: 6  },
}

export const PRESET_ORDER: ThemePreset[] = ['luxury', 'modern', 'minimal', 'bold']

export const PRESET_LABELS: Record<ThemePreset, string> = {
  luxury:  'Luxury',
  modern:  'Modern',
  minimal: 'Minimal',
  bold:    'Bold',
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildTheme(raw: unknown): StudioTheme {
  const r      = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const preset = (typeof r.preset === 'string' && r.preset in THEME_PRESETS)
    ? (r.preset as ThemePreset) : 'luxury'
  const base   = THEME_PRESETS[preset]
  const hexRe  = /^#[0-9a-fA-F]{6}$/

  return {
    preset,
    primary: typeof r.primary === 'string' && hexRe.test(r.primary) ? r.primary : base.primary,
    bg:      typeof r.bg      === 'string' && hexRe.test(r.bg)      ? r.bg      : base.bg,
    serif:   typeof r.serif   === 'boolean' ? r.serif  : base.serif,
    radius:  typeof r.radius  === 'number'  && r.radius >= 0 && r.radius <= 32
               ? r.radius : base.radius,
  }
}

// ─── CSS variable generator ───────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export function themeCssVars(t: StudioTheme): string {
  const [pr, pg, pb] = hexToRgb(t.primary)
  const bgLum        = luminance(t.bg)
  const isDarkBg     = bgLum < 0.5
  const onPrimary    = luminance(t.primary) > 0.45 ? '#1a1a1a' : '#ffffff'

  // Card background is slightly lighter/darker than page bg
  const cardBg     = isDarkBg ? 'rgba(255,255,255,.07)' : '#ffffff'
  const cardBorder = isDarkBg ? 'rgba(255,255,255,.12)' : `rgba(${pr},${pg},${pb},.15)`
  const navBg      = isDarkBg
    ? `rgba(${parseInt(t.bg.slice(1,3),16)},${parseInt(t.bg.slice(3,5),16)},${parseInt(t.bg.slice(5,7),16)},.88)`
    : `rgba(${parseInt(t.bg.slice(1,3),16)},${parseInt(t.bg.slice(3,5),16)},${parseInt(t.bg.slice(5,7),16)},.88)`
  const textMain   = isDarkBg ? '#f0ece6' : '#1a1a1a'
  const textMuted  = isDarkBg ? '#a09890' : '#6b6660'
  const textFaint  = isDarkBg ? '#666258' : '#c4bdb4'
  const ruleColor  = `linear-gradient(90deg, ${t.primary} 0%, rgba(${pr},${pg},${pb},.4) 50%, ${t.primary} 100%)`
  const headingFont = t.serif
    ? 'Georgia, "Times New Roman", serif'
    : 'system-ui, -apple-system, sans-serif'

  return [

    `--primary: ${t.primary}`,
    `--primary-rgb: ${pr},${pg},${pb}`,
    `--primary-dim: rgba(${pr},${pg},${pb},.12)`,
    `--primary-border: rgba(${pr},${pg},${pb},.3)`,
    `--on-primary: ${onPrimary}`,
    `--bg: ${t.bg}`,
    `--card-bg: ${cardBg}`,
    `--card-border: ${cardBorder}`,
    `--nav-bg: ${navBg}`,
    `--text-main: ${textMain}`,
    `--text-muted: ${textMuted}`,
    `--text-faint: ${textFaint}`,
    `--rule: ${ruleColor}`,
    `--heading-font: ${headingFont}`,
    `--radius: ${t.radius}px`,
    `--radius-sm: ${Math.max(4, Math.round(t.radius * 0.6))}px`,
  ].join('; ')
}

// ─── Tailwind / Shadcn CSS Variables ──────────────────────────────────────────

export function hexToHsl(hex: string) {
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

export function getThemeStyles(theme: StudioTheme): React.CSSProperties {
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

  return {
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
  } as React.CSSProperties
}
