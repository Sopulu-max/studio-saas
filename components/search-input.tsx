'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function SearchInput({
  defaultValue = '',
  placeholder = 'Search...',
}: {
  defaultValue?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      if (value) params.set('q', value)
      else params.delete('q')
      params.delete('page')
      startTransition(() => {
        router.replace(`${pathname}?${params}`)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '7px 12px',
        fontSize: '13px',
        borderRadius: '8px',
        outline: 'none',
        width: '220px',
      }}
    />
  )
}
