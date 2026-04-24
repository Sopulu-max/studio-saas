type BookingClientRelation =
  | { phone?: string | null }
  | Array<{ phone?: string | null }>
  | null

export function getClientPhone(clients: BookingClientRelation) {
  if (Array.isArray(clients)) return clients[0]?.phone ?? ''
  return clients?.phone ?? ''
}

function normalizePhone(value: string) {
  return value.replace(/[\s\-().+]/g, '')
}

function phoneTail(value: string) {
  return normalizePhone(value).slice(-10)
}

export function isGallerySelectionOpen({
  galleryStatus,
  bookingStatus,
  selectionsCount,
}: {
  galleryStatus?: string | null
  bookingStatus?: string | null
  selectionsCount?: number | string | null
}) {
  if (galleryStatus === 'expired') return false
  if (bookingStatus !== 'selecting') return false
  return Number(selectionsCount ?? 0) <= 0
}

export function isMatchingGalleryPhone(clients: BookingClientRelation, inputPhone: string) {
  const clientPhone = getClientPhone(clients)
  const normalizedInput = normalizePhone(inputPhone)

  return phoneTail(clientPhone) === phoneTail(normalizedInput) && normalizedInput.length >= 7
}
