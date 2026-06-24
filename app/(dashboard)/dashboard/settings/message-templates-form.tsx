'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createTemplate, updateTemplate, deleteTemplate } from '@/app/actions/message-templates'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

export type MessageTemplate = {
  template_id: string
  title: string
  content: string
}

export default function MessageTemplatesForm({ initial }: { initial: MessageTemplate[] }) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    if (editingId === 'new') {
      const res = await createTemplate(formData)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Template created')
        setEditingId(null)
      }
    } else if (editingId) {
      const res = await updateTemplate(editingId, formData)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Template updated')
        setEditingId(null)
      }
    }
    
    // In a real app we'd rely on server components to refresh or update state directly, 
    // but the server action calls revalidatePath so the parent page will refetch anyway.
    setIsSubmitting(false)
  }

  async function handleDelete(templateId: string) {
    if (!confirm('Are you sure you want to delete this template?')) return
    setIsSubmitting(true)
    const res = await deleteTemplate(templateId)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Template deleted')
      setTemplates(templates.filter(t => t.template_id !== templateId))
    }
    setIsSubmitting(false)
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '500', margin: '0 0 4px' }}>Message Templates</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Save repeating text to quickly share via WhatsApp</p>
        </div>
        {!editingId && (
          <button 
            onClick={() => { setEditingId('new'); setFormData({ title: '', content: '' }) }}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Add template
          </button>
        )}
      </div>

      {editingId && (
        <form onSubmit={handleSave} style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--line)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Title</label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Studio Address & Guide"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Message content</label>
            <textarea 
              required
              rows={4}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="e.g. Hello! Here is the link to our studio guide..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ marginTop: '8px', padding: '8px', background: 'var(--surface)', border: '1px solid var(--line-inner)', borderRadius: '6px' }}>
              <p style={{ fontSize: '12px', fontWeight: '500', margin: '0 0 4px', color: 'var(--text-3)' }}>Available Variables:</p>
              <ul style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, paddingLeft: '16px' }}>
                <li><code>{'{'}{'{'}studio_name{'}'}{'}'}</code> - Your studio's name</li>
                <li><code>{'{'}{'{'}booking_link{'}'}{'}'}</code> - Link to your public booking page</li>
                <li><code>{'{'}{'{'}packages_link{'}'}{'}'}</code> - Link to your public packages catalog</li>
              </ul>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={isSubmitting} style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {isSubmitting ? 'Saving...' : 'Save template'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} disabled={isSubmitting} style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {initial.length === 0 && !editingId ? (
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No templates yet.</p>
      ) : (
        <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {initial.map((template, i) => (
            <AnimatedItem key={template.template_id} delay={i * 0.05}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px', border: '1px solid var(--line-inner)', borderRadius: '8px', background: 'var(--surface)' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px' }}>{template.title}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0, whiteSpace: 'pre-wrap' }}>{template.content}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '16px' }}>
                  <button 
                    onClick={() => { setEditingId(template.template_id); setFormData({ title: template.title, content: template.content }) }}
                    disabled={isSubmitting}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(template.template_id)}
                    disabled={isSubmitting}
                    style={{ background: 'none', border: 'none', color: '#e24b4a', cursor: 'pointer', fontSize: '13px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </AnimatedItem>
          ))}
        </AnimatedList>
      )}
    </div>
  )
}
