'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import GlobalSearch from './global-search'

const OWNER_NAV = [
  { label: 'Dashboard',    href: '/dashboard' },
  { label: 'Sessions',     href: '/dashboard/sessions' },
  { label: 'Calendar',     href: '/dashboard/calendar' },
  { label: 'Clients',      href: '/dashboard/clients' },
  { label: 'Packages',     href: '/dashboard/packages' },
  { label: 'Staff',        href: '/dashboard/staff' },
  { label: 'Attendance',   href: '/dashboard/attendance' },
  { label: 'Galleries',    href: '/dashboard/galleries' },
  { label: 'Invoices',     href: '/dashboard/invoices' },
  { label: 'Contracts',    href: '/dashboard/contracts' },
  { label: 'Print orders', href: '/dashboard/print-orders' },
  { label: 'Equipment',    href: '/dashboard/equipment' },
  { label: 'Reports',      href: '/dashboard/reports' },
]

const STAFF_NAV = [
  { label: 'My sessions',  href: '/dashboard/sessions' },
  { label: 'Calendar',     href: '/dashboard/calendar' },
  { label: 'Clients',      href: '/dashboard/clients' },
]

export default function Sidebar({ studioName, isOwner = true }: { studioName: string; isOwner?: boolean }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = mobileOpen ? 'hidden' : ''
    }
    return () => { if (typeof document !== 'undefined') document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navContent = (
    <>
      {/* Brand header */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {studioName}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '1px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Weave
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="sidebar-close-btn"
            style={{
              display: 'none',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '4px', color: 'var(--text-3)', lineHeight: 1, borderRadius: '6px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 8px 0' }}>
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
        {(isOwner ? OWNER_NAV : STAFF_NAV).map(item => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')) ||
            (item.href !== '/dashboard' && pathname === item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block', padding: '7px 10px', borderRadius: '7px',
                fontSize: '13.5px',
                fontWeight: active ? '500' : '400',
                color: active ? 'var(--text)' : 'var(--text-3)',
                background: active ? 'var(--active)' : 'transparent',
                textDecoration: 'none', marginBottom: '1px',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--line)' }}>
        {!isOwner && (
          <p style={{ fontSize: '11px', color: 'var(--text-4)', padding: '4px 10px 8px', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: '600' }}>
            Staff view
          </p>
        )}
        {isOwner && <Link
          href="/dashboard/settings"
          style={{
            display: 'block', padding: '7px 10px', borderRadius: '7px', fontSize: '13.5px',
            fontWeight: pathname === '/dashboard/settings' ? '500' : '400',
            color: pathname === '/dashboard/settings' ? 'var(--text)' : 'var(--text-3)',
            background: pathname === '/dashboard/settings' ? 'var(--active)' : 'transparent',
            textDecoration: 'none', marginBottom: '2px',
          }}
        >
          Settings
        </Link>}
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '7px 10px', textAlign: 'left', fontSize: '13.5px',
            fontWeight: '400', color: '#c0392b', background: 'transparent', border: 'none',
            borderRadius: '7px', cursor: 'pointer', borderLeft: '2px solid transparent',
          }}
        >
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: '216px', minHeight: '100vh', borderRight: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0,
        }}
      >
        {navContent}
      </aside>

      {/* ── Mobile: hamburger button (fixed, top-left) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="sidebar-hamburger"
        style={{
          display: 'none',
          position: 'fixed', top: '14px', left: '14px', zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px',
          padding: '7px 8px', cursor: 'pointer', color: 'var(--text)',
          boxShadow: '0 1px 4px rgba(0,0,0,.1)', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* ── Mobile: backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="sidebar-backdrop"
          style={{
            position: 'fixed', inset: 0, zIndex: 48,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <aside
        className="sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 49,
          width: '240px', display: 'flex', flexDirection: 'column',
          background: 'var(--surface)', borderRight: '1px solid var(--line)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(.4,0,.2,1)',
          overflowY: 'auto',
        }}
      >
        {navContent}
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop   { display: none !important; }
          .sidebar-hamburger { display: flex !important; }
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  )
}
