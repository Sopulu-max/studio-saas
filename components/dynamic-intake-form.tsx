'use client'

import { motion } from 'framer-motion'

export type IntakeField = {
  id: string
  label: string
  type: string
  required: boolean
}

type DynamicIntakeFormProps = {
  fields: IntakeField[]
  answers: Record<string, any>
  onChange: (id: string, value: any) => void
  inputStyle?: React.CSSProperties
  labelStyle?: React.CSSProperties
  reqStyle?: React.CSSProperties
  optStyle?: React.CSSProperties
  rowStyle?: React.CSSProperties
}

export default function DynamicIntakeForm({
  fields,
  answers,
  onChange,
  inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', background: 'var(--bg)', fontSize: '15px', color: 'var(--text-main)', transition: 'border-color 0.2s', boxSizing: 'border-box' },
  labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '8px' },
  reqStyle = { color: 'var(--destructive)', marginLeft: '4px' },
  optStyle = { color: 'var(--text-faint)', marginLeft: '4px', fontWeight: '400' },
  rowStyle = { marginBottom: '20px' }
}: DynamicIntakeFormProps) {
  if (fields.length === 0) return null

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {fields.map(field => (
        <div style={rowStyle} key={field.id}>
          <label style={labelStyle}>
            {field.label} 
            <span style={field.required ? reqStyle : optStyle}>
              {field.required ? '*' : '(optional)'}
            </span>
          </label>
          {field.type === 'boolean' ? (
            <select 
              value={answers[field.id] || ''} 
              onChange={e => onChange(field.id, e.target.value)} 
              style={inputStyle}
            >
              <option value="">-- Select --</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          ) : (
            <input 
              type={field.type === 'number' ? 'number' : 'text'} 
              value={answers[field.id] || ''} 
              onChange={e => onChange(field.id, e.target.value)} 
              style={inputStyle} 
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          )}
        </div>
      ))}
    </motion.div>
  )
}
