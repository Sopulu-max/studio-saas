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
        borderRadius: isPublic ? '0' : '16px',
        overflow: 'hidden',
        border: isPublic ? 'none' : '1px solid var(--card-border)',
        boxShadow: isPublic ? 'none' : '0 12px 48px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        
        {/* Navigation Bar */}
        <header style={{
          width: '100%', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--card-border)', background: 'var(--card-bg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {studio.logo_url ? (
              <img src={studio.logo_url} alt={studio.name || 'Logo'} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
                {studio.name ? studio.name.charAt(0).toUpperCase() : 'S'}
              </div>
            )}
            <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'var(--heading-font)' }}>{studio.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href={packagesLink} style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Packages</a>
            <a href={bookingLink} className="sf-btn" style={{ 
              padding: '10px 20px', background: 'var(--primary)', color: 'var(--on-primary)', 
              borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: '600', textDecoration: 'none' 
            }}>Book Now</a>
          </div>
        </header>

        {/* Hero Section */}
        <section style={{ 
          width: '100%', padding: isPublic ? '120px 24px' : '64px 24px', 
          background: `linear-gradient(135deg, var(--card-bg) 0%, var(--primary-dim) 100%)`, 
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <h1 style={{ 
            maxWidth: '800px', margin: '0 0 24px', fontSize: isPublic ? '48px' : '32px', fontWeight: '700', 
            fontFamily: 'var(--heading-font)', color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: '1.1'
          }}>
            Capture your best moments with {studio.name}
          </h1>
          <p style={{ maxWidth: '600px', margin: '0 0 40px', fontSize: isPublic ? '18px' : '16px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            {studio.bio ? studio.bio.split('\n')[0] : 'Professional photography studio dedicated to capturing your unique story.'}
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href={bookingLink} className="sf-btn" style={{
              padding: '16px 32px', background: 'var(--primary)', color: 'var(--on-primary)',
              borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: '600', fontSize: '16px',
            }}>
              Book a Session
            </a>
            <a href={packagesLink} className="sf-btn" style={{
              padding: '16px 32px', background: 'var(--bg)', color: 'var(--text-main)',
              border: '1px solid var(--primary-border)', borderRadius: 'var(--radius)', textDecoration: 'none', 
              fontWeight: '600', fontSize: '16px',
            }}>
              View Packages
            </a>
          </div>
        </section>

        {/* About & Contact Section */}
        <section style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '80px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--heading-font)', margin: '0 0 24px' }}>About the Studio</h2>
            <p style={{ fontSize: '16px', color: 'var(--text-main)', lineHeight: '1.7', whiteSpace: 'pre-wrap', opacity: 0.9 }}>
              {studio.bio || "Welcome to our studio. We specialize in providing high-quality photography services tailored to your needs. Reach out to us or book a session directly."}
            </p>
          </div>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--heading-font)', margin: '0 0 24px' }}>Contact & Location</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px', color: 'var(--text-muted)' }}>
              {studio.address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>{studio.address}</span>
                </div>
              )}
              {studio.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <span>{studio.phone}</span>
                </div>
              )}
              {studio.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  <span>{studio.email}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Team Section */}
        {showTeam && staff && staff.length > 0 && (
          <section style={{ width: '100%', background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '80px 24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: '700', fontFamily: 'var(--heading-font)', margin: '0 0 12px', color: 'var(--text-main)' }}>Meet the Team</h2>
                <p style={{ fontSize: '16px', color: 'var(--text-muted)', margin: 0 }}>The creative minds behind the lens.</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                {staff.map((member) => (
                  <div key={member.staff_id} className="sf-card" style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', 
                    borderRadius: 'var(--radius)', background: 'var(--bg)', 
                    border: '1px solid var(--card-border)', transition: 'transform 0.2s, box-shadow 0.2s', textAlign: 'center'
                  }}>
                    <div style={{ 
                      width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-dim)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '16px',
                      border: '3px solid var(--card-bg)'
                    }}>
                      {member.users?.avatar_url ? (
                        <img src={member.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '24px', color: 'var(--primary)', fontWeight: '600' }}>
                          {member.users?.full_name?.charAt(0) || '?'}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: '600', fontSize: '18px', color: 'var(--text-main)' }}>
                      {member.users?.full_name}
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                      {member.role || 'Staff Member'}
                    </p>
                  </div>
                ))}
              </div>
              
              <div style={{ 
                marginTop: '40px', fontSize: '13px', color: 'var(--primary)', fontWeight: '500', 
                background: 'var(--primary-dim)', padding: '16px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--primary-border)', display: 'flex', gap: '8px', alignItems: 'flex-start', justifyContent: 'center'
              }}>
                <svg style={{ flexShrink: 0, marginTop: '2px' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Note: The Team section is currently hidden on your public live link.
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer style={{ 
          width: '100%', padding: '32px 24px', textAlign: 'center', 
          borderTop: '1px solid var(--card-border)', background: 'var(--bg)', marginTop: 'auto'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 8px' }}>
            © {new Date().getFullYear()} {studio.name}. All rights reserved.
          </p>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Powered by Weave
          </div>
        </footer>

      </div>
    </>
  )
}
