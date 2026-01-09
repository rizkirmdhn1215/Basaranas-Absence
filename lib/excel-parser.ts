import * as XLSX from 'xlsx'

export interface EmployeeRow {
    name: string
    rank: string
    position: string
    positionDate: string
    unit?: string
}

export function parseExcelFile(file: File): Promise<EmployeeRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                // Find the header row (look for "Nama" in column C)
                let headerRowIndex = -1
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    if (row && row[2] && String(row[2]).trim().toLowerCase() === 'nama') {
                        headerRowIndex = i
                        break
                    }
                }

                // If no header found, assume row 0 is header
                if (headerRowIndex === -1) {
                    headerRowIndex = 0
                }

                // Parse data starting from the row after header
                const employees: EmployeeRow[] = []

                for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                    const row = jsonData[i]

                    // Skip empty rows or rows without a name
                    if (!row || row.length === 0 || !row[2] || String(row[2]).trim() === '') continue

                    employees.push({
                        name: String(row[2] || '').trim(), // Column C: Nama
                        rank: String(row[3] || '').trim(), // Column D: Pangkat/Gol
                        position: String(row[4] || '').trim(), // Column E: Jabatan
                        positionDate: String(row[5] || '').trim(), // Column F: TMT Jabatan
                        unit: '', // Will be added later if needed
                    })
                }

                resolve(employees)
            } catch (error) {
                reject(error)
            }
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsBinaryString(file)
    })
}

export function parseCSVFile(file: File): Promise<EmployeeRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string
                const workbook = XLSX.read(text, { type: 'string' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                const employees: EmployeeRow[] = []

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    if (!row || row.length === 0 || !row[1]) continue

                    employees.push({
                        name: String(row[1] || '').trim(),
                        rank: String(row[2] || '').trim(),
                        position: String(row[3] || '').trim(),
                        positionDate: String(row[4] || '').trim(),
                        unit: '',
                    })
                }

                resolve(employees)
            } catch (error) {
                reject(error)
            }
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
    })
}
