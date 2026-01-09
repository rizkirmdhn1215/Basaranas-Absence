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

    const [isFullscreen, setIsFullscreen] = useState(false)

    // ... (keep useEffects and updateToken)

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center h-full border-2 border-indigo-500 relative">
                <button
                    onClick={() => setIsFullscreen(true)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-indigo-600 transition-colors"
                    title="Layar Penuh"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Scan Absensi
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

                <p className="text-sm text-gray-500">
                    QR Code berubah otomatis <br />(Setiap 30 detik)
                </p>
            </div>

            {/* Fullscreen Overlay */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8">
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-8 right-8 text-gray-500 hover:text-red-600 transition-colors bg-gray-100 dark:bg-gray-800 p-3 rounded-full shadow-lg"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <h1 className="text-4xl md:text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-8 text-center">
                        {sessionName}
                    </h1>

                    <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-indigo-100 dark:border-indigo-900">
                        {qrUrl ? (
                            <QRCodeSVG value={qrUrl} size={500} level="H" includeMargin={true} />
                        ) : (
                            <div className="w-[500px] h-[500px] flex items-center justify-center text-gray-400">
                                Memuat...
                            </div>
                        )}
                    </div>

                    <p className="text-xl text-gray-500 mt-8 animate-pulse">
                        Silakan scan QR Code untuk melakukan absensi
                    </p>
                </div>
            )}
        </>
    )
}
