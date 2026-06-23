/**
 * lib/whatsapp-links.ts
 * Generates formatted wa.me links for the "Quick Share Hub" and general app infrastructure.
 * These links are meant to be used by the STUDIO MANAGER to send messages to clients,
 * OR by the app to quickly open WhatsApp for the studio manager with a pre-filled text.
 */

function formatPhone(phone?: string | null): string {
  if (!phone) return ''
  return phone.replace(/[^\d+]/g, '')
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const cleanPhone = formatPhone(phone)
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`
}

/** 
 * Generate a pre-filled message for sharing the studio's booking link
 */
export function buildBookingShareLink(studioName: string, studioSlug: string, clientPhone?: string | null) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${base.replace(/\/$/, '')}/book/${studioSlug}`
  const msg = `Hi! Here is the booking link for ${studioName}. You can view our packages and select your preferred date here:\n\n${url}`
  return buildWhatsAppLink(clientPhone, msg)
}

/** 
 * Generate a pre-filled message for sharing the studio's package catalog
 */
export function buildPackagesShareLink(studioName: string, studioSlug: string, clientPhone?: string | null) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${base.replace(/\/$/, '')}/packages/${studioSlug}`
  const msg = `Hi! Here are the packages and pricing for ${studioName}:\n\n${url}`
  return buildWhatsAppLink(clientPhone, msg)
}

/**
 * Generate a pre-filled message for sending an invoice to a client
 */
export function buildInvoiceShareLink(invoiceShortId: string, total: number | string, publicLink: string, clientPhone?: string | null) {
  const fmtTotal = 'NGN ' + Number(total).toLocaleString('en-NG')
  const msg = `Hi! Here is your invoice (#${invoiceShortId}) for the amount of ${fmtTotal}. You can view it and get payment details here:\n\n${publicLink}`
  return buildWhatsAppLink(clientPhone, msg)
}

/**
 * Generate a pre-filled message for sending a gallery to a client
 */
export function buildGalleryShareLink(galleryTitle: string, galleryUrl: string, password?: string | null, clientPhone?: string | null) {
  let msg = `Hi! Your gallery "${galleryTitle}" is ready to view!\n\nYou can access it here: ${galleryUrl}`
  if (password) {
    msg += `\nPassword: ${password}`
  }
  return buildWhatsAppLink(clientPhone, msg)
}

/**
 * Generate a pre-filled message with custom content
 */
export function buildCustomShareLink(content: string, clientPhone?: string | null) {
  return buildWhatsAppLink(clientPhone, content)
}
