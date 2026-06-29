'use client'

import React from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'

export function TextBlock({ block, isEditMode, updateBlock }: { 
  block: BuilderBlock
  isEditMode: boolean
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void 
}) {
  const content = block.data.content || 'Start typing here...'
  const alignment = block.data.align || 'left'

  if (isEditMode) {
    return (
      <div style={{ position: 'relative', width: '100%', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'var(--panel)', padding: '6px', borderRadius: '8px', width: 'fit-content' }}>
          <button 
            onClick={() => updateBlock(block.id, { data: { ...block.data, align: 'left' }})}
            style={{ padding: '4px 8px', fontSize: '12px', background: alignment === 'left' ? 'var(--btn)' : 'transparent', color: alignment === 'left' ? 'var(--btn-fg)' : 'var(--text-2)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Left
          </button>
          <button 
            onClick={() => updateBlock(block.id, { data: { ...block.data, align: 'center' }})}
            style={{ padding: '4px 8px', fontSize: '12px', background: alignment === 'center' ? 'var(--btn)' : 'transparent', color: alignment === 'center' ? 'var(--btn-fg)' : 'var(--text-2)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Center
          </button>
        </div>
        
        <textarea
          value={content}
          onChange={(e) => updateBlock(block.id, { data: { ...block.data, content: e.target.value }})}
          style={{ 
            width: '100%', 
            minHeight: '100px', 
            fontSize: '16px', 
            lineHeight: '1.6',
            color: 'var(--text)',
            textAlign: alignment,
            border: 'none',
            background: 'transparent',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit'
          }}
          placeholder="Start typing..."
        />
      </div>
    )
  }

  return (
    <div style={{ 
      width: '100%', 
      padding: '16px 0', 
      textAlign: alignment as any,
      fontSize: '16px', 
      lineHeight: '1.6',
      color: 'var(--text)',
      whiteSpace: 'pre-wrap'
    }}>
      {content}
    </div>
  )
}
