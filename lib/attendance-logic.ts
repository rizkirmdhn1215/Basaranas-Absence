import { createClient } from '@/utils/supabase/server'

export interface Employee {
    id: string
    name: string
    rank: string
    position: string
    position_date: string
    unit: string
    is_active: boolean
}

export interface Session {
    id: string
    session_date: string
    session_name: string
    start_time: string
    end_time: string
    status: 'open' | 'closed'
    opened_at: string
    closed_at: string | null
}

export interface CheckIn {
    id: string
    session_id: string
    employee_id: string
    checked_in_at: string
    ip_address: string | null
    device_id?: string | null
}

export interface AttendanceRecord {
    employee: Employee
    status: 'present' | 'absent'
    checked_in_at?: string
    flags?: string[] // 'duplicate_device', 'duplicate_ip'
    meta?: {
        ip_address?: string | null
        device_id?: string | null
    }
}

/**
 * Derive attendance status for a session
 * Returns list of all employees with their attendance status
 */
export async function deriveAttendanceStatus(
    sessionId: string
): Promise<AttendanceRecord[]> {
    const supabase = await createClient()

    // Get all active employees
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name')

    if (empError) throw empError

    // Get all check-ins for this session
    const { data: checkIns, error: checkError } = await supabase
        .from('check_ins')
        .select('*')
        .eq('session_id', sessionId)

    if (checkError) throw checkError

    // Analyze duplicates
    const deviceCounts = new Map<string, number>()
    const ipCounts = new Map<string, number>()

    checkIns?.forEach((c) => {
        if (c.device_id) {
            deviceCounts.set(c.device_id, (deviceCounts.get(c.device_id) || 0) + 1)
        }
        if (c.ip_address) {
            ipCounts.set(c.ip_address, (ipCounts.get(c.ip_address) || 0) + 1)
        }
    })

    // Create a map of employee_id -> check_in
    const checkInMap = new Map(
        checkIns?.map((c) => [c.employee_id, c]) || []
    )

    // Derive attendance status
    const attendance: AttendanceRecord[] = (employees || []).map((employee) => {
        const checkIn = checkInMap.get(employee.id)
        const flags: string[] = []

        if (checkIn) {
            if (checkIn.device_id && (deviceCounts.get(checkIn.device_id) || 0) >= 2) {
                flags.push('duplicate_device')
            }
            // Optional: Flag IP duplicates if stricter control is needed, but often IP is shared (WIFI)
            // if (checkIn.ip_address && (ipCounts.get(checkIn.ip_address) || 0) >= 2) {
            //     flags.push('duplicate_ip') 
            // }
        }

        return {
            employee,
            status: checkIn ? 'present' : 'absent',
            checked_in_at: checkIn?.checked_in_at,
            flags: flags.length > 0 ? flags : undefined,
            meta: checkIn ? {
                ip_address: checkIn.ip_address,
                device_id: checkIn.device_id
            } : undefined
        }
    })

    return attendance
}

/**
 * Get present employees for a session
 */
export async function getPresentEmployees(
    sessionId: string
): Promise<AttendanceRecord[]> {
    const attendance = await deriveAttendanceStatus(sessionId)
    return attendance.filter((a) => a.status === 'present')
}

/**
 * Get absent employees for a session
 */
export async function getAbsentEmployees(
    sessionId: string
): Promise<AttendanceRecord[]> {
    const attendance = await deriveAttendanceStatus(sessionId)
    return attendance.filter((a) => a.status === 'absent')
}

/**
 * Get attendance summary statistics
 */
export async function getAttendanceSummary(sessionId: string) {
    const attendance = await deriveAttendanceStatus(sessionId)

    const present = attendance.filter((a) => a.status === 'present').length
    const absent = attendance.filter((a) => a.status === 'absent').length
    const total = attendance.length
    const percentage = total > 0 ? (present / total) * 100 : 0

    return {
        total,
        present,
        absent,
        percentage: Math.round(percentage * 100) / 100,
    }
}
