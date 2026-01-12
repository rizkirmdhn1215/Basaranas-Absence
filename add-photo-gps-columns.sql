-- Add photo and GPS location columns to check_ins table
-- Run this in Supabase SQL Editor

ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comment for documentation
COMMENT ON COLUMN check_ins.photo_url IS 'URL to check-in photo stored in Supabase Storage';
COMMENT ON COLUMN check_ins.latitude IS 'GPS latitude coordinate of check-in location';
COMMENT ON COLUMN check_ins.longitude IS 'GPS longitude coordinate of check-in location';
