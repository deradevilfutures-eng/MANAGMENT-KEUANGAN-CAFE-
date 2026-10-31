# Racik — Manajemen Kafe

Aplikasi web responsif untuk pencatatan keuangan dan operasional kafe. Frontend yang ada saat ini masih berjalan secara lokal di browser; backend dan database terpusat sedang disiapkan bertahap.

## Fitur frontend saat ini
- Dashboard pemasukan, pengeluaran, arus kas bersih, nilai stok, dan grafik 6 bulan
- Tambah dan hapus transaksi pemasukan/pengeluaran
- Inventaris, batas minimum stok, dan nilai persediaan
- Daftar pegawai, status aktif/nonaktif, dan gaji bulanan
- Filter laporan berdasarkan tanggal
- Ekspor transaksi, inventaris, pegawai, dan laporan ke CSV
- Tampilan responsif untuk desktop, tablet, dan ponsel

## Status implementasi
- Frontend lama masih menyimpan data di `localStorage`; belum tersinkron antarperangkat.
- Fondasi PostgreSQL Racik telah diterapkan pada proyek Supabase yang dipilih.
- Skema mencakup organisasi, cabang, pengguna, peran, akses cabang, meja, token QR, audit log, dan sesi autentikasi.
- Backend Node.js tersedia di `backend/`, tetapi belum dipublikasikan ke hosting dan belum dikonfigurasi dengan kredensial database produksi.
- Belum ada UI login, POS, pemesanan QR, pembayaran digital, atau integrasi data frontend ke API yang aktif.

## Database Supabase
Proyek database: `MANAGMENT-KEUANGAN-CAFE-` (region EU North / Stockholm).

Migration SQL tersimpan di:
- `database/schema.sql`
- `database/migrations/001_auth_sessions.sql`
- `database/migrations/002_foreign_key_indexes.sql`

Gunakan Supabase Dashboard → Connect untuk mengambil connection string. Untuk host backend IPv4-only, pilih **Session pooler** dan URI (port 5432). Supabase menjelaskan direct connection memerlukan IPv6 secara default, sedangkan shared pooler session mode mendukung IPv4: https://supabase.com/docs/guides/database/connecting-to-postgres

Jangan commit `.env`, password database, publishable/secret key, atau token. Simpan `DATABASE_URL` hanya di environment variables layanan backend. Jangan pernah mengekspos password database atau Supabase secret/service-role key di frontend.

RLS diaktifkan pada tabel fondasi. Tabel-tabel tersebut sengaja belum memiliki policy browser karena akses operasional direncanakan melalui backend Node.js tepercaya. Jangan menambahkan grant/policy publik tanpa desain otorisasi tenant dan cabang yang diuji.

## Backend lokal
Persyaratan: Node.js 20+ dan koneksi PostgreSQL.

1. Masuk ke folder `backend`.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`.
4. Isi `DATABASE_URL` dengan URI Supabase Session pooler (untuk jaringan IPv4) atau Direct connection jika hosting mendukung IPv6.
5. Isi `FRONTEND_ORIGINS` dengan origin GitHub Pages yang tepat dan origin lokal saat development.
6. Jalankan `npm run dev`.
7. Periksa `/health` dan `/health/ready`.

API autentikasi fondasi:
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Bootstrap owner menggunakan `npm run create-owner` hanya setelah environment aman disiapkan. Gunakan password unik minimal 12 karakter dan jangan commit nilainya. Hapus variabel `OWNER_*` setelah bootstrap.

## Deployment
GitHub Pages hanya meng-host frontend statis. Backend Node.js perlu Web Service tersendiri. Render dapat menghubungkan repository GitHub dan mengatur environment variables, tetapi layanan Free akan tidur setelah 15 menit tanpa traffic dan dapat membutuhkan sekitar satu menit untuk bangun; dokumentasi Render menyatakan Free cocok untuk uji coba, bukan produksi: https://render.com/docs/free

Untuk deploy backend:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health/ready`
- Environment: `NODE_ENV=production`, `DATABASE_URL`, `FRONTEND_ORIGINS`

Jangan menandai aplikasi siap produksi sebelum secret backend dimasukkan, endpoint readiness sukses, UI login terhubung, dan tes lintas cabang/RLS serta backup/restore dilakukan.

## CI
GitHub Actions menjalankan instalasi dependency dan pemeriksaan sintaks JavaScript pada backend. Ini bukan pengganti integration test terhadap database atau pengujian keamanan.
