# Competitive Brief — TAP-In vs iSeller
**Disusun berdasarkan:** Analisis fitur iSeller (Maret 2026)
**Tujuan:** Roadmap prioritas update TAP-In agar kompetitif di segmen UMKM mikro

---

## Posisi TAP-In Saat Ini

TAP-In bukan mencoba jadi iSeller versi murah. TAP-In adalah **anti-thesis** dari iSeller:
- iSeller = powerful, kompleks, berbayar, ada fee transaksi
- TAP-In = simpel, zero-friction, **0% potongan QRIS**, gratis/murah

Pertahankan differensiasi ini di setiap update. Jangan tambah fitur yang bikin TAP-In terasa berat.

---

## Gap Analysis: Fitur iSeller yang Worth Diadopsi

Dipilih hanya yang **relevan untuk UMKM mikro** dan **tidak mengorbankan simplisitas**.

### Tier 1 — Prioritas Tinggi (Update Berikutnya)

**1. Riwayat Transaksi Sederhana**
- iSeller punya: dashboard analitik real-time, laporan per shift, produk terlaris
- TAP-In sekarang: tidak ada riwayat sama sekali
- Yang perlu dibuat: halaman sederhana daftar transaksi hari ini (tanggal, total, item)
- Kenapa penting: pedagang perlu tahu udah dapat berapa hari ini tanpa harus hitung manual

**2. Laporan Harian/Rekap Penjualan**
- iSeller punya: laporan per shift dengan rekap kas
- Yang perlu dibuat: ringkasan sederhana — total transaksi hari ini, total pemasukan, item terlaris
- Format: satu halaman, bisa di-screenshot buat laporan pribadi

---

### Tier 2 — Prioritas Sedang (3–6 Bulan ke Depan)

**3. Manajemen Stok Dasar**
- iSeller punya: inventory per outlet, varian produk, peringatan stok rendah
- Yang perlu dibuat: field opsional "stok" per produk + notifikasi kalau stok habis
- Catatan: buat opsional, jangan wajib — banyak pedagang jual jasa atau produk unlimited

**4. Mode Offline / PWA**
- iSeller punya: SmartSync™ — tetap jalan tanpa internet
- TAP-In sekarang: butuh internet terus
- Yang perlu dibuat: Progressive Web App (PWA) dengan service worker — transaksi bisa jalan offline, sync saat online
- Kenapa penting: pedagang di pasar atau area sinyal jelek sangat butuh ini

**5. Shortcut Produk Favorit / Pin Produk**
- iSeller punya: product collections & grouping
- Yang perlu dibuat: pedagang bisa "pin" 4–6 produk paling sering dijual di atas grid
- Kenapa penting: kalau produk udah banyak, kasir tetap cepat

---

### Tier 3 — Prioritas Rendah / Future Vision (6–12 Bulan)

**6. Multi-User + PIN Kasir**
- iSeller punya: role-based access, shift management, ganti kasir tanpa tutup shift
- Yang perlu dibuat (versi simpel): owner bisa tambah akun "kasir" dengan PIN, kasir hanya bisa akses POS, tidak bisa edit produk atau lihat laporan
- Catatan: baru worth dibuat kalau user TAP-In mulai punya karyawan

**7. Nota Digital (Struk)**
- iSeller punya: receipt management
- Yang perlu dibuat: tombol "Kirim Nota" yang generate link atau gambar ringkasan transaksi yang bisa di-share via WhatsApp
- Format: sederhana — nama toko, list item, total, QR nota

**8. Kategori Produk**
- iSeller punya: collections & grouping produk
- Yang perlu dibuat: label kategori sederhana (Makanan, Minuman, dll) untuk filter di grid POS
- Baru relevan kalau produk user sudah 20+

---

## Fitur iSeller yang TIDAK Perlu Diadopsi

| Fitur iSeller | Alasan Skip |
|---|---|
| Loyalty program & membership | Overkill untuk warung/UMKM mikro |
| Kitchen Display System (KDS) | Segmen F&B besar, bukan target TAP-In |
| Multi-outlet management | Target TAP-In = 1 toko, 1 pemilik |
| Integrasi marketplace | Kompleksitas tinggi, bukan core use case |
| Barcode scanner | Pedagang kecil jarang pakai barcode |
| Gift card & store credit | Tidak relevan untuk transaksi cash/QRIS sederhana |
| Split payment | Edge case, tambah kompleksitas UI |

---

## Keunggulan TAP-In yang Harus Dipertahankan

1. **0% potongan QRIS** — ini adalah *moat* utama TAP-In. Jangan pernah replace dengan payment gateway berbayar.
2. **Onboarding 2 langkah** — tambah fitur baru tanpa mengorbankan ini. Fitur baru harus bisa diabaikan oleh user yang tidak butuh.
3. **UI besar & jelas** — jangan perkecil card produk demi muat lebih banyak info. Prioritas tetap "anti-salah tap".
4. **Gratis / harga sangat terjangkau** — iSeller mulai Rp 200K/bulan. TAP-In harus tetap accessible untuk pedagang dengan modal tipis.

---

## Prinsip Update TAP-In ke Depan

> **"Tambah fitur seperti menambah bumbu, bukan mengganti resep."**

Setiap fitur baru harus lolos 3 filter:
1. **Apakah pedagang warung butuh ini?** — kalau jawabannya "mungkin", skip dulu
2. **Apakah bisa dibuat tanpa menambah halaman/navigasi baru?** — prioritaskan fitur yang terintegrasi di halaman yang sudah ada
3. **Apakah user yang tidak mau pakai fitur ini tetap tidak terganggu?** — semua fitur advanced harus opsional

---

*Brief ini disusun berdasarkan analisis kompetitor iSeller, Maret 2026.*
