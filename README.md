# SIPH Sulsel — Sistem Informasi Perkembangan Harga

Dashboard **Indeks Perkembangan Harga (IPH)** mingguan kabupaten/kota di Sulawesi Selatan, bersumber dari rilis BPS.

🌐 **Dashboard:** [ridsonap.github.io/siph](https://ridsonap.github.io/siph/) · profil wilayah langsung: [`?kab=7301`](https://ridsonap.github.io/siph/?kab=7301)

## Isi dashboard

| Tampilan | Isi |
|---|---|
| **Sulawesi Selatan** | Kalimat ringkasan minggu terpilih, 4 angka kunci, peta, peringkat kab/kota, tren rata-rata Sulsel (bisa dibandingkan dengan satu wilayah), komoditas penyumbang & paling bergejolak, tabel rincian + unduh CSV |
| **Kabupaten/Kota** | Ringkasan per tahun, IPH mingguan vs rata-rata Sulsel, pendorong kenaikan/penurunan, komoditas paling bergejolak, riwayat mingguan + unduh CSV, tautan yang bisa dibagikan |

Semua teks, daftar tahun, minggu, dan wilayah dibentuk otomatis dari `data/iph_sulsel.json`. Tidak ada angka yang ditulis manual di kode, jadi data baru langsung tampil.

## Menambah data baru (3 langkah)

**1. Simpan berkas rilis** ke `Perkembangan IPH Sulsel/<tahun>/`. Format yang diterima: **PDF**, **PNG/JPG** (tangkapan layar tabel), **Excel (.xlsx)**, atau **CSV**.

Nama berkas wajib memuat **bulan**, **minggu (M1–M5)**, dan **tahun**, misalnya:

```
11.November M2 2026.pdf
Desember_M4 2026.png
IPH M1 Januari 2027.xlsx
```

Untuk Excel/CSV, gunakan kolom seperti tabel rilis BPS: `KODE`, `PERUBAHAN IPH`, `KOMODITAS UTAMA PENYUMBANG` (format `Nama(andil), ...`), `FLUKTUASI HARGA TERTINGGI`, `NILAI CV`, `STATUS`.

**2. Bangun ulang data** (perlu macOS untuk OCR gambar):

```bash
python3 scripts/build_data.py
```

Di akhir proses akan tampil ringkasan, misalnya:

```
Total rilis      : 181 minggu (Januari 2023 (Minggu 2) – Oktober 2026 (Minggu 2))
Rilis baru       : 1
   + Oktober 2026 (Minggu 2): 16 kab/kota
Perlu dicek      : tidak ada
```

Kalau ada baris **Perlu dicek**, buka `data/laporan_validasi.txt`, cocokkan dengan berkas sumber, lalu tulis nilai yang benar di `data/koreksi_manual.json`:

```json
{
  "2026-10-W2": {
    "7301": { "iph": 0.84, "catatan": "dicek manual dari PDF" }
  }
}
```

Setelah itu jalankan ulang langkah 2.

**3. Publikasikan:** cek tampilan secara lokal (`python3 -m http.server 8000`, buka `http://localhost:8000`), lalu commit dan push ke `main`. GitHub Actions akan memperbarui situs.

Opsional: `node scripts/generate_materi_pptx.js` membuat ulang deck paparan `Materi_IPH_2026.pptx` dari data terbaru.

## Cara kerja pipeline data

* **PDF**: teks dibaca langsung dari stream PDF.
* **PNG/JPG**: dibaca dengan Apple Vision OCR (`scripts/ocr_vision.swift`). Baris dipisahkan memakai garis grid tabel. Sel IPH yang tidak terbaca dipotong, diperbesar, lalu di-OCR ulang. Hasil OCR disimpan di `.cache/`, jadi hanya berkas baru yang diproses.
* **Excel/CSV**: kolom dikenali dari judul kolomnya.
* **Validasi**:
  * tanda IPH dicek silang dengan kolom STATUS dan dengan tanda andil komoditas;
  * IPH wajib berasal dari kolom IPH;
  * nama berkas tanpa bulan/minggu/tahun dilewati dengan peringatan;
  * minggu ganda dilaporkan.

## Teknologi

HTML/CSS/JavaScript tanpa framework, [Apache ECharts 5](https://echarts.apache.org/) untuk grafik dan peta, Python 3 untuk pipeline data, dan GitHub Pages untuk hosting.
