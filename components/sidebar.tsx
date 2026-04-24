'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import GlobalSearch from './global-search'

type NavItem = { label: string; href: string }

const OWNER_NAV_DEFAULT: NavItem[] = [
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

const STAFF_NAV: NavItem[] = [
  { label: 'My sessions', href: '/dashboard/sessions' },
  { label: 'Calendar',    href: '/dashboard/calendar' },
  { label: 'Clients',     href: '/dashboard/clients' },
]

const NAV_STORAGE_KEY = 'sidebar-nav-order'

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const r = [...arr]; const [x] = r.splice(from, 1); r.splice(to, 0, x); return r
}

function GripDots() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
      {[0,5,10].map(y => (
        <g key={y}>
          <circle cx="2" cy={y+2} r="1.5" fill="currentColor" />
          <circle cx="8" cy={y+2} r="1.5" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

export default function Sidebar({ studioName, isOwner = true }: { studioName: string; isOwner?: boolean }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editNav,    setEditNav]    = useState(false)
  const [navItems,   setNavItems]   = useState<NavItem[]>(OWNER_NAV_DEFAULT)
  const [dragging,   setDragging]   = useState<string | null>(null)
  const [dragOver,   setDragOver]   = useState<string | null>(null)

  // Load saved nav order
  useEffect(() => {
    if (!isOwner) return
    try {
      const saved = localStorage.getItem(NAV_STORAGE_KEY)
      if (saved) {
        const parsed: NavItem[] = JSON.parse(saved)
        const defaultHrefs = OWNER_NAV_DEFAULT.map(n => n.href)
        // merge: keep saved order but add any new items not yet in saved
        const savedHrefs = parsed.map(n => n.href)
        const valid  = parsed.filter(n => defaultHrefs.includes(n.href))
        const newOnes = OWNER_NAV_DEFAULT.filter(n => !savedHrefs.includes(n.href))
        if (valid.length > 0) setNavItems([...valid, ...newOnes])
      }
    } catch {}
  }, [isOwner])

  function saveNav(items: NavItem[]) {
    setNavItems(items)
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(items))
  }

  function onDragStart(href: string) { setDragging(href) }
  function onDragOver(e: React.DragEvent, href: string) { e.preventDefault(); setDragOver(href) }
  function onDrop(href: string) {
    if (dragging && dragging !== href) {
      const from = navItems.findIndex(n => n.href === dragging)
      const to   = navItems.findIndex(n => n.href === href)
      if (from !== -1 && to !== -1) saveNav(moveItem(navItems, from, to))
    }
    setDragging(null); setDragOver(null)
  }
  function onDragEnd() { setDragging(null); setDragOver(null) }

  function moveUp(href: string) {
    const idx = navItems.findIndex(n => n.href === href)
    if (idx > 0) saveNav(moveItem(navItems, idx, idx - 1))
  }
  function moveDown(href: string) {
    const idx = navItems.findIndex(n => n.href === href)
    if (idx < navItems.length - 1) saveNav(moveItem(navItems, idx, idx + 1))
  }

  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    if (typeof document !== 'undefined')
      document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { if (typeof document !== 'undefined') document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeNav = isOwner ? navItems : STAFF_NAV

  const navContent = (
    <>
      {/* Brand header */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {studioName}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '1px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Weave</p>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <ThemeToggle />
          <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="sidebar-close-btn"
            style={{ display: 'none', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-3)', lineHeight: 1, borderRadius: '6px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6"  x2="6"  y2="18"/>
              <line x1="6"  y1="6"  x2="18" y2="18"/>
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
        {activeNav.map((item, idx) => {
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          const isGhost   = dragging === item.href
          const isDropTarget = dragOver === item.href && dragging !== item.href

          return (
            <div
              key={item.href}
              draggable={editNav && isOwner}
              onDragStart={() => onDragStart(item.href)}
              onDragOver={e  => onDragOver(e, item.href)}
              onDrop={()     => onDrop(item.href)}
              onDragEnd={onDragEnd}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                opacity:     isGhost ? 0.35 : 1,
                borderTop:   isDropTarget ? '2px solid var(--btn)' : '2px solid transparent',
                cursor:      editNav ? 'grab' : 'default',
                marginBottom: '1px',
              }}
            >
              {editNav && isOwner && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
                  <button onClick={() => moveUp(item.href)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', padding: '1px 3px', cursor: 'pointer', color: 'var(--text-4)', fontSize: '10px', lineHeight: 1, opacity: idx === 0 ? 0.2 : 0.7 }}>▲</button>
                  <button onClick={() => moveDown(item.href)} disabled={idx === activeNav.length - 1}
                    style={{ background: 'none', border: 'none', padding: '1px 3px', cursor: 'pointer', color: 'var(--text-4)', fontSize: '10px', lineHeight: 1, opacity: idx === activeNav.length - 1 ? 0.2 : 0.7 }}>▼</button>
                </div>
              )}

              {editNav && isOwner && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '2px 0' }}>
                  <GripDots />
                </div>
              )}

              <Link
                href={editNav ? '#' : item.href}
                onClick={editNav ? e => e.preventDefault() : undefined}
                style={{
                  flex: 1, display: 'block', padding: '7px 10px', borderRadius: '7px',
                  fontSize: '13.5px',
                  fontWeight: active ? '500' : '400',
                  color: active ? 'var(--text)' : 'var(--text-3)',
                  background: active ? 'var(--active)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background 0.12s, color 0.12s',
                  pointerEvents: editNav ? 'none' : 'auto',
                }}
              >
                {item.label}
              </Link>
            </div>
          )
        })}

        {/* Edit nav toggle */}
        {isOwner && (
          <button
            onClick={() => setEditNav(e => !e)}
            style={{
              width: '100%', marginTop: '8px', padding: '5px 10px', textAlign: 'left',
              fontSize: '11px', color: editNav ? 'var(--btn)' : 'var(--text-4)',
              background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '6px',
              fontWeight: editNav ? '600' : '400',
            }}
          >
            {editNav ? '✓ Done reordering' : '⋮⋮ Reorder nav'}
          </button>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--line)' }}>
        {!isOwner && (
          <p style={{ fontSize: '11px', color: 'var(--text-4)', padding: '4px 10px 8px', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: '600' }}>
            Staff view
          </p>
        )}
        {isOwner && (
          <Link href="/dashboard/settings"
            style={{
              display: 'block', padding: '7px 10px', borderRadius: '7px', fontSize: '13.5px',
              fontWeight: pathname === '/dashboard/settings' ? '500' : '400',
              color: pathname === '/dashboard/settings' ? 'var(--text)' : 'var(--text-3)',
              background: pathname === '/dashboard/settings' ? 'var(--active)' : 'transparent',
              textDecoration: 'none', marginBottom: '2px',
            }}
          >
            Settings
          </Link>
        )}
        <button onClick={handleSignOut}
          style={{ width: '100%', padding: '7px 10px', textAlign: 'left', fontSize: '13.5px', fontWeight: '400', color: '#c0392b', background: 'transparent', border: 'none', borderRadius: '7px', cursor: 'pointer' }}>
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar-desktop"
        style={{ width: '216px', minHeight: '100vh', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0 }}>
        {navContent}
      </aside>

      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="sidebar-hamburger"
        style={{ display: 'none', position: 'fixed', top: '14px', left: '14px', zIndex: 50, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '8px', padding: '7px 8px', cursor: 'pointer', color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,.1)', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="3"  y1="6"  x2="21" y2="6"/>
          <line x1="3"  y1="12" x2="21" y2="12"/>
          <line x1="3"  y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="sidebar-backdrop"
          style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }} />
      )}

      {/* Mobile drawer */}
      <aside className="sidebar-mobile"
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 49, width: '240px', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRight: '1px solid var(--line)', transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.22s cubic-bezier(.4,0,.2,1)', overflowY: 'auto' }}>
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
