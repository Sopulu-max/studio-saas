// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionTypeConfig = {
  value:      string   // stored in DB, e.g. "studio", "outdoor", "event"
  label:      string   // display name, e.g. "Outdoor"
  color_bg:   string
  color_fg:   string
  icon?:      string   // optional emoji prefix
  is_event?:  boolean  // event-specific fields (name, venue, event date)
  is_outdoor?: boolean // outdoor-specific fields (location)
}

export type BookingField = {
  key:      string   // e.g. "outfits_count", "video_duration"
  required: boolean
}

export type ServiceTypeConfig = {
  value:           string   // stored in DB, e.g. "photo", "video", "photo_video"
  label:           string   // display name, e.g. "Photography"
  color_bg:        string
  color_fg:        string
  booking_fields?: BookingField[]
  has_video_crew?: boolean  // shows videographer/video_editor assignment fields
}

// All fields a studio can configure per service type
export type BookingFieldDef = {
  key:         string
  label:       string
  description: string
  inputType:   'text' | 'number' | 'date' | 'suggest'
}

export const BOOKING_FIELD_DEFINITIONS: BookingFieldDef[] = [
  { key: 'outfits_count',    label: 'Number of outfits',    description: 'How many outfit changes the client wants',       inputType: 'number'  },
  { key: 'shoot_type',       label: 'Occasion / category',  description: 'e.g. Birthday, Graduation, Anniversary',         inputType: 'suggest' },
  { key: 'event_date',       label: 'Occasion date',        description: 'Date of the occasion being photographed',        inputType: 'date'    },
  { key: 'location_address', label: 'Preferred location',   description: 'Venue, area, or address for the shoot',          inputType: 'text'    },
  { key: 'event_name',       label: 'Event name',           description: 'e.g. Sandra & Emeka\'s Wedding',                 inputType: 'text'    },
  { key: 'video_duration',   label: 'Desired video length', description: 'e.g. 3–5 min highlight, full ceremony',          inputType: 'text'    },
  { key: 'coverage_hours',   label: 'Hours of coverage',    description: 'How many hours of shooting are needed',          inputType: 'number'  },
  { key: 'crew_size',        label: 'Crew size needed',     description: 'Number of photographers/videographers required',  inputType: 'number'  },
]

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
  staff_role?: string | null           // references a StaffRoleConfig value
}

export type EquipmentCategoryConfig = {
  value:    string
  label:    string
  color_bg: string
  color_fg: string
}

export type StaffRoleConfig = {
  value:    string
  label:    string
  color_bg: string
  color_fg: string
}

