type Preset = 'avatar' | 'cover' | 'gallery'

const PRESETS: Record<Preset, { maxPx: number; quality: number }> = {
  avatar:  { maxPx: 800,  quality: 0.85 },
  cover:   { maxPx: 1400, quality: 0.85 },
  gallery: { maxPx: 2400, quality: 0.88 },
}

/**
 * Compress an image file in the browser using Canvas.
 * - Resizes so the longest edge is at most `maxPx` (no upscaling).
 * - Re-encodes as JPEG at `quality`.
 * - Returns a new File with the same base name but a .jpg extension.
 */
export function compressImage(file: File, preset: Preset): Promise<File> {
  return new Promise((resolve, reject) => {
    const { maxPx, quality } = PRESETS[preset]
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const { naturalWidth: w, naturalHeight: h } = img
      const scale  = Math.min(1, maxPx / Math.max(w, h))
      const width  = Math.round(w * scale)
      const height = Math.round(h * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Compression failed')); return }
          const name = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}
