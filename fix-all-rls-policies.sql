-- =====================================================
-- COMPREHENSIVE RLS POLICY FIX
-- =====================================================
-- This file consolidates all RLS policies and fixes conflicts
-- Run this ONCE in your Supabase SQL Editor to fix all RLS issues
-- =====================================================

-- Step 1: Drop ALL existing policies to start fresh
-- =====================================================

-- Drop all employees policies
DROP POLICY IF EXISTS "Admin full access to employees" ON employees;
DROP POLICY IF EXISTS "Public can read active employees" ON employees;
DROP POLICY IF EXISTS "Admin can select employees" ON employees;
DROP POLICY IF EXISTS "Admin can insert employees" ON employees;
DROP POLICY IF EXISTS "Admin can update employees" ON employees;
DROP POLICY IF EXISTS "Admin can delete employees" ON employees;

-- Drop all sessions policies
DROP POLICY IF EXISTS "Admin full access to sessions" ON sessions;
DROP POLICY IF EXISTS "Public can read open sessions" ON sessions;
DROP POLICY IF EXISTS "Public can view open sessions" ON sessions;

-- Drop all check_ins policies
DROP POLICY IF EXISTS "Admin can read all check-ins" ON check_ins;
DROP POLICY IF EXISTS "Public can insert check-ins" ON check_ins;
DROP POLICY IF EXISTS "Public can check in" ON check_ins;
DROP POLICY IF EXISTS "Everyone can insert check-ins" ON check_ins;
DROP POLICY IF EXISTS "Admin can delete check-ins" ON check_ins;
DROP POLICY IF EXISTS "Admin can update check-ins" ON check_ins;

-- Step 2: Create clean, non-conflicting policies
-- =====================================================

-- EMPLOYEES TABLE POLICIES
-- =====================================================

-- Admin: Full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "employees_admin_all"
    ON employees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Public: Read-only access to active employees
CREATE POLICY "employees_public_select"
    ON employees
    FOR SELECT
    TO anon
    USING (is_active = true);

-- SESSIONS TABLE POLICIES
-- =====================================================

-- Admin: Full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "sessions_admin_all"
    ON sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Public: Read-only access to open sessions
CREATE POLICY "sessions_public_select"
    ON sessions
    FOR SELECT
    TO anon
    USING (status = 'open');

-- CHECK_INS TABLE POLICIES
-- =====================================================

-- Everyone (public + authenticated): Can INSERT check-ins
CREATE POLICY "checkins_public_insert"
    ON check_ins
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Admin: Can SELECT all check-ins
CREATE POLICY "checkins_admin_select"
    ON check_ins
    FOR SELECT
    TO authenticated
    USING (true);

-- Admin: Can UPDATE check-ins
CREATE POLICY "checkins_admin_update"
    ON check_ins
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Admin: Can DELETE check-ins
CREATE POLICY "checkins_admin_delete"
    ON check_ins
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this, verify with:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