export type StudioConfig = {
  sessionTypes:        SessionTypeConfig[]
  serviceTypes:        ServiceTypeConfig[]
  bookingStatuses:     BookingStatusConfig[]
  equipmentCategories: EquipmentCategoryConfig[]
  staffRoles:          StaffRoleConfig[]
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
// Every new studio starts with these. Existing studios that have no custom
// config stored will also fall back to these at runtime.

export const DEFAULT_SESSION_TYPES: SessionTypeConfig[] = [
  { value: 'studio',  label: 'Studio',  color_bg: '#e0dcc8', color_fg: '#4a4530' },
  { value: 'outdoor', label: 'Outdoor', color_bg: '#b8dfa0', color_fg: '#245a0a', is_outdoor: true },
  { value: 'event',   label: 'Event',   color_bg: '#c4c0f8', color_fg: '#2e28a8', is_event: true },
]

export const DEFAULT_SERVICE_TYPES: ServiceTypeConfig[] = [
  {
    value: 'photo', label: 'Photography', color_bg: '#dce8f5', color_fg: '#1a4a7a',
    booking_fields: [
      { key: 'outfits_count',    required: false },
      { key: 'shoot_type',       required: false },
      { key: 'event_date',       required: false },
      { key: 'location_address', required: false },
    ],
  },
  {
    value: 'video', label: 'Videography', color_bg: '#e8dcf5', color_fg: '#4a1a7a', has_video_crew: true,
    booking_fields: [
      { key: 'event_name',       required: false },
      { key: 'event_date',       required: false },
      { key: 'location_address', required: false },
      { key: 'video_duration',   required: false },
      { key: 'coverage_hours',   required: false },
    ],
  },
  {
    value: 'photo_video', label: 'Photo + Video', color_bg: '#f5f0dc', color_fg: '#7a5a1a', has_video_crew: true,
    booking_fields: [
      { key: 'outfits_count',    required: false },
      { key: 'shoot_type',       required: false },
      { key: 'event_date',       required: false },
      { key: 'location_address', required: false },
      { key: 'event_name',       required: false },
      { key: 'video_duration',   required: false },
      { key: 'coverage_hours',   required: false },
    ],
  },
]

export const DEFAULT_BOOKING_STATUSES: BookingStatusConfig[] = [
  { value: 'pending_confirmation', label: 'Pending',        color_bg: '#f8cd80', color_fg: '#7a3800', order: 0 },
  { value: 'confirmed',            label: 'Confirmed',      color_bg: '#90c4f0', color_fg: '#0a3d80', order: 1, staff_role: 'photographer' },
  { value: 'in_progress',          label: 'In progress',    color_bg: '#c4c0f8', color_fg: '#2e28a8', order: 2, staff_role: 'photographer' },
  { value: 'colour_grading',       label: 'Colour grading', color_bg: '#f0a8d8', color_fg: '#7a1060', order: 3, staff_role: 'colour_grader' },
  { value: 'selecting',            label: 'Selecting',      color_bg: '#90d8f0', color_fg: '#0a5070', order: 4, requires_selection_count: true },
  { value: 'editing',              label: 'Editing',        color_bg: '#f8cd80', color_fg: '#7a3800', order: 5, staff_role: 'editor' },
  { value: 'delivered',            label: 'Delivered',      color_bg: '#b8dfa0', color_fg: '#245a0a', order: 6, is_terminal: true },
  { value: 'cancelled',            label: 'Cancelled',      color_bg: '#f0a0a0', color_fg: '#8a1010', order: 99, is_terminal: true, is_cancellation: true },
]

export const DEFAULT_EQUIPMENT_CATEGORIES: EquipmentCategoryConfig[] = [
  { value: 'camera',    label: 'Camera',    color_bg: '#eeedfe', color_fg: '#534ab7' },
  { value: 'lens',      label: 'Lens',      color_bg: '#e6f1fb', color_fg: '#185fa5' },
  { value: 'lighting',  label: 'Lighting',  color_bg: '#faeeda', color_fg: '#854f0b' },
  { value: 'accessory', label: 'Accessory', color_bg: '#eaf3de', color_fg: '#3b6d11' },
  { value: 'other',     label: 'Other',     color_bg: '#f1efe8', color_fg: '#5f5e5a' },
]

export const DEFAULT_STAFF_ROLES: StaffRoleConfig[] = [
  { value: 'photographer',   label: 'Photographer',      color_bg: '#e6f1fb', color_fg: '#185fa5' },
  { value: 'second_shooter', label: 'Second shooter',    color_bg: '#eeedfe', color_fg: '#534ab7' },
  { value: 'videographer',   label: 'Videographer',      color_bg: '#fce8f3', color_fg: '#8b2d6e' },
  { value: 'colour_grader',  label: 'Colour grader',     color_bg: '#fce8f3', color_fg: '#8b2d6e' },
  { value: 'editor',         label: 'Editor / retoucher', color_bg: '#faeeda', color_fg: '#854f0b' },
  { value: 'assistant',      label: 'Assistant',         color_bg: '#eaf3de', color_fg: '#3b6d11' },
  { value: 'manager',        label: 'Studio manager',    color_bg: '#fbeaf0', color_fg: '#993556' },
]

// ─── Builder ──────────────────────────────────────────────────────────────────
// Merges whatever's stored in the DB with the defaults (DB wins).

export function buildStudioConfig(
  sessionTypes:         unknown,
  bookingStatuses:      unknown,
  serviceTypes?:        unknown,
  equipmentCategories?: unknown,
  staffRoles?:          unknown,
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

  const categories =
    Array.isArray(equipmentCategories) && equipmentCategories.length > 0
      ? (equipmentCategories as EquipmentCategoryConfig[])
      : DEFAULT_EQUIPMENT_CATEGORIES

  const roles =
    Array.isArray(staffRoles) && staffRoles.length > 0
      ? (staffRoles as StaffRoleConfig[])
      : DEFAULT_STAFF_ROLES

  return {
    sessionTypes:        types,
    serviceTypes:        services,
    bookingStatuses:     [...statuses].sort((a, b) => a.order - b.order),
    equipmentCategories: categories,
    staffRoles:          roles,
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

export function getEquipmentCategoryConfig(
  config: StudioConfig,
  value: string | null | undefined,
): EquipmentCategoryConfig {
  return (
    config.equipmentCategories.find(c => c.value === value) ??
    { value: value ?? '', label: value ?? 'Other', color_bg: '#f1efe8', color_fg: '#5f5e5a' }
  )
}

export function getStaffRoleConfig(
  config: StudioConfig,
  value: string | null | undefined,
): StaffRoleConfig {
  return (
    config.staffRoles.find(r => r.value === value) ??
    { value: value ?? '', label: value ?? '', color_bg: '#f1efe8', color_fg: '#5f5e5a' }
  )
}

/**
 * Returns the booking_fields for a given service type value.
 * Falls back to the default config for that value, then to photo defaults.
 */
export function getServiceTypeBookingFields(
  config: StudioConfig,
  serviceTypeValue: string | null | undefined,
): BookingField[] {
  const svc = config.serviceTypes.find(t => t.value === serviceTypeValue)
  if (svc?.booking_fields?.length) return svc.booking_fields
  const def = DEFAULT_SERVICE_TYPES.find(t => t.value === serviceTypeValue)
  if (def?.booking_fields?.length) return def.booking_fields
  return DEFAULT_SERVICE_TYPES[0].booking_fields ?? []
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
