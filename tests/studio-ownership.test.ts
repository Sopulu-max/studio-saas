import test from 'node:test'
import assert from 'node:assert/strict'
import { ownsBooking, ownsGallery, ownsGalleryPhoto, ownsInvoice } from '../lib/studio-ownership.ts'

function createFakeAdmin(responses: Record<string, unknown>) {
  return {
    from(table: string) {
      const filters = new Map<string, string>()
      return {
        select(query: string) {
          void query
          return this
        },
        eq(column: string, value: string) {
          filters.set(column, value)
          return this
        },
        async maybeSingle() {
          const key = `${table}|${Array.from(filters.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')}`
          return { data: responses[key] ?? null }
        },
      }
    },
  }
}

test('ownsBooking scopes by studio_id', async () => {
  const admin = createFakeAdmin({
    'bookings|booking_id=b1&studio_id=s1': { booking_id: 'b1' },
  })

  await assert.equal(await ownsBooking(admin, 's1', 'b1'), true)
  await assert.equal(await ownsBooking(admin, 's2', 'b1'), false)
})

test('ownsInvoice checks joined booking studio ownership', async () => {
  const admin = createFakeAdmin({
    'invoices|bookings.studio_id=s1&invoice_id=i1': { invoice_id: 'i1' },
  })

  await assert.equal(await ownsInvoice(admin, 's1', 'i1'), true)
  await assert.equal(await ownsInvoice(admin, 's2', 'i1'), false)
})

test('ownsGallery follows gallery booking ownership', async () => {
  const admin = createFakeAdmin({
    'galleries|gallery_id=g1': { gallery_id: 'g1', booking_id: 'b1' },
    'bookings|booking_id=b1&studio_id=s1': { booking_id: 'b1' },
  })

  await assert.equal(await ownsGallery(admin, 's1', 'g1'), true)
  await assert.equal(await ownsGallery(admin, 's2', 'g1'), false)
})

test('ownsGalleryPhoto follows photo to gallery to booking ownership', async () => {
  const admin = createFakeAdmin({
    'gallery_photos|photo_id=p1': { photo_id: 'p1', gallery_id: 'g1' },
    'galleries|gallery_id=g1': { gallery_id: 'g1', booking_id: 'b1' },
    'bookings|booking_id=b1&studio_id=s1': { booking_id: 'b1' },
  })

  await assert.equal(await ownsGalleryPhoto(admin, 's1', 'p1'), true)
  await assert.equal(await ownsGalleryPhoto(admin, 's2', 'p1'), false)
})
