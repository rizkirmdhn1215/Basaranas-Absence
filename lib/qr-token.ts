import { createHmac } from 'crypto'

const SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key-123'

/**
 * Generate a time-based token for QR check-in
 * Logic:
 * 1. Get current timestamp (rounded to 30s window)
 * 2. Create signature using HMAC(sessionId + timestamp, SECRET)
 * 3. Return timestamp + signature
 */
export function generateQRToken(sessionId: string, interval: number = 30): string {
    const timestamp = Math.floor(Date.now() / (interval * 1000)) // Configurable interval windows
    const data = `${sessionId}:${timestamp}`
    const signature = createHmac('sha256', SECRET).update(data).digest('hex').substring(0, 16)
    return `${timestamp}.${signature}`
}

/**
 * Validate a QR token
 * Returns true if token is valid and within allowable window
 */
export function validateQRToken(sessionId: string, token: string, interval: number = 30): boolean {
    if (!token) return false

    const [tokenTimestamp, tokenSignature] = token.split('.')
    if (!tokenTimestamp || !tokenSignature) return false

    const currentTimestamp = Math.floor(Date.now() / (interval * 1000))
    const tx = parseInt(tokenTimestamp)

    // Allow window of -1 (previous interval) to +1 (next interval) to account for slight clock drift or scan delay
    if (Math.abs(currentTimestamp - tx) > 1) {
        return false
    }

    const data = `${sessionId}:${tokenTimestamp}`
    const expectedSignature = createHmac('sha256', SECRET).update(data).digest('hex').substring(0, 16)

    return tokenSignature === expectedSignature
}
