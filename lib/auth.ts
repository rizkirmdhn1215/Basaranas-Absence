import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export const SESSION_COOKIE_NAME = 'apel_session'

const secretKey = new TextEncoder().encode(
    process.env.JWT_SECRET || 'apel-pagi-default-jwt-secret-key-change-in-env'
)

export interface SessionPayload {
    id: string
    email: string
    name: string
    role: string
}

/**
 * Hash a plain password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10)
}

/**
 * Compare plain password with bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
}

/**
 * Create and sign a JWT session token (valid for 7 days)
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secretKey)
}

/**
 * Verify a JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secretKey)
        return payload as unknown as SessionPayload
    } catch {
        return null
    }
}

/**
 * Get current authenticated user from cookies (Server Components / API Routes)
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!token) return null

        const payload = await verifySessionToken(token)
        if (!payload?.id) return null

        // Verify user still exists in database
        const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, name: true, role: true },
        })

        if (!user) return null

        return user
    } catch {
        return null
    }
}
