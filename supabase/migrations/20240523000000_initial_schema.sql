-- Create a table for store profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  store_name TEXT,
  qris_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create a table for products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own profile and create one
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Products: Users can manage their own products
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);

-- Storage: Public access to QRIS images (optional, depends on how you want to handle it)
-- Note: You manually created the 'qris' bucket, ensure it's 'public' or add policies there.

-- Seed Data (Mock items)
INSERT INTO profiles (id, store_name, qris_url)
VALUES ('ef96fa05-cdbd-4256-b9e9-8f56b054d22b', 'Tap-In Store', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (name, price, user_id)
VALUES 
  ('Es Teh Manis', 5000, 'ef96fa05-cdbd-4256-b9e9-8f56b054d22b'),
  ('Nasi Goreng Gila', 25000, 'ef96fa05-cdbd-4256-b9e9-8f56b054d22b'),
  ('Ayam Penyet', 18000, 'ef96fa05-cdbd-4256-b9e9-8f56b054d22b'),
  ('Kopi Hitam', 10000, 'ef96fa05-cdbd-4256-b9e9-8f56b054d22b'),
  ('Indomie Rebus Extra', 12000, 'ef96fa05-cdbd-4256-b9e9-8f56b054d22b'),
  ('Kerupuk Kaleng', 2000, 'ef96fa05-cdbd-4256-b9e9-8f56b054d22b')
ON CONFLICT DO NOTHING;
