import test from 'node:test'
import assert from 'node:assert/strict'
import { getClientPhone, isGallerySelectionOpen, isMatchingGalleryPhone } from '../lib/gallery-public.ts'

test('getClientPhone supports object and array relations', () => {
  assert.equal(getClientPhone({ phone: '+234 801 234 5678' }), '+234 801 234 5678')
  assert.equal(getClientPhone([{ phone: '08012345678' }]), '08012345678')
  assert.equal(getClientPhone(null), '')
})

test('isMatchingGalleryPhone compares normalized phone tails', () => {
  assert.equal(
    isMatchingGalleryPhone({ phone: '+234 801 234 5678' }, '08012345678'),
    true
  )
  assert.equal(
    isMatchingGalleryPhone([{ phone: '(080) 123-45678' }], '+234-809-999-0000'),
    false
  )
})

test('isGallerySelectionOpen only allows active selecting galleries with no submitted selections', () => {
  assert.equal(
    isGallerySelectionOpen({
      galleryStatus: 'ready',
      bookingStatus: 'selecting',
      selectionsCount: 0,
    }),
    true
  )

  assert.equal(
    isGallerySelectionOpen({
      galleryStatus: 'expired',
      bookingStatus: 'selecting',
      selectionsCount: 0,
    }),
    false
  )

  assert.equal(
    isGallerySelectionOpen({
      galleryStatus: 'ready',
      bookingStatus: 'delivered',
      selectionsCount: 0,
    }),
    false
  )

  assert.equal(
    isGallerySelectionOpen({
      galleryStatus: 'ready',
      bookingStatus: 'selecting',
      selectionsCount: 3,
    }),
    false
  )
})
