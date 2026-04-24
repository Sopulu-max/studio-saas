export function getInviteAcceptanceError({
  inviteAcceptedAt,
  invitedEmail,
  signedInEmail,
}: {
  inviteAcceptedAt?: string | null
  invitedEmail?: string | null
  signedInEmail?: string | null
}) {
  if (inviteAcceptedAt) {
    return { status: 409, error: 'This invitation has already been accepted' }
  }

  if ((invitedEmail ?? '').toLowerCase() !== (signedInEmail ?? '').toLowerCase()) {
    return { status: 403, error: 'This invitation belongs to a different email address' }
  }

  return null
}
