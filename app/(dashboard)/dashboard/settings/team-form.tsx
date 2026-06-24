'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { inviteStaffMember, revokeStaffInvite, resendStaffInvite } from '@/app/actions/team'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

const ROLE_OPTIONS = [
  { value: 'photographer',   label: 'Photographer' },
  { value: 'second_shooter', label: 'Second shooter' },
  { value: 'colour_grader',  label: 'Colour grader' },
  { value: 'editor',         label: 'Editor / retoucher' },
  { value: 'assistant',      label: 'Assistant' },
  { value: 'manager',        label: 'Studio manager' },
  { value: 'other',          label: 'Other' },
]

type StaffMember = {
  staff_id: string
  full_name: string
  email: string
  role: string
  invite_sent_at: string | null
  invite_accepted_at: string | null
  user_id: string | null
}

export default function TeamForm({ initial }: { initial: StaffMember[] }) {
  const [members, setMembers] = useState<StaffMember[]>(initial)
  const [adding, setAdding]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('photographer')

  async function handleInvite() {
    setLoading(true)
    const { error } = await inviteStaffMember({ fullName: newName, email: newEmail, role: newRole })
    if (error) { toast.error(error); setLoading(false); return }
    toast.success('Invitation sent!')
    setNewName(''); setNewEmail(''); setAdding(false); setLoading(false)
    // Optimistic add
    setMembers(prev => [...prev, {
      staff_id: crypto.randomUUID(),
      full_name: newName, email: newEmail, role: newRole,
      invite_sent_at: new Date().toISOString(), invite_accepted_at: null, user_id: null,
    }])
  }

  async function handleRevoke(staffId: string) {
    if (!confirm('Remove this person from your team?')) return
    const { error } = await revokeStaffInvite(staffId)
    if (error) { toast.error(error); return }
    setMembers(prev => prev.filter(m => m.staff_id !== staffId))
    toast.success('Removed')
  }

  async function handleResend(staffId: string) {
    const { error } = await resendStaffInvite(staffId)
    if (error) toast.error(error)
    else toast.success('Invite resent!')
  }

  const roleLabel = (role: string) => ROLE_OPTIONS.find(r => r.value === role)?.label ?? role

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Team members</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Invite staff to access their assigned sessions.
          </p>
        </div>
        <button onClick={() => setAdding(v => !v)} type="button"
          style={{ padding: '5px 12px', fontSize: '13px', flexShrink: 0, marginLeft: '12px' }}>
          {adding ? 'Cancel' : '+ Invite'}
        </button>
      </div>

      {/* Invite form */}
      {adding && (
        <div style={{ background: 'var(--hover)', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Smith"
                style={{ width: '100%', boxSizing: 'border-box' as const }} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane@example.com"
                style={{ width: '100%', boxSizing: 'border-box' as const }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: '100%' }}>
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button onClick={handleInvite} disabled={loading || !newName.trim() || !newEmail.trim()} type="button"
              style={{ padding: '8px 18px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              {loading ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-4)', padding: '20px 0', textAlign: 'center' }}>
          No team members yet. Invite someone to get started.
        </p>
      ) : (
        <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {members.map((m, i) => (
            <AnimatedItem key={m.staff_id} delay={i * 0.05}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', background: 'var(--surface)',
                border: '1px solid var(--line-inner)', borderRadius: '8px',
              }}>
                {/* Avatar initials */}
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: 'var(--hover)', border: '1px solid var(--line-inner)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: '600', color: 'var(--text-3)',
                }}>
                  {m.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {m.full_name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {m.email}
                  </p>
                </div>

                <span style={{ fontSize: '12px', color: 'var(--text-3)', flexShrink: 0 }}>
                  {roleLabel(m.role)}
                </span>

                {/* Status badge */}
                {m.user_id || m.invite_accepted_at ? (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#eaf3de', color: '#245a0a', flexShrink: 0, fontWeight: '500' }}>
                    Active
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#faeeda', color: '#7a3800', flexShrink: 0, fontWeight: '500' }}>
                    Pending
                  </span>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  {!m.user_id && !m.invite_accepted_at && (
                    <button type="button" onClick={() => handleResend(m.staff_id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-3)', padding: '3px 6px', borderRadius: '4px' }}>
                      Resend
                    </button>
                  )}
                  <button type="button" onClick={() => handleRevoke(m.staff_id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>
                    ×
                  </button>
                </div>
              </div>
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}

      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '14px 0 0' }}>
        Staff members receive an email invitation and can only see sessions assigned to them.
      </p>
    </div>
  )
}
