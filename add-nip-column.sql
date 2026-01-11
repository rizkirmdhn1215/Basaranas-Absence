-- Add NIP (Nomor Induk Pegawai) column to employees table
-- Run this in your Supabase SQL Editor

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS nip TEXT;

-- Create index for faster NIP searches
CREATE INDEX IF NOT EXISTS idx_employees_nip ON employees(nip);

-- Add comment
COMMENT ON COLUMN employees.nip IS 'Nomor Induk Pegawai (Employee ID Number)';
