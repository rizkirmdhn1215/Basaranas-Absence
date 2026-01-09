import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { deriveAttendanceStatus } from '@/lib/attendance-logic'

export async function GET(
    request: Request,
    context: { params: Promise<{ sessionId: string }> }
) {
    try {
        const supabase = await createClient()
        const { sessionId } = await context.params

        // Get session details
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single()

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            )
        }

        // Get attendance data
        const attendance = await deriveAttendanceStatus(sessionId)

        return NextResponse.json({
            session,
            attendance,
            summary: {
                total: attendance.length,
                present: attendance.filter((a) => a.status === 'present').length,
                absent: attendance.filter((a) => a.status === 'absent').length,
            },
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
