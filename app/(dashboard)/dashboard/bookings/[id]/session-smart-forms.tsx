'use client'

import { motion } from 'framer-motion'

type BookingField = {
  name: string
  label: string
  type: string
  required?: boolean
  options?: string[]
}

type BookedService = {
  booking_service_id: string
  services?: { 
    name?: string | null
    type?: string | null
    category_value?: string | null
    booking_fields?: BookingField[] | null
  } | null
}

export default function SessionSmartForms({ 
  services, 
  customAnswers 
}: { 
  services: BookedService[]
  customAnswers: Record<string, any> | null 
}) {
  const answers = customAnswers || {}
  
  // Collect all fields from all services
  const fieldGroups = services.map(bs => {
    const svcName = bs.services?.name || 'Service'
    const fields = bs.services?.booking_fields || []
    return { svcName, fields }
  }).filter(g => g.fields.length > 0)

  // Identify any custom answers that don't belong to known booking_fields
  const knownKeys = new Set(fieldGroups.flatMap(g => g.fields.map(f => f.name)))
  const extraAnswers = Object.keys(answers).filter(k => !knownKeys.has(k))

  if (fieldGroups.length === 0 && extraAnswers.length === 0) return null

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>DYNAMIC INTAKE FORMS</p>
      
      {fieldGroups.map((group, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{ marginBottom: i < fieldGroups.length - 1 ? '16px' : 0 }}
        >
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2)', borderBottom: '1px solid var(--line-inner)', paddingBottom: '4px', marginBottom: '12px' }}>
            {group.svcName} Requirements
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {group.fields.map((f, j) => {
              const val = answers[f.name]
              const isMissing = !val && val !== 0 && val !== false
              
              return (
                <div key={j}>
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>
                    {f.label} {f.required && <span style={{ color: 'red' }}>*</span>}
                  </p>
                  {isMissing ? (
                    <span style={{ fontSize: '13px', color: '#854f0b', background: '#faeeda', padding: '2px 6px', borderRadius: '4px' }}>
                      Pending input
                    </span>
                  ) : (
                    <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>{String(val)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      ))}

      {extraAnswers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}
        >
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-2)', marginBottom: '8px' }}>Other Answers</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {extraAnswers.map(key => (
              <div key={key}>
                <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px', textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </p>
                <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>{String(answers[key])}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
