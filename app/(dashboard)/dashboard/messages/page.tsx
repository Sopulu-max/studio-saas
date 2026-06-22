import { getStudioContext } from '@/lib/studio'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Image as ImageIcon, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { sendStudioMessage, verifyPaymentProof } from '@/app/actions/messages'

export const metadata = { title: 'Messages | Weave' }

type ConversationRow = {
  id: string
  client_phone: string
  status: string | null
  last_message_at: string | null
  clients?: { full_name?: string | null } | null
}

type MessageRow = {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  content: string | null
  media_url: string | null
  media_type: string | null
  status: string | null
  requires_verification: boolean | null
  created_at: string
}

type OpenInvoiceRow = {
  invoice_id: string
  total: number | string | null
  status: string | null
  bookings?: {
    booking_ref?: number | null
    clients?: { full_name?: string | null } | null
  } | null
}

function invoiceLabel(invoice: OpenInvoiceRow) {
  const ref = invoice.bookings?.booking_ref != null
    ? `#${String(invoice.bookings.booking_ref).padStart(4, '0')}`
    : invoice.invoice_id.slice(0, 8)
  const clientName = invoice.bookings?.clients?.full_name ?? 'Client'
  const total = Number(invoice.total ?? 0).toLocaleString('en-NG')
  return `${ref} - ${clientName} (NGN ${total})`
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { c: activeConversationId } = await searchParams

  const { data: convData } = await context.admin
    .from('conversations')
    .select('id, client_phone, status, last_message_at, clients(full_name)')
    .eq('studio_id', context.studioId)
    .order('last_message_at', { ascending: false })

  const conversations = (convData ?? []) as unknown as ConversationRow[]
  const activeConversation = activeConversationId
    ? conversations.find((conv) => conv.id === activeConversationId) ?? null
    : null

  let messages: MessageRow[] = []
  if (activeConversation) {
    const { data } = await context.admin
      .from('messages')
      .select('*, conversations!inner(studio_id)')
      .eq('conversation_id', activeConversation.id)
      .eq('conversations.studio_id', context.studioId)
      .order('created_at', { ascending: true })

    messages = (data ?? []) as unknown as MessageRow[]
  }

  const { data: invData } = await context.admin
    .from('invoices')
    .select('invoice_id, total, status, bookings!inner(studio_id, booking_ref, clients(full_name))')
    .eq('bookings.studio_id', context.studioId)
    .in('status', ['draft', 'sent', 'overdue'])

  const openInvoices = (invData ?? []) as unknown as OpenInvoiceRow[]

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <Card className="w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            WhatsApp Inbox
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No messages yet.</p>
          ) : (
            conversations.map((conv) => (
              <Link key={conv.id} href={`/dashboard/messages?c=${conv.id}`}>
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    activeConversation?.id === conv.id
                      ? 'bg-primary/10 border-primary/20'
                      : 'hover:bg-muted bg-card border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium truncate">
                      {conv.clients?.full_name || 'Unknown Client'}
                    </span>
                    {conv.status === 'open' && <Badge variant="secondary" className="text-[10px]">Open</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{conv.client_phone}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
            <p>{activeConversationId ? 'Conversation not found' : 'Select a conversation to view messages'}</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
              <h3 className="font-medium">Chat History</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[80%] ${
                    msg.direction === 'outbound' ? 'ml-auto items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${
                      msg.direction === 'outbound'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted rounded-tl-sm'
                    }`}
                  >
                    {msg.media_url && (
                      <div className="mb-2 flex items-center justify-center w-48 h-48 bg-black/10 rounded overflow-hidden">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.direction === 'outbound' && <span>&bull; {msg.status}</span>}
                  </div>

                  {msg.requires_verification && msg.direction === 'inbound' && (
                    <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg w-full max-w-sm">
                      <div className="flex items-start gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Payment Proof</p>
                          <p className="text-xs text-orange-600/80 dark:text-orange-400/80">This image might be a transfer receipt.</p>
                        </div>
                      </div>

                      <form action={async (formData) => {
                        'use server'
                        const invoiceId = formData.get('invoiceId') as string
                        const amount = Number(formData.get('amount'))
                        if (!invoiceId || !amount) return
                        await verifyPaymentProof(msg.id, invoiceId, amount)
                      }} className="space-y-2">
                        <select
                          name="invoiceId"
                          required
                          className="w-full text-sm rounded border-gray-300 bg-white dark:bg-black p-2"
                        >
                          <option value="">Select open invoice...</option>
                          {openInvoices.map((invoice) => (
                            <option key={invoice.invoice_id} value={invoice.invoice_id}>
                              {invoiceLabel(invoice)}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            name="amount"
                            placeholder="Amount verified"
                            required
                            className="flex-1 text-sm rounded border-gray-300 bg-white dark:bg-black p-2"
                          />
                          <Button type="submit" size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                            Verify
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-card">
              <form action={async (formData) => {
                'use server'
                const content = formData.get('content') as string
                await sendStudioMessage(activeConversation.id, content)
              }} className="flex gap-2">
                <input
                  name="content"
                  type="text"
                  placeholder="Type a message to the client..."
                  className="flex-1 rounded-md border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-transparent"
                  required
                  autoComplete="off"
                />
                <Button type="submit">Send</Button>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
