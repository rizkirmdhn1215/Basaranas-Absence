'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'

function ReportsContent() {
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

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([]) // Create empty sheet

        // Get session info
        const sessionName = reportData.session.session_name
        const sessionDate = new Date(reportData.session.session_date).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        const sessionTime = `${reportData.session.start_time} - ${reportData.session.end_time}`

        // Add header rows (rows 1-5) - will be merged later
        XLSX.utils.sheet_add_aoa(ws, [
            ['DAFTAR ABSENSI'],
            ['Kantor Pencarian dan Pertolongan Kelas A Padang'],
            ['Badan Nasional Pencarian dan Pertolongan'],
            [`Periode ${sessionDate}`],
            [`${sessionName} (${sessionTime})`]
        ], { origin: 'A1' })

        // Add table headers at row 6
        const headers = ['No', 'NIP', 'Nama', 'Pangkat/Gol', 'Jabatan', 'Waktu Check-In', 'Keterangan']
        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A6' })

        // Prepare data
        const dataRows = reportData.attendance
            .filter((a: any) => tab === 'present' ? a.status === 'present' : a.status === 'absent')
            .map((a: any, idx: number) => [
                idx + 1,
                a.employee.nip || '-',
                a.employee.name,
                a.employee.rank || '-',
                a.employee.position || '-',
                a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString('id-ID') : '-',
                '' // Empty Keterangan column
            ])

        // Add data starting from row 7
        XLSX.utils.sheet_add_aoa(ws, dataRows, { origin: 'A7' })

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },  // No
            { wch: 18 }, // NIP
            { wch: 25 }, // Nama
            { wch: 15 }, // Pangkat/Gol
            { wch: 30 }, // Jabatan
            { wch: 15 }, // Waktu Check-In
            { wch: 30 }  // Keterangan
        ]

        // Set row heights for header rows (1-5) to prevent text clipping
        ws['!rows'] = [
            { hpt: 20 }, // Row 1
            { hpt: 18 }, // Row 2
            { hpt: 18 }, // Row 3
            { hpt: 18 }, // Row 4
            { hpt: 18 }, // Row 5
            { hpt: 20 }  // Row 6 (table header)
        ]

        // Merge cells for header rows (A1:G1, A2:G2, etc.)
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Row 1
            { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Row 2
            { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // Row 3
            { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } }, // Row 4
            { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } }  // Row 5
        ]

        // Apply styles to header rows (1-5) - centered, middle aligned, and bold
        for (let row = 1; row <= 5; row++) {
            const cellRef = XLSX.utils.encode_cell({ r: row - 1, c: 0 })
            if (!ws[cellRef]) continue
            ws[cellRef].s = {
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true
                },
                font: { bold: true, sz: row === 1 ? 14 : 11 }
            }
        }

        // Apply styles to table headers (row 6) - bold, centered, with background
        for (let col = 0; col < headers.length; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 5, c: col })
            if (!ws[cellRef]) continue
            ws[cellRef].s = {
                alignment: {
                    horizontal: 'center',
                    vertical: 'center',
                    wrapText: true
                },
                font: { bold: true },
                fill: { fgColor: { rgb: 'D3D3D3' } },
                border: {
                    top: { style: 'medium', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: col === 0 ? { style: 'medium', color: { rgb: '000000' } } : { style: 'thin', color: { rgb: '000000' } },
                    right: col === headers.length - 1 ? { style: 'medium', color: { rgb: '000000' } } : { style: 'thin', color: { rgb: '000000' } }
                }
            }
        }

        // Apply borders to data cells with thick outer border
        for (let row = 0; row < dataRows.length; row++) {
            const isLastRow = row === dataRows.length - 1
            for (let col = 0; col < headers.length; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: 6 + row, c: col })
                if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' }

                const isFirstCol = col === 0
                const isLastCol = col === headers.length - 1

                ws[cellRef].s = {
                    border: {
                        top: { style: 'thin', color: { rgb: '000000' } },
                        bottom: isLastRow ? { style: 'medium', color: { rgb: '000000' } } : { style: 'thin', color: { rgb: '000000' } },
                        left: isFirstCol ? { style: 'medium', color: { rgb: '000000' } } : { style: 'thin', color: { rgb: '000000' } },
                        right: isLastCol ? { style: 'medium', color: { rgb: '000000' } } : { style: 'thin', color: { rgb: '000000' } }
                    },
                    alignment: {
                        horizontal: col === 0 ? 'center' : 'left',
                        vertical: 'center',
                        wrapText: true
                    }
                }
            }
        }

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

export default function ReportsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Memuat...</div>}>
            <ReportsContent />
        </Suspense>
    )
}
