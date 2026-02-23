# Product Requirements Document (PRD)
**Project Name:** TAP-In
**Target Platform:** Web Application (Responsive/Mobile-first)
**Environment:** Frontend (Netlify), Backend (Supabase)

## 1. Visi & Tujuan Produk
Menciptakan sistem kasir (Point of Sale) web-based yang sangat standar dan intuitif. Fokus utama adalah memberikan kebebasan bagi pengguna (terutama UMKM/pedagang kecil) untuk mengatur item jualan mereka sendiri dan memfasilitasi pembayaran langsung ke rekening mereka melalui upload QRIS mandiri, tanpa potongan pihak ketiga.

## 2. Target Pengguna
- Pemilik usaha kecil atau warung yang baru beralih ke pencatatan digital.
- Pengguna yang "gaptek" dan membutuhkan antarmuka yang sangat jelas, minim teks, dan minim navigasi rumit.

## 3. Fitur Utama (MVP - Minimum Viable Product)
**A. Manajemen Produk (Custom Items & Pricing)**
- Pengguna dapat menambahkan, mengedit, dan menghapus nama item.
- Pengguna dapat menentukan dan merubah harga setiap item secara bebas.
- Tampilan produk berupa Grid/Card besar untuk mempermudah tap/klik saat transaksi.

**B. Sistem Pembayaran & QRIS Kustom**
- Fitur bagi pengguna untuk mengunggah gambar QRIS (Gopay atau lainnya) milik mereka sendiri ke sistem.
- Gambar QRIS disimpan dengan aman menggunakan Supabase Storage.
- Saat *checkout*, sistem akan memunculkan gambar QRIS yang telah diunggah tersebut untuk di-scan oleh pelanggan.

**C. Operasional Kasir (POS Interface)**
- Flow "Klik dan Masukkan Keranjang" yang mulus dan instan.
- Kalkulasi total belanja secara otomatis.
- Tombol aksi (Bayar, Batal, Simpan) berukuran besar dan jelas.

## 4. Tech Stack & Arsitektur
- **Frontend Framework:** React + Vite (Dipilih karena lebih ringan, *snappy*, dan lebih mudah di-setup untuk *Single Page Application* tanpa kebutuhan SEO yang kompleks dibandingkan Next.js).
- **UI Components:** ShadcnUI (Untuk komponen yang *accessible*, mulus, dan terlihat profesional) + Tailwind CSS.
- **Backend & Database:** Supabase (PostgreSQL untuk relasi data item/transaksi, Supabase Auth untuk login pengguna, Supabase Storage untuk menyimpan gambar QRIS).
- **Hosting/Deployment:** Netlify (Mudah untuk *continuous integration* dan *testing*).

## 5. User Experience (UX) Guidelines
- **Zero-Friction Onboarding:** Setelah login, pengguna hanya perlu 2 langkah untuk mulai jualan: Input 1 item dan Upload QRIS.
- **Feedback Visual:** Setiap kali item ditambahkan ke keranjang, harus ada animasi ringan atau *toast notification* yang jelas.