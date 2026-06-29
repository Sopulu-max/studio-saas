'use client'

import React from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import { useBuilder } from '../BuilderContext'
import Image from 'next/image'
import Link from 'next/link'

export function GalleryPortfolioBlock({ block, isEditMode, updateBlock }: { 
  block: BuilderBlock
  isEditMode: boolean
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void 
}) {
  const { storefrontData } = useBuilder()
  const portfolio = storefrontData?.portfolio || []
  const title = block.data.title || 'Recent Work'
  const alignment = block.data.align || 'center'

  const EditControls = isEditMode ? (
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
  ) : null

  const titleEl = isEditMode ? (
    <input
      type="text"
      value={title}
      onChange={(e) => updateBlock(block.id, { data: { ...block.data, title: e.target.value }})}
      style={{ 
        width: '100%', 
        fontSize: '32px', 
        fontWeight: '600',
        color: 'var(--text)',
        textAlign: alignment as any,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontFamily: 'inherit',
        marginBottom: '32px'
      }}
      placeholder="Section Title"
    />
  ) : (
    <h2 style={{ 
      fontSize: '32px', 
      fontWeight: '600', 
      color: 'var(--text)',
      textAlign: alignment as any,
      marginBottom: '32px',
      marginTop: 0
    }}>
      {title}
    </h2>
  )

  return (
    <div style={{ width: '100%', padding: '40px 20px' }}>
      {EditControls}
      {titleEl}

      {portfolio.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--panel)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p>No public galleries found. {isEditMode && 'Mark some galleries as public to show them here.'}</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '2px' // tight grid like Instagram or modern portfolios
        }}>
          {portfolio.map((gallery: any) => {
            const inner = (
              <div style={{ 
                position: 'relative',
                width: '100%', 
                aspectRatio: '1/1',
                background: '#f5f5f5',
                overflow: 'hidden',
                cursor: 'pointer'
              }}>
                {gallery.cover_photo_url ? (
                  <Image 
                    src={gallery.cover_photo_url} 
                    alt={gallery.title || 'Gallery'} 
                    fill 
                    style={{ objectFit: 'cover', transition: 'transform 0.4s ease' }} 
                    className="portfolio-img hover:scale-105"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-4)' }}>No Cover</span>
                  </div>
                )}
                
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '24px',
                  transition: 'opacity 0.2s'
                }}>
                  <span style={{ color: 'white', fontWeight: '500', fontSize: '18px' }}>
                    {gallery.title || 'Untitled Collection'}
                  </span>
                </div>
              </div>
            )

            // If we are in edit mode, links shouldn't work.
            if (isEditMode) {
              return <div key={gallery.gallery_id}>{inner}</div>
            }

            // Normal mode
            return (
              <Link href={gallery.shared_link || '#'} key={gallery.gallery_id} style={{ textDecoration: 'none' }}>
                {inner}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
