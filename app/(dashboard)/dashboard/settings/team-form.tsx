'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { inviteStaffMember, revokeStaffInvite, resendStaffInvite, updateStaffMember } from '@/app/actions/team'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'
import type { SettingsStaffDTO } from '@/lib/domains/settings/types'
import { Plus, UserMinus, RefreshCw, Mail, CheckCircle2, Shield, Eye, EyeOff, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLE_OPTIONS = [
  { value: 'photographer',   label: 'Photographer' },
  { value: 'second_shooter', label: 'Second shooter' },
  { value: 'colour_grader',  label: 'Colour grader' },
  { value: 'editor',         label: 'Editor / retoucher' },
  { value: 'assistant',      label: 'Assistant' },
  { value: 'manager',        label: 'Studio manager' },
  { value: 'other',          label: 'Other' },
]

export default function TeamForm({ initial }: { initial: SettingsStaffDTO[] }) {
  const [members, setMembers] = useState<SettingsStaffDTO[]>(initial)
  const [adding, setAdding]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('photographer')
  const [editingId, setEditingId] = useState<string | null>(null)

  async function handleInvite() {
    setLoading(true)
    const { error } = await inviteStaffMember({ fullName: newName, email: newEmail, role: newRole })
    if (error) { toast.error(error); setLoading(false); return }
    toast.success('Invitation sent!')
    setNewName(''); setNewEmail(''); setAdding(false); setLoading(false)
    // Optimistic add
    setMembers(prev => [...prev, {
      staff_id: crypto.randomUUID(),
      full_name: newName, email: newEmail, roles: [newRole],
      invite_sent_at: new Date().toISOString(), invite_accepted_at: null, user_id: null,
      is_public: false, public_name: null, public_bio: null,
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

  async function togglePublicVisibility(staffId: string, currentStatus: boolean) {
    const { error } = await updateStaffMember(staffId, { is_public: !currentStatus })
    if (error) { toast.error(error); return }
    setMembers(prev => prev.map(m => m.staff_id === staffId ? { ...m, is_public: !currentStatus } : m))
    toast.success(currentStatus ? 'Profile hidden from public' : 'Profile made public')
  }

  async function saveProfileEdits(staffId: string, payload: { public_name: string, public_bio: string }) {
    const { error } = await updateStaffMember(staffId, payload)
    if (error) { toast.error(error); return }
    setMembers(prev => prev.map(m => m.staff_id === staffId ? { ...m, ...payload } : m))
    setEditingId(null)
    toast.success('Profile updated')
  }

  const roleLabel = (role: string) => ROLE_OPTIONS.find(r => r.value === role)?.label ?? role

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)] mb-1">Team Members</h2>
            <p className="text-[13px] text-[var(--text-3)]">
              Invite staff, assign roles, and manage their public storefront profiles.
            </p>
          </div>
          <button 
            onClick={() => setAdding(v => !v)} 
            type="button"
            className="px-4 py-2 bg-[var(--btn)] text-[var(--btn-fg)] text-[13px] font-medium rounded-lg hover:brightness-110 transition flex items-center gap-2"
          >
            {adding ? 'Cancel' : <><Plus className="w-4 h-4" /> Invite</>}
          </button>
        </div>

        {/* Invite form */}
        {adding && (
          <div className="bg-[var(--bg-hover)] border border-[var(--line)] rounded-xl p-4 mb-6">
            <h3 className="text-[13px] font-semibold text-[var(--text-1)] mb-4">Invite new member</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[12px] text-[var(--text-3)] mb-1.5">Full Name</label>
                <input 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="Jane Smith"
                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition" 
                  autoFocus 
                />
              </div>
              <div>
                <label className="block text-[12px] text-[var(--text-3)] mb-1.5">Email</label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={e => setNewEmail(e.target.value)} 
                  placeholder="jane@example.com"
                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition" 
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[12px] text-[var(--text-3)] mb-1.5">Role</label>
                <select 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value)} 
                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition"
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <button 
                onClick={handleInvite} 
                disabled={!newName || !newEmail || loading}
                className="w-full md:w-auto px-5 py-2.5 bg-[var(--primary)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        )}

        {/* Member List */}
        <AnimatedList className="space-y-3">
          {members.map(member => {
            const isEditing = editingId === member.staff_id;
            return (
              <AnimatedItem key={member.staff_id}>
                <div className={cn(
                  "border border-[var(--line)] rounded-xl overflow-hidden transition-all duration-300",
                  isEditing ? "bg-[var(--bg-hover)] shadow-sm" : "bg-transparent"
                )}>
                  {/* Summary Row */}
                  <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex flex-shrink-0 items-center justify-center text-[16px] font-semibold text-[var(--text-2)] border border-[var(--line)]">
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[14px] font-medium text-[var(--text-1)]">{member.full_name}</p>
                          {member.user_id ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              <Mail className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-3)]">
                          <span>{member.email}</span>
                          <span className="w-1 h-1 rounded-full bg-[var(--text-4)]"></span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {member.roles.map(roleLabel).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => togglePublicVisibility(member.staff_id, member.is_public)}
                        className={cn(
                          "px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors border flex items-center gap-1.5",
                          member.is_public 
                            ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20" 
                            : "bg-[var(--bg-hover)] text-[var(--text-3)] border-[var(--line)] hover:text-[var(--text-2)]"
                        )}
                        title="Toggle visibility on storefront"
                      >
                        {member.is_public ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {member.is_public ? 'Public' : 'Hidden'}
                      </button>

                      <button 
                        onClick={() => setEditingId(isEditing ? null : member.staff_id)}
                        className="px-3 py-1.5 bg-[var(--btn)] text-[var(--btn-fg)] text-[12px] font-medium rounded-lg hover:brightness-110 transition"
                      >
                        {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                      </button>
                      
                      {!member.user_id && (
                        <button 
                          onClick={() => handleResend(member.staff_id)}
                          className="px-3 py-1.5 bg-[var(--bg-hover)] text-[var(--text-2)] text-[12px] font-medium rounded-lg hover:bg-[var(--line)] transition"
                          title="Resend Invite"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button 
                        onClick={() => handleRevoke(member.staff_id)}
                        className="p-1.5 text-red-500/70 hover:text-red-600 hover:bg-red-500/10 rounded transition"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Form */}
                  {isEditing && (
                    <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)]">
                      <PublicProfileEditor 
                        member={member} 
                        onSave={(payload) => saveProfileEdits(member.staff_id, payload)} 
                      />
                    </div>
                  )}
                </div>
              </AnimatedItem>
            )
          })}
          {members.length === 0 && (
            <div className="text-center py-10 border border-[var(--line)] border-dashed rounded-xl">
              <Users className="w-8 h-8 text-[var(--text-4)] mx-auto mb-3" />
              <p className="text-[14px] text-[var(--text-2)] mb-1">No team members yet</p>
              <p className="text-[13px] text-[var(--text-3)]">Invite someone to start collaborating.</p>
            </div>
          )}
        </AnimatedList>
      </div>
    </div>
  )
}

function PublicProfileEditor({ 
  member, 
  onSave 
}: { 
  member: SettingsStaffDTO, 
  onSave: (payload: { public_name: string, public_bio: string }) => void 
}) {
  const [publicName, setPublicName] = useState(member.public_name || '')
  const [publicBio, setPublicBio] = useState(member.public_bio || '')

  return (
    <div className="space-y-4">
      <h4 className="text-[13px] font-semibold text-[var(--text-1)]">Storefront Profile Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-[12px] text-[var(--text-3)] mb-1.5">Public Name (Optional)</label>
          <input 
            value={publicName} 
            onChange={e => setPublicName(e.target.value)} 
            placeholder={member.full_name}
            className="w-full bg-[var(--bg-hover)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition" 
          />
          <p className="text-[11px] text-[var(--text-4)] mt-1">Leave blank to use full name.</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[12px] text-[var(--text-3)] mb-1.5">Public Bio</label>
          <textarea 
            value={publicBio} 
            onChange={e => setPublicBio(e.target.value)} 
            placeholder="Tell clients about this team member..."
            rows={3}
            className="w-full bg-[var(--bg-hover)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition resize-none" 
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button 
          onClick={() => onSave({ public_name: publicName || member.full_name, public_bio: publicBio })}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-[13px] font-medium hover:opacity-90 transition"
        >
          Save Profile
        </button>
      </div>
    </div>
  )
}
