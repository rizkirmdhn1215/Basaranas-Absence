import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { uploadCheckInPhoto } from '@/lib/s3'

export async function POST(request: Request) {
    try {
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

        const searchTerm = String(employeeName).trim()

        // Find employee by name OR NIP (case-insensitive)
        let employees = await prisma.employee.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { nip: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
        })

        if (!employees || employees.length === 0) {
            return NextResponse.json(
                { error: 'Karyawan tidak ditemukan' },
                { status: 404 }
            )
        }

        const employee = employees[0]

        // Get session details
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
        })

        if (!session) {
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

        // Check if session has started (allow late check-ins after end_time)
        const now = new Date()
        const currentTime = now.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
        })

        if (currentTime < session.startTime) {
            return NextResponse.json(
                { error: `Absensi belum dibuka. Dimulai pukul ${session.startTime}` },
                { status: 400 }
            )
        }

        // Check for duplicate check-in
        const existingCheckIn = await prisma.checkIn.findUnique({
            where: {
                sessionId_employeeId: {
                    sessionId,
                    employeeId: employee.id,
                },
            },
        })

        if (existingCheckIn) {
            return NextResponse.json(
                { error: 'Anda sudah melakukan check-in untuk sesi ini' },
                { status: 400 }
            )
        }

        // Upload photo to MinIO Object Storage
        let photoUrl = ''
        try {
            photoUrl = await uploadCheckInPhoto(sessionId, employee.id, photoData)
        } catch (photoError: any) {
            console.error('Error uploading photo to MinIO:', photoError)
            return NextResponse.json(
                { error: 'Gagal memproses dan mengunggah foto ke storage. Silakan coba lagi.' },
                { status: 500 }
            )
        }

        // Create check-in record in PostgreSQL
        const checkIn = await prisma.checkIn.create({
            data: {
                sessionId,
                employeeId: employee.id,
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                deviceId: deviceId || null,
                photoUrl,
                latitude: latitude ? String(latitude) : null,
                longitude: longitude ? String(longitude) : null,
            },
        })

        return NextResponse.json({
            success: true,
            employee: {
                name: employee.name,
                position: employee.position,
                rank: employee.rank,
            },
            checkedInAt: checkIn.checkedInAt.toISOString(),
            photoUrl: photoUrl,
        })
    } catch (error: any) {
        console.error('Check-in error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}

// GET: Search employees by name or NIP (for autocomplete)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')?.trim()

        if (!query || query.length < 2) {
            return NextResponse.json({ employees: [] })
        }

        const employees = await prisma.employee.findMany({
            where: {
                isActive: true,
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { nip: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                nip: true,
                name: true,
                position: true,
                rank: true,
            },
            take: 10,
        })

        return NextResponse.json({ employees })
    } catch (error: any) {
        console.error('Employee search error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
