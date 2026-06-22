'use client'

import React from 'react'

export type MockupTemplate = {
  template_id: string
  name: string
  overlay_image_url: string
  mask_css: string
}

interface MockupGeneratorProps {
  photoUrl: string
  template: MockupTemplate
  className?: string
}

/**
 * MockupGenerator
 * 
 * Takes a client's photo and perfectly aligns it underneath a transparent 
 * frame/canvas PNG overlay using the template's mask_css coordinates.
 */
export default function MockupGenerator({ photoUrl, template, className = '' }: MockupGeneratorProps) {
  // Parse mask_css into a React style object
  // Expected format: "top: 10%; left: 15%; width: 70%; height: 80%;"
  const maskStyles = React.useMemo(() => {
    if (!template.mask_css) return { inset: '10%' }
    
    return template.mask_css.split(';').filter(Boolean).reduce((acc: any, rule: string) => {
      const parts = rule.split(':')
      if (parts.length === 2) {
        // Convert dash-case to camelCase for React styles
        const key = parts[0].trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase())
        acc[key] = parts[1].trim()
      }
      return acc
    }, {})
  }, [template.mask_css])

  return (
    <div className={`relative flex items-center justify-center max-w-full ${className}`}>
      {/* 
        The base photo that sits BEHIND the frame.
        Positioned exactly according to the maskStyles to fit inside the frame's transparent window.
      */}
      <div 
        className="absolute z-0 bg-muted overflow-hidden flex items-center justify-center" 
        style={maskStyles}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={photoUrl} 
          alt="Client photo" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* 
        The Frame Overlay that sits ON TOP of the photo. 
        Must be a transparent PNG.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={template.overlay_image_url} 
        alt={template.name} 
        className="relative z-10 w-full h-auto pointer-events-none drop-shadow-2xl"
      />
    </div>
  )
}
