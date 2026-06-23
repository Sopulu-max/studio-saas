'use client'

import { StudioRow } from '@/lib/studio'

type StorefrontViewProps = {
  studio: StudioRow
  staff: any[]
  showTeam: boolean
}

export default function StorefrontView({ studio, staff, showTeam }: StorefrontViewProps) {
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const bookingLink = `${siteUrl}/book/${studio.slug}`
  const packagesLink = `${siteUrl}/packages/${studio.slug}`

  return (
    <div style={{ 
      maxWidth: '500px', margin: '0 auto', background: 'var(--surface)', 
      borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--line)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
    }}>
      {/* Header / Cover Area */}
      <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--btn) 0%, var(--active) 100%)', position: 'relative' }}>
        <div style={{ 
          position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)',
          width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface)',
          border: '4px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {studio.logo_url ? (
            <img src={studio.logo_url} alt={studio.name || 'Logo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-3)' }}>
              {studio.name ? studio.name.charAt(0).toUpperCase() : 'S'}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '56px 24px 32px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '700' }}>{studio.name}</h1>
        
        {(studio.address || studio.phone || studio.email) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', margin: '0 0 16px', fontSize: '13px', color: 'var(--text-3)' }}>
            {studio.address && <span>📍 {studio.address}</span>}
            {studio.phone && <span>📞 {studio.phone}</span>}
            {studio.email && <span>✉️ {studio.email}</span>}
          </div>
        )}

        {studio.bio && (
          <p style={{ margin: '0 0 24px', fontSize: '15px', color: 'var(--text-2)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {studio.bio}
          </p>
        )}

        {/* Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
          <a href={bookingLink} style={{
            display: 'block', padding: '16px', background: 'var(--btn)', color: 'var(--btn-fg)',
            borderRadius: '12px', textDecoration: 'none', fontWeight: '600', fontSize: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Book a Session
          </a>
          <a href={packagesLink} style={{
            display: 'block', padding: '16px', background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--line-inner)', borderRadius: '12px', textDecoration: 'none', 
            fontWeight: '600', fontSize: '15px', transition: 'background 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--active)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
          >
            View Packages
          </a>
        </div>

        {/* Team Section */}
        {showTeam && staff && staff.length > 0 && (
          <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid var(--line)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 24px', color: 'var(--text)' }}>Meet the Team</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {staff.map((member) => (
                <div key={member.staff_id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px', border: '1px solid var(--line-inner)', textAlign: 'left' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--active)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {member.users?.avatar_url ? (
                      <img src={member.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '16px', color: 'var(--text-3)' }}>{member.users?.full_name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontWeight: '600', fontSize: '15px' }}>{member.users?.full_name}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-3)' }}>{member.role || 'Staff Member'}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Note about it being hidden from public */}
            <p style={{ marginTop: '16px', fontSize: '12px', color: '#c0392b', fontWeight: '500', background: '#fadbd8', padding: '8px', borderRadius: '6px' }}>
              Note: The Team section is currently hidden on your public live link.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
