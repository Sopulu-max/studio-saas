'use client'

import React from 'react'
import { BuilderProvider } from './BuilderContext'
import { BuilderCanvas } from './BuilderCanvas'
import { BlockToolbar } from './BlockToolbar'
import { BuilderBlock } from '@/lib/domains/builder/repository'

export function UniversalBuilder({ 
  initialBlocks = [],
  isEditMode = false,
  storefrontData,
  onChange
}: { 
  initialBlocks?: BuilderBlock[]
  isEditMode?: boolean
  storefrontData?: any
  onChange?: (blocks: BuilderBlock[]) => void
}) {
  return (
    <BuilderProvider initialBlocks={initialBlocks} isEditMode={isEditMode} onChange={onChange} storefrontData={storefrontData}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <BuilderCanvas />
        {isEditMode && <BlockToolbar />}
      </div>
    </BuilderProvider>
  )
}
