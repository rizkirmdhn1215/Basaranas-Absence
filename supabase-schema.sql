-- Apel Pagi Attendance System Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    rank TEXT,
    position TEXT,
    position_date DATE,
    unit TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster name searches
CREATE INDEX idx_employees_name ON employees(name);
CREATE INDEX idx_employees_unit ON employees(unit);
CREATE INDEX idx_employees_active ON employees(is_active);

-- =====================================================
-- SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_date DATE NOT NULL,
    session_name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opened_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster session queries
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_sessions_status ON sessions(status);

-- =====================================================
-- CHECK_INS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    UNIQUE(session_id, employee_id)
);

-- Index for faster check-in queries
CREATE INDEX idx_checkins_session ON check_ins(session_id);
CREATE INDEX idx_checkins_employee ON check_ins(employee_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Employees: Admin can do everything, public can read active employees
CREATE POLICY "Admin full access to employees"
    ON employees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public can read active employees"
    ON employees
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Sessions: Admin can do everything, public can read open sessions
CREATE POLICY "Admin full access to sessions"
    ON sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Public can read open sessions"
    ON sessions
    FOR SELECT
    TO anon
    USING (status = 'open');

-- Check-ins: Admin can read all, public can insert only
CREATE POLICY "Admin can read all check-ins"
    ON check_ins
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Public can insert check-ins"
    ON check_ins
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for employees table
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- View to get attendance summary for a session
CREATE OR REPLACE VIEW session_attendance_summary AS
SELECT 
    s.id as session_id,
    s.session_name,
    s.session_date,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT c.employee_id) as present_count,
    COUNT(DISTINCT e.id) - COUNT(DISTINCT c.employee_id) as absent_count
FROM sessions s
CROSS JOIN employees e
LEFT JOIN check_ins c ON c.session_id = s.id AND c.employee_id = e.id
WHERE e.is_active = true
GROUP BY s.id, s.session_name, s.session_date;

COMMENT ON TABLE employees IS 'Master employee list imported from HR Excel files';
COMMENT ON TABLE sessions IS 'Attendance sessions with time windows';
COMMENT ON TABLE check_ins IS 'Employee check-in records for each session';
