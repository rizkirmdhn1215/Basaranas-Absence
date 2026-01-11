-- =====================================================
-- ULTIMATE RLS FIX FOR CHECK-INS
-- =====================================================
-- This explicitly allows BOTH anon and authenticated users to insert
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, completely disable RLS temporarily to test
ALTER TABLE check_ins DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing check_ins policies
DROP POLICY IF EXISTS "checkins_public_insert" ON check_ins;
DROP POLICY IF EXISTS "checkins_admin_select" ON check_ins;
DROP POLICY IF EXISTS "checkins_admin_update" ON check_ins;
DROP POLICY IF EXISTS "checkins_admin_delete" ON check_ins;
DROP POLICY IF EXISTS "Admin can read all check-ins" ON check_ins;
DROP POLICY IF EXISTS "Public can insert check-ins" ON check_ins;
DROP POLICY IF EXISTS "Public can check in" ON check_ins;
DROP POLICY IF EXISTS "Everyone can insert check-ins" ON check_ins;
DROP POLICY IF EXISTS "Admin can delete check-ins" ON check_ins;
DROP POLICY IF EXISTS "Admin can update check-ins" ON check_ins;

-- Create explicit INSERT policy for anonymous users (most important!)
CREATE POLICY "anon_can_insert_checkins"
    ON check_ins
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Create explicit INSERT policy for authenticated users
CREATE POLICY "auth_can_insert_checkins"
    ON check_ins
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Admin can SELECT all check-ins
CREATE POLICY "auth_can_select_checkins"
    ON check_ins
    FOR SELECT
    TO authenticated
    USING (true);

-- Admin can UPDATE check-ins
CREATE POLICY "auth_can_update_checkins"
    ON check_ins
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Admin can DELETE check-ins
CREATE POLICY "auth_can_delete_checkins"
    ON check_ins
    FOR DELETE
    TO authenticated
    USING (true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the policies are active:

-- 1. Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'check_ins';

-- 2. List all policies on check_ins
-- SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'check_ins';

-- 3. Test insert as anon (should work)
-- SET ROLE anon;
-- INSERT INTO check_ins (session_id, employee_id) VALUES ('test-uuid', 'test-uuid');
-- RESET ROLE;
