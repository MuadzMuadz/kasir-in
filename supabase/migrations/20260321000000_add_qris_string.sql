-- Add qris_string column to profiles for dynamic QRIS support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS qris_string TEXT;
