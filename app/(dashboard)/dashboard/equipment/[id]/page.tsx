import { redirect } from 'next/navigation'
import Link from 'next/link'
import EquipmentActions from './equipment-actions'
import { getStudioContext } from '@/lib/studio'

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  camera:    { bg: '#eeedfe', color: '#534ab7' },
  lens:      { bg: '#e6f1fb', color: '#185fa5' },
  lighting:  { bg: '#faeeda', color: '#854f0b' },
  accessory: { bg: '#eaf3de', color: '#3b6d11' },
  other:     { bg: '#f1efe8', color: '#5f5e5a' },
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  available:   { bg: '#eaf3de', color: '#3b6d11' },
  in_use:      { bg: '#e6f1fb', color: '#185fa5' },
  maintenance: { bg: '#faeeda', color: '#854f0b' },
  retired:     { bg: '#fcebeb', color: '#a32d2d' },
}

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: item } = await context.admin
    .from('equipment')
    .select('*')
    .eq('equipment_id', id)
    .eq('studio_id', context.studioId)
    .single()

  if (!item) redirect('/dashboard/equipment')

  const cat = CATEGORY_COLORS[item.category ?? ''] ?? CATEGORY_COLORS.other
  const st  = STATUS_COLORS[item.status ?? '']    ?? STATUS_COLORS.available

  // Extract checkout name from notes prefix if present
  const checkoutMatch = (item.notes ?? '').match(/^\[Checked out to: (.+?) on .+?\]/)
  const checkedOutTo  = checkoutMatch?.[1] ?? null

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 6px' }}>{item.name}</h1>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: cat.bg, color: cat.color, fontWeight: '500' }}>
            {item.category}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', padding: '4px 12px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500' }}>
            {item.status.replace('_', ' ')}
          </span>
          <Link
            href={`/dashboard/equipment/${id}/edit`}
            style={{ fontSize: '13px', padding: '5px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
          >
            Edit
          </Link>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Category</p>
            <p style={{ fontSize: '14px', margin: 0, textTransform: 'capitalize' }}>{item.category}</p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Serial number</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{item.serial_number ?? '—'}</p>
          </div>
          {item.purchase_date && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Purchase date</p>
              <p style={{ fontSize: '14px', margin: 0 }}>
                {new Date(item.purchase_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
          {item.purchase_price != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Purchase price</p>
              <p style={{ fontSize: '14px', margin: 0 }}>₦{Number(item.purchase_price).toLocaleString()}</p>
            </div>
          )}
        </div>
        {(() => {
          const displayNotes = (item.notes ?? '').replace(/^\[Checked out to:.*?\]\n?/, '').trim()
          return displayNotes ? (
            <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>Notes</p>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{displayNotes}</p>
            </div>
          ) : null
        })()}
      </div>

      <EquipmentActions equipmentId={id} currentStatus={item.status} checkedOutTo={checkedOutTo} />
    </div>
  )
}
