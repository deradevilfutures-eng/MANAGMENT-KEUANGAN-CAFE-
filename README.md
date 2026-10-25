# Racik — Manajemen Keuangan Kafe

Aplikasi web responsif untuk pencatatan keuangan dan operasional kafe. Dibuat dengan HTML, CSS, dan JavaScript tanpa backend atau layanan database eksternal.

## Fitur
- Dashboard pemasukan, pengeluaran, arus kas bersih, nilai stok, dan grafik 6 bulan
- Tambah dan hapus transaksi pemasukan/pengeluaran
- Inventaris, batas minimum stok, dan nilai persediaan
- Daftar pegawai, status aktif/nonaktif, dan gaji bulanan
- Filter laporan berdasarkan tanggal
- Ekspor transaksi, inventaris, pegawai, dan laporan ke CSV
- Tampilan responsif untuk desktop, tablet, dan ponsel

## Penyimpanan dan batasan penting
- Data disimpan pada `localStorage` di browser/perangkat yang sedang digunakan.
- Tidak perlu membuat akun, mengisi API key, atau mengatur Supabase.
- Data **tidak tersinkron otomatis** antar-browser atau antarperangkat dan tidak otomatis tersedia untuk pengguna lain.
- Menghapus data browser, menggunakan mode privat, atau mengganti perangkat/browser dapat membuat data tidak tersedia. Gunakan ekspor CSV secara berkala sebagai cadangan.
- Karena tidak ada autentikasi server, jangan gunakan mode ini untuk data sensitif atau untuk operasional multi-user yang membutuhkan kontrol akses. GitHub Pages hanya menyajikan file statis; bukan database online.

## Menjalankan secara lokal
Buka `index.html` di browser modern. Untuk publikasi, gunakan GitHub Pages.

## Deploy ke GitHub Pages
1. Buka **Settings → Pages** pada repository.
2. Pada **Build and deployment**, pilih **GitHub Actions** sebagai source.
3. Buka tab **Actions**, lalu tunggu workflow Pages selesai dengan status hijau.
4. Buka URL Pages yang ditampilkan GitHub pada Settings → Pages.

Setiap perubahan yang di-commit ke branch `main` akan memicu workflow deploy.

## Struktur
```
index.html
README.md
.github/workflows/pages.yml
```
