-- =====================================================
-- SIMPLE RLS FIX - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This will allow check-ins to work from both PC and mobile
-- =====================================================

-- Step 1: Temporarily disable RLS to test
ALTER TABLE check_ins DISABLE ROW LEVEL SECURITY;

-- Step 2: After confirming it works, re-enable and add proper policy
-- Uncomment these lines after testing:

-- ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "allow_anon_insert_checkins" ON check_ins;
-- DROP POLICY IF EXISTS "allow_auth_all_checkins" ON check_ins;
-- 
-- -- Allow anonymous users to INSERT check-ins
-- CREATE POLICY "allow_anon_insert_checkins"
--     ON check_ins
--     FOR INSERT
--     TO anon
--     WITH CHECK (true);
-- 
-- -- Allow authenticated users full access
-- CREATE POLICY "allow_auth_all_checkins"
--     ON check_ins
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);
