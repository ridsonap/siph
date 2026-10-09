# SIPH Sulsel — Sistem Informasi Perkembangan Harga

Dashboard visualisasi dan analitik interaktif **Indeks Perkembangan Harga (IPH)** Kabupaten/Kota di Provinsi Sulawesi Selatan periode **2023–2026**.

🌐 **Live Demo:** [https://ridsonap.github.io/siph/](https://ridsonap.github.io/siph/)

---

## 📌 Fitur Utama

1. **Ringkasan Eksekutif & Early Warning (KPI Header):**
   * Rata-rata IPH Sulsel mingguan dengan indikator tren inflasi/deflasi.
   * Sebaran status kabupaten/kota (Naik, Turun, Stabil).
   * Kabupaten dengan lonjakan harga tertinggi dan penurunan terdalam.
   * Komoditas pemicu gejolak dominan (*Top Threat Commodity*).
   * Narasi analitik kebijakan otomatis untuk arahan tindak lanjut TPID.

2. **Peta Spasial Interaktif Sulsel (Choropleth Map):**
   * Visualisasi batas wilayah 24 Kabupaten/Kota se-Sulsel berbasis GeoJSON teroptimasi (<350 KB).
   * Skala warna dinamis: Hijau (Deflasi) ke Merah (Inflasi).
   * Tooltip interaktif memuat rincian IPH, status, 3 komoditas penyumbang utama, dan nilai Koefisien Variasi (CV).
   * Klik pada kabupaten untuk langsung menyaring grafik tren historis.

3. **Peringkat IPH Wilayah:**
   * Horizontal bar chart mengurutkan kabupaten/kota dengan tekanan inflasi atau deflasi pada minggu terpilih.

4. **Eksplorasi Tren Historis (2023–2026):**
   * Time-series multi-line chart memuat **175 rilis data mingguan**.
   * Pemilihan multi-daerah (Rata-rata Sulsel + kabupaten terpilih).
   * Slider rentang waktu (*brush & zoom*) dan garis ambang batas nol.

5. **Matriks Komoditas Pemicu Gejolak:**
   * Peringkat frekuensi komoditas paling sering berfluktuasi tinggi (Cabai Rawit, Cabai Merah, Bawang Merah, Daging Ayam Ras, Beras, dll.).
   * Ringkasan temuan pola musiman pangan Sulawesi Selatan.

6. **Tabel Data Terperinci & Ekspor:**
   * Pencarian instan dan filter status (Naik / Turun / Stabil).
   * Tombol **Unduh CSV** per periode rilis dan **Unduh JSON** untuk analisis lanjutan.

---

## 🛠️ Arsitektur & Teknologi

* **Data Pipeline (ETL):** Python 3 (`scripts/build_data.py`) mengekstrak data dari 180 berkas gambar (PNG via Tesseract OCR) dan PDF (via stream decompression), memvalidasi kode BPS Sulsel (7301–7373), dan menghasilkan `data/iph_sulsel.json` & `data/sulsel_geo.json`.
* **Frontend:** Static Single Page Application (HTML5, Vanilla JS, Tailwind CSS via CDN).
* **Visualisasi & Peta:** Apache ECharts 5 (Choropleth GeoJSON + Time Series + Bar Charts).
* **Deployment:** GitHub Pages otomatis via GitHub Actions (`.github/workflows/deploy.yml`).

---

## 🚀 Menjalankan Secara Lokal

Cukup jalankan web server lokal tanpa perlu instalasi Node.js/npm:

```bash
# Menggunakan Python
python3 -m http.server 8000
```

Buka `http://localhost:8000` di peramban Anda.

Untuk memperbarui data dari berkas mentah baru:
```bash
python3 scripts/build_data.py
```
