import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Studio <onboarding@resend.dev>'

export async function sendInvoiceEmail({
  to,
  clientName,
  studioName,
  invoiceId,
  total,
  dueDate,
  sessionDate,
}: {
  to: string
  clientName: string
  studioName: string
  invoiceId: string
  total: number
  dueDate?: string
  sessionDate?: string
}) {
  const formatted = (n: number) =>
    '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 })

  const dueLine = dueDate
    ? `<p style="margin:0 0 8px;color:#555;font-size:14px;">Due by: <strong>${new Date(dueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>`
    : ''

  const sessionLine = sessionDate
    ? `<p style="margin:0 0 8px;color:#555;font-size:14px;">Session date: ${new Date(sessionDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e5e5;padding:32px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111;">${studioName}</p>
    <p style="margin:0 0 28px;font-size:13px;color:#888;">Invoice</p>

    <p style="margin:0 0 16px;font-size:15px;color:#111;">Hi ${clientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      Please find your invoice from <strong>${studioName}</strong> below.
    </p>

    <div style="background:#f4f4f4;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:24px;font-weight:600;color:#111;">${formatted(total)}</p>
      ${sessionLine}
      ${dueLine}
    </div>

    <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6;">
      If you have any questions about this invoice, please reply to this email.
    </p>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice from ${studioName} — ${formatted(total)}`,
    html,
  })

  return { error: error?.message ?? null }
}

export async function sendContractEmail({
  to,
  clientName,
  studioName,
  contractId,
  sessionDate,
  siteUrl,
}: {
  to: string
  clientName: string
  studioName: string
  contractId: string
  sessionDate?: string
  siteUrl?: string
}) {
  const base = (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const viewUrl = `${base}/view/contract/${contractId}`

  const sessionLine = sessionDate
    ? `<p style="margin:0 0 6px;font-size:14px;color:#555;">Session date: <strong>${new Date(sessionDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p>`
    : ''

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e5e5;padding:32px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111;">${studioName}</p>
    <p style="margin:0 0 28px;font-size:13px;color:#888;">Contract for review</p>

    <p style="margin:0 0 16px;font-size:15px;color:#111;">Hi ${clientName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
      Please review and download your contract with <strong>${studioName}</strong>.
      You can view the full contract, save it as a PDF, or print it using the button below.
    </p>

    ${sessionLine ? `<div style="background:#f4f4f4;border-radius:8px;padding:16px;margin-bottom:24px;">${sessionLine}</div>` : ''}

    <a href="${viewUrl}"
      style="display:block;text-align:center;padding:13px 24px;background:#111;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:24px;">
      View &amp; Download Contract →
    </a>

    <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <span style="color:#555;word-break:break-all;">${viewUrl}</span>
    </p>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0;" />

    <p style="margin:0;font-size:12px;color:#bbb;">
      Please reply to this email with any questions.
    </p>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your contract from ${studioName}`,
    html,
  })

  return { error: error?.message ?? null }
}

export async function sendBookingConfirmationEmail({
  to,
  clientName,
  studioName,
  sessionType,
  preferredDate,
}: {
  to: string
  clientName: string
  studioName: string
  sessionType: string
  preferredDate: string
}) {
  const typeLabel = sessionType.charAt(0).toUpperCase() + sessionType.slice(1)
  const dateLabel = new Date(preferredDate).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e5e5;padding:32px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111;">${studioName}</p>
    <p style="margin:0 0 28px;font-size:13px;color:#888;">Booking request received</p>

    <p style="margin:0 0 16px;font-size:15px;color:#111;">Hi ${clientName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      Thank you for your booking request! We've received your details and will be in touch shortly to confirm your session.
    </p>

    <div style="background:#f4f4f4;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.04em;font-weight:500;">Your request</p>
      <p style="margin:0 0 6px;font-size:14px;color:#111;"><strong>Type:</strong> ${typeLabel} session</p>
      <p style="margin:0;font-size:14px;color:#111;"><strong>Preferred date:</strong> ${dateLabel}</p>
    </div>

    <p style="margin:0;font-size:13px;color:#aaa;line-height:1.6;">
      If you have any questions, please reply to this email.
    </p>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Booking request received — ${studioName}`,
    html,
  })

  return { error: error?.message ?? null }
}

export async function sendStatusUpdateEmail({
  to,
  clientName,
  studioName,
  statusLabel,
  message,
}: {
  to: string
  clientName: string
  studioName: string
  statusLabel: string
  message?: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e5e5;padding:32px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111;">${studioName}</p>
    <p style="margin:0 0 28px;font-size:13px;color:#888;">Session update</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111;">Hi ${clientName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">Your session has been updated.</p>
    <div style="background:#f4f4f4;border-radius:8px;padding:16px 20px;margin-bottom:${message ? '20px' : '0'};">
      <p style="margin:0;font-size:15px;font-weight:600;color:#111;">Status: ${statusLabel}</p>
    </div>
    ${message ? `<p style="margin:0;font-size:14px;color:#555;line-height:1.6;">${message}</p>` : ''}
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Session update: ${statusLabel} — ${studioName}`,
    html,
  })
  return { error: error?.message ?? null }
}

export async function sendStaffInviteEmail({
  to,
  inviteeName,
  studioName,
  role,
  inviteUrl,
}: {
  to: string
  inviteeName: string
  studioName: string
  role: string
  inviteUrl: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e5e5;padding:32px;">
    <p style="margin:0 0 4px;font-size:18px;font-weight:600;color:#111;">${studioName}</p>
    <p style="margin:0 0 28px;font-size:13px;color:#888;">Team invitation</p>
    <p style="margin:0 0 16px;font-size:15px;color:#111;">Hi ${inviteeName},</p>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      You've been invited to join <strong>${studioName}</strong> as <strong>${role}</strong> on Weave.
      Click below to accept the invitation and set up your account.
    </p>
    <a href="${inviteUrl}" style="display:inline-block;padding:13px 28px;background:#111;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:24px;">
      Accept invitation →
    </a>
    <p style="margin:0;font-size:12px;color:#bbb;">This invitation expires in 7 days. If you weren't expecting this, ignore it safely.</p>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${studioName}`,
    html,
  })
  return { error: error?.message ?? null }
}

export async function sendStudioBookingNotification({
  studioEmail,
  studioName,
  clientName,
  clientPhone,
  sessionType,
  preferredDate,
}: {
  studioEmail: string
  studioName: string
  clientName: string
  clientPhone: string
  sessionType: string
  preferredDate: string
}) {
  const typeLabel = sessionType.charAt(0).toUpperCase() + sessionType.slice(1)
  const dateLabel = new Date(preferredDate).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f9f9f9;margin:0;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;border:1px solid #e5e5e5;padding:32px;">
    <p style="margin:0 0 28px;font-size:13px;color:#888;">New booking request on ${studioName}</p>
    <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">${clientName}</p>
    <p style="margin:0 0 20px;font-size:14px;color:#555;">${clientPhone}</p>
    <div style="background:#f4f4f4;border-radius:8px;padding:20px;margin-bottom:0;">
      <p style="margin:0 0 6px;font-size:14px;color:#111;"><strong>Type:</strong> ${typeLabel} session</p>
      <p style="margin:0;font-size:14px;color:#111;"><strong>Preferred date:</strong> ${dateLabel}</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM,
    to: studioEmail,
    subject: `New booking request from ${clientName}`,
    html,
  })

  return { error: error?.message ?? null }
}
