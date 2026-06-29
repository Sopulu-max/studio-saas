'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from './theme-toggle'
import GlobalSearch from './global-search'
import { buildBookingShareLink, buildPackagesShareLink, buildCustomShareLink } from '@/lib/whatsapp-links'

type NavItem = { label: string; href: string }
type NavGroup = { title: string; items: NavItem[] }

const OWNER_NAV_GROUPS: NavGroup[] = [
  {
    title: 'COMMERCIAL',
    items: [
      { label: 'Bookings',     href: '/dashboard/bookings' },
      { label: 'Clients',      href: '/dashboard/clients' },
      { label: 'Invoices',     href: '/dashboard/invoices' },
      { label: 'Contracts',    href: '/dashboard/contracts' },
    ]
  },
  {
    title: 'FULFILLMENT',
    items: [
      { label: 'Services & Catalog', href: '/dashboard/services' },
      { label: 'Galleries',    href: '/dashboard/galleries' },
      { label: 'Print orders', href: '/dashboard/print-orders' },
      { label: 'Packages (Legacy)', href: '/dashboard/packages' },
      { label: 'Products',     href: '/dashboard/products' },
    ]
  },
  {
    title: 'LOGISTICS & TEAM',
    items: [
      { label: 'Calendar',     href: '/dashboard/calendar' },
      { label: 'Staff',        href: '/dashboard/staff' },
      { label: 'Attendance',   href: '/dashboard/attendance' },
      { label: 'Equipment',    href: '/dashboard/equipment' },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Dashboard',    href: '/dashboard' },
      { label: 'Website',      href: '/dashboard/storefront' },
      { label: 'Reports',      href: '/dashboard/reports' },
    ]
  }
]

const STAFF_NAV_GROUPS: NavGroup[] = [
  {
    title: 'MY WORKSPACE',
    items: [
      { label: 'My bookings',  href: '/dashboard/bookings' },
      { label: 'Calendar',     href: '/dashboard/calendar' },
      { label: 'Clients',      href: '/dashboard/clients' },
    ]
  }
]

export default function Sidebar({ studioName, studioSlug, isOwner = true, messageTemplates = [] }: { studioName: string; studioSlug?: string; isOwner?: boolean; messageTemplates?: { template_id: string; title: string; content: string }[] }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [quickShareOpen, setQuickShareOpen] = useState(false)

  useEffect(() => {
    if (typeof document !== 'undefined')
      document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { if (typeof document !== 'undefined') document.body.style.overflow = '' }
  }, [mobileOpen])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeGroups = isOwner ? OWNER_NAV_GROUPS : STAFF_NAV_GROUPS

  function handleNavClick() {
    setMobileOpen(false)
  }

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
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activeGroups.map((group) => (
          <div key={group.title}>
            <p style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-4)', margin: '0 0 6px 8px', letterSpacing: '0.05em' }}>
              {group.title}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => {
                const active = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className="hover-lift"
                    style={{
                      display: 'block', padding: '7px 10px', borderRadius: '7px',
                      fontSize: '13.5px',
                      fontWeight: active ? '500' : '400',
                      color: active ? 'var(--text)' : 'var(--text-3)',
                      background: active ? 'var(--active)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Quick Share Hub */}
      {isOwner && studioSlug && (
        <div style={{ padding: '8px', borderTop: '1px solid var(--line)' }}>
          <button
            onClick={() => setQuickShareOpen(!quickShareOpen)}
            style={{
              width: '100%', padding: '7px 10px', textAlign: 'left', fontSize: '13.5px', fontWeight: '500', 
              color: quickShareOpen ? 'var(--text)' : 'var(--text-2)', background: quickShareOpen ? 'var(--active)' : 'transparent', 
              border: 'none', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
              Quick Share
            </span>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>{quickShareOpen ? '▲' : '▼'}</span>
          </button>
          
          {quickShareOpen && (
            <div style={{ marginTop: '4px', paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {messageTemplates.length === 0 ? (
                <p style={{ fontSize: '11px', color: 'var(--text-4)', padding: '6px 10px', margin: 0 }}>No templates saved. Go to Settings &gt; Messages to add some.</p>
              ) : (
                messageTemplates.map(t => {
                  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
                  const parsedContent = t.content
                    .replace(/\{\{studio_name\}\}/g, studioName)
                    .replace(/\{\{booking_link\}\}/g, `${base.replace(/\/$/, '')}/book/${studioSlug}`)
                    .replace(/\{\{packages_link\}\}/g, `${base.replace(/\/$/, '')}/packages/${studioSlug}`)

                  return (
                    <a key={t.template_id} href={buildCustomShareLink(parsedContent)} target="_blank" rel="noopener noreferrer"
                       style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none', borderRadius: '6px' }}
                       onMouseEnter={e => (e.currentTarget.style.background = 'var(--active)')}
                       onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.385 0 0 5.385 0 12.031C0 14.673 1.05 17.202 2.87 19.166L1.134 23.366L5.438 21.63C7.355 23.303 9.773 24 12.031 24C18.677 24 24 18.615 24 11.969C24 5.323 18.677 0 12.031 0ZM18.57 16.711C18.293 17.487 16.892 18.172 16.208 18.256C15.655 18.339 14.898 18.423 11.83 17.151C8.077 15.589 5.666 11.758 5.485 11.517C5.304 11.276 4 9.539 4 7.747C4 5.955 4.908 5.086 5.274 4.721C5.551 4.444 5.986 4.316 6.388 4.316C6.516 4.316 6.634 4.321 6.743 4.326C7.02 4.341 7.159 4.356 7.34 4.789C7.568 5.339 8.125 6.702 8.192 6.841C8.258 6.98 8.35 7.16 8.258 7.34C8.167 7.52 8.106 7.595 7.97 7.747C7.835 7.899 7.7 8.084 7.564 8.192C7.429 8.3 7.279 8.423 7.444 8.708C7.61 8.993 8.183 9.932 9.034 10.688C10.13 11.587 11.018 11.874 11.334 12.008C11.56 12.102 11.846 12.078 12.012 11.898C12.223 11.673 12.479 11.282 12.736 10.891C12.932 10.59 13.174 10.545 13.43 10.635C13.702 10.726 15.134 11.433 15.42 11.568C15.706 11.704 15.897 11.779 15.957 11.884C16.017 11.99 16.017 12.516 15.741 13.292" /></svg>
                      {t.title}
                    </a>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--line)' }}>
        {!isOwner && (
          <p style={{ fontSize: '11px', color: 'var(--text-4)', padding: '4px 10px 8px', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: '600' }}>
            Staff view
          </p>
        )}
        {isOwner && (
          <Link href="/dashboard/settings"
            onClick={handleNavClick}
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
      <aside className="sidebar-desktop glass-panel border-r-0 border-y-0 border-l-0 border-r border-[var(--line-inner)]"
        style={{ width: '216px', minHeight: '100vh', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
