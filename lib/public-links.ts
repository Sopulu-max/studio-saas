import crypto from 'node:crypto'

type PublicLinkKind = 'invoice' | 'contract' | 'summary'

function getPublicLinkSecret() {
  return process.env.PUBLIC_LINK_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-public-link-secret'
}

function buildPayload(kind: PublicLinkKind, id: string, expiresAt: string) {
  return `${kind}:${id}:${expiresAt}`
}

function signPayload(payload: string) {
  return crypto
    .createHmac('sha256', getPublicLinkSecret())
    .update(payload)
    .digest('hex')
}

export function buildSignedPublicLink(kind: PublicLinkKind, id: string, siteUrl?: string, ttlHours = 24 * 14) {
  const base = (siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const expiresAt = String(Date.now() + ttlHours * 60 * 60 * 1000)
  const signature = signPayload(buildPayload(kind, id, expiresAt))
  return `${base}/view/${kind}/${id}?exp=${expiresAt}&sig=${signature}`
}

export function verifySignedPublicLink(kind: PublicLinkKind, id: string, signature?: string, expiresAt?: string) {
  if (!signature || !expiresAt) return false

  const expiry = Number(expiresAt)
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false

  const expected = signPayload(buildPayload(kind, id, expiresAt))
  const received = signature.trim()

  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}
