// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionTypeConfig = {
  value:     string   // stored in DB, e.g. "studio", "outdoor", "event"
  label:     string   // display name, e.g. "Outdoor"
  color_bg:  string
  color_fg:  string
  icon?:     string   // optional emoji prefix
}

export type ServiceTypeConfig = {
  value:    string   // stored in DB, e.g. "photo", "video", "photo_video"
  label:    string   // display name, e.g. "Photography"
  color_bg: string
  color_fg: string
}

export type BookingStatusConfig = {
  value:    string   // stored in DB, e.g. "confirmed", "colour_grading"
  label:    string   // display name
  color_bg: string
  color_fg: string
  order:    number   // pipeline position (ascending)
  // special behaviours
  is_terminal?:               boolean  // no further transitions
  is_cancellation?:           boolean  // the "cancelled" terminal state
  requires_selection_count?:  boolean  // shows the photo-count selection form
  staff_role?: 'shooter' | 'grader' | 'editor' | null
}

export type StudioConfig = {
  sessionTypes:    SessionTypeConfig[]
  serviceTypes:    ServiceTypeConfig[]
  bookingStatuses: BookingStatusConfig[]
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
// Every new studio starts with these. Existing studios that have no custom
// config stored will also fall back to these at runtime.

export const DEFAULT_SESSION_TYPES: SessionTypeConfig[] = [
  { value: 'studio',  label: 'Studio',  color_bg: '#e0dcc8', color_fg: '#4a4530' },
  { value: 'outdoor', label: 'Outdoor', color_bg: '#b8dfa0', color_fg: '#245a0a' },
  { value: 'event',   label: 'Event',   color_bg: '#c4c0f8', color_fg: '#2e28a8' },
]

export const DEFAULT_SERVICE_TYPES: ServiceTypeConfig[] = [
  { value: 'photo',       label: 'Photography',    color_bg: '#dce8f5', color_fg: '#1a4a7a' },
  { value: 'video',       label: 'Videography',    color_bg: '#e8dcf5', color_fg: '#4a1a7a' },
  { value: 'photo_video', label: 'Photo + Video',  color_bg: '#f5f0dc', color_fg: '#7a5a1a' },
]

export const DEFAULT_BOOKING_STATUSES: BookingStatusConfig[] = [
  { value: 'pending_confirmation', label: 'Pending',        color_bg: '#f8cd80', color_fg: '#7a3800', order: 0 },
  { value: 'confirmed',            label: 'Confirmed',      color_bg: '#90c4f0', color_fg: '#0a3d80', order: 1, staff_role: 'shooter' },
  { value: 'in_progress',          label: 'In progress',    color_bg: '#c4c0f8', color_fg: '#2e28a8', order: 2, staff_role: 'shooter' },
  { value: 'colour_grading',       label: 'Colour grading', color_bg: '#f0a8d8', color_fg: '#7a1060', order: 3, staff_role: 'grader' },
  { value: 'selecting',            label: 'Selecting',      color_bg: '#90d8f0', color_fg: '#0a5070', order: 4, requires_selection_count: true },
  { value: 'editing',              label: 'Editing',        color_bg: '#f8cd80', color_fg: '#7a3800', order: 5, staff_role: 'editor' },
  { value: 'delivered',            label: 'Delivered',      color_bg: '#b8dfa0', color_fg: '#245a0a', order: 6, is_terminal: true },
  { value: 'cancelled',            label: 'Cancelled',      color_bg: '#f0a0a0', color_fg: '#8a1010', order: 99, is_terminal: true, is_cancellation: true },
]

// ─── Builder ──────────────────────────────────────────────────────────────────
// Merges whatever's stored in the DB with the defaults (DB wins).

export function buildStudioConfig(
  sessionTypes:    unknown,
  bookingStatuses: unknown,
  serviceTypes?:   unknown,
): StudioConfig {
  const types =
    Array.isArray(sessionTypes) && sessionTypes.length > 0
      ? (sessionTypes as SessionTypeConfig[])
      : DEFAULT_SESSION_TYPES

  const services =
    Array.isArray(serviceTypes) && serviceTypes.length > 0
      ? (serviceTypes as ServiceTypeConfig[])
      : DEFAULT_SERVICE_TYPES

  const statuses =
    Array.isArray(bookingStatuses) && bookingStatuses.length > 0
      ? (bookingStatuses as BookingStatusConfig[])
      : DEFAULT_BOOKING_STATUSES

  return {
    sessionTypes: types,
    serviceTypes: services,
    bookingStatuses: [...statuses].sort((a, b) => a.order - b.order),
  }
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getSessionTypeConfig(
  config: StudioConfig,
  value: string | null | undefined,
): SessionTypeConfig {
  return (
    config.sessionTypes.find(t => t.value === value) ??
    config.sessionTypes[0] ??
    DEFAULT_SESSION_TYPES[0]
  )
}

export function getServiceTypeConfig(
  config: StudioConfig,
  value: string | null | undefined,
): ServiceTypeConfig {
  return (
    config.serviceTypes.find(t => t.value === value) ??
    config.serviceTypes[0] ??
    DEFAULT_SERVICE_TYPES[0]
  )
}

export function getStatusConfig(
  config: StudioConfig,
  value: string | null | undefined,
): BookingStatusConfig {
  return (
    config.bookingStatuses.find(s => s.value === value) ??
    { value: value ?? '', label: value ?? '', color_bg: '#e0dcc8', color_fg: '#4a4530', order: 0 }
  )
}

/** Returns the next non-cancellation status in the pipeline, or null if terminal. */
export function getNextStatus(
  config: StudioConfig,
  currentValue: string,
): BookingStatusConfig | null {
  const active = config.bookingStatuses.filter(s => !s.is_cancellation)
  const idx = active.findIndex(s => s.value === currentValue)
  if (idx === -1) return null
  const next = active[idx + 1]
  return next?.is_terminal ? null : (next ?? null)
}

/** Returns the cancellation status, if one is configured. */
export function getCancellationStatus(
  config: StudioConfig,
): BookingStatusConfig | null {
  return config.bookingStatuses.find(s => s.is_cancellation) ?? null
}
