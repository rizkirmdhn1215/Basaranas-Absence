import { NextResponse } from 'next/server'
import { generateQRToken } from '@/lib/qr-token'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> } // Fix for Next.js 15
) {
    try {
        const { id } = await context.params
        const { searchParams } = new URL(request.url)
        const interval = parseInt(searchParams.get('interval') || '3600')

        const token = generateQRToken(id, interval)

        return NextResponse.json({ token })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
