import Link from 'next/link'

const btn: React.CSSProperties = {
  fontSize: '13px', padding: '6px 14px', borderRadius: '8px',
  textDecoration: 'none', display: 'inline-block',
}

export default function Pagination({
  page,
  totalPages,
  prevUrl,
  nextUrl,
}: {
  page: number
  totalPages: number
  prevUrl?: string
  nextUrl?: string
}) {
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
        Page {page} of {totalPages}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {prevUrl
          ? <Link href={prevUrl} style={{ ...btn, border: '1px solid var(--line)', color: 'var(--text)' }}>← Previous</Link>
          : <span style={{ ...btn, border: '1px solid var(--line-inner)', color: 'var(--text-4)' }}>← Previous</span>
        }
        {nextUrl
          ? <Link href={nextUrl} style={{ ...btn, border: '1px solid var(--line)', color: 'var(--text)' }}>Next →</Link>
          : <span style={{ ...btn, border: '1px solid var(--line-inner)', color: 'var(--text-4)' }}>Next →</span>
        }
      </div>
    </div>
  )
}
