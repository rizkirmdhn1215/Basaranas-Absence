'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'

export default function CheckInPage() {
    const [activeSession, setActiveSession] = useState<any>(null)
    const [employeeName, setEmployeeName] = useState('')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [employeeData, setEmployeeData] = useState<any>(null)
    const [deviceId, setDeviceId] = useState('')
    const isSelecting = useRef(false)

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
            setError('Silakan masukkan nama Anda')
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
                    deviceId: deviceId
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
                    <button
                        onClick={() => {
                            setSuccess(false)
                            setEmployeeData(null)
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
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Masukkan Nama Anda
                                </label>
                                <input
                                    type="text"
                                    value={employeeName}
                                    onChange={(e) => setEmployeeName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleCheckIn()}
                                    placeholder="Ketik nama lengkap..."
                                    className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    disabled={loading}
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

                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleCheckIn}
                                disabled={loading || !employeeName.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-4 text-lg rounded-lg transition-colors shadow-lg hover:shadow-xl"
                            >
                                {loading ? 'Memproses...' : 'Check In'}
                            </button>
                        </div>
                    </>
                )}


            </div>
        </div>
    )
}
