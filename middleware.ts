import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SESSION_COOKIE_NAME = 'apel_session'
const secretKey = new TextEncoder().encode(
    process.env.JWT_SECRET || 'apel-pagi-default-jwt-secret-key-change-in-env'
)

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

    let isAuthenticated = false
    if (token) {
        try {
            const { payload } = await jwtVerify(token, secretKey)
            if (payload?.id) {
                isAuthenticated = true
            }
        } catch {
            isAuthenticated = false
        }
    }

    // If user is logged in and visits /login, redirect to /dashboard
    if (isAuthenticated && pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Public routes that don't need authentication
    const isPublicRoute =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/checkin') ||
        pathname.startsWith('/api/checkin') ||
        pathname.startsWith('/api/auth/login') ||
        (pathname === '/api/sessions' && request.method === 'GET')

    if (!isAuthenticated && !isPublicRoute) {
        // For API routes, return 401 JSON
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // For page routes, redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public static assets (.svg, .png, .jpg, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
