export type AttendanceStaffDTO = {
  staff_id: string
  full_name: string
  roles: string[]
  working_days: string[]
  checkin: {
    checkin_id: string
    checked_in_at: string
    checked_out_at: string | null
  } | null
}

export type AttendanceStaffOptionDTO = {
  staff_id: string
  full_name: string
}

export type AttendanceRecordDTO = {
  checkin_id: string
  staff_id: string
  date: string
  checked_in_at: string
  checked_out_at: string | null
  staff: {
    full_name: string
    roles: string[]
  } | null
}

export type CheckinHistoryDTO = {
  checkin_id: string
  date: string
  checked_in_at: string
  checked_out_at: string | null
}
