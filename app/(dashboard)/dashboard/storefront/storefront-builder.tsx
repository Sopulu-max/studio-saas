'use client'

import React, { useState } from 'react'
import { UniversalBuilder } from '@/components/builder'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import { saveLayoutAction, publishLayoutAction } from '@/app/actions/builder'
import { toast } from 'sonner'
import { Check, Globe, Save } from 'lucide-react'

export function StorefrontBuilder({ 
  initialDraft, 
  storefrontData 
}: { 
  initialDraft: BuilderBlock[]
  storefrontData: any
}) {
  const [blocks, setBlocks] = useState<BuilderBlock[]>(initialDraft)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  const handleSaveDraft = async () => {
    setIsSaving(true)
    const res = await saveLayoutAction('storefront', blocks, 'draft')
    setIsSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Draft saved')
    }
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    // 1. Save draft first
    await saveLayoutAction('storefront', blocks, 'draft')
    // 2. Publish
    const res = await publishLayoutAction('storefront')
    setIsPublishing(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Storefront published live!')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 24px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--panel)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px' }}>Storefront Builder</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Design your public facing studio page</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="hover-lift"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', fontSize: '13px', fontWeight: '500', 
              borderRadius: '8px', border: '1px solid var(--line-inner)', 
              background: 'transparent', color: 'var(--text)', cursor: 'pointer' 
            }}
          >
            {isSaving ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Save size={14} />}
            Save Draft
          </button>
          
          <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="hover-lift"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', fontSize: '13px', fontWeight: '500', 
              borderRadius: '8px', border: 'none', 
              background: 'var(--btn)', color: 'var(--btn-fg)', cursor: 'pointer' 
            }}
          >
            {isPublishing ? <span className="spinner" style={{ width: '14px', height: '14px' }} /> : <Globe size={14} />}
            Publish Live
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {/* Render Builder inside a simulated wrapper to represent the page container */}
        <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'white', minHeight: '100%', boxShadow: '0 0 40px rgba(0,0,0,0.02)' }}>
          <UniversalBuilder 
            initialBlocks={blocks} 
            isEditMode={true} 
            onChange={setBlocks}
            storefrontData={storefrontData}
          />
        </div>
      </div>
    </div>
  )
}
