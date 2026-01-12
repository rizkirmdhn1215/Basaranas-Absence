'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function QRPanel({ sessionId, sessionName }: { sessionId: string, sessionName: string }) {
    const [token, setToken] = useState<string>('')
    const [refreshInterval, setRefreshInterval] = useState(30)
    const [timeLeft, setTimeLeft] = useState(30)
    const [qrUrl, setQrUrl] = useState('')
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Load saved interval from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('qr-refresh-interval')
        if (saved) {
            const interval = parseInt(saved)
            if (interval >= 10 && interval <= 300) {
                setRefreshInterval(interval)
                setTimeLeft(interval)
            }
        }
    }, [])

    // Save interval to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('qr-refresh-interval', refreshInterval.toString())
    }, [refreshInterval])

    useEffect(() => {
        updateToken()
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    updateToken()
                    return refreshInterval
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [sessionId, refreshInterval])

    const updateToken = async () => {
        try {
            // Fetch secure token from server-side API with the current interval
            const res = await fetch(`/api/sessions/${sessionId}/token?interval=${refreshInterval}`)
            const data = await res.json()
            if (data.token) {
                setToken(data.token)
                // Construct the full check-in URL with interval parameter
                const url = `${window.location.origin}/checkin?session=${sessionId}&token=${data.token}&interval=${refreshInterval}`
                setQrUrl(url)
            }
        } catch (error) {
            console.error('Failed to update QR token', error)
        }
    }

    const handleIntervalChange = (newInterval: number) => {
        setRefreshInterval(newInterval)
        setTimeLeft(newInterval)
        // Immediately regenerate QR code with new interval
        setTimeout(() => updateToken(), 100)
    }

    const presetIntervals = [
        { value: 15, label: '15 detik' },
        { value: 30, label: '30 detik' },
        { value: 60, label: '1 menit' },
        { value: 120, label: '2 menit' },
    ]

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

                {/* Timer Controls */}
                <div className="mb-4 w-full">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Interval Refresh QR
                    </label>
                    <div className="flex gap-2 justify-center flex-wrap">
                        {presetIntervals.map((preset) => (
                            <button
                                key={preset.value}
                                onClick={() => handleIntervalChange(preset.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${refreshInterval === preset.value
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

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
                    QR Code berubah otomatis <br />(Setiap {refreshInterval} detik)
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

                    <h1 className="text-4xl md:text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 text-center">
                        {sessionName}
                    </h1>

                    {/* Timer Controls in Fullscreen */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
                            Interval Refresh QR
                        </label>
                        <div className="flex gap-3 justify-center flex-wrap">
                            {presetIntervals.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handleIntervalChange(preset.value)}
                                    className={`px-4 py-2 rounded-lg text-base font-medium transition-all ${refreshInterval === preset.value
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-indigo-100 dark:border-indigo-900">
                        {qrUrl ? (
                            <QRCodeSVG value={qrUrl} size={500} level="H" includeMargin={true} />
                        ) : (
                            <div className="w-[500px] h-[500px] flex items-center justify-center text-gray-400">
                                Memuat...
                            </div>
                        )}
                    </div>

                    <p className="text-xl text-gray-500 mt-8">
                        Silakan scan QR Code untuk melakukan absensi
                    </p>
                    <p className="text-lg text-gray-400 mt-2">
                        Refresh otomatis setiap {refreshInterval} detik
                    </p>
                </div>
            )}
        </>
    )
}
