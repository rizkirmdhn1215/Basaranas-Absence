'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'

export default function ReportsPage() {
    const [sessions, setSessions] = useState<any[]>([])
    const [selectedSession, setSelectedSession] = useState<string>('')
    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [tab, setTab] = useState<'present' | 'absent'>('present')
    const [searchTerm, setSearchTerm] = useState('')
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        fetchSessions()
        const sessionParam = searchParams.get('session')
        if (sessionParam) {
            setSelectedSession(sessionParam)
            fetchReport(sessionParam)
        }
    }, [searchParams])

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/sessions')
            const data = await res.json()
            setSessions(data.sessions || [])
        } catch (error) {
            console.error('Failed to fetch sessions:', error)
        }
    }

    const fetchReport = async (sessionId: string) => {
        if (!sessionId) return

        setLoading(true)
        try {
            const res = await fetch(`/api/reports/${sessionId}`)
            const data = await res.json()
            setReportData(data)
        } catch (error) {
            console.error('Failed to fetch report:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSessionChange = (sessionId: string) => {
        setSelectedSession(sessionId)
        fetchReport(sessionId)
    }

    const exportToExcel = () => {
        if (!reportData) return

        const dataToExport = reportData.attendance
            .filter((a: any) => tab === 'present' ? a.status === 'present' : a.status === 'absent')
            .map((a: any) => ({
                Nama: a.employee.name,
                'Pangkat/Gol': a.employee.rank,
                Jabatan: a.employee.position,
                Status: a.status === 'present' ? 'Hadir' : 'Tidak Hadir',
                'Waktu Check-In': a.checked_in_at || '-',
            }))

        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, tab === 'present' ? 'Hadir' : 'Tidak Hadir')

        const filename = `Absensi_${reportData.session.session_name}_${tab === 'present' ? 'Hadir' : 'Tidak_Hadir'}.xlsx`
        XLSX.writeFile(wb, filename)
    }

    const filteredAttendance = reportData?.attendance?.filter((a: any) => {
        const matchesTab = tab === 'present' ? a.status === 'present' : a.status === 'absent'
        const matchesSearch = a.employee.name.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesTab && matchesSearch
    }) || []

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
                        <h1 className="text-xl font-bold">Laporan Absensi</h1>
                        <div className="w-20"></div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Session Selector */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                    <label className="block text-sm font-medium mb-2">Pilih Sesi</label>
                    <select
                        value={selectedSession}
                        onChange={(e) => handleSessionChange(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                    >
                        <option value="">-- Pilih Sesi --</option>
                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {session.session_name} - {new Date(session.session_date).toLocaleDateString('id-ID')}
                            </option>
                        ))}
                    </select>
                </div>

                {loading && (
                    <div className="text-center py-12 text-gray-600">Memuat laporan...</div>
                )}

                {reportData && !loading && (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Karyawan</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {reportData.summary.total}
                                </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl shadow p-6">
                                <p className="text-sm text-green-700 dark:text-green-300">Hadir</p>
                                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                                    {reportData.summary.present}
                                </p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow p-6">
                                <p className="text-sm text-red-700 dark:text-red-300">Tidak Hadir</p>
                                <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                                    {reportData.summary.absent}
                                </p>
                            </div>
                        </div>

                        {/* Tabs and Export */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setTab('present')}
                                        className={`px-4 py-2 rounded-lg font-semibold ${tab === 'present'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        Hadir ({reportData.summary.present})
                                    </button>
                                    <button
                                        onClick={() => setTab('absent')}
                                        className={`px-4 py-2 rounded-lg font-semibold ${tab === 'absent'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        Tidak Hadir ({reportData.summary.absent})
                                    </button>
                                </div>
                                <button
                                    onClick={exportToExcel}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export Excel
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder="Cari nama..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg mb-4 dark:bg-gray-700"
                            />

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">No</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">Pangkat/Gol</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold">Jabatan</th>
                                            {tab === 'present' && (
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Waktu Check-In</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAttendance.map((a: any, idx: number) => (
                                            <tr key={idx} className={`border-b border-gray-200 dark:border-gray-700 ${a.flags?.includes('duplicate_device') ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                                <td className="px-4 py-3">{idx + 1}</td>
                                                <td className="px-4 py-3 font-semibold flex items-center gap-2">
                                                    {a.employee.name}
                                                    {a.flags?.includes('duplicate_device') && (
                                                        <span className="text-red-500" title="Terdeteksi check-in ganda dari perangkat yang sama">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.employee.rank}</td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{a.employee.position}</td>
                                                {tab === 'present' && (
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                        {a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString('id-ID') : '-'}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}
