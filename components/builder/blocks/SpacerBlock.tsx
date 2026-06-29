'use client'

import React from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'

export function SpacerBlock({ block, isEditMode, updateBlock }: { 
  block: BuilderBlock
  isEditMode: boolean
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void 
}) {
  const height = block.data.height || 64 // default 64px

  if (isEditMode) {
    return (
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, background: 'repeating-linear-gradient(45deg, #f8f8f8, #f8f8f8 10px, #ffffff 10px, #ffffff 20px)' }}>
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => updateBlock(block.id, { data: { ...block.data, height: Math.max(16, height - 16) }})}
            style={{ padding: '2px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--line)', cursor: 'pointer' }}
          >
            -
          </button>
          <span style={{ fontSize: '12px', background: 'white', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--line)' }}>
            {height}px
          </span>
          <button 
            onClick={() => updateBlock(block.id, { data: { ...block.data, height: height + 16 }})}
            style={{ padding: '2px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--line)', cursor: 'pointer' }}
          >
            +
          </button>
        </div>
      </div>
    )
  }

  return <div style={{ width: '100%', height: `${height}px` }} />
}
