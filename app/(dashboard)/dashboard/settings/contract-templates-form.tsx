'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { saveContractTemplates } from '@/app/actions/contract-templates'

type Templates = { studio: string; outdoor: string; event: string }
type Tab = keyof Templates

const TABS: { value: Tab; label: string; hint: string }[] = [
  { value: 'studio',  label: 'Studio',  hint: 'Applies to all in-studio sessions (photography, videography, or both) unless a package overrides it.' },
  { value: 'outdoor', label: 'Outdoor', hint: 'Applies to all outdoor / on-location sessions.' },
  { value: 'event',   label: 'Event',   hint: 'Applies to all event sessions. Individual packages can override this.' },
]

export default function ContractTemplatesForm({ initial }: { initial: Templates }) {
  const [templates, setTemplates] = useState<Templates>(initial)
  const [activeTab, setActiveTab] = useState<Tab>('studio')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const { error } = await saveContractTemplates(templates)
    if (error) toast.error(error)
    else toast.success('Templates saved')
    setLoading(false)
  }

  const active = TABS.find(t => t.value === activeTab)!

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Contract templates</p>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          Default contract per session type. Packages can override with their own template.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '16px', background: 'var(--surface-2)', borderRadius: '8px', padding: '3px', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            style={{
              flex: 1, padding: '6px 10px', fontSize: '12.5px', fontWeight: '500',
              borderRadius: '6px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: activeTab === tab.value ? 'var(--surface)' : 'transparent',
              color: activeTab === tab.value ? 'var(--text)' : 'var(--text-3)',
              boxShadow: activeTab === tab.value ? 'var(--shadow-sm)' : 'none',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 10px' }}>
        {active.hint}
      </p>

      <textarea
        key={activeTab}
        value={templates[activeTab]}
        onChange={e => setTemplates(prev => ({ ...prev, [activeTab]: e.target.value }))}
        rows={18}
        placeholder={`Paste your ${active.label.replace(/🎬\s*/, '')} contract template here…`}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '12.5px', lineHeight: '1.7' }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button onClick={handleSave} disabled={loading} style={{ padding: '8px 20px', fontSize: '13px' }}>
          {loading ? 'Saving…' : 'Save templates'}
        </button>
      </div>
    </div>
  )
}
