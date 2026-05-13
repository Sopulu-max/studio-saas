'use client'

import { useState } from 'react'
import SessionTypesForm from './session-types-form'
import ServiceTypesForm from './service-types-form'
import BookingStatusesForm from './booking-statuses-form'
import EquipmentCategoriesForm from './equipment-categories-form'
import StaffRolesForm from './staff-roles-form'
import ContractTemplatesForm from './contract-templates-form'
import SettingsForm from './settings-form'
import TeamForm from './team-form'
import type { SessionTypeConfig, ServiceTypeConfig, BookingStatusConfig, EquipmentCategoryConfig, StaffRoleConfig } from '@/lib/studio-config'

type ContractTemplates = {
  studio: string; outdoor: string; event: string
}

type StaffMember = {
  staff_id: string
  full_name: string
  email: string
  role: string
  invite_sent_at: string | null
  invite_accepted_at: string | null
  user_id: string | null
}

type Tab = 'studio' | 'workflow' | 'contracts' | 'team'

const TABS: { value: Tab; label: string }[] = [
  { value: 'studio',    label: 'Studio profile' },
  { value: 'workflow',  label: 'Workflow' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'team',      label: 'Team' },
]

export default function SettingsTabs({
  sessionTypes,
  serviceTypes,
  bookingStatuses,
  equipmentCategories,
  staffRoles,
  contractTemplates,
  teamMembers,
  studioId,
  name,
  email,
  slug,
  phone,
  address,
  timezone,
  logoUrl,
  siteUrl,
}: {
  sessionTypes:        SessionTypeConfig[]
  serviceTypes:        ServiceTypeConfig[]
  bookingStatuses:     BookingStatusConfig[]
  equipmentCategories: EquipmentCategoryConfig[]
  staffRoles:          StaffRoleConfig[]
  contractTemplates:   ContractTemplates
  teamMembers:         StaffMember[]
  studioId:  string
  name:      string
  email:     string
  slug:      string
  phone:     string
  address:   string
  timezone:  string
  logoUrl:   string | null
  siteUrl:   string
}) {
  const [active, setActive] = useState<Tab>('studio')

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '2px', flexWrap: 'wrap',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: '10px', padding: '3px',
        marginBottom: '1.25rem', width: 'fit-content',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActive(tab.value)}
            style={{
              padding: '6px 16px', fontSize: '13px', fontWeight: '500',
              borderRadius: '7px', border: 'none', cursor: 'pointer',
              background: active === tab.value ? 'var(--btn)' : 'transparent',
              color: active === tab.value ? 'var(--btn-fg)' : 'var(--text-3)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {active === 'studio' && (
        <SettingsForm
          studioId={studioId}
          name={name}
          email={email}
          slug={slug}
          phone={phone}
          address={address}
          timezone={timezone}
          logoUrl={logoUrl}
          siteUrl={siteUrl}
        />
      )}

      {active === 'workflow' && (
        <>
          <SessionTypesForm       initial={sessionTypes} />
          <ServiceTypesForm       initial={serviceTypes} />
          <BookingStatusesForm    initial={bookingStatuses} staffRoles={staffRoles} />
          <StaffRolesForm         initial={staffRoles} />
          <EquipmentCategoriesForm initial={equipmentCategories} />
        </>
      )}

      {active === 'contracts' && (
        <ContractTemplatesForm initial={contractTemplates} />
      )}

      {active === 'team' && (
        <TeamForm initial={teamMembers} />
      )}
    </div>
  )
}
