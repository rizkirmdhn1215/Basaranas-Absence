import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email dan password wajib diisi' },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            )
        }

        const isValid = await comparePassword(password, user.passwordHash)
        if (!isValid) {
            return NextResponse.json(
                { error: 'Email atau password salah' },
                { status: 401 }
            )
        }

        const token = await signSessionToken({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        })

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        })

        // Set secure HTTP-only cookie (7 days)
        response.cookies.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days
        })

        return response
    } catch (error: any) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server saat login' },
            { status: 500 }
        )
    }
}
