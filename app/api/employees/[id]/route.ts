import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// PUT: Update employee
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const body = await request.json()

        const { data, error } = await supabase
            .from('employees')
            .update({
                name: body.name?.trim(),
                rank: body.rank?.trim(),
                position: body.position?.trim(),
                unit: body.unit?.trim() || '',
                is_active: body.is_active ?? true,
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, employee: data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE: Delete employee
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            console.error('DELETE employee - Unauthorized')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        console.log('Deleting employee:', id, 'by user:', user.email)

        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('DELETE employee error:', error)
            return NextResponse.json({
                error: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            }, { status: 500 })
        }

        console.log('Successfully deleted employee:', id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('DELETE employee exception:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
