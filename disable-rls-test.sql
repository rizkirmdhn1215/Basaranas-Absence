-- =====================================================
-- NUCLEAR OPTION: Temporarily disable RLS for testing
-- =====================================================
-- WARNING: Only use this for TESTING to verify the issue is RLS
-- DO NOT leave this in production!
-- =====================================================

-- Temporarily disable RLS on check_ins to test
ALTER TABLE check_ins DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- After confirming check-ins work, re-enable with proper policies:
-- =====================================================

-- ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
-- 
-- -- Drop all existing policies
-- DROP POLICY IF EXISTS "anon_can_insert_checkins" ON check_ins;
-- DROP POLICY IF EXISTS "auth_can_insert_checkins" ON check_ins;
-- DROP POLICY IF EXISTS "auth_can_select_checkins" ON check_ins;
-- DROP POLICY IF EXISTS "auth_can_update_checkins" ON check_ins;
-- DROP POLICY IF EXISTS "auth_can_delete_checkins" ON check_ins;
-- 
-- -- Create new policies
-- CREATE POLICY "anon_can_insert_checkins"
--     ON check_ins
--     FOR INSERT
--     TO anon
--     WITH CHECK (true);
-- 
-- CREATE POLICY "auth_can_all_checkins"
--     ON check_ins
--     FOR ALL
--     TO authenticated
--     USING (true)
--     WITH CHECK (true);
