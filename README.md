# Racik — Manajemen Keuangan Kafe

Aplikasi web responsif untuk pencatatan keuangan dan operasional kafe. Dibangun sebagai static frontend HTML/CSS/JavaScript dengan Supabase Auth + PostgreSQL.

## Fitur awal
- Login dan pendaftaran email/kata sandi
- Dashboard pemasukan, pengeluaran, arus kas bersih, dan nilai persediaan
- Pencatatan serta penghapusan transaksi
- Inventaris dengan ambang stok minimum
- Daftar pegawai, status aktif/nonaktif, dan gaji bulanan
- Filter laporan dan ekspor CSV
- Data terpusat di Supabase, dengan Row Level Security (RLS) berdasarkan akun pemilik

## Setup database
1. Buat proyek di https://supabase.com/.
2. Buka **SQL Editor** di dashboard Supabase.
3. Salin dan jalankan seluruh isi `supabase/schema.sql`.
4. Pastikan tabel `transactions`, `inventory_items`, dan `employees` dibuat tanpa error.

## Konfigurasi aplikasi
Edit bagian konfigurasi pada `index.html`:
```js
const SUPABASE_URL = "https://PROJECT_ID.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";
```
Ambil URL dan publishable key dari halaman Connect / API Keys proyek Supabase. Legacy `anon` key juga dapat dipakai dengan kebijakan RLS yang benar. **Jangan pernah menaruh service_role atau secret key di HTML/browser.**

## Menjalankan
- Buka `index.html` untuk mencoba tampilan; fungsi database membutuhkan konfigurasi Supabase dan koneksi internet.
- Di GitHub, buka **Settings → Pages**, pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
- Setelah proses selesai, gunakan URL GitHub Pages yang diberikan oleh GitHub.

## Catatan keamanan penting
- Pendaftaran akun tersedia dari halaman login. Aktifkan konfirmasi email di Supabase Auth jika sesuai kebutuhan.
- Setiap tabel memakai RLS dan setiap row dimiliki oleh `auth.uid()`. Akun hanya dapat mengakses row miliknya sendiri.
- Jangan membagikan akun; gunakan kata sandi kuat dan aktifkan proteksi akun yang tersedia.
- Static site ini belum memiliki role owner/cashier multi-user untuk satu kafe. Pada versi awal, tiap akun melihat data milik akunnya sendiri.
- Untuk produksi, tambahkan pengujian RLS, backup database, validasi bisnis, audit log, kebijakan retensi data, dan uji lintas perangkat sebelum menyimpan data keuangan nyata.
- Data contoh tidak ditambahkan otomatis agar laporan tidak tercampur dengan transaksi riil.

## Struktur
```
index.html
README.md
supabase/
  schema.sql
```
