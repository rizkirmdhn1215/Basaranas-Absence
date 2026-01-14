-- =====================================================
-- FIX STORAGE UPLOAD ERROR (403 Forbidden)
-- =====================================================
-- Error: "new row violates row-level security policy"
-- Cause: Storage bucket only allows authenticated uploads
-- Solution: Allow anonymous (public) uploads to check-in-photos
-- =====================================================

-- CRITICAL: Drop existing restrictive policies
-- =====================================================

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- =====================================================
-- Create NEW policies that allow anonymous uploads
-- =====================================================

-- Policy 1: Allow ANYONE (including anonymous) to upload photos
CREATE POLICY "Allow public uploads to check-in-photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'check-in-photos');

-- Policy 2: Allow ANYONE to read/view photos
CREATE POLICY "Allow public read from check-in-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'check-in-photos');

-- Policy 3: Allow authenticated users to delete photos (admin only)
CREATE POLICY "Allow authenticated delete from check-in-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'check-in-photos');

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this, test:
-- 1. Try check-in from mobile device (should work now)
-- 2. Verify photo appears in Supabase Storage
-- 3. Verify photo URL is accessible publicly
-- 4. Check admin reports show photos correctly

-- To verify policies are created:
-- SELECT policyname, cmd, roles FROM pg_policies 
-- WHERE schemaname = 'storage' AND tablename = 'objects' 
-- AND policyname LIKE '%check-in-photos%';
