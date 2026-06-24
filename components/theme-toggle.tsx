'use client'

import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  function toggle() {
    const isDark = document.documentElement.classList.contains('dark')
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    document.cookie = `theme=${next ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  return (
    <button
      onClick={toggle}
      title="Toggle theme"
      aria-label="Toggle theme"
      style={{
        width: '32px',
        height: '32px',
        padding: 0,
        background: 'var(--hover)',
        color: 'var(--text-3)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sun size={15} aria-hidden="true" className="theme-icon-sun" />
      <Moon size={15} aria-hidden="true" className="theme-icon-moon" />
    </button>
  )
}
