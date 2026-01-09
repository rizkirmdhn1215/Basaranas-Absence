'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseExcelFile, parseCSVFile, type EmployeeRow } from '@/lib/excel-parser'
import Swal from 'sweetalert2'

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [previewData, setPreviewData] = useState<EmployeeRow[]>([])
    const [showPreview, setShowPreview] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState<any>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [showCrudModal, setShowCrudModal] = useState(false)
    const [crudSearchTerm, setCrudSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const router = useRouter()

    useEffect(() => {
        fetchEmployees()
    }, [])

    useEffect(() => {
        // Lock body scroll when modal is open
        if (showCrudModal || editingEmployee || showPreview) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showCrudModal, editingEmployee, showPreview])

    const fetchEmployees = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/employees')
            const data = await res.json()
            setEmployees(data.employees || [])
        } catch (error) {
            console.error('Failed to fetch employees:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            let parsedData: EmployeeRow[]

            if (file.name.endsWith('.csv')) {
                parsedData = await parseCSVFile(file)
            } else {
                parsedData = await parseExcelFile(file)
            }

            setPreviewData(parsedData)
            setShowPreview(true)
        } catch (error) {
            console.error('Failed to parse file:', error)
            Swal.fire('Error', 'Gagal membaca file. Pastikan format file benar.', 'error')
        } finally {
            setUploading(false)
        }
    }

    const confirmUpload = async () => {
        setUploading(true)
        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employees: previewData }),
            })

            const data = await res.json()

            if (res.ok) {
                Swal.fire('Berhasil!', `Berhasil mengupload ${data.count} karyawan`, 'success')
                setShowPreview(false)
                setPreviewData([])
                fetchEmployees()
            } else {
                Swal.fire('Error', `Gagal upload: ${data.error}`, 'error')
            }
        } catch (error) {
            console.error('Upload error:', error)
            Swal.fire('Error', 'Terjadi kesalahan saat upload', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleEdit = async () => {
        if (!editingEmployee) return

        setLoading(true)
        try {
            const res = await fetch(`/api/employees/${editingEmployee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingEmployee),
            })

            if (res.ok) {
                Swal.fire('Berhasil!', 'Data karyawan berhasil diupdate', 'success')
                setEditingEmployee(null)
                fetchEmployees()
            } else {
                Swal.fire('Error', 'Gagal mengupdate karyawan', 'error')
            }
        } catch (error) {
            Swal.fire('Error', 'Terjadi kesalahan', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: 'Hapus Karyawan?',
            text: 'Data yang dihapus tidak dapat dikembalikan',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        })
        if (!result.isConfirmed) return

        setLoading(true)
        try {
            const res = await fetch(`/api/employees/${id}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                Swal.fire('Terhapus!', 'Karyawan berhasil dihapus', 'success')
                fetchEmployees()
            } else {
                Swal.fire('Error', 'Gagal menghapus karyawan', 'error')
            }
        } catch (error) {
            Swal.fire('Error', 'Terjadi kesalahan', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleMassDelete = async () => {
        if (selectedIds.length === 0) {
            Swal.fire('Perhatian', 'Pilih minimal 1 karyawan', 'warning')
            return
        }

        const result = await Swal.fire({
            title: 'Hapus Karyawan?',
            text: `Hapus ${selectedIds.length} karyawan terpilih? Data tidak dapat dikembalikan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        })
        if (!result.isConfirmed) return

        setLoading(true)
        let successCount = 0
        let failCount = 0

        try {
            // Delete sequentially to avoid overwhelming the server
            for (const id of selectedIds) {
                try {
                    const res = await fetch(`/api/employees/${id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    })

                    if (res.ok) {
                        successCount++
                    } else {
                        failCount++
                        const error = await res.json()
                        console.error(`Failed to delete ${id}:`, error)
                    }
                } catch (error) {
                    failCount++
                    console.error(`Error deleting ${id}:`, error)
                }
            }

            if (successCount > 0) {
                Swal.fire(
                    'Berhasil!',
                    `Berhasil menghapus ${successCount} karyawan${failCount > 0 ? `, ${failCount} gagal` : ''}`,
                    failCount > 0 ? 'warning' : 'success'
                )
                setSelectedIds([])
                fetchEmployees()
            } else {
                Swal.fire('Error', 'Gagal menghapus semua karyawan', 'error')
            }
        } catch (error) {
            console.error('Mass delete error:', error)
            Swal.fire('Error', 'Terjadi kesalahan', 'error')
        } finally {
            setLoading(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === crudFilteredEmployees.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(crudFilteredEmployees.map(e => e.id))
        }
    }

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const filteredEmployees = employees.filter((emp) =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const crudFilteredEmployees = employees.filter((emp) =>
        emp.name.toLowerCase().includes(crudSearchTerm.toLowerCase())
    )

    // Pagination calculations
    const totalPages = Math.ceil(crudFilteredEmployees.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedEmployees = crudFilteredEmployees.slice(startIndex, endIndex)

    const goToPage = (page: number) => {
        setCurrentPage(page)
    }

    const toggleSelectAllOnPage = () => {
        const pageIds = paginatedEmployees.map(e => e.id)
        const allPageSelected = pageIds.every(id => selectedIds.includes(id))

        if (allPageSelected) {
            setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)))
        } else {
            setSelectedIds([...new Set([...selectedIds, ...pageIds])])
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
                        <h1 className="text-xl font-bold">Kelola Karyawan</h1>
                        <div className="w-20"></div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Upload Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Upload Data Karyawan</h2>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            {uploading ? 'Memproses...' : 'Pilih File Excel/CSV'}
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                {/* Preview Modal */}
                {showPreview && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-6 border-b">
                                <h3 className="text-xl font-bold">Preview Data ({previewData.length} karyawan)</h3>
                            </div>
                            <div className="p-6 overflow-auto max-h-96">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Nama</th>
                                            <th className="px-4 py-2 text-left">Pangkat/Gol</th>
                                            <th className="px-4 py-2 text-left">Jabatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 50).map((emp, idx) => (
                                            <tr key={idx} className="border-b">
                                                <td className="px-4 py-2">{emp.name}</td>
                                                <td className="px-4 py-2">{emp.rank}</td>
                                                <td className="px-4 py-2">{emp.position}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 border-t flex gap-4">
                                <button
                                    onClick={confirmUpload}
                                    disabled={uploading}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
                                >
                                    {uploading ? 'Mengupload...' : 'Konfirmasi Upload'}
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingEmployee && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                            <h3 className="text-xl font-bold mb-4">Edit Karyawan</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nama</label>
                                    <input
                                        type="text"
                                        value={editingEmployee.name}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Pangkat/Gol</label>
                                    <input
                                        type="text"
                                        value={editingEmployee.rank}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, rank: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Jabatan</label>
                                    <input
                                        type="text"
                                        value={editingEmployee.position}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Unit</label>
                                    <input
                                        type="text"
                                        value={editingEmployee.unit || ''}
                                        onChange={(e) => setEditingEmployee({ ...editingEmployee, unit: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    onClick={handleEdit}
                                    disabled={loading}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan'}
                                </button>
                                <button
                                    onClick={() => setEditingEmployee(null)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg font-semibold"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CRUD Modal */}
                {showCrudModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-6xl w-full max-h-[85vh] overflow-hidden">
                            <div className="p-6 border-b flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xl font-bold">Kelola Karyawan</h3>
                                    {selectedIds.length > 0 && (
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {selectedIds.length} dipilih
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {selectedIds.length > 0 && (
                                        <button
                                            onClick={handleMassDelete}
                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
                                        >
                                            Hapus ({selectedIds.length})
                                        </button>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Cari nama..."
                                        value={crudSearchTerm}
                                        onChange={(e) => {
                                            setCrudSearchTerm(e.target.value)
                                            setCurrentPage(1)
                                        }}
                                        className="px-4 py-2 border rounded-lg dark:bg-gray-700"
                                    />
                                    <button
                                        onClick={() => {
                                            setShowCrudModal(false)
                                            setSelectedIds([])
                                            setCrudSearchTerm('')
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="overflow-auto max-h-[60vh]">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3 w-12 text-center border-b dark:border-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={paginatedEmployees.length > 0 && paginatedEmployees.every(emp => selectedIds.includes(emp.id))}
                                                        onChange={toggleSelectAllOnPage}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 w-12 text-center text-sm font-semibold border-b dark:border-gray-600">No</th>
                                                <th className="px-4 py-3 w-[25%] text-sm font-semibold border-b dark:border-gray-600 truncate">Nama</th>
                                                <th className="px-4 py-3 w-[20%] text-sm font-semibold border-b dark:border-gray-600 truncate">Pangkat/Gol</th>
                                                <th className="px-4 py-3 w-[30%] text-sm font-semibold border-b dark:border-gray-600 truncate">Jabatan</th>
                                                <th className="px-4 py-3 w-[15%] text-sm font-semibold border-b dark:border-gray-600 text-center">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {paginatedEmployees.map((emp, index) => (
                                                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(emp.id)}
                                                            onChange={() => toggleSelect(emp.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 truncate" title={emp.name}>
                                                        {emp.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate" title={emp.rank}>
                                                        {emp.rank}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 truncate" title={emp.position}>
                                                        {emp.position}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => setEditingEmployee(emp)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Menampilkan {startIndex + 1}-{Math.min(endIndex, crudFilteredEmployees.length)} dari {crudFilteredEmployees.length} karyawan
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => goToPage(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            ← Prev
                                        </button>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`px-3 py-1 border rounded-lg ${currentPage === page
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => goToPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Employee List (Read-only) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold">
                                Daftar Karyawan ({filteredEmployees.length})
                            </h2>
                            <button
                                onClick={() => setShowCrudModal(true)}
                                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                                title="Kelola Karyawan"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Cari nama..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-4 py-2 border rounded-lg dark:bg-gray-700"
                        />
                    </div>

                    {loading ? (
                        <div className="text-center py-8">Memuat data...</div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-8">Belum ada data karyawan</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-sm font-semibold w-12">No</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Pangkat/Gol</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold">Jabatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmployees.map((emp, index) => (
                                        <tr key={emp.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-4 py-3 text-center text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-3 font-semibold">{emp.name}</td>
                                            <td className="px-4 py-3 text-sm">{emp.rank}</td>
                                            <td className="px-4 py-3 text-sm">{emp.position}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
