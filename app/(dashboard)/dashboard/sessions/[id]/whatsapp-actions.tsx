'use client'

import { motion } from 'framer-motion'

type WhatsAppActionsProps = {
  phone: string | null
  clientName: string | null
  balanceDue: number
  hasInvoice: boolean
  hasGallery: boolean
  status: string
  sessionRef: number | null
}

export default function WhatsAppActions({ 
  phone, 
  clientName, 
  balanceDue, 
  hasInvoice, 
  hasGallery, 
  status,
  sessionRef
}: WhatsAppActionsProps) {
  if (!phone) return null

  // Format phone for wa.me
  const cleanPhone = phone.replace(/\D/g, '')
  const firstName = clientName?.split(' ')[0] || 'there'
  const refText = sessionRef ? `(Ref #${sessionRef})` : ''

  const actions = []

  if (!hasInvoice) {
    actions.push({
      label: 'Request Details for Invoice',
      msg: `Hi ${firstName}, we are preparing your invoice ${refText}. Please let us know if you have any additional requirements.`,
      priority: false,
    })
  }

  if (balanceDue > 0) {
    actions.push({
      label: 'Send Balance Reminder',
      msg: `Hi ${firstName}, a quick reminder that there is a pending balance of ₦${balanceDue.toLocaleString()} for your session ${refText}. Let us know if you need the payment link again!`,
      priority: status === 'delivered' || status === 'completed', // High priority if delivered but unpaid
    })
  }

  if (status === 'ready' && hasGallery) {
    actions.push({
      label: 'Notify Gallery Ready',
      msg: `Hi ${firstName}! Great news, your photos ${refText} are ready to view. I'll send the link in the next message!`,
      priority: true,
    })
  }

  actions.push({
    label: 'Send General Update',
    msg: `Hi ${firstName}, `,
    priority: false,
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: '#25D366', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
        WHATSAPP CONTROL CENTER
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {actions.map((act, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={act.priority ? {
              boxShadow: ['0px 0px 0px rgba(37, 211, 102, 0)', '0px 0px 12px rgba(37, 211, 102, 0.4)', '0px 0px 0px rgba(37, 211, 102, 0)']
            } : {}}
            transition={act.priority ? { duration: 2, repeat: Infinity } : {}}
          >
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(act.msg)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block',
                background: act.priority ? '#25D366' : 'var(--bg)',
                color: act.priority ? '#fff' : 'var(--text)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                textDecoration: 'none',
                border: act.priority ? '1px solid #25D366' : '1px solid var(--line-inner)',
              }}
            >
              {act.label} →
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
