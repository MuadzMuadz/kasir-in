-- Add category column to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;
