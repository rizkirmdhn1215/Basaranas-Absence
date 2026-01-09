import { createHmac } from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key-123'

/**
 * Generate a time-based token for QR check-in
 * Logic:
 * 1. Get current timestamp (rounded to 30s window)
 * 2. Create signature using HMAC(sessionId + timestamp, SECRET)
 * 3. Return timestamp + signature
 */
export function generateQRToken(sessionId: string): string {
    const timestamp = Math.floor(Date.now() / 30000) // 30-second windows
    const data = `${sessionId}:${timestamp}`
    const signature = createHmac('sha256', SECRET).update(data).digest('hex').substring(0, 16)
    return `${timestamp}.${signature}`
}

/**
 * Validate a QR token
 * Returns true if token is valid and within allowable window
 */
export function validateQRToken(sessionId: string, token: string): boolean {
    if (!token) return false

    const [tokenTimestamp, tokenSignature] = token.split('.')
    if (!tokenTimestamp || !tokenSignature) return false

    const currentTimestamp = Math.floor(Date.now() / 30000)
    const tx = parseInt(tokenTimestamp)

    // Allow window of -1 (previous 30s) to +1 (next 30s) to account for slight clock drift or scan delay
    if (Math.abs(currentTimestamp - tx) > 1) {
        return false
    }

    const data = `${sessionId}:${tokenTimestamp}`
    const expectedSignature = createHmac('sha256', SECRET).update(data).digest('hex').substring(0, 16)

    return tokenSignature === expectedSignature
}
