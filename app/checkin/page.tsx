'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function CheckInContent() {
    const searchParams = useSearchParams()
    const urlSessionId = searchParams.get('session')

    const [activeSession, setActiveSession] = useState<any>(null)
    const [employeeName, setEmployeeName] = useState('')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [employeeData, setEmployeeData] = useState<any>(null)
    const [deviceId, setDeviceId] = useState('')
    const isSelecting = useRef(false)

    // Photo capture states
    const [showCamera, setShowCamera] = useState(false)
    const [photoData, setPhotoData] = useState<string>('')
    const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    useEffect(() => {
        fetchActiveSession()

        // Generate or retrieve persistent device ID
        let id = localStorage.getItem('device_id')
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)
            localStorage.setItem('device_id', id)
        }
        setDeviceId(id)

        // Request location permission on mount
        requestLocation()
    }, [])

    useEffect(() => {
        if (isSelecting.current) {
            isSelecting.current = false
            return
        }

        if (employeeName.length >= 2) {
            fetchSuggestions()
        } else {
            setSuggestions([])
        }
    }, [employeeName])

    const requestLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    })
                },
                (error) => {
                    console.error('Location error:', error)
                    setError('Tidak dapat mengakses lokasi. Pastikan izin lokasi diaktifkan.')
                }
            )
        }
    }

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                streamRef.current = stream
                setShowCamera(true)
            }
        } catch (err) {
            console.error('Camera error:', err)
            setError('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.')
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setShowCamera(false)
    }

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current || !location) {
            setError('Lokasi belum tersedia. Tunggu sebentar...')
            return
        }

        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context) return

        // Set canvas size
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        // Draw video frame
        context.drawImage(video, 0, 0)

        // Add timestamp and location overlay
        const now = new Date()
        const timestamp = now.toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        const locationText = `Lat: ${location.lat.toFixed(6)}, Lon: ${location.lon.toFixed(6)}`

        // Draw semi-transparent background
        context.fillStyle = 'rgba(0, 0, 0, 0.6)'
        context.fillRect(10, canvas.height - 70, canvas.width - 20, 60)

        // Draw text
        context.fillStyle = 'white'
        context.font = 'bold 16px Arial'
        context.fillText(timestamp, 20, canvas.height - 45)
        context.font = '14px Arial'
        context.fillText(locationText, 20, canvas.height - 20)

        // Compress and get base64
        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.7)
        setPhotoData(compressedPhoto)
        stopCamera()
    }

    const fetchActiveSession = async () => {
        try {
            const res = await fetch('/api/sessions?active=true')
            const data = await res.json()
            setActiveSession(data.sessions?.[0] || null)
        } catch (error) {
            console.error('Failed to fetch session:', error)
        }
    }

    const fetchSuggestions = async () => {
        try {
            const res = await fetch(`/api/checkin?q=${encodeURIComponent(employeeName)}`)
            const data = await res.json()
            setSuggestions(data.employees || [])
        } catch (error) {
            console.error('Failed to fetch suggestions:', error)
        }
    }

    const handleCheckIn = async () => {
        if (!employeeName.trim()) {
            setError('Silakan masukkan nama atau NIP Anda')
            return
        }

        if (!photoData) {
            setError('Silakan ambil foto terlebih dahulu')
            return
        }

        if (!location) {
            setError('Lokasi belum tersedia')
            return
        }

        if (!activeSession) {
            setError('Tidak ada sesi aktif saat ini')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeName: employeeName.trim(),
                    sessionId: activeSession.id,
                    deviceId: deviceId,
                    photoData: photoData,
                    latitude: location.lat,
                    longitude: location.lon
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setSuccess(true)
                setEmployeeData(data.employee)
                setEmployeeName('')
                setSuggestions([])
            } else {
                setError(data.error || 'Gagal melakukan check-in')
            }
        } catch (error) {
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    const selectSuggestion = (name: string) => {
        isSelecting.current = true
        setEmployeeName(name)
        setSuggestions([])
    }

    if (!urlSessionId) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Akses Ditolak
                    </h2>
                    <p className="text-gray-600 mb-6">
                        Silakan scan QR Code yang ada di layar Admin Dashboard untuk melakukan absensi.
                    </p>
                    <a href="/" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                        Kembali ke Beranda
                    </a>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Check-In Berhasil! ✓
                    </h2>
                    {employeeData && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4 text-left">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Nama:</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{employeeData.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Jabatan:</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{employeeData.position}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Pangkat:</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{employeeData.rank}</p>
                        </div>
                    )}
                    {photoData && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Foto Check-In:</p>
                            <img src={photoData} alt="Check-in photo" className="rounded-lg w-full" />
                        </div>
                    )}
                    <button
                        onClick={() => {
                            setSuccess(false)
                            setEmployeeData(null)
                            setPhotoData('')
                        }}
                        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Apel Pagi
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Sistem Absensi
                    </p>
                </div>

                {!activeSession ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                        <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                            Tidak ada sesi aktif saat ini
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                            Silakan hubungi admin untuk membuka sesi absensi
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                            <p className="text-green-800 dark:text-green-200 font-semibold">
                                🟢 Sesi Aktif: {activeSession.session_name}
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                Waktu: {activeSession.start_time} - {activeSession.end_time}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* Name Input */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Masukkan Nama atau NIP Anda
                                </label>
                                <input
                                    type="text"
                                    value={employeeName}
                                    onChange={(e) => setEmployeeName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && !photoData && startCamera()}
                                    placeholder="Ketik nama atau NIP..."
                                    className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    disabled={loading || showCamera}
                                />

                                {/* Autocomplete Suggestions */}
                                {suggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                                        {suggestions.map((emp, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => selectSuggestion(emp.name)}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600 last:border-0"
                                            >
                                                <p className="font-semibold text-gray-900 dark:text-white">{emp.name}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{emp.position}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Photo Capture Section */}
                            {!photoData && !showCamera && (
                                <button
                                    onClick={startCamera}
                                    disabled={!employeeName.trim() || loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 text-lg rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Ambil Foto
                                </button>
                            )}

                            {/* Camera View */}
                            {showCamera && (
                                <div className="space-y-4">
                                    <div className="relative rounded-lg overflow-hidden bg-black">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={capturePhoto}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg"
                                        >
                                            📸 Ambil Foto
                                        </button>
                                        <button
                                            onClick={stopCamera}
                                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Photo Preview */}
                            {photoData && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <img src={photoData} alt="Preview" className="w-full rounded-lg" />
                                        <button
                                            onClick={() => setPhotoData('')}
                                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {photoData && (
                                <button
                                    onClick={handleCheckIn}
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 text-lg rounded-lg transition-colors shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Memproses...' : 'Check In'}
                                </button>
                            )}
                        </div>
                    </>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    )
}

export default function CheckInPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">Memuat...</div>}>
            <CheckInContent />
        </Suspense>
    )
}
