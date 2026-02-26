-- Add stock tracking columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT NULL;
