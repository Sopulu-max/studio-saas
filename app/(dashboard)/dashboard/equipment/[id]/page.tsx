import { redirect } from 'next/navigation'
import Link from 'next/link'
import EquipmentActions from './equipment-actions'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getEquipmentCategoryConfig } from '@/lib/studio-config'

// ─── Types ──────────────────────────────────────────────────────────────────

type EquipmentRow = {
  equipment_id:   string
  name:           string | null
  category:       string | null
  serial_number:  string | null
  status:         string
  notes:          string | null
  purchase_date:  string | null
  purchase_price: number | string | null
  assigned_to:    string | null
  checked_out_at: string | null
  booking_id:     string | null
}

type CheckoutRow = {
  checkout_id:    string
  assigned_to:    string
  checked_out_at: string
  checked_in_at:  string | null
  notes:          string | null
  booking_id:     string | null
  bookings?: { booking_ref?: number | null; session_date?: string | null } | null
}

type StaffRow = { staff_id: string; full_name: string }

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  available:   { bg: '#eaf3de', color: '#3b6d11' },
  in_use:      { bg: '#e6f1fb', color: '#185fa5' },
  maintenance: { bg: '#faeeda', color: '#854f0b' },
  retired:     { bg: '#fcebeb', color: '#a32d2d' },
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const [
    { data: itemRaw },
    { data: checkoutsRaw },
    { data: staffRaw },
    studio,
  ] = await Promise.all([
    context.admin
      .from('equipment')
      .select('*')
      .eq('equipment_id', id)
      .eq('studio_id', context.studioId)
      .single(),
    context.admin
      .from('equipment_checkouts')
      .select('checkout_id, assigned_to, checked_out_at, checked_in_at, notes, booking_id, bookings(booking_ref, session_date)')
      .eq('equipment_id', id)
      .order('checked_out_at', { ascending: false })
      .limit(20),
    context.admin
      .from('staff')
      .select('staff_id, full_name')
      .eq('studio_id', context.studioId)
      .order('full_name', { ascending: true }),
    fetchStudio(context.admin, context.studioId),
  ])

  if (!itemRaw) redirect('/dashboard/equipment')

  const item     = itemRaw as unknown as EquipmentRow
  const checkouts = (checkoutsRaw ?? []) as unknown as CheckoutRow[]
  const staffList = (staffRaw ?? []) as unknown as StaffRow[]

  const config  = buildStudioConfig(
    studio?.session_types, studio?.booking_statuses, studio?.service_types,
    studio?.equipment_categories, studio?.staff_roles,
  )
  const catCfg  = getEquipmentCategoryConfig(config, item.category)
  const cat     = { bg: catCfg.color_bg, color: catCfg.color_fg }
  const st      = STATUS_COLORS[item.status ?? ''] ?? STATUS_COLORS.available

  const isCheckedOut = item.status === 'in_use' && !!item.assigned_to

  return (
    <div style={{ maxWidth: '600px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 6px' }}>{item.name}</h1>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: cat.bg, color: cat.color, fontWeight: '500' }}>
            {catCfg.label || item.category}
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

      {/* Current checkout banner */}
      {isCheckedOut && (
        <div style={{ background: '#e6f1fb', border: '1px solid #b8d4f0', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#185fa5', fontWeight: '600', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '.04em' }}>Currently checked out</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#0f3c6d', margin: '0 0 2px' }}>{item.assigned_to}</p>
            {item.checked_out_at && (
              <p style={{ fontSize: '12px', color: '#4a7fa5', margin: 0 }}>Since {fmt(item.checked_out_at)}</p>
            )}
            {item.booking_id && (
              <Link href={`/dashboard/sessions/${item.booking_id}`} style={{ fontSize: '12px', color: '#185fa5', textDecoration: 'underline' }}>
                View session →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Details card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Category</p>
            <p style={{ fontSize: '14px', margin: 0 }}>{catCfg.label || item.category}</p>
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
        {item.notes?.trim() && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>Notes</p>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>{item.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <EquipmentActions
        equipmentId={id}
        currentStatus={item.status}
        assignedTo={item.assigned_to}
        staffList={staffList}
      />

      {/* Checkout history */}
      {checkouts.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginTop: '12px' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>CHECKOUT HISTORY</p>
          </div>
          {checkouts.map((c, i) => {
            const bk = c.bookings as { booking_ref?: number | null; session_date?: string | null } | null
            const isOpen = !c.checked_in_at
            return (
              <div key={c.checkout_id} style={{
                padding: '12px 1.25rem',
                borderBottom: i < checkouts.length - 1 ? '1px solid var(--line-inner)' : 'none',
                display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 1px', color: 'var(--text)' }}>{c.assigned_to}</p>
                  {c.notes && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{c.notes}</p>}
                  {bk?.booking_ref && (
                    <Link href={`/dashboard/sessions/${c.booking_id}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                      Session #{bk.booking_ref}{bk.session_date ? ` · ${fmtDate(bk.session_date)}` : ''}
                    </Link>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 2px' }}>Out: {fmt(c.checked_out_at)}</p>
                  {!isOpen && <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>In: {fmt(c.checked_in_at)}</p>}
                </div>
                <span style={{
                  fontSize: '11px', padding: '2px 9px', borderRadius: '20px', fontWeight: '600', whiteSpace: 'nowrap',
                  background: isOpen ? '#e6f1fb' : '#f1f0ed',
                  color:      isOpen ? '#185fa5' : '#888',
                }}>
                  {isOpen ? 'Out' : 'Returned'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
