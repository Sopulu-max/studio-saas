'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getStudioContext, ownsBooking, ownsGallery, ownsGalleryPhoto } from '@/lib/studio'
import { sendGalleryEmail } from '@/lib/email'
import { unwrapRow } from "@/lib/utils";

const addGallerySchema = z.object({
  booking_id: z.string().min(1, 'Booking is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().default(''),
})

export async function addGallery(form: {
  booking_id: string
  title: string
  description: string
}) {
  const result = addGallerySchema.safeParse(form)
  if (!result.success) return { error: result.error.issues[0].message }

  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsBooking(context.admin, context.studioId, form.booking_id))) {
    return { error: 'Session not found' }
  }

  const slug = `${form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`

  const { data: gallery, error } = await context.admin
    .from('galleries')
    .insert({
      booking_id: form.booking_id,
      title: form.title,
      description: form.description,
      shared_link: slug,
      status: 'processing',
    })
    .select()
    .single()

  if (error || !gallery) return { error: error?.message ?? 'Failed to create gallery' }
  return { error: null, galleryId: gallery.gallery_id as string }
}

export async function updateGalleryStatus(galleryId: string, status: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsGallery(context.admin, context.studioId, galleryId))) {
    return { error: 'Gallery not found' }
  }

  const { error } = await context.admin
    .from('galleries')
    .update({ status })
    .eq('gallery_id', galleryId)
  return { error: error?.message ?? null }
}

export async function deletePhoto(photoId: string, fileUrl: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsGalleryPhoto(context.admin, context.studioId, photoId))) {
    return { error: 'Photo not found' }
  }

  const path = fileUrl.split('/gallery-photos/')[1]
  if (path) await context.admin.storage.from('gallery-photos').remove([path])
  const { error } = await context.admin
    .from('gallery_photos')
    .delete()
    .eq('photo_id', photoId)
  return { error: error?.message ?? null }
}

export async function deliverGallery(galleryId: string, driveLink?: string) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsGallery(context.admin, context.studioId, galleryId))) {
    return { error: 'Gallery not found' }
  }

  type GalleryDeliveryRow = {
    shared_link: string
    bookings: {
      booking_id: string
      session_date: string | null
      drive_link: string | null
      clients: { full_name: string | null; email: string | null } | null
    } | null
  }

  const { data: galleryRaw } = await context.admin
    .from('galleries')
    .select('shared_link, bookings(booking_id, session_date, drive_link, clients(full_name, email))')
    .eq('gallery_id', galleryId)
    .single()
  const gallery = galleryRaw as unknown as GalleryDeliveryRow | null

  if (!gallery) return { error: 'Gallery not found' }

  const clientEmail = unwrapRow(unwrapRow(gallery.bookings)?.clients)?.email
  if (!clientEmail) return { error: 'Client has no email address' }

  const { data: studio } = await context.admin
    .from('studios')
    .select('name')
    .eq('studio_id', context.studioId)
    .single()

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const galleryUrl = `${siteUrl}/gallery/${gallery.shared_link}`

  const { error: emailError } = await sendGalleryEmail({
    to: clientEmail,
    clientName: unwrapRow(unwrapRow(gallery.bookings)?.clients)?.full_name ?? 'Client',
    studioName: (studio?.name as string | null | undefined) ?? '',
    galleryUrl,
    driveLink: driveLink || unwrapRow(gallery.bookings)?.drive_link || undefined,
    sessionDate: unwrapRow(gallery.bookings)?.session_date ?? undefined,
  })

  if (emailError) return { error: emailError }

  // Mark gallery as delivered
  const { error: galleryError } = await context.admin
    .from('galleries')
    .update({ status: 'delivered' })
    .eq('gallery_id', galleryId)

  revalidatePath(`/dashboard/galleries/${galleryId}`)
  revalidatePath('/dashboard/galleries')
  return { error: null }
}

export async function toggleFavourite(photoId: string, current: boolean) {
  const context = await getStudioContext()
  if ('error' in context) return { error: context.error }

  if (!(await ownsGalleryPhoto(context.admin, context.studioId, photoId))) {
    return { error: 'Photo not found' }
  }

  const { error } = await context.admin
    .from('gallery_photos')
    .update({ is_favourite: !current })
    .eq('photo_id', photoId)
  return { error: error?.message ?? null }
}
