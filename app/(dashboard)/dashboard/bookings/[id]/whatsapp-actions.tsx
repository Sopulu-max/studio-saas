'use client'

import GlobalWhatsAppActions, { WhatsAppAction } from '@/components/whatsapp-actions'

type SessionWhatsAppActionsProps = {
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
}: SessionWhatsAppActionsProps) {
  if (!phone) return null

  const firstName = clientName?.split(' ')[0] || 'there'
  const refText = sessionRef ? `(Ref #${sessionRef})` : ''

  const actions: WhatsAppAction[] = []

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
      priority: status === 'delivered' || status === 'completed',
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

  return <GlobalWhatsAppActions phone={phone} actions={actions} />
}
