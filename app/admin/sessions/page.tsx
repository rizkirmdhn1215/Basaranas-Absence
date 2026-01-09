'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

export default function SessionsPage() {
    const [sessions, setSessions] = useState<any[]>([])
    const [activeSession, setActiveSession] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        sessionName: '',
        sessionDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '07:00',
        endTime: '08:00',
    })

    useEffect(() => {
        fetchSessions()
    }, [])

    const fetchSessions = async () => {
        setLoading(true)
        try {
            const [allRes, activeRes] = await Promise.all([
                fetch('/api/sessions'),
                fetch('/api/sessions?active=true'),
            ])

            const allData = await allRes.json()
            const activeData = await activeRes.json()

            setSessions(allData.sessions || [])
            setActiveSession(activeData.sessions?.[0] || null)
        } catch (error) {
            console.error('Failed to fetch sessions:', error)
            MySwal.fire('Error', 'Gagal memuat sesi', 'error')
        } finally {
            setLoading(false)
        }
    }

    const openSession = async () => {
        if (!formData.sessionName) {
            MySwal.fire('Gagal', 'Nama sesi harus diisi', 'warning')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (res.ok) {
                MySwal.fire({
                    title: 'Berhasil!',
                    text: 'Sesi berhasil dibuka!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                })
                setShowModal(false)
                fetchSessions()
            } else {
                MySwal.fire('Gagal', data.error || 'Gagal membuka sesi', 'error')
            }
        } catch (error) {
            MySwal.fire('Error', 'Terjadi kesalahan sistem', 'error')
        } finally {
            setLoading(false)
        }
    }

    const closeSession = async (sessionId: string) => {
        const result = await MySwal.fire({
            title: 'Tutup Sesi?',
            text: "Karyawan tidak akan bisa check-in lagi setelah sesi ditutup.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Tutup Sesi!',
            cancelButtonText: 'Batal'
        })

        if (!result.isConfirmed) return

        setLoading(true)
        try {
            const res = await fetch('/api/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            })

            if (res.ok) {
                MySwal.fire('Berhasil!', 'Sesi berhasil ditutup', 'success')
                fetchSessions()
            } else {
                MySwal.fire('Gagal', 'Gagal menutup sesi', 'error')
            }
        } catch (error) {
            MySwal.fire('Error', 'Terjadi kesalahan sistem', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-indigo-600 hover:text-indigo-700"
                        >
                            ← Kembali
                        </button>
                        <h1 className="text-xl font-bold">Kelola Sesi Absensi</h1>
                        <div className="w-20"></div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Active Session */}
                {activeSession && (
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl p-6 mb-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                                    🟢 Sesi Aktif
                                </h2>
                                <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                                    {activeSession.session_name}
                                </p>
                                <p className="text-green-700 dark:text-green-300 mt-1">
                                    {format(new Date(activeSession.session_date), 'dd MMM yyyy')} • {activeSession.start_time} - {activeSession.end_time}
                                </p>
                            </div>
                            <button
                                onClick={() => closeSession(activeSession.id)}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
                            >
                                Tutup Sesi
                            </button>
                        </div>
                    </div>
                )}

                {/* Open New Session Button */}
                {!activeSession && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-semibold text-lg mb-6"
                    >
                        + Buka Sesi Baru
                    </button>
                )}

                {/* Past Sessions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">Riwayat Sesi</h2>
                    {loading ? (
                        <p className="text-center py-8 text-gray-500">Memuat...</p>
                    ) : sessions.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Belum ada sesi</p>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                    onClick={() => router.push(`/admin/reports?session=${session.id}`)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {session.session_name}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {format(new Date(session.session_date), 'dd MMM yyyy')} • {session.start_time} - {session.end_time}
                                            </p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${session.status === 'open'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {session.status === 'open' ? 'Aktif' : 'Ditutup'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">Buka Sesi Baru</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nama Sesi</label>
                                <input
                                    type="text"
                                    value={formData.sessionName}
                                    onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                                    placeholder="Apel Pagi 9 Jan 2026"
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tanggal</label>
                                <input
                                    type="date"
                                    value={formData.sessionDate}
                                    onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Jam Mulai</label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Jam Selesai</label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={openSession}
                                disabled={loading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold"
                            >
                                {loading ? 'Membuka...' : 'Buka Sesi'}
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
