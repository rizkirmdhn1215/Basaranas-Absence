import { createClient } from '@/utils/supabase/server'
import { createAnonClient } from '@/utils/supabase/anon'
import { NextResponse } from 'next/server'
import { validateQRToken } from '@/lib/qr-token'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { employeeName, sessionId, deviceId, token, interval = 3600 } = body

        // Validate QR Token
        // We enforce token presence for security
        if (!token || !validateQRToken(sessionId, token, interval)) {
            return NextResponse.json(
                { error: 'Invalid or expired QR code. Please scan again.' },
                { status: 403 }
            )
        }

        if (!employeeName || !sessionId) {
            return NextResponse.json(
                { error: 'Nama karyawan dan session ID diperlukan' },
                { status: 400 }
            )
        }

        // Find employee by name OR NIP (case-insensitive)
        // Try searching by name first
        let { data: employees, error: empError } = await supabase
            .from('employees')
            .select('*')
            .ilike('name', `%${employeeName}%`)
            .eq('is_active', true)

        // If no results, try searching by NIP
        if ((!employees || employees.length === 0) && !empError) {
            const nipResult = await supabase
                .from('employees')
                .select('*')
                .ilike('nip', `%${employeeName}%`)
                .eq('is_active', true)

            employees = nipResult.data
            empError = nipResult.error
        }

        if (empError) {
            return NextResponse.json({ error: empError.message }, { status: 500 })
        }

        if (!employees || employees.length === 0) {
            return NextResponse.json(
                { error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            )
        }

        const employee = employees[0]

        // Get session details
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single()

        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Sesi tidak ditemukan' },
                { status: 404 }
            )
        }

        // Check time and auto-close
        const now = new Date()
        // Use Asia/Jakarta (WIB) for consistent time comparison
        const currentTime = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit'
        })

        // If session is open but time has passed, close it automatically
        if (session.status === 'open' && currentTime > session.end_time) {
            await supabase
                .from('sessions')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString()
                })
                .eq('id', sessionId)

            return NextResponse.json(
                { error: 'Sesi absensi telah berakhir dan ditutup otomatis.' },
                { status: 400 }
            )
        }

        if (session.status !== 'open') {
            return NextResponse.json(
                { error: 'Sesi absensi sudah ditutup' },
                { status: 400 }
            )
        }

        if (currentTime < session.start_time) {
            return NextResponse.json(
                { error: `Absensi belum dibuka. Dimulai pukul ${session.start_time}` },
                { status: 400 }
            )
        }

        // Check for duplicate check-in
        const { data: existingCheckIn } = await supabase
            .from('check_ins')
            .select('*')
            .eq('session_id', sessionId)
            .eq('employee_id', employee.id)
            .single()

        if (existingCheckIn) {
            return NextResponse.json(
                { error: 'Anda sudah melakukan check-in untuk sesi ini' },
                { status: 400 }
            )
        }

        // Create check-in record
        // Note: ensuring device_id is handled if passed
        const insertData: any = {
            session_id: sessionId,
            employee_id: employee.id,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        }

        if (deviceId) {
            insertData.device_id = deviceId
        }

        const { data: checkIn, error: checkInError } = await supabase
            .from('check_ins')
            .insert(insertData)
            .select()
            .single()

        if (checkInError) {
            // Check if error is related to missing column
            if (checkInError.message?.includes('device_id')) {
                // Fallback if schema not updated yet: try insert without device_id
                delete insertData.device_id
                const { data: fallbackCheckIn, error: fallbackError } = await supabase
                    .from('check_ins')
                    .insert(insertData)
                    .select()
                    .single()

                if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })

                return NextResponse.json({
                    success: true,
                    employee: {
                        name: employee.name,
                        position: employee.position,
                        rank: employee.rank,
                    },
                    checkedInAt: fallbackCheckIn.checked_in_at,
                })
            }
            return NextResponse.json({ error: checkInError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            employee: {
                name: employee.name,
                position: employee.position,
                rank: employee.rank,
            },
            checkedInAt: checkIn.checked_in_at,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET: Search employees by name (for autocomplete)
export async function GET(request: Request) {
    try {
        const supabase = createAnonClient()
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')

        if (!query || query.length < 2) {
            return NextResponse.json({ employees: [] })
        }

        // Search by name first
        let { data, error } = await supabase
            .from('employees')
            .select('nip, name, position, rank')
            .ilike('name', `%${query}%`)
            .eq('is_active', true)
            .limit(10)

        // If no results, try searching by NIP
        if ((!data || data.length === 0) && !error) {
            const nipResult = await supabase
                .from('employees')
                .select('nip, name, position, rank')
                .ilike('nip', `%${query}%`)
                .eq('is_active', true)
                .limit(10)

            data = nipResult.data
            error = nipResult.error
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ employees: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
