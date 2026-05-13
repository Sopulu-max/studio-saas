'use client'

import { createContext, useContext } from 'react'
import {
  type StudioConfig,
  DEFAULT_SESSION_TYPES,
  DEFAULT_SERVICE_TYPES,
  DEFAULT_BOOKING_STATUSES,
  DEFAULT_EQUIPMENT_CATEGORIES,
  DEFAULT_STAFF_ROLES,
} from '@/lib/studio-config'

const defaultConfig: StudioConfig = {
  sessionTypes:        DEFAULT_SESSION_TYPES,
  serviceTypes:        DEFAULT_SERVICE_TYPES,
  bookingStatuses:     DEFAULT_BOOKING_STATUSES,
  equipmentCategories: DEFAULT_EQUIPMENT_CATEGORIES,
  staffRoles:          DEFAULT_STAFF_ROLES,
}

const StudioConfigContext = createContext<StudioConfig>(defaultConfig)

export function StudioConfigProvider({
  config,
  children,
}: {
  config: StudioConfig
  children: React.ReactNode
}) {
  return (
    <StudioConfigContext.Provider value={config}>
      {children}
    </StudioConfigContext.Provider>
  )
}

export function useStudioConfig(): StudioConfig {
  return useContext(StudioConfigContext)
}
