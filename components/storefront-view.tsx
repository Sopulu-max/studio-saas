'use client'

import { StudioRow } from '@/lib/studio'
import { buildTheme, themeCssVars } from '@/lib/studio-theme'

type StorefrontViewProps = {
  studio: StudioRow
  staff: any[]
  showTeam: boolean
  isPublic?: boolean
}

export default function StorefrontView({ studio, staff, showTeam, isPublic = false }: StorefrontViewProps) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const bookingLink = `${siteUrl}/book/${studio.slug}`
  const packagesLink = `${siteUrl}/packages/${studio.slug}`

  const theme = buildTheme(studio.theme)
  const cssVars = themeCssVars(theme)
  const wrapperClass = `storefront-theme-${studio.studio_id || 'preview'}`

  return (
    <>
      <style>{`
        .${wrapperClass} {
          ${cssVars}
          --blur-bg: rgba(255, 255, 255, 0.05);
          --blur-border: rgba(255, 255, 255, 0.1);
        }
        .${wrapperClass} .sf-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .${wrapperClass} .sf-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--primary-dim);
        }
        .${wrapperClass} .sf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
      `}</style>

      <div className={wrapperClass} style={{ 
        width: '100%', 
        minHeight: isPublic ? '100vh' : 'auto',
        background: 'var(--bg)', 
        color: 'var(--text-main)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: isPublic ? '0' : '24px',
        overflow: 'hidden',
        border: isPublic ? 'none' : '1px solid var(--card-border)',
        boxShadow: isPublic ? 'none' : '0 12px 48px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: '64px'
      }}>
        
        {/* Hero Cover Area */}
        <div style={{ 
          width: '100%', 
          height: '160px', 
          background: `linear-gradient(135deg, var(--card-bg) 0%, var(--primary-dim) 100%)`, 
          position: 'relative',
          borderBottom: '1px solid var(--card-border)'
        }}>
          {/* Logo overlapping the cover */}
          <div style={{ 
            position: 'absolute', bottom: '-50px', left: '50%', transform: 'translateX(-50%)',
            width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg)',
            padding: '4px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
              background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {studio.logo_url ? (
                <img src={studio.logo_url} alt={studio.name || 'Logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)', fontFamily: 'var(--heading-font)' }}>
                  {studio.name ? studio.name.charAt(0).toUpperCase() : 'S'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ 
          width: '100%', maxWidth: '520px', padding: '64px 24px 0', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' 
        }}>
          
          <h1 style={{ 
            margin: '0 0 12px', fontSize: '28px', fontWeight: '600', 
            fontFamily: 'var(--heading-font)', color: 'var(--text-main)',
            letterSpacing: '-0.02em'
          }}>
            {studio.name}
          </h1>
          
          {(studio.address || studio.phone || studio.email) && (
            <div style={{ 
              display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', 
              margin: '0 0 24px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500'
            }}>
              {studio.address && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>{studio.address}</span>}
              {studio.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>{studio.phone}</span>}
              {studio.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>{studio.email}</span>}
            </div>
          )}

          {studio.bio && (
            <p style={{ 
              margin: '0 0 32px', fontSize: '15px', color: 'var(--text-main)', 
              lineHeight: '1.6', whiteSpace: 'pre-wrap', opacity: 0.9
            }}>
              {studio.bio}
            </p>
          )}

          {/* Quick Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginTop: '8px' }}>
            <a href={bookingLink} className="sf-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '18px', background: 'var(--primary)', color: 'var(--on-primary)',
              borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: '600', fontSize: '16px',
              border: '1px solid var(--primary-border)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Book a Session
            </a>
            
            <a href={packagesLink} className="sf-btn" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '18px', background: 'var(--card-bg)', color: 'var(--text-main)',
              border: '1px solid var(--card-border)', borderRadius: 'var(--radius)', textDecoration: 'none', 
              fontWeight: '600', fontSize: '16px', backdropFilter: 'blur(10px)'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              View Packages
            </a>
          </div>

          {/* Team Section */}
          {showTeam && staff && staff.length > 0 && (
            <div style={{ width: '100%', marginTop: '48px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Meet the Team
                </h2>
                <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {staff.map((member) => (
                  <div key={member.staff_id} className="sf-card" style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
                    borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)', 
                    border: '1px solid var(--card-border)', transition: 'transform 0.2s, box-shadow 0.2s'
                  }}>
                    <div style={{ 
                      width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-dim)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                      border: '2px solid var(--card-bg)'
                    }}>
                      {member.users?.avatar_url ? (
                        <img src={member.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '20px', color: 'var(--primary)', fontWeight: '600' }}>
                          {member.users?.full_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '16px', color: 'var(--text-main)' }}>
                        {member.users?.full_name}
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                        {member.role || 'Staff Member'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Note about it being hidden from public */}
              <div style={{ 
                marginTop: '24px', fontSize: '13px', color: 'var(--primary)', fontWeight: '500', 
                background: 'var(--primary-dim)', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--primary-border)', display: 'flex', gap: '8px', alignItems: 'flex-start'
              }}>
                <svg style={{ flexShrink: 0, marginTop: '2px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Note: The Team section is currently hidden on your public live link.
              </div>
            </div>
          )}

          <div style={{ marginTop: '48px', fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Powered by Weave
          </div>
        </div>
      </div>
    </>
  )
}
