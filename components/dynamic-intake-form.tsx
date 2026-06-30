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
  inputClassName?: string
  labelClassName?: string
  reqClassName?: string
  optClassName?: string
  rowClassName?: string
}

export default function DynamicIntakeForm({
  fields,
  answers,
  onChange,
  inputClassName = "w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all",
  labelClassName = "block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2",
  reqClassName = "text-[var(--primary)] ml-1",
  optClassName = "text-[var(--muted-foreground)] ml-1 font-normal lowercase",
  rowClassName = "mb-6"
}: DynamicIntakeFormProps) {
  if (fields.length === 0) return null

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {fields.map(field => (
        <div className={rowClassName} key={field.id}>
          <label className={labelClassName}>
            {field.label} 
            <span className={field.required ? reqClassName : optClassName}>
              {field.required ? '*' : '(optional)'}
            </span>
          </label>
          {field.type === 'boolean' ? (
            <select 
              value={answers[field.id] || ''} 
              onChange={e => onChange(field.id, e.target.value)} 
              className={inputClassName}
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
              className={inputClassName} 
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          )}
        </div>
      ))}
    </motion.div>
  )
}
