import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser()
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

        const prismaUpdates: any = {}
        if (updates.unit !== undefined) prismaUpdates.unit = updates.unit
        if (updates.is_active !== undefined) prismaUpdates.isActive = updates.is_active
        if (updates.isActive !== undefined) prismaUpdates.isActive = updates.isActive
        if (updates.rank !== undefined) prismaUpdates.rank = updates.rank
        if (updates.position !== undefined) prismaUpdates.position = updates.position

        const result = await prisma.employee.updateMany({
            where: {
                id: { in: employeeIds },
            },
            data: prismaUpdates,
        })

        return NextResponse.json({
            success: true,
            count: result.count,
        })
    } catch (error: any) {
        console.error('Mass update employees error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
