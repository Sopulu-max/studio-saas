'use client'

import { useState } from 'react'
import AddSessionModal from './AddSessionModal'

export default function AddSessionButton({ bookingId }: { bookingId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line-inner)',
          color: 'var(--text-2)',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer'
        }}
        className="hover-lift"
      >
        + Add Session
      </button>

      {isOpen && (
        <AddSessionModal bookingId={bookingId} onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
