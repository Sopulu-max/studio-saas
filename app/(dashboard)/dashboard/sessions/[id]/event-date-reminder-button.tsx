'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { sendEventDateReminder } from '@/app/actions/sessions'

interface EventDateReminderButtonProps {
  sessionId:  string
  clientName: string
  shootType:  string
  eventDate:  string
  daysUntil:  number
}

function daysLabel(d: number): string {
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  return `in ${d} day${d !== 1 ? 's' : ''}`
}

export default function EventDateReminderButton({
  sessionId,
  clientName,
  shootType,
  eventDate,
  daysUntil,
}: EventDateReminderButtonProps) {
  const [loading, setSent] = useState<'idle' | 'loading' | 'sent'>('idle')

  async function handleSend() {
    setSent('loading')
    const { error } = await sendEventDateReminder(sessionId)
    if (error) {
      toast.error(error)
      setSent('idle')
    } else {
      toast.success(`Reminder sent to ${clientName}`)
      setSent('sent')
    }
  }

  const label = daysLabel(daysUntil)
  const isUrgent = daysUntil <= 1

  if (loading === 'sent') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 16px', borderRadius: '8px',
        background: '#f0fdf4', border: '1px solid #86efac',
        fontSize: '13px', color: '#166534',
      }}>
        <span>✓</span>
        <span>Reminder sent to {clientName}</span>
      </div>
    )
  }

  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px',
      background: isUrgent ? '#fef3c7' : '#fefce8',
      border: `1px solid ${isUrgent ? '#f59e0b' : '#fde68a'}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '12px', flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ fontSize: '12px', fontWeight: 700, color: isUrgent ? '#92400e' : '#78350f', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isUrgent ? '🎉 ' : '📅 '}
          {shootType} is {label}
        </p>
        <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
          {new Date(eventDate).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <button
        onClick={handleSend}
        disabled={loading === 'loading'}
        style={{
          padding: '7px 16px', fontSize: '12px', fontWeight: 600,
          borderRadius: '7px', cursor: loading === 'loading' ? 'default' : 'pointer',
          background: '#f59e0b', color: 'white', border: 'none',
          opacity: loading === 'loading' ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {loading === 'loading' ? 'Sending…' : 'Send reminder email'}
      </button>
    </div>
  )
}
