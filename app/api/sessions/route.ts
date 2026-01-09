import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// GET: Fetch all sessions or active session
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(request.url)
        const activeOnly = searchParams.get('active') === 'true'

        let query = supabase
            .from('sessions')
            .select('*')
            .order('session_date', { ascending: false })

        if (activeOnly) {
            query = query.eq('status', 'open')
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ sessions: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST: Create and open a new session
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check authentication
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sessionName, sessionDate, startTime, endTime } = body

        if (!sessionName || !sessionDate || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Check if there's already an open session
        const { data: existingSessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('status', 'open')

        if (existingSessions && existingSessions.length > 0) {
            return NextResponse.json(
                { error: 'Sesi aktif sudah ada. Tutup sesi sebelumnya terlebih dahulu.' },
                { status: 400 }
            )
        }

        // Create new session
        const { data, error } = await supabase
            .from('sessions')
            .insert({
                session_name: sessionName,
                session_date: sessionDate,
                start_time: startTime,
                end_time: endTime,
                status: 'open',
                opened_by: user.id,
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, session: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH: Close a session
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sessionId } = body

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID required' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('sessions')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, session: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
