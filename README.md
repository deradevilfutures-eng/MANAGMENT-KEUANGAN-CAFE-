# Racik — Manajemen Kafe

Aplikasi responsif untuk pencatatan keuangan dan operasional kafe, dengan database PostgreSQL terpusat di Supabase.

## Arsitektur deployment
- Frontend: static `index.html` pada Vercel.
- Backend: Express sebagai Vercel Function melalui `api/[...path].js`.
- Database: Supabase PostgreSQL.
- Semua permintaan frontend memakai same-origin `/api`; refresh token disimpan pada cookie HttpOnly.

Vercel menjalankan aplikasi Express sebagai satu Function. Lihat https://vercel.com/docs/frameworks/backend/express.

## Fitur frontend
- Login owner dan pengguna.
- Pemilihan cabang.
- Dashboard pemasukan, pengeluaran, arus kas, dan nilai persediaan.
- CRUD transaksi, inventaris, pegawai.
- Filter laporan dan ekspor CSV.
- Layout responsif desktop/tablet/ponsel.

## Database
Supabase project: `MANAGMENT-KEUANGAN-CAFE-` (EU North / Stockholm).
Migrasi:
- `database/schema.sql`
- `database/migrations/001_auth_sessions.sql`
- `database/migrations/002_foreign_key_indexes.sql`
- `database/migrations/003_restrict_rls_helper_execution.sql`
- `database/migrations/004_branch_operations.sql`

RLS aktif pada tabel fondasi dan tabel operasional. Akses browser ke tabel tidak diberikan; semua query operasional melewati API Node.js dengan pemeriksaan sesi, organisasi, dan cabang.

## Deploy ke Vercel
1. Import repository `deradevilfutures-eng/MANAGMENT-KEUANGAN-CAFE-` ke Vercel.
2. Set **Root Directory** ke repository root (kosong / `.`), bukan `backend`.
3. Framework preset: Other (atau biarkan auto-detect).
4. Build command: kosong; Output Directory: kosong. Vercel akan menyajikan `index.html` dan mendeteksi `api/[...path].js`.
5. Set Node.js runtime 20.x atau lebih baru.
6. Tambahkan Environment Variables berikut untuk Production dan Preview:
   - `NODE_ENV=production`
   - `DATABASE_URL`: Supabase Session Pooler URI, port 5432. Masukkan langsung dari Supabase Connect; jangan commit ke GitHub.
   - `BOOTSTRAP_SECRET`: secret acak panjang sekali pakai (minimal 32 byte acak).
   - `FRONTEND_ORIGINS`: opsional, hanya untuk origin tambahan; aplikasi default same-origin.
7. Deploy branch `feature/phase-1-foundation` sebagai Preview terlebih dahulu. Tes `/api/health/ready`.
8. Setelah Preview lolos uji, merge PR ke `main` sesuai persetujuan pemilik untuk Production.

## Setup akun owner pertama
Saat `BOOTSTRAP_SECRET` sudah tersedia dan belum ada owner, halaman login menampilkan **Pengaturan awal pemilik**.
Masukkan secret tersebut, nama organisasi, nama owner, email, dan password unik minimal 12 karakter. API membuat organisasi, cabang awal `MAIN / Cabang Utama`, akun owner, dan membership dalam satu transaksi.
Setelah berhasil, hapus `BOOTSTRAP_SECRET` dari Vercel Environment Variables dan redeploy. Jangan pernah menaruh secret atau password di GitHub.

## Environment lokal
Salin `backend/.env.example` menjadi `backend/.env` untuk menjalankan backend lokal. Jangan commit `.env`.
Untuk Vercel, konfigurasi proyek berada di root karena frontend dan API memakai satu origin.

## Batasan tahap ini
- Data transaksi, inventaris, dan pegawai kini memakai tabel database per organisasi/cabang.
- Menu, resep, pemakaian bahan otomatis, QR ordering, POS, pembayaran gateway, dan administrasi cabang lanjutan belum dibangun.
- Jangan menyebut aplikasi siap produksi sebelum uji login, CRUD, isolasi cabang, restore backup, dan review keamanan menyeluruh.
