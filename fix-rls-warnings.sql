-- =====================================================
-- FIX SUPABASE SECURITY WARNINGS
-- =====================================================
-- This fixes the RLS warnings from Supabase linter
-- Run this in your Supabase SQL Editor
-- =====================================================

-- CRITICAL: Enable RLS on check_ins table
-- This fixes: "RLS Disabled in Public" and "Policy Exists RLS Disabled"
-- =====================================================

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Fix Security Definer View Warning
-- =====================================================
-- Drop and recreate the view without SECURITY DEFINER
-- =====================================================

DROP VIEW IF EXISTS session_attendance_summary;

CREATE OR REPLACE VIEW session_attendance_summary AS
SELECT 
    s.id as session_id,
    s.session_name,
    s.session_date,
    s.start_time,
    s.end_time,
    s.status,
    COUNT(c.id) as total_check_ins,
    COUNT(DISTINCT c.employee_id) as unique_employees,
    COUNT(CASE WHEN c.checked_in_at::time > s.end_time::time THEN 1 END) as late_count,
    COUNT(CASE WHEN c.is_fraudulent = true THEN 1 END) as fraud_count
FROM sessions s
LEFT JOIN check_ins c ON s.id = c.session_id
GROUP BY s.id, s.session_name, s.session_date, s.start_time, s.end_time, s.status;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the fixes worked:

-- 1. Check RLS is enabled on check_ins
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_ins';
-- Expected: rowsecurity = true

-- 2. Check all policies exist
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'check_ins';
-- Expected: 4 policies (checkins_public_insert, checkins_admin_select, checkins_admin_update, checkins_admin_delete)

-- 3. Check view is not SECURITY DEFINER
-- SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname = 'session_attendance_summary';
-- Expected: view exists without SECURITY DEFINER
