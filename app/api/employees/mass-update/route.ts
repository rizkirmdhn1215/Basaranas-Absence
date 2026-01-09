import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// POST: Mass update employees
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { employeeIds, updates } = body

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return NextResponse.json(
                { error: 'Employee IDs required' },
                { status: 400 }
            )
        }

        // Update all selected employees
        const { data, error } = await supabase
            .from('employees')
            .update(updates)
            .in('id', employeeIds)
            .select()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            employees: data,
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
