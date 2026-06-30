'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateWhatsAppConfig } from '@/app/actions/studio'
import { MessageCircle } from 'lucide-react'

export default function IntegrationsForm({
  waPhoneNumberId,
  waAccessToken,
  waVerifyToken,
}: {
  waPhoneNumberId: string
  waAccessToken: string
  waVerifyToken: string
}) {
  const [form, setForm] = useState({ 
    wa_phone_number_id: waPhoneNumberId, 
    wa_access_token: waAccessToken, 
    wa_verify_token: waVerifyToken 
  })
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const { error } = await updateWhatsAppConfig(form)
    if (error) toast.error(error)
    else toast.success('WhatsApp configuration saved')
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-1)]">WhatsApp Integration</h2>
            <p className="text-[13px] text-[var(--text-3)]">Connect your studio to WhatsApp Business API to send and receive messages.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Phone Number ID</label>
            <input 
              type="text" 
              value={form.wa_phone_number_id} 
              onChange={e => setForm(f => ({ ...f, wa_phone_number_id: e.target.value }))}
              placeholder="e.g. 101234567890123"
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition font-mono"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">System User Access Token</label>
            <input 
              type="password" 
              value={form.wa_access_token} 
              onChange={e => setForm(f => ({ ...f, wa_access_token: e.target.value }))}
              placeholder="EAAD..."
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition font-mono"
            />
          </div>
          <div>
            <label className="block text-[13px] text-[var(--text-2)] mb-1.5">Webhook Verify Token</label>
            <input 
              type="text" 
              value={form.wa_verify_token} 
              onChange={e => setForm(f => ({ ...f, wa_verify_token: e.target.value }))}
              placeholder="Create a random secret token"
              className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[var(--primary)] transition font-mono"
            />
            <p className="text-[12px] text-[var(--text-3)] mt-1.5">You will need to enter this exact token in your Meta App Webhook settings.</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end pt-4 border-t border-[var(--line)]">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-[14px] font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save connection'}
          </button>
        </div>
      </div>
    </div>
  )
}
