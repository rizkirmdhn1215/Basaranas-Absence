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
    const [locationName, setLocationName] = useState<string>('Mengambil lokasi...')
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const [currentTime, setCurrentTime] = useState(new Date())
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

    // Attach camera stream to video element when modal opens
    useEffect(() => {
        if (showCamera && cameraStream && videoRef.current) {
            console.log('Attaching stream to video element in useEffect')
            videoRef.current.srcObject = cameraStream
            streamRef.current = cameraStream

            videoRef.current.onloadedmetadata = () => {
                console.log('Video metadata loaded, playing...')
                videoRef.current?.play().then(() => {
                    console.log('Video playing successfully')
                }).catch(err => {
                    console.error('Error playing video:', err)
                })
            }
        }
    }, [showCamera, cameraStream])

    // Update current time every second for live overlay
    useEffect(() => {
        if (showCamera) {
            const timer = setInterval(() => {
                setCurrentTime(new Date())
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [showCamera])

    // Reverse geocode coordinates to get location name
    const reverseGeocode = async (lat: number, lon: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'Basarnas-CheckIn-App'
                    }
                }
            )
            const data = await response.json()

            if (data.display_name) {
                // Extract relevant parts of the address
                const address = data.address
                const parts = []

                if (address.road) parts.push(address.road)
                if (address.suburb) parts.push(address.suburb)
                if (address.city || address.town || address.village) {
                    parts.push(address.city || address.town || address.village)
                }

                setLocationName(parts.join(', ') || data.display_name)
            } else {
                setLocationName('Lokasi tidak diketahui')
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error)
            setLocationName('Gagal mendapatkan nama lokasi')
        }
    }

    const startCamera = async () => {
        try {
            // Request location if not already available
            if (!location) {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const coords = {
                                lat: position.coords.latitude,
                                lon: position.coords.longitude
                            }
                            setLocation(coords)
                            console.log('Location acquired:', position.coords)

                            // Reverse geocode to get location name
                            reverseGeocode(coords.lat, coords.lon)
                        },
                        (error) => {
                            console.error('Location error:', error)
                            setError('Tidak dapat mengakses lokasi. Pastikan izin lokasi diaktifkan.')
                            setLocationName('Lokasi tidak tersedia')
                        }
                    )
                }
            }

            console.log('Requesting camera access...')
            // Request camera access with lower resolution for better compatibility
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            })

            console.log('Camera stream acquired:', stream)
            console.log('Video tracks:', stream.getVideoTracks())

            // Store stream in state - useEffect will attach it to video element
            setCameraStream(stream)
            setShowCamera(true)
            setError('')
            console.log('Camera modal should open now, useEffect will attach stream')
        } catch (err: any) {
            console.error('Camera error:', err)
            if (err.name === 'NotAllowedError') {
                setError('Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.')
            } else if (err.name === 'NotFoundError') {
                setError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.')
            } else {
                setError('Tidak dapat mengakses kamera. Silakan coba lagi.')
            }
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setCameraStream(null)
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

        // Calculate scaled dimensions (max 640px on longest side for better compatibility with older devices)
        const maxDimension = 640
        let width = video.videoWidth
        let height = video.videoHeight

        if (width > maxDimension || height > maxDimension) {
            if (width > height) {
                height = Math.round((height * maxDimension) / width)
                width = maxDimension
            } else {
                width = Math.round((width * maxDimension) / height)
                height = maxDimension
            }
        }

        // Set canvas size to scaled dimensions
        canvas.width = width
        canvas.height = height

        // Draw video frame with scaling
        context.drawImage(video, 0, 0, width, height)

        // Add timestamp and location overlay (top-left, matching live view)
        const now = new Date()
        const timeStr = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        const dateStr = now.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })

        // Draw semi-transparent background box (top-left) - scale based on canvas size
        const scale = Math.min(width / 640, 1) // Scale overlay for smaller images
        const padding = Math.round(16 * scale)
        const lineHeight = Math.round(24 * scale)
        const boxWidth = Math.round(400 * scale)
        const boxHeight = Math.round(160 * scale)
        const fontSize = Math.round(14 * scale)
        const headerSize = Math.round(20 * scale)

        context.fillStyle = 'rgba(0, 0, 0, 0.7)'
        context.fillRect(padding, padding, boxWidth, boxHeight)

        // Draw text content
        let yPos = padding + Math.round(30 * scale)

        // BASARNAS header
        context.fillStyle = 'white'
        context.font = `bold ${headerSize}px Arial`
        context.fillText('BASARNAS', padding + Math.round(16 * scale), yPos)
        yPos += lineHeight + Math.round(8 * scale)

        // Location
        context.fillStyle = '#D1D5DB' // gray-300
        context.font = `${fontSize}px Arial`
        context.fillText('Location:', padding + Math.round(16 * scale), yPos)
        context.fillStyle = '#FCD34D' // yellow-300
        const locationText = locationName.length > 35 ? locationName.substring(0, 35) + '...' : locationName
        context.fillText(locationText, padding + Math.round(100 * scale), yPos)
        yPos += lineHeight

        // Coordinates
        context.fillStyle = '#D1D5DB'
        context.fillText('Coordinates:', padding + Math.round(16 * scale), yPos)
        context.fillStyle = '#6EE7B7' // green-300
        context.fillText(`${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`, padding + Math.round(120 * scale), yPos)
        yPos += lineHeight

        // Time
        context.fillStyle = '#D1D5DB'
        context.fillText('Time:', padding + Math.round(16 * scale), yPos)
        context.fillStyle = '#93C5FD' // blue-300
        context.fillText(timeStr, padding + Math.round(70 * scale), yPos)
        yPos += lineHeight

        // Date
        context.fillStyle = '#D1D5DB'
        context.fillText('Date:', padding + Math.round(16 * scale), yPos)
        context.fillStyle = '#93C5FD'
        context.fillText(dateStr, padding + Math.round(70 * scale), yPos)

        // Compress more aggressively for better compatibility with older devices
        // Quality 0.65 = good balance between size and quality
        const compressedPhoto = canvas.toDataURL('image/jpeg', 0.65)
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
            // Log photo size for debugging
            const photoSizeKB = Math.round((photoData.length * 3) / 4 / 1024)
            console.log(`Uploading photo: ~${photoSizeKB}KB`)

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
                console.error('Check-in error:', data.error)
                setError(data.error || 'Gagal melakukan check-in')
            }
        } catch (error: any) {
            console.error('Network error:', error)
            setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
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

                {/* Camera Modal */}
                {showCamera && (
                    <div className="fixed inset-0 z-50 bg-black flex flex-col">
                        {/* Video Container */}
                        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-contain"
                                style={{ transform: 'scaleX(-1)' }}
                            />

                            {/* Live Timestamp Overlay */}
                            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg font-mono text-sm max-w-md">
                                <div className="font-bold text-lg mb-2">BASARNAS</div>
                                <div className="space-y-1">
                                    {location && (
                                        <>
                                            <div>
                                                <span className="text-gray-300">Location:</span>{' '}
                                                <span className="text-yellow-300">
                                                    {locationName}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-300">Coordinates:</span>{' '}
                                                <span className="text-green-300">
                                                    {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <span className="text-gray-300">Time:</span>{' '}
                                        <span className="text-blue-300">
                                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-300">Date:</span>{' '}
                                        <span className="text-blue-300">
                                            {currentTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex-shrink-0 p-6 bg-gray-900 flex gap-4 justify-center">
                            <button
                                onClick={capturePhoto}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-lg text-lg flex items-center gap-2"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                📸 Ambil Foto
                            </button>
                            <button
                                onClick={stopCamera}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-8 py-4 rounded-lg text-lg"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
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
