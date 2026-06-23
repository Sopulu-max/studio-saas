import { SupabaseClient } from '@supabase/supabase-js'
import { buildGenericContractTemplate } from './contract-template'

export async function runPhase3Automation(
  admin: SupabaseClient<any, "public", any>,
  studioId: string,
  bookingId: string,
  packageId?: string | null
) {
  // 1. Fetch necessary data
  const { data: booking } = await admin
    .from('bookings')
    .select('client_id, session_date, clients(full_name)')
    .eq('booking_id', bookingId)
    .single()

  if (!booking) return

  const { data: studio } = await admin
    .from('studios')
    .select('name, default_contract_template')
    .eq('studio_id', studioId)
    .single()

  let packageName = 'Custom Session'
  let invoiceTotal = 0

  if (packageId) {
    const { data: pkg } = await admin
      .from('packages')
      .select('name, base_price')
      .eq('package_id', packageId)
      .single()
    if (pkg) {
      packageName = pkg.name
      invoiceTotal += Number(pkg.base_price || 0)
    }

    // Sum up any add-ons from booking_services that match package_services where is_addon = true
    const { data: pkgServices } = await admin
      .from('package_services')
      .select('service_id, is_addon, addon_price')
      .eq('package_id', packageId)

    const { data: bookingServices } = await admin
      .from('booking_services')
      .select('service_id, price_at_booking')
      .eq('booking_id', bookingId)

    if (pkgServices && bookingServices) {
      for (const bs of bookingServices) {
        const matchingPkgService = pkgServices.find(ps => ps.service_id === bs.service_id)
        if (matchingPkgService?.is_addon) {
          invoiceTotal += Number(bs.price_at_booking || matchingPkgService.addon_price || 0)
        }
      }
    }
  }

  // 2. Insert Draft Invoice
  const { data: invoice } = await admin
    .from('invoices')
    .insert({
      booking_id: bookingId,
      subtotal: invoiceTotal,
      tax: 0,
      discount: 0,
      total: invoiceTotal,
      status: 'draft',
      issued_at: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  // 3. Insert Draft Contract
  const clientName = Array.isArray(booking.clients) ? booking.clients[0]?.full_name : (booking.clients as any)?.full_name || 'Client'
  const studioName = studio?.name || 'Studio'
  const sessionDateStr = booking.session_date ? new Date(booking.session_date).toLocaleDateString() : 'TBD'
  
  const contractContent = studio?.default_contract_template || buildGenericContractTemplate({
    studioName,
    clientName,
    sessionDate: sessionDateStr,
    packageName
  })

  await admin.from('contracts').insert({
    booking_id: bookingId,
    content: contractContent,
    status: 'draft'
  })

  // 4. Insert Unpublished Gallery
  await admin.from('galleries').insert({
    booking_id: bookingId,
    name: `Session with ${clientName}`,
    status: 'unpublished'
  })
}
