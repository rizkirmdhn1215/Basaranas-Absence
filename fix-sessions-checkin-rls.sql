-- Allow public to view open sessions
DROP POLICY IF EXISTS "Public can view open sessions" ON sessions;
CREATE POLICY "Public can view open sessions"
ON sessions FOR SELECT
TO anon
USING (status = 'open');

-- Allow public to insert check-ins
DROP POLICY IF EXISTS "Public can check in" ON check_ins;
CREATE POLICY "Public can check in"
ON check_ins FOR INSERT
TO anon
WITH CHECK (true);

-- Ensure employees are readable by public (if not already set)
DROP POLICY IF EXISTS "Public can read active employees" ON employees;
CREATE POLICY "Public can read active employees"
ON employees FOR SELECT
TO anon
USING (is_active = true);
