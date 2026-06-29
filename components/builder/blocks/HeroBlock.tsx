'use client'

import React from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import Image from 'next/image'

export function HeroBlock({ block, isEditMode, updateBlock }: { 
  block: BuilderBlock
  isEditMode: boolean
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void 
}) {
  const headline = block.data.headline || 'Your Beautiful Studio'
  const subheadline = block.data.subheadline || 'Capturing moments that last a lifetime'
  const imageUrl = block.data.imageUrl || ''
  const alignment = block.data.align || 'center'

  if (isEditMode) {
    return (
      <div style={{ position: 'relative', width: '100%', padding: '40px 20px', background: '#fafafa', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center' }}>
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
        
        <input
          type="text"
          value={headline}
          onChange={(e) => updateBlock(block.id, { data: { ...block.data, headline: e.target.value }})}
          style={{ 
            width: '100%', 
            fontSize: '48px', 
            fontWeight: '700',
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            textAlign: alignment,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: 'inherit',
            marginBottom: '16px'
          }}
          placeholder="Headline"
        />

        <textarea
          value={subheadline}
          onChange={(e) => updateBlock(block.id, { data: { ...block.data, subheadline: e.target.value }})}
          style={{ 
            width: '100%', 
            fontSize: '18px', 
            color: 'var(--text-3)',
            textAlign: alignment,
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontFamily: 'inherit',
            resize: 'none',
            minHeight: '60px'
          }}
          placeholder="Subheadline"
        />

        <div style={{ marginTop: '24px', textAlign: alignment }}>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => updateBlock(block.id, { data: { ...block.data, imageUrl: e.target.value }})}
            placeholder="Paste Hero Image URL here..."
            style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line-inner)', fontSize: '14px' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: alignment === 'center' ? 'center' : 'flex-start',
      textAlign: alignment as any,
      padding: '80px 20px',
      overflow: 'hidden'
    }}>
      {imageUrl && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Image 
            src={imageUrl} 
            alt="Hero background" 
            fill 
            style={{ objectFit: 'cover' }}
            priority
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
        </div>
      )}
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', width: '100%' }}>
        <h1 style={{ 
          fontSize: 'clamp(40px, 6vw, 64px)', 
          fontWeight: '700', 
          letterSpacing: '-0.02em', 
          margin: '0 0 24px',
          color: imageUrl ? '#fff' : 'var(--text)',
          lineHeight: '1.1'
        }}>
          {headline}
        </h1>
        <p style={{ 
          fontSize: 'clamp(18px, 2.5vw, 22px)', 
          color: imageUrl ? 'rgba(255,255,255,0.9)' : 'var(--text-3)',
          margin: 0,
          maxWidth: '600px',
          marginLeft: alignment === 'center' ? 'auto' : '0',
          marginRight: alignment === 'center' ? 'auto' : '0'
        }}>
          {subheadline}
        </p>
      </div>
    </div>
  )
}
