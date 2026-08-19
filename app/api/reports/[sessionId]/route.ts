import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deriveAttendanceStatus } from '@/lib/attendance-logic'

export async function GET(
    request: Request,
    context: { params: Promise<{ sessionId: string }> }
) {
    try {
        const { sessionId } = await context.params

        // Get session details from PostgreSQL
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
        })

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            )
        }

        // Get attendance data via business logic
        const attendance = await deriveAttendanceStatus(sessionId)

        return NextResponse.json({
            session: {
                id: session.id,
                session_name: session.sessionName,
                sessionName: session.sessionName,
                session_date: session.sessionDate.toISOString().split('T')[0],
                sessionDate: session.sessionDate.toISOString().split('T')[0],
                start_time: session.startTime,
                startTime: session.startTime,
                end_time: session.endTime,
                endTime: session.endTime,
                status: session.status,
                opened_at: session.openedAt.toISOString(),
                closed_at: session.closedAt ? session.closedAt.toISOString() : null,
            },
            attendance,
            summary: {
                total: attendance.length,
                present: attendance.filter((a) => a.status === 'present').length,
                absent: attendance.filter((a) => a.status === 'absent').length,
            },
        })
    } catch (error: any) {
        console.error('Report error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
