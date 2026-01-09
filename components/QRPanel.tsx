'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRPanel({ sessionId, sessionName }: { sessionId: string, sessionName: string }) {
    const [token, setToken] = useState<string>('')
    const [timeLeft, setTimeLeft] = useState(30)
    const [qrUrl, setQrUrl] = useState('')

    useEffect(() => {
        updateToken()
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    updateToken()
                    return 30
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [sessionId])

    const updateToken = async () => {
        try {
            // Fetch secure token from server-side API to ensure secret key safety
            // We need a small API route to sign the token, or we can use a server action if we had them set up.
            // Since we defined `generateQRToken` in a lib file which uses `process.env`, we cannot call it directly in client component.
            // We need an API route to generate the token.
            const res = await fetch(`/api/sessions/${sessionId}/token`)
            const data = await res.json()
            if (data.token) {
                setToken(data.token)
                // Construct the full check-in URL
                const url = `${window.location.origin}/checkin?session=${sessionId}&token=${data.token}`
                setQrUrl(url)
            }
        } catch (error) {
            console.error('Failed to update QR token', error)
        }
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center h-full border-2 border-indigo-500">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Scan Absensi: {sessionName}
            </h2>
            <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-200 mb-4">
                {qrUrl ? (
                    <QRCodeSVG value={qrUrl} size={200} level="H" includeMargin={true} />
                ) : (
                    <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center text-gray-400">
                        Memuat QR...
                    </div>
                )}
            </div>

            <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
                Refresh dalam {timeLeft} detik
            </p>
        </div>
    )
}
