'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Suspense } from 'react'

export type ViewMode = 'list' | 'grid' | 'chart-donut' | 'chart-bar'

const ICONS: Record<ViewMode, React.ReactNode> = {
  list: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <line x1="2" y1="4" x2="13" y2="4" />
      <line x1="2" y1="7.5" x2="13" y2="7.5" />
      <line x1="2" y1="11" x2="13" y2="11" />
    </svg>
  ),
  grid: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="4.5" height="4.5" rx="1" />
      <rect x="8.5" y="2" width="4.5" height="4.5" rx="1" />
      <rect x="2" y="8.5" width="4.5" height="4.5" rx="1" />
      <rect x="8.5" y="8.5" width="4.5" height="4.5" rx="1" />
    </svg>
  ),
  'chart-bar': (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="3" height="5" rx="0.5" />
      <rect x="6" y="5" width="3" height="8" rx="0.5" />
      <rect x="10" y="2" width="3" height="11" rx="0.5" />
    </svg>
  ),
  'chart-donut': (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="7.5" cy="7.5" r="5" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <line x1="7.5" y1="2.5" x2="10.5" y2="4.5" />
    </svg>
  ),
}

const LABELS: Record<ViewMode, string> = {
  list:          'List view',
  grid:          'Grid view',
  'chart-bar':   'Bar chart',
  'chart-donut': 'Donut chart',
}

function ViewSwitcherInner({ modes, storageKey }: { modes: ViewMode[]; storageKey: string }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const current      = (searchParams.get('layout') as ViewMode) ?? modes[0]

  function setMode(mode: ViewMode) {
    try { localStorage.setItem(`layout-${storageKey}`, mode) } catch {}
    const p = new URLSearchParams(searchParams.toString())
    p.set('layout', mode)
    router.push(`${pathname}?${p}`)
  }

  return (
    <div style={{
      display: 'flex', gap: '2px',
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: '8px', padding: '2px',
    }}>
      {modes.map(mode => (
        <button
          key={mode}
          onClick={() => setMode(mode)}
          title={LABELS[mode]}
          style={{
            padding: '5px 7px', border: 'none', cursor: 'pointer',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: current === mode ? 'var(--btn)' : 'transparent',
            color:      current === mode ? 'var(--btn-fg)' : 'var(--text-3)',
            transition: 'background .15s, color .15s',
          }}
        >
          {ICONS[mode]}
        </button>
      ))}
    </div>
  )
}

export function ViewSwitcher({ modes, storageKey }: { modes: ViewMode[]; storageKey: string }) {
  return (
    <Suspense fallback={null}>
      <ViewSwitcherInner modes={modes} storageKey={storageKey} />
    </Suspense>
  )
}

/** Read active layout on the server from searchParams, falling back to the first mode. */
export function resolveLayout(raw: string | undefined, modes: ViewMode[]): ViewMode {
  if (raw && modes.includes(raw as ViewMode)) return raw as ViewMode
  return modes[0]
}
