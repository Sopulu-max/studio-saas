'use client'

import React from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import { useBuilder } from '../BuilderContext'
import Image from 'next/image'

export function PackageGridBlock({ block, isEditMode, updateBlock }: { 
  block: BuilderBlock
  isEditMode: boolean
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void 
}) {
  const { storefrontData } = useBuilder()
  const packages = storefrontData?.packages || []
  const title = block.data.title || 'Our Packages'
  const alignment = block.data.align || 'center'

  // Edit Mode Header Settings
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

      {packages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--panel)', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p>No packages found. {isEditMode && 'Create some in your dashboard to see them here!'}</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {packages.map((pkg: any) => (
            <div key={pkg.package_id} className="hover-lift" style={{ 
              borderRadius: '16px', 
              overflow: 'hidden',
              background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid var(--line-inner)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {pkg.cover_url ? (
                <div style={{ width: '100%', height: '200px', position: 'relative', background: '#f5f5f5' }}>
                  <Image src={pkg.cover_url} alt={pkg.name} fill style={{ objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ width: '100%', height: '200px', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--text-4)' }}>No Image</span>
                </div>
              )}
              
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '600' }}>{pkg.name}</h3>
                {pkg.tagline && <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-2)' }}>{pkg.tagline}</p>}
                
                {pkg.base_price && (
                  <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>Starting at</span>
                    <span style={{ fontSize: '20px', fontWeight: '700' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(pkg.base_price)}
                    </span>
                  </div>
                )}
                
                {/* Simulated Book Button */}
                <button style={{ 
                  marginTop: '16px', 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none',
                  background: 'var(--text)', 
                  color: 'white', 
                  fontWeight: '500',
                  cursor: isEditMode ? 'default' : 'pointer'
                }}>
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
