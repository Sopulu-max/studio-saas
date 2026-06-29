import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSignedPublicLink, verifySignedPublicLink } from '../lib/public-links.ts'

function readParams(url: string) {
  const parsed = new URL(url)
  return {
    pathname: parsed.pathname,
    sig: parsed.searchParams.get('sig') ?? undefined,
    exp: parsed.searchParams.get('exp') ?? undefined,
  }
}

test('buildSignedPublicLink creates a verifiable invoice URL', () => {
  const url = buildSignedPublicLink('my-studio', 'invoice', 'inv_123', 'https://example.com', 1)
  const { pathname, sig, exp } = readParams(url)

  assert.equal(pathname, '/my-studio/portal/invoice/inv_123')
  assert.ok(sig)
  assert.ok(exp)
  assert.equal(verifySignedPublicLink('invoice', 'inv_123', sig, exp), true)
})

test('verifySignedPublicLink rejects tampered ids', () => {
  const url = buildSignedPublicLink('my-studio', 'contract', 'ctr_123', 'https://example.com', 1)
  const { sig, exp } = readParams(url)

  assert.equal(verifySignedPublicLink('contract', 'ctr_999', sig, exp), false)
})

test('verifySignedPublicLink rejects expired links', () => {
  const expiredAt = String(Date.now() - 60_000)

  assert.equal(
    verifySignedPublicLink('invoice', 'inv_123', 'deadbeef', expiredAt),
    false
  )
})
