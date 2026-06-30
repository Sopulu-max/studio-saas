'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SessionTypesForm from './session-types-form'
import BookingStatusesForm from './booking-statuses-form'
import EquipmentCategoriesForm from './equipment-categories-form'
import StaffRolesForm from './staff-roles-form'
import ContractTemplatesForm from './contract-templates-form'
import SettingsForm from './settings-form'
import TeamForm from './team-form'
import ThemeForm from './theme-form'
import IntegrationsForm from './integrations-form'
import MessageTemplatesForm from './message-templates-form'
import type { SessionTypeConfig, BookingStatusConfig, EquipmentCategoryConfig, StaffRoleConfig } from '@/lib/studio-config'
import type { SettingsContractTemplateDTO, SettingsStaffDTO, SettingsMessageTemplateDTO } from '@/lib/domains/settings/types'
import { 
  Building2, Palette, GitMerge, FileSignature, 
  MessageSquareText, Users, Webhook 
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'studio' | 'appearance' | 'workflow' | 'contracts' | 'messages' | 'team' | 'integrations'

const TABS: { value: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'studio',     label: 'Studio profile', icon: Building2, description: 'Manage your public details' },
  { value: 'appearance', label: 'Appearance',     icon: Palette,   description: 'Theme and branding colors' },
  { value: 'workflow',   label: 'Workflow',       icon: GitMerge,  description: 'Sessions, statuses, equipment' },
  { value: 'contracts',  label: 'Contracts',      icon: FileSignature, description: 'Smart contract templates' },
  { value: 'messages',   label: 'Messages',       icon: MessageSquareText, description: 'Email and chat templates' },
  { value: 'team',       label: 'Team',           icon: Users,     description: 'Manage staff and roles' },
  { value: 'integrations', label: 'Integrations', icon: Webhook,   description: 'WhatsApp and external apps' },
]

export default function SettingsTabs({
  sessionTypes,
  bookingStatuses,
  equipmentCategories,
  staffRoles,
  contractTemplates,
  teamMembers,
  messageTemplates,
  studioId,
  name,
  email,
  slug,
  phone,
  address,
  timezone,
  logoUrl,
  coverUrl,
  bio,
  waPhoneNumberId,
  waAccessToken,
  waVerifyToken,
  siteUrl,
  theme,
}: {
  sessionTypes:        SessionTypeConfig[]
  bookingStatuses:     BookingStatusConfig[]
  equipmentCategories: EquipmentCategoryConfig[]
  staffRoles:          StaffRoleConfig[]
  contractTemplates:   SettingsContractTemplateDTO[]
  teamMembers:         SettingsStaffDTO[]
  messageTemplates:    SettingsMessageTemplateDTO[]
  studioId:  string
  name:      string
  email:     string
  slug:      string
  phone:     string
  address:   string
  timezone:  string
  logoUrl:   string | null
  coverUrl:  string | null
  bio:       string
  waPhoneNumberId: string
  waAccessToken: string
  waVerifyToken: string
  siteUrl:   string
  theme:     unknown
}) {
  const [active, setActive] = useState<Tab>('studio')

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Sidebar Navigation */}
      <div className="col-span-1 space-y-1 relative">
        <div className="sticky top-6 flex flex-col gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = active === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActive(tab.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group",
                  isActive 
                    ? "bg-[var(--card)] border border-[var(--border)] shadow-sm" 
                    : "hover:bg-[var(--bg-hover)] border border-transparent"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive 
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]" 
                    : "text-[var(--text-3)] group-hover:text-[var(--text-2)]"
                )}>
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                </div>
                <div>
                  <span className={cn(
                    "block text-[13px] font-medium transition-colors",
                    isActive ? "text-[var(--text-1)]" : "text-[var(--text-2)] group-hover:text-[var(--text-1)]"
                  )}>
                    {tab.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="col-span-1 md:col-span-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
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
                coverUrl={coverUrl}
                bio={bio}
                siteUrl={siteUrl}
              />
            )}

            {active === 'appearance' && (
              <ThemeForm initial={theme} />
            )}

            {active === 'workflow' && (
              <div className="space-y-6">
                <SessionTypesForm       initial={sessionTypes} />
                <BookingStatusesForm    initial={bookingStatuses} staffRoles={staffRoles} />
                <StaffRolesForm         initial={staffRoles} />
                <EquipmentCategoriesForm initial={equipmentCategories} />
              </div>
            )}

            {active === 'contracts' && (
              <ContractTemplatesForm initial={contractTemplates as any} />
            )}

            {active === 'messages' && (
              <MessageTemplatesForm initial={messageTemplates as any} />
            )}

            {active === 'team' && (
              <TeamForm initial={teamMembers as any} />
            )}
            
            {active === 'integrations' && (
              <IntegrationsForm 
                waPhoneNumberId={waPhoneNumberId}
                waAccessToken={waAccessToken}
                waVerifyToken={waVerifyToken}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
