import test from 'node:test'
import assert from 'node:assert/strict'
import { getInviteAcceptanceError } from '../lib/invite-accept.ts'

test('getInviteAcceptanceError rejects already accepted invites', () => {
  assert.deepEqual(
    getInviteAcceptanceError({
      inviteAcceptedAt: '2026-04-22T10:00:00.000Z',
      invitedEmail: 'client@example.com',
      signedInEmail: 'client@example.com',
    }),
    { status: 409, error: 'This invitation has already been accepted' }
  )
})

test('getInviteAcceptanceError rejects mismatched emails', () => {
  assert.deepEqual(
    getInviteAcceptanceError({
      inviteAcceptedAt: null,
      invitedEmail: 'invited@example.com',
      signedInEmail: 'other@example.com',
    }),
    { status: 403, error: 'This invitation belongs to a different email address' }
  )
})

test('getInviteAcceptanceError allows matching pending invites', () => {
  assert.equal(
    getInviteAcceptanceError({
      inviteAcceptedAt: null,
      invitedEmail: 'member@example.com',
      signedInEmail: 'member@example.com',
    }),
    null
  )
})
