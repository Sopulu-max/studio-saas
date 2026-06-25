export type StaffStatsDTO = {
  total: number
  sessions_this_month: number
  sessions_today: number
}

export type StaffMemberDTO = {
  staff_id: string
  full_name: string
  email: string | null
  role: string | null
  roles: string[]
  working_days: string[]
  hire_date: string | null
  avatar_url: string | null
}

export type StaffSessionAssignmentDTO = {
  booking_id: string | null
  booking_ref: number | null
  session_date: string | null
  session_type: string | null
  client_name: string | null
  staff_name: string | null
  staff_id: string | null
  role: string | null
}

export type TodaySessionDTO = {
  booking_id: string
  booking_ref: number | null
  session_date: string | null
  session_type: string | null
  status: string
  client_name: string | null
  assigned_staff: {
    staff_id: string | null
    full_name: string | null
    role: string | null
  }[]
}

export type StaffCheckinDTO = {
  checkin_id: string
  date: string
  checked_in_at: string
  checked_out_at: string | null
}

export type StaffAssignmentDTO = {
  role: string | null
  session: {
    booking_id: string | null
    booking_ref: number | null
    session_date: string | null
    status: string | null
    client_name: string | null
  }
}

export type StaffDetailDTO = {
  staff_id: string
  full_name: string
  email: string | null
  role: string | null
  roles: string[]
  avatar_url: string | null
  hire_date: string | null
  working_days: string[]
  assignments: StaffAssignmentDTO[]
  recent_checkins: StaffCheckinDTO[]
}
