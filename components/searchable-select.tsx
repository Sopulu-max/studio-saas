'use client'

import { useState, useRef, useEffect } from 'react'

export interface SelectOption {
  value: string
  label: string       // primary — name, booking title, etc.
  sublabel?: string   // secondary — phone, date, status, etc.
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  emptyMessage = 'No results',
}: {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleFocus() {
    setQuery('')
    setOpen(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  function pick(option: SelectOption) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selected?.label ?? '')}
          placeholder={selected ? '' : placeholder}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', boxSizing: 'border-box', paddingRight: selected ? '28px' : undefined }}
          autoComplete="off"
        />
        {/* Clear × button */}
        {selected && !open && (
          <button
            type="button"
            onMouseDown={clear}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
              fontSize: '14px', color: 'var(--text-4)', lineHeight: 1,
            }}
            title="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px',
          boxShadow: 'var(--shadow-lg)', maxHeight: '260px', overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', padding: '12px 14px', margin: 0 }}>
              {emptyMessage}
            </p>
          ) : (
            filtered.map(option => (
              <div
                key={option.value}
                className="dropdown-option"
                data-selected={option.value === value ? 'true' : 'false'}
                onMouseDown={() => pick(option)}
                style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-inner)' }}
              >
                <p style={{ fontSize: '14px', margin: 0, fontWeight: option.value === value ? '500' : '400' }}>
                  {option.label}
                </p>
                {option.sublabel && (
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                    {option.sublabel}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
