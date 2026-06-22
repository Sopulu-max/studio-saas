import { NextRequest } from 'next/server'
import { verifyWebhook, processIncomingWebhook, WhatsAppWebhookPayload } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  return verifyWebhook(mode, token, challenge)
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as WhatsAppWebhookPayload

    // Process the webhook synchronously
    await processIncomingWebhook(payload)

    // Meta strictly requires a 200 OK response
    return new Response('EVENT_RECEIVED', { status: 200 })
  } catch (err) {
    console.error('Error processing WhatsApp webhook:', err)
    // We still return 200 so Meta doesn't block the webhook and retry aggressively,
    // though in a production queue system, we'd log this to an error tracker.
    return new Response('EVENT_RECEIVED', { status: 200 })
  }
}
