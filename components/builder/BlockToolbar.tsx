'use client'

import React from 'react'
import { useBuilder } from './BuilderContext'
import { Plus, Type, Image as ImageIcon, Layout, Grid, Users, LayoutTemplate, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AVAILABLE_BLOCKS = [
  { type: 'hero', icon: Layout, label: 'Hero Section' },
  { type: 'text', icon: Type, label: 'Text/Markdown' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'spacer', icon: LayoutTemplate, label: 'Spacer' },
  { type: 'package_grid', icon: Grid, label: 'Package Grid' },
  { type: 'team_roster', icon: Users, label: 'Team Roster' },
  { type: 'gallery_portfolio', icon: ImageIcon, label: 'Gallery Portfolio' },
] as const

export function BlockToolbar() {
  const { isEditMode, addBlock, blocks, selectedBlockId, updateBlock, removeBlock } = useBuilder()

  if (!isEditMode) return null

  const selectedBlock = blocks.find(b => b.id === selectedBlockId)

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      alignItems: 'center'
    }}>
      <AnimatePresence>
        {selectedBlock && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-panel"
            style={{
              padding: '12px 20px',
              borderRadius: '20px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>
              Editing: {selectedBlock.type}
            </span>
            <div style={{ width: '1px', height: '16px', background: 'var(--line-inner)' }} />
            {/* Contextual config inputs could go here depending on the block type */}
            <button
              onClick={() => removeBlock(selectedBlock.id)}
              style={{
                background: 'transparent', border: 'none', color: '#a32d2d', cursor: 'pointer',
                display: 'flex', alignItems: 'center', padding: '4px'
              }}
              title="Remove Block"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel" style={{
        padding: '8px',
        borderRadius: '24px',
        display: 'flex',
        gap: '4px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
      }}>
        {AVAILABLE_BLOCKS.map(block => (
          <button
            key={block.type}
            onClick={() => addBlock(block.type)}
            className="hover-lift"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '16px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
            title={`Add ${block.label}`}
          >
            <block.icon size={16} />
            <span className="hidden md:inline">{block.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
