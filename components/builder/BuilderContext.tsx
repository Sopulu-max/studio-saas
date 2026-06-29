'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { BuilderBlock } from '@/lib/domains/builder/repository'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface BuilderContextType {
  blocks: BuilderBlock[]
  setBlocks: React.Dispatch<React.SetStateAction<BuilderBlock[]>>
  selectedBlockId: string | null
  setSelectedBlockId: (id: string | null) => void
  addBlock: (type: BuilderBlock['type'], index?: number) => void
  updateBlock: (id: string, data: Partial<BuilderBlock>) => void
  removeBlock: (id: string) => void
  moveBlock: (oldIndex: number, newIndex: number) => void
  isEditMode: boolean
  storefrontData?: any // Holding the injected public DTO for ecosystem blocks
}

const BuilderContext = createContext<BuilderContextType | null>(null)

export function useBuilder() {
  const context = useContext(BuilderContext)
  if (!context) throw new Error('useBuilder must be used within a BuilderProvider')
  return context
}

export function BuilderProvider({ 
  initialBlocks = [], 
  isEditMode = true,
  storefrontData,
  onChange,
  children 
}: { 
  initialBlocks?: BuilderBlock[]
  isEditMode?: boolean
  storefrontData?: any
  onChange?: (blocks: BuilderBlock[]) => void
  children: ReactNode 
}) {
  const [blocks, setBlocksState] = useState<BuilderBlock[]>(initialBlocks)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const setBlocks = (action: React.SetStateAction<BuilderBlock[]>) => {
    setBlocksState(prev => {
      const next = typeof action === 'function' ? action(prev) : action
      onChange?.(next)
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const addBlock = (type: BuilderBlock['type'], index?: number) => {
    const newBlock: BuilderBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      data: {},
      style: {}
    }
    
    setBlocks(prev => {
      const copy = [...prev]
      if (index !== undefined) {
        copy.splice(index, 0, newBlock)
      } else {
        copy.push(newBlock)
      }
      return copy
    })
    setSelectedBlockId(newBlock.id)
  }

  const updateBlock = (id: string, updates: Partial<BuilderBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedBlockId === id) setSelectedBlockId(null)
  }

  const moveBlock = (oldIndex: number, newIndex: number) => {
    setBlocks(prev => arrayMove(prev, oldIndex, newIndex))
  }

  return (
    <BuilderContext.Provider value={{
      blocks, setBlocks, selectedBlockId, setSelectedBlockId,
      addBlock, updateBlock, removeBlock, moveBlock, isEditMode, storefrontData
    }}>
      {isEditMode ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            {children}
          </SortableContext>
        </DndContext>
      ) : children}
    </BuilderContext.Provider>
  )
}
