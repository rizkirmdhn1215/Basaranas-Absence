-- Fix RLS policies for employee CRUD operations
-- Run this in Supabase SQL Editor if you're having permission issues

-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to employees" ON employees;
DROP POLICY IF EXISTS "Public can read active employees" ON employees;

-- Create explicit policies for each operation
CREATE POLICY "Admin can select employees"
    ON employees
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin can insert employees"
    ON employees
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Admin can update employees"
    ON employees
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admin can delete employees"
    ON employees
    FOR DELETE
    TO authenticated
    USING (true);

-- Public read access
CREATE POLICY "Public can read active employees"
    ON employees
    FOR SELECT
    TO anon
    USING (is_active = true);
