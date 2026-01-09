import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check if user is authenticated
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { employees } = body

        if (!Array.isArray(employees) || employees.length === 0) {
            return NextResponse.json(
                { error: 'Invalid employee data' },
                { status: 400 }
            )
        }

        // Helper to parse date
        const parseDate = (dateStr: string) => {
            if (!dateStr || dateStr.trim() === '') return null

            const trimmed = String(dateStr).trim()

            // Skip if it looks like a header or invalid text
            if (trimmed.toLowerCase().includes('tmt') ||
                trimmed.toLowerCase().includes('jabatan') ||
                trimmed.toLowerCase().includes('date')) {
                return null
            }

            try {
                // Handle Excel date format
                const date = new Date(trimmed)
                if (isNaN(date.getTime())) return null

                // Only return if it's a reasonable date (between 1900 and 2100)
                const year = date.getFullYear()
                if (year < 1900 || year > 2100) return null

                return date.toISOString().split('T')[0] // YYYY-MM-DD
            } catch {
                return null
            }
        }

        // Insert employees into database
        const { data, error } = await supabase
            .from('employees')
            .upsert(
                employees.map((emp: any) => ({
                    name: emp.name?.trim() || '',
                    rank: emp.rank?.trim() || '',
                    position: emp.position?.trim() || '',
                    position_date: parseDate(emp.positionDate),
                    unit: emp.unit?.trim() || '',
                    is_active: true,
                })),
                { onConflict: 'name', ignoreDuplicates: false }
            )
            .select()

        if (error) {
            console.error('Database error:', error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            console.error('Sample employee data:', employees[0])
            return NextResponse.json(
                {
                    error: 'Failed to upload employees',
                    details: error.message,
                    code: error.code,
                    hint: error.hint
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            employees: data,
        })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}

// GET: Fetch all employees
export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        const { searchParams } = new URL(request.url)
        const unit = searchParams.get('unit')
        const search = searchParams.get('search')

        let query = supabase
            .from('employees')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (unit) {
            query = query.eq('unit', unit)
        }

        if (search) {
            query = query.ilike('name', `%${search}%`)
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ employees: data })
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        )
    }
}
