import { createClient } from '@/utils/supabase/server'
import { createAnonClient } from '@/utils/supabase/anon'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const body = await request.json()
        const { employeeName, sessionId, deviceId, photoData, latitude, longitude } = body

        // Validate required fields
        if (!employeeName || !sessionId) {
            return NextResponse.json(
                { error: 'Nama karyawan dan session ID diperlukan' },
                { status: 400 }
            )
        }

        if (!photoData) {
            return NextResponse.json(
                { error: 'Foto check-in diperlukan' },
                { status: 400 }
            )
        }

        if (!latitude || !longitude) {
            return NextResponse.json(
                { error: 'Lokasi GPS diperlukan' },
                { status: 400 }
            )
        }

        // Find employee by name OR NIP (case-insensitive)
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

        // Check session status
        if (session.status !== 'open') {
            return NextResponse.json(
                { error: 'Sesi absensi sudah ditutup' },
                { status: 400 }
            )
        }

        // Check if session has started (but allow late check-ins after end_time)
        const now = new Date()
        const currentTime = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit'
        })

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

        // Upload photo to Supabase Storage
        let photoUrl = ''
        try {
            // Convert base64 to blob
            const base64Data = photoData.split(',')[1]
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'image/jpeg' })

            // Generate unique filename
            const timestamp = Date.now()
            const filename = `${sessionId}/${employee.id}_${timestamp}.jpg`

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('check-in-photos')
                .upload(filename, blob, {
                    contentType: 'image/jpeg',
                    upsert: false
                })

            if (uploadError) {
                console.error('Photo upload error:', uploadError)
                return NextResponse.json(
                    { error: 'Gagal menyimpan foto. Silakan coba lagi.' },
                    { status: 500 }
                )
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('check-in-photos')
                .getPublicUrl(filename)

            photoUrl = urlData.publicUrl
        } catch (photoError) {
            console.error('Photo processing error:', photoError)
            return NextResponse.json(
                { error: 'Gagal memproses foto. Silakan coba lagi.' },
                { status: 500 }
            )
        }

        // Create check-in record with photo and GPS
        const insertData: any = {
            session_id: sessionId,
            employee_id: employee.id,
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            photo_url: photoUrl,
            latitude: latitude,
            longitude: longitude
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
            photoUrl: photoUrl
        })
    } catch (error: any) {
        console.error('Check-in error:', error)
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
