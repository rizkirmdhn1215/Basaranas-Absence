-- Add device_id column to check_ins table for fraud detection
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Create index for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_checkins_device ON check_ins(device_id);
CREATE INDEX IF NOT EXISTS idx_checkins_ip ON check_ins(ip_address);
