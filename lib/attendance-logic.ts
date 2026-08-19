import { prisma } from './prisma'

export interface Employee {
    id: string
    name: string
    nip?: string | null
    rank: string | null
    position: string | null
    position_date?: string | null
    unit: string | null
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
    photo_url?: string | null
    latitude?: number | null
    longitude?: number | null
}

export interface AttendanceRecord {
    employee: Employee
    status: 'present' | 'absent'
    checked_in_at?: string
    photo_url?: string | null
    latitude?: number | null
    longitude?: number | null
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
    // Get all active employees
    const employees = await prisma.employee.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    })

    // Get all check-ins for this session
    const checkIns = await prisma.checkIn.findMany({
        where: { sessionId },
    })

    // Analyze duplicates
    const deviceCounts = new Map<string, number>()
    const ipCounts = new Map<string, number>()

    checkIns.forEach((c) => {
        if (c.deviceId) {
            deviceCounts.set(c.deviceId, (deviceCounts.get(c.deviceId) || 0) + 1)
        }
        if (c.ipAddress) {
            ipCounts.set(c.ipAddress, (ipCounts.get(c.ipAddress) || 0) + 1)
        }
    })

    // Create a map of employeeId -> checkIn
    const checkInMap = new Map(
        checkIns.map((c) => [c.employeeId, c])
    )

    // Derive attendance status
    const attendance: AttendanceRecord[] = employees.map((emp) => {
        const checkIn = checkInMap.get(emp.id)
        const flags: string[] = []

        if (checkIn) {
            if (checkIn.deviceId && (deviceCounts.get(checkIn.deviceId) || 0) >= 2) {
                flags.push('duplicate_device')
            }
        }

        return {
            employee: {
                id: emp.id,
                name: emp.name,
                nip: emp.nip,
                rank: emp.rank,
                position: emp.position,
                position_date: emp.positionDate ? emp.positionDate.toISOString().split('T')[0] : null,
                unit: emp.unit,
                is_active: emp.isActive,
            },
            status: checkIn ? 'present' : 'absent',
            checked_in_at: checkIn?.checkedInAt ? checkIn.checkedInAt.toISOString() : undefined,
            photo_url: checkIn?.photoUrl,
            latitude: checkIn?.latitude ? Number(checkIn.latitude) : null,
            longitude: checkIn?.longitude ? Number(checkIn.longitude) : null,
            flags: flags.length > 0 ? flags : undefined,
            meta: checkIn ? {
                ip_address: checkIn.ipAddress,
                device_id: checkIn.deviceId,
            } : undefined,
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
