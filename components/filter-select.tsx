'use client'

import { useRouter, usePathname } from 'next/navigation'

export default function FilterSelect({
  name,
  defaultValue = '',
  options,
  placeholder,
}: {
  name: string
  defaultValue?: string
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(val: string) {
    const params = new URLSearchParams(window.location.search)
    if (val) params.set(name, val)
    else params.delete(name)
    params.delete('page')
    router.replace(`${pathname}?${params}`)
  }

  return (
    <select
      defaultValue={defaultValue}
      onChange={e => handleChange(e.target.value)}
      style={{
        padding: '7px 12px',
        fontSize: '13px',
        borderRadius: '8px',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
