export default function GalleryNotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <p style={{ fontSize: '48px', margin: '0 0 16px' }}>📷</p>
        <h1 style={{ fontSize: '20px', fontWeight: '500', margin: '0 0 8px' }}>Gallery not available</h1>
        <p style={{ fontSize: '14px', color: '#888', margin: 0, lineHeight: '1.6' }}>
          This gallery link has expired or is no longer available. Please contact your photographer for a new link.
        </p>
      </div>
    </div>
  )
}