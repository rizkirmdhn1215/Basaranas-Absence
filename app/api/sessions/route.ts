import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Format Prisma Session to frontend structure
function formatSession(session: any) {
    return {
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
        opened_by: session.openedById,
    }
}

// GET: Fetch all sessions or active session
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const activeOnly = searchParams.get('active') === 'true'

        const sessions = await prisma.session.findMany({
            where: activeOnly ? { status: 'open' } : undefined,
            orderBy: { sessionDate: 'desc' },
        })

        return NextResponse.json({
            sessions: sessions.map(formatSession),
        })
    } catch (error: any) {
        console.error('Fetch sessions error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// POST: Create and open a new session (Admin only)
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sessionName, sessionDate, startTime, endTime } = body

        if (!sessionName || !sessionDate || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'Semua field (nama sesi, tanggal, jam mulai, jam selesai) wajib diisi' },
                { status: 400 }
            )
        }

        // Check if there's already an open session
        const existingOpenSession = await prisma.session.findFirst({
            where: { status: 'open' },
        })

        if (existingOpenSession) {
            return NextResponse.json(
                { error: 'Sesi aktif sudah ada. Tutup sesi sebelumnya terlebih dahulu.' },
                { status: 400 }
            )
        }

        // Parse date string to Date object
        const parsedDate = new Date(`${sessionDate}T00:00:00Z`)

        // Create new session in PostgreSQL
        const newSession = await prisma.session.create({
            data: {
                sessionName: sessionName.trim(),
                sessionDate: parsedDate,
                startTime: startTime.trim(),
                endTime: endTime.trim(),
                status: 'open',
                openedById: user.id,
            },
        })

        return NextResponse.json({
            success: true,
            session: formatSession(newSession),
        })
    } catch (error: any) {
        console.error('Create session error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// PATCH: Close a session (Admin only)
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { sessionId } = body

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Session ID diperlukan' },
                { status: 400 }
            )
        }

        const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: {
                status: 'closed',
                closedAt: new Date(),
            },
        })

        return NextResponse.json({
            success: true,
            session: formatSession(updatedSession),
        })
    } catch (error: any) {
        console.error('Close session error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
