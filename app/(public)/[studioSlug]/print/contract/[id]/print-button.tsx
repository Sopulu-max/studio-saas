'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{ padding: '8px 18px', fontSize: '13px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
    >
      Print / Save as PDF
    </button>
  )
}
