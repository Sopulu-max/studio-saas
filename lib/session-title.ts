const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

/**
 * Generates a short unique session identifier.
 * Format: "ADA-0004-02MAY26"
 *   - First 3 chars of client first name, uppercase
 *   - Padded booking ref (or first 4 chars of UUID if ref is null)
 *   - Zero-padded day + 3-letter month + 2-digit year
 */
export function sessionName(
  clientName: string | null | undefined,
  bookingRef: number | string | null | undefined,
  bookingId: string | null | undefined,
  sessionDate: string | null | undefined,
): string {
  const firstName = clientName?.trim().split(' ')[0] ?? 'UNK'
  const prefix = firstName.slice(0, 3).toUpperCase()

  const ref =
    bookingRef != null
      ? String(bookingRef).padStart(4, '0')
      : (bookingId ?? '').slice(0, 4).toUpperCase()

  let datePart = ''
  if (sessionDate) {
    try {
      const d = new Date(
        sessionDate.includes('T') ? sessionDate : sessionDate + 'T00:00:00',
      )
      const day   = String(d.getDate()).padStart(2, '0')
      const month = MONTHS[d.getMonth()]
      const year  = String(d.getFullYear()).slice(-2)
      datePart = `${day}${month}${year}`
    } catch {
      datePart = ''
    }
  }

  return datePart ? `${prefix}-${ref}-${datePart}` : `${prefix}-${ref}`
}

/**
 * Generates a human-readable, unique session title from booking data.
 * Format: "Ada Okafor · Studio · 14 Jun 2025"
 *
 * Works on both server (Node) and client (browser) — uses Intl.DateTimeFormat
 * so the format is locale-stable.
 */

export function sessionTitle(
  clientName: string | null | undefined,
  sessionType: string | null | undefined,
  sessionDate: string | null | undefined,
): string {
  const name = clientName?.trim() || 'Unknown client'

  const typeLabel = sessionType
    ? sessionType.charAt(0).toUpperCase() + sessionType.slice(1)
    : ''

  let dateLabel = ''
  if (sessionDate) {
    try {
      // session_date can be a date string like "2025-06-14" or a datetime
      const d = new Date(sessionDate.includes('T') ? sessionDate : sessionDate + 'T00:00:00')
      dateLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      dateLabel = ''
    }
  }

  const parts = [name, typeLabel, dateLabel].filter(Boolean)
  return parts.join(' · ')
}

/**
 * Shorter version for dropdowns and tight spaces.
 * Format: "Ada Okafor · 14 Jun 2025"
 */
export function sessionTitleShort(
  clientName: string | null | undefined,
  sessionDate: string | null | undefined,
): string {
  const name = clientName?.trim() || 'Unknown client'

  let dateLabel = ''
  if (sessionDate) {
    try {
      const d = new Date(sessionDate.includes('T') ? sessionDate : sessionDate + 'T00:00:00')
      dateLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      dateLabel = ''
    }
  }

  return [name, dateLabel].filter(Boolean).join(' · ')
}
