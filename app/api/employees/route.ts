import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function formatEmployee(emp: any) {
    return {
        id: emp.id,
        nip: emp.nip || '',
        name: emp.name,
        rank: emp.rank || '',
        position: emp.position || '',
        position_date: emp.positionDate ? emp.positionDate.toISOString().split('T')[0] : null,
        positionDate: emp.positionDate ? emp.positionDate.toISOString().split('T')[0] : null,
        unit: emp.unit || '',
        is_active: emp.isActive,
        isActive: emp.isActive,
        created_at: emp.createdAt.toISOString(),
        updated_at: emp.updatedAt.toISOString(),
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { employees } = body

        if (!Array.isArray(employees) || employees.length === 0) {
            return NextResponse.json(
                { error: 'Data karyawan tidak valid' },
                { status: 400 }
            )
        }

        // Helper to parse date
        const parseDate = (dateStr: any) => {
            if (!dateStr || String(dateStr).trim() === '') return null
            const trimmed = String(dateStr).trim()

            if (
                trimmed.toLowerCase().includes('tmt') ||
                trimmed.toLowerCase().includes('jabatan') ||
                trimmed.toLowerCase().includes('date')
            ) {
                return null
            }

            try {
                const date = new Date(trimmed)
                if (isNaN(date.getTime())) return null
                const year = date.getFullYear()
                if (year < 1900 || year > 2100) return null
                return date
            } catch {
                return null
            }
        }

        const results = []

        // Upsert each employee by unique name
        for (const emp of employees) {
            const name = emp.name?.trim()
            if (!name) continue

            const employeeData = {
                nip: emp.nip?.trim() || null,
                rank: emp.rank?.trim() || null,
                position: emp.position?.trim() || null,
                positionDate: parseDate(emp.positionDate || emp.position_date),
                unit: emp.unit?.trim() || null,
                isActive: emp.isActive ?? emp.is_active ?? true,
            }

            const upserted = await prisma.employee.upsert({
                where: { name },
                update: employeeData,
                create: {
                    name,
                    ...employeeData,
                },
            })

            results.push(formatEmployee(upserted))
        }

        return NextResponse.json({
            success: true,
            count: results.length,
            employees: results,
        })
    } catch (error: any) {
        console.error('Upload employees error:', error)
        return NextResponse.json(
            { error: 'Gagal mengunggah data karyawan', details: error.message },
            { status: 500 }
        )
    }
}

// GET: Fetch all active employees
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const unit = searchParams.get('unit')
        const search = searchParams.get('search')

        const whereClause: any = {
            isActive: true,
        }

        if (unit) {
            whereClause.unit = unit
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { nip: { contains: search, mode: 'insensitive' } },
            ]
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({
            employees: employees.map(formatEmployee),
        })
    } catch (error: any) {
        console.error('Get employees error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
