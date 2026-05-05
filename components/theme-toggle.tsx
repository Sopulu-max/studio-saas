'use client'

import { useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: '32px',
        height: '32px',
        padding: 0,
        background: 'var(--hover)',
        color: 'var(--text-3)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {dark ? '☀︎' : '☽'}
    </button>
  )
}
