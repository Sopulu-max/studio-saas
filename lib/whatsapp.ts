import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

const META_GRAPH_VERSION = 'v18.0'

export type WhatsAppWebhookPayload = {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: 'whatsapp'
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker'
          text?: { body: string }
          image?: { id: string; mime_type: string; sha256: string }
          document?: { id: string; mime_type: string; sha256: string }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
        }>
      }
      field: 'messages'
    }>
  }>
}

type WhatsAppMessage = NonNullable<
  WhatsAppWebhookPayload['entry'][number]['changes'][number]['value']['messages']
>[number]

type WhatsAppSendResponse = {
  messages?: Array<{ id: string }>
  error?: { message?: string }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Failed to send WhatsApp message'
}

/**
 * Validates the verify token during Meta's initial webhook setup.
 */
export async function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null
) {
  if (mode === 'subscribe' && token) {
    const admin = createAdminClient()
    const { data: studio } = await admin
      .from('studios')
      .select('studio_id')
      .eq('wa_verify_token', token)
      .maybeSingle()

    if (studio) {
      return new Response(challenge, { status: 200 })
    }
  }
  return new Response('Forbidden', { status: 403 })
}

/**
 * Sends a standard text message within the WhatsApp 24-hour window.
 */
export async function sendWhatsAppMessage(
  studioId: string,
  toPhone: string,
  content: string
) {
  const admin = createAdminClient()
  const { data: studio } = await admin
    .from('studios')
    .select('wa_phone_number_id, wa_access_token')
    .eq('studio_id', studioId)
    .single()

  if (!studio?.wa_phone_number_id || !studio?.wa_access_token) {
    return { error: 'WhatsApp not configured for this studio' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${studio.wa_phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studio.wa_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'text',
          text: { preview_url: false, body: content },
        }),
      }
    )

    const data = (await res.json()) as WhatsAppSendResponse
    if (!res.ok) throw new Error(data.error?.message || 'Failed to send WhatsApp message')

    const externalId = data.messages?.[0]?.id
    if (externalId) {
      await saveMessageToDb(admin, studioId, toPhone, 'outbound', content, externalId)
    }
    return { data }
  } catch (error) {
    return { error: errorMessage(error) }
  }
}

/**
 * Main processor for incoming webhooks.
 */
export async function processIncomingWebhook(payload: WhatsAppWebhookPayload) {
  const admin = createAdminClient()

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value
      if (value.messaging_product !== 'whatsapp') continue

      const { data: studio } = await admin
        .from('studios')
        .select('studio_id')
        .eq('wa_phone_number_id', value.metadata.phone_number_id)
        .maybeSingle()

      if (!studio) continue

      const studioId = studio.studio_id as string

      for (const msg of value.messages ?? []) {
        const parsed = parseIncomingMessage(msg)
        await saveMessageToDb(
          admin,
          studioId,
          msg.from,
          'inbound',
          parsed.content,
          msg.id,
          parsed.mediaUrl,
          parsed.mediaType
        )
      }

      for (const status of value.statuses ?? []) {
        await updateMessageStatus(admin, studioId, status.id, status.status)
      }
    }
  }
}

function parseIncomingMessage(
  msg: WhatsAppMessage
) {
  let content = ''
  let mediaUrl: string | null = null
  let mediaType: string | null = null

  if (msg.type === 'text') {
    content = msg.text?.body || ''
  } else if (msg.type === 'image' && msg.image) {
    content = 'Image attached'
    mediaUrl = msg.image.id
    mediaType = 'image'
  } else if (msg.type === 'document' && msg.document) {
    content = 'Document attached'
    mediaUrl = msg.document.id
    mediaType = 'document'
  } else {
    content = `[Received unsupported message type: ${msg.type}]`
  }

  return { content, mediaUrl, mediaType }
}

async function updateMessageStatus(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  externalId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed'
) {
  const { data: message } = await admin
    .from('messages')
    .select('id, conversations!inner(studio_id)')
    .eq('external_id', externalId)
    .eq('conversations.studio_id', studioId)
    .maybeSingle()

  if (!message?.id) return

  await admin
    .from('messages')
    .update({ status })
    .eq('id', message.id as string)
}

async function saveMessageToDb(
  admin: ReturnType<typeof createAdminClient>,
  studioId: string,
  clientPhone: string,
  direction: 'inbound' | 'outbound',
  content: string,
  externalId: string,
  mediaUrl: string | null = null,
  mediaType: string | null = null
) {
  let { data: conversation } = await admin
    .from('conversations')
    .select('id')
    .eq('studio_id', studioId)
    .eq('client_phone', clientPhone)
    .maybeSingle()

  if (!conversation) {
    const { data: client } = await admin
      .from('clients')
      .select('client_id')
      .eq('studio_id', studioId)
      .eq('phone', clientPhone)
      .maybeSingle()

    const { data: newConversation } = await admin
      .from('conversations')
      .insert({
        studio_id: studioId,
        client_phone: clientPhone,
        client_id: client?.client_id || null,
        status: 'open',
      })
      .select('id')
      .single()

    conversation = newConversation
  } else {
    await admin
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), status: 'open' })
      .eq('id', conversation.id as string)
      .eq('studio_id', studioId)
  }

  if (!conversation) return

  await admin.from('messages').insert({
    conversation_id: conversation.id as string,
    direction,
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    external_id: externalId,
    status: direction === 'inbound' ? 'received' : 'sent',
    requires_verification: mediaType === 'image' && direction === 'inbound',
  })
}
