-- ============================================================
--  TAP-In — Supabase Setup (All-in-One)
--  Jalankan seluruh file ini di SQL Editor Supabase.
--  Aman dijalankan berulang (IF NOT EXISTS / IF NOT EXISTS).
-- ============================================================


-- ────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────

-- Profil toko (1 per akun)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  store_name  TEXT,
  qris_url    TEXT,
  qris_string TEXT,
  updated_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Produk
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  price       NUMERIC NOT NULL DEFAULT 0,
  image_url   TEXT,
  category    TEXT,
  track_stock BOOLEAN NOT NULL DEFAULT false,
  stock       INTEGER,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Staf / kasir
CREATE TABLE IF NOT EXISTS staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name       TEXT    NOT NULL,
  pin        TEXT    NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ────────────────────────────────────────────────
-- 2. KOLOM TAMBAHAN (aman kalau tabel sudah ada)
-- ────────────────────────────────────────────────

ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS qris_string TEXT;
ALTER TABLE products  ADD COLUMN IF NOT EXISTS category    TEXT;
ALTER TABLE products  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products  ADD COLUMN IF NOT EXISTS stock       INTEGER;


-- ────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff    ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────
-- 4. POLICIES
-- ────────────────────────────────────────────────

-- Profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Products
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Users can view own products') THEN
    CREATE POLICY "Users can view own products"   ON products FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Users can insert own products') THEN
    CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Users can update own products') THEN
    CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Users can delete own products') THEN
    CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Staff
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff' AND policyname='Owner can manage their staff') THEN
    CREATE POLICY "Owner can manage their staff"
      ON staff FOR ALL
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;


-- ────────────────────────────────────────────────
-- 5. STORAGE BUCKETS
-- ────────────────────────────────────────────────
-- Buat 2 bucket ini di Supabase Dashboard → Storage:
--   • bucket-product  (private)
--   • bucket-qris     (private)
--
-- Atau jalankan SQL berikut (butuh ekstensi storage aktif):

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('bucket-product', 'bucket-product', false),
  ('bucket-qris',    'bucket-qris',    false)
ON CONFLICT (id) DO NOTHING;

-- Policy storage: owner bisa upload/baca/hapus file miliknya
DO $$ BEGIN
  -- bucket-product
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Product images: owner access') THEN
    CREATE POLICY "Product images: owner access"
      ON storage.objects FOR ALL
      USING (bucket_id = 'bucket-product' AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = 'bucket-product' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;

  -- bucket-qris
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='QRIS images: owner access') THEN
    CREATE POLICY "QRIS images: owner access"
      ON storage.objects FOR ALL
      USING (bucket_id = 'bucket-qris' AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = 'bucket-qris' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;


-- ────────────────────────────────────────────────
-- SELESAI ✓
-- ────────────────────────────────────────────────
