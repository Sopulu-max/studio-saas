'use client'

import { motion, AnimatePresence } from 'framer-motion'

export function AnimatedList({ children, className, style }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) {
  return (
    <div className={className} style={style}>
      <AnimatePresence>
        {children}
      </AnimatePresence>
    </div>
  )
}

export function AnimatedItem({ children, delay = 0, style, className }: { children: React.ReactNode, delay?: number, style?: React.CSSProperties, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay, duration: 0.2 }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
