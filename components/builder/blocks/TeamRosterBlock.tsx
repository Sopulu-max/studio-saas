'use client'

import React from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import { useBuilder } from '../BuilderContext'
import Image from 'next/image'

export function TeamRosterBlock({ block, isEditMode, updateBlock }: { 
  block: BuilderBlock
  isEditMode: boolean
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void 
}) {
  const { storefrontData } = useBuilder()
  const team = storefrontData?.team || []
  const title = block.data.title || 'Meet the Team'
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
    <div style={{ width: '100%', padding: '40px 20px', background: 'transparent' }}>
      {EditControls}
      {titleEl}

      {team.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', borderRadius: '12px', color: 'var(--text-3)' }}>
          <p>No team members found.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '32px'
        }}>
          {team.map((member: any) => (
            <div key={member.staff_id} className="hover-lift" style={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '24px',
              borderRadius: '24px',
              background: 'var(--surface)'
            }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                overflow: 'hidden',
                background: 'var(--surface-2)',
                border: '4px solid var(--line-inner)',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                marginBottom: '16px',
                position: 'relative'
              }}>
                {member.avatar_url ? (
                  <Image src={member.avatar_url} alt={member.name} fill style={{ objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '32px', color: 'var(--text-4)' }}>{member.name?.[0] || 'T'}</span>
                  </div>
                )}
              </div>
              
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>{member.name}</h3>
              {member.bio && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-2)', lineHeight: '1.5' }}>{member.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
