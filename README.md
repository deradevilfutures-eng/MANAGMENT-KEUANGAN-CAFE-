# Racik — Manajemen Kafe

Aplikasi web responsif untuk pencatatan keuangan dan operasional kafe. Frontend yang ada saat ini masih berjalan secara lokal di browser; fondasi backend PostgreSQL sedang disiapkan secara bertahap.

## Fitur frontend saat ini
- Dashboard pemasukan, pengeluaran, arus kas bersih, nilai stok, dan grafik 6 bulan
- Tambah dan hapus transaksi pemasukan/pengeluaran
- Inventaris, batas minimum stok, dan nilai persediaan
- Daftar pegawai, status aktif/nonaktif, dan gaji bulanan
- Filter laporan berdasarkan tanggal
- Ekspor transaksi, inventaris, pegawai, dan laporan ke CSV
- Tampilan responsif untuk desktop, tablet, dan ponsel

## Status penyimpanan saat ini
- Versi frontend yang sudah ada menyimpan data pada `localStorage` browser/perangkat.
- Data belum tersinkron antarperangkat atau antar-cabang.
- Belum ada autentikasi server, POS, pemesanan QR, maupun pembayaran digital yang aktif.
- Jangan gunakan data browser sebagai satu-satunya catatan transaksi operasional multi-user.

## Fondasi backend (Phase 1)
Struktur awal backend dan database tersedia pada:
- `backend/` — API Node.js/Express dan endpoint pemeriksaan kesehatan.
- `backend/.env.example` — contoh konfigurasi lokal; isi rahasia hanya di environment/secret manager.
- `database/schema.sql` — skema PostgreSQL awal untuk organisasi, cabang, pengguna, peran, akses cabang, meja, token QR, dan audit log.
- `docs/PHASE-1-ARCHITECTURE.md` — arsitektur, batas akses, keamanan, dan rencana deployment.

### Menjalankan API secara lokal
Persyaratan: Node.js 20+ dan PostgreSQL.

1. Masuk ke folder `backend`.
2. Jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dengan koneksi PostgreSQL lokal.
4. Jalankan skema awal pada database baru menggunakan `database/schema.sql`.
5. Jalankan `npm run dev`.
6. Periksa `http://localhost:3000/health` dan `http://localhost:3000/health/ready`.

Endpoint `/health` memeriksa proses API; `/health/ready` memeriksa koneksi database. Ini masih fondasi awal, bukan sistem produksi lengkap. Login, pengelolaan sesi, API bisnis, dan pengujian keamanan akan ditambahkan pada langkah berikutnya.

## Arsitektur dan deployment
GitHub Pages hanya meng-host frontend statis. API Node.js dan PostgreSQL harus dijalankan pada layanan terpisah. Belum ada hosting backend/database produksi atau kredensial layanan yang dikonfigurasi di repository ini. Lihat dokumen arsitektur Phase 1 sebelum memilih penyedia hosting.

## Deploy frontend ke GitHub Pages
1. Buka **Settings → Pages** pada repository.
2. Pada **Build and deployment**, pilih **GitHub Actions** sebagai source.
3. Buka tab **Actions**, lalu tunggu workflow Pages selesai dengan status hijau.
4. Buka URL Pages yang ditampilkan GitHub pada Settings → Pages.

Perubahan pada branch `main` akan memicu workflow deploy sesuai konfigurasi repository.
