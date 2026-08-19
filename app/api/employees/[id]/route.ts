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

// PUT: Update employee
export async function PUT(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const body = await request.json()

        const updated = await prisma.employee.update({
            where: { id },
            data: {
                nip: body.nip?.trim() || null,
                name: body.name?.trim(),
                rank: body.rank?.trim() || null,
                position: body.position?.trim() || null,
                unit: body.unit?.trim() || null,
                isActive: body.is_active ?? body.isActive ?? true,
            },
        })

        return NextResponse.json({
            success: true,
            employee: formatEmployee(updated),
        })
    } catch (error: any) {
        console.error('Update employee error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// DELETE: Delete employee
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params

        await prisma.employee.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Delete employee error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
