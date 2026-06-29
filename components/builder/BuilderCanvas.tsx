'use client'

import React from 'react'
import { useBuilder } from './BuilderContext'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import { GripVertical } from 'lucide-react'

// We will map block types to components here
import { HeroBlock } from './blocks/HeroBlock'
import { TextBlock } from './blocks/TextBlock'
import { SpacerBlock } from './blocks/SpacerBlock'
import { PackageGridBlock } from './blocks/PackageGridBlock'
import { TeamRosterBlock } from './blocks/TeamRosterBlock'
import { GalleryPortfolioBlock } from './blocks/GalleryPortfolioBlock'

const BlockRegistry: Record<BuilderBlock['type'], React.FC<{ block: BuilderBlock; isEditMode: boolean; updateBlock: (id: string, data: Partial<BuilderBlock>) => void }>> = {
  hero: HeroBlock,
  text: TextBlock,
  spacer: SpacerBlock,
  image: () => <div style={{ padding: '40px', background: '#eee', textAlign: 'center' }}>[Image Block Placeholder]</div>,
  package_grid: PackageGridBlock,
  team_roster: TeamRosterBlock,
  gallery_portfolio: GalleryPortfolioBlock,
}

function SortableBlock({ block }: { block: BuilderBlock }) {
  const { isEditMode, selectedBlockId, setSelectedBlockId, updateBlock } = useBuilder()
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 1,
    padding: isEditMode ? '8px 0' : 0,
  }

  const isSelected = selectedBlockId === block.id
  const BlockComponent = BlockRegistry[block.type]

  if (!isEditMode) {
    if (!BlockComponent) return null
    return <BlockComponent block={block} isEditMode={false} updateBlock={updateBlock} />
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedBlockId(block.id)
      }}
    >
      <div style={{
        position: 'absolute',
        left: '-40px',
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: 'grab',
        padding: '8px',
        color: 'var(--text-4)',
        display: isSelected ? 'block' : 'none'
      }} {...attributes} {...listeners}>
        <GripVertical size={20} />
      </div>
      
      <div style={{
        border: isSelected ? '2px solid var(--btn)' : '2px solid transparent',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease'
      }}>
        {BlockComponent ? (
          <BlockComponent block={block} isEditMode={true} updateBlock={updateBlock} />
        ) : (
          <div style={{ padding: '20px', background: '#f5f5f5', textAlign: 'center' }}>
            Unknown Block Type: {block.type}
          </div>
        )}
      </div>
    </div>
  )
}

export function BuilderCanvas() {
  const { blocks, isEditMode, setSelectedBlockId } = useBuilder()

  return (
    <div 
      style={{ 
        minHeight: isEditMode ? '70vh' : 'auto',
        paddingBottom: isEditMode ? '120px' : '0'
      }}
      onClick={() => isEditMode && setSelectedBlockId(null)}
    >
      {blocks.length === 0 && isEditMode && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '40vh', 
          border: '2px dashed var(--line-inner)',
          borderRadius: '24px',
          color: 'var(--text-4)',
          fontSize: '15px'
        }}>
          Click a block below to start building your layout
        </div>
      )}
      {blocks.map(block => (
        <SortableBlock key={block.id} block={block} />
      ))}
    </div>
  )
}
