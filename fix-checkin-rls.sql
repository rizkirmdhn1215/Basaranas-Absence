-- Fix RLS policies for check_ins table
-- Allows both anonymous (public) and authenticated (admin) users to insert check-ins

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Admin can read all check-ins" ON check_ins;
DROP POLICY IF EXISTS "Public can insert check-ins" ON check_ins;

-- 1. Everyone can INSERT (Public + Admin)
CREATE POLICY "Everyone can insert check-ins"
    ON check_ins
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 2. Admin can SELECT (Read all)
CREATE POLICY "Admin can read all check-ins"
    ON check_ins
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. Admin can DELETE (Optional, for cleanup)
CREATE POLICY "Admin can delete check-ins"
    ON check_ins
    FOR DELETE
    TO authenticated
    USING (true);

-- 4. Admin can UPDATE (Optional)
CREATE POLICY "Admin can update check-ins"
    ON check_ins
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
