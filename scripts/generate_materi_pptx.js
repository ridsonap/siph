const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FONT_FAMILY = 'Calibri';
const C_BG = 'F8FAFC';
const C_CARD = 'FFFFFF';
const C_BORDER = 'CBD5E1'; // Higher contrast border
const C_TEXT_MAIN = '0F172A'; // High contrast near-black
const C_TEXT_MUTED = '334155'; // Darker for high legibility
const C_TEXT_SUB = '1E293B';
const C_PRIMARY = '0284C7';
const C_RED = 'DC2626';
const C_GREEN = '16A34A';
const C_AMBER = 'D97706';
const C_INDIGO = '4F46E5';

const LOGO_SELAYAR = path.resolve('assets/logos/logo_selayar.png');
const LOGO_BPS = path.resolve('assets/logos/logo_bps.png');
const LOGO_SE2026 = path.resolve('assets/logos/logo_se2026.png');

const CHART_SLIDE2 = path.resolve('assets/charts/chart_slide2.png');
const CHART_SLIDE3 = path.resolve('assets/charts/chart_slide3.png');
const CHART_SLIDE4 = path.resolve('assets/charts/chart_slide4.png');
const CHART_SLIDE5 = path.resolve('assets/charts/chart_slide5.png');
const CHART_SLIDE6 = path.resolve('assets/charts/chart_slide6.png');

function addHeader(slide, category, title, subtitle) {
  // Category Badge (Large & readable)
  slide.addShape('roundRect', {
    x: 0.6, y: 0.4, w: 3.6, h: 0.36,
    rectRadius: 0.08,
    fill: { color: 'E0F2FE' },
    line: { color: '0284C7', width: 1.2 }
  });
  slide.addText(category.toUpperCase(), {
    x: 0.6, y: 0.4, w: 3.6, h: 0.36,
    fontSize: 10, bold: true, color: '0369A1',
    align: 'center', valign: 'middle', fontFace: FONT_FAMILY, margin: 0
  });

  // Slide Title (Large 22pt)
  slide.addText(title, {
    x: 0.6, y: 0.82, w: 10.4, h: 0.52,
    fontSize: 22, bold: true, color: C_TEXT_MAIN,
    fontFace: FONT_FAMILY, margin: 0
  });

  // Subtitle (13pt, high contrast)
  slide.addText(subtitle, {
    x: 0.6, y: 1.35, w: 10.4, h: 0.38,
    fontSize: 13, color: C_TEXT_MUTED,
    fontFace: FONT_FAMILY, margin: 0
  });

  // Logo BPS on top right
  if (fs.existsSync(LOGO_BPS)) {
    slide.addImage({
      path: LOGO_BPS,
      x: 11.1, y: 0.42, w: 1.6, h: 0.54
    });
  }
}

function addFooter(slide, pageNum) {
  slide.addText('Sumber: Badan Pusat Statistik & SIPH Sulawesi Selatan 2026 | Evaluasi TPID Kab. Kepulauan Selayar', {
    x: 0.6, y: 7.05, w: 10.0, h: 0.3,
    fontSize: 10, color: '64748B', fontFace: FONT_FAMILY, margin: 0
  });
  slide.addText(String(pageNum), {
    x: 12.0, y: 7.05, w: 0.7, h: 0.3,
    fontSize: 11, bold: true, color: '64748B', align: 'right', fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 1: COVER 2026
// ==========================================
function buildSlide1(pres) {
  const s1 = pres.addSlide();
  s1.background = { color: '0F172A' };

  s1.addShape('roundRect', {
    x: 0.8, y: 0.8, w: 11.733, h: 5.9,
    rectRadius: 0.15,
    fill: { color: '1E293B' },
    line: { color: '475569', width: 2 }
  });

  if (fs.existsSync(LOGO_SELAYAR)) {
    s1.addImage({ path: LOGO_SELAYAR, x: 1.3, y: 1.25, w: 0.95, h: 0.95 });
  }
  if (fs.existsSync(LOGO_BPS)) {
    s1.addImage({ path: LOGO_BPS, x: 2.5, y: 1.45, w: 1.9, h: 0.64 });
  }

  s1.addShape('roundRect', {
    x: 1.3, y: 2.45, w: 5.2, h: 0.42,
    rectRadius: 0.08,
    fill: { color: '0284C7' },
    line: { color: '38BDF8', width: 1.2 }
  });
  s1.addText('TIM PENGENDALIAN INFLASI DAERAH (TPID) & BPS', {
    x: 1.3, y: 2.45, w: 5.2, h: 0.42,
    fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: FONT_FAMILY, margin: 0
  });

  s1.addText('Perkembangan Indeks Perkembangan Harga (IPH) 2026\nKabupaten Kepulauan Selayar', {
    x: 1.3, y: 2.98, w: 10.5, h: 1.4,
    fontSize: 29, bold: true, color: 'FFFFFF', fontFace: FONT_FAMILY, margin: 0, lineSpacing: 36
  });

  s1.addText('Evaluasi Dinamika Fluktuasi Harga Mingguan, Komoditas Pemicu, dan Rekomendasi Kebijakan Pengendalian Inflasi (Januari – Oktober 2026)', {
    x: 1.3, y: 4.45, w: 10.2, h: 0.55,
    fontSize: 14, color: 'CBD5E1', fontFace: FONT_FAMILY, margin: 0
  });

  s1.addShape('roundRect', {
    x: 1.3, y: 5.15, w: 10.7, h: 1.18,
    rectRadius: 0.1,
    fill: { color: '0F172A' },
    line: { color: '475569', width: 1.2 }
  });

  s1.addText([
    { text: 'Forum: ', options: { bold: true, fontSize: 12, color: '38BDF8' } },
    { text: 'High Level Meeting (HLM) dan Capacity Building Penyusunan Neraca Pangan Daerah Tahun 2026\n', options: { fontSize: 12, color: 'F1F5F9' } },
    { text: 'Cakupan: ', options: { bold: true, fontSize: 12, color: '38BDF8' } },
    { text: '33 Rilis Mingguan (Januari – Oktober 2026)  |  ', options: { fontSize: 12, color: 'CBD5E1' } },
    { text: 'Sumber: ', options: { bold: true, fontSize: 12, color: '38BDF8' } },
    { text: 'Pemantauan SP2KP BPS RI & Portal SIPH Sulawesi Selatan', options: { fontSize: 12, color: 'CBD5E1' } }
  ], {
    x: 1.5, y: 5.25, w: 10.3, h: 0.98,
    fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 2: OVERVIEW 2026
// ==========================================
function buildSlide2(pres) {
  const s2 = pres.addSlide();
  s2.background = { color: C_BG };
  addHeader(s2, 'Tinjauan Tahunan 2026', 'Dinamika IPH Kabupaten Kepulauan Selayar Sepanjang 2026', 'Tren Harga: Fluktuasi Ekstrem Saat HBKN April Diikuti Deflasi Panjang dan Rebound di Q3');
  addFooter(s2, 2);

  s2.addShape('roundRect', {
    x: 0.6, y: 1.85, w: 7.2, h: 5.05,
    rectRadius: 0.12,
    fill: { color: C_CARD },
    line: { color: C_BORDER, width: 1.2 }
  });

  if (fs.existsSync(CHART_SLIDE2)) {
    s2.addImage({
      path: CHART_SLIDE2,
      x: 0.75, y: 1.95, w: 6.9, h: 4.85
    });
  }

  // Card 1: Puncak HBKN April
  s2.addShape('roundRect', {
    x: 8.0, y: 1.85, w: 4.733, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FCA5A5', width: 1.5 }
  });
  s2.addText('PUNCAK FLUKTUASI HBKN (APRIL 2026)', {
    x: 8.2, y: 1.96, w: 4.3, h: 0.28,
    fontSize: 11.5, bold: true, color: C_RED, fontFace: FONT_FAMILY, margin: 0
  });
  s2.addText([
    { text: '• Rentang Ayunan: ', options: { bold: true, fontSize: 11.5, color: C_TEXT_MAIN } },
    { text: '-3.29% s.d. +3.29%', options: { bold: true, fontSize: 12, color: C_RED, breakLine: true } },
    { text: '• Analisis: Lonjakan belanja Idul Fitri pada Daging Sapi (+2.17%) dan Telur Ayam (+1.35%) memicu puncak inflasi sebelum terkoreksi tajam.', options: { fontSize: 11, color: C_TEXT_SUB } }
  ], {
    x: 8.2, y: 2.25, w: 4.3, h: 1.05,
    fontFace: FONT_FAMILY, margin: 0
  });

  // Card 2: Fase Deflasi Panjang Mei - Agustus
  s2.addShape('roundRect', {
    x: 8.0, y: 3.6, w: 4.733, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: '86EFAC', width: 1.5 }
  });
  s2.addText('FASE DEFLASI PANJANG (MEI – AGUSTUS 2026)', {
    x: 8.2, y: 3.71, w: 4.3, h: 0.28,
    fontSize: 11.5, bold: true, color: C_GREEN, fontFace: FONT_FAMILY, margin: 0
  });
  s2.addText([
    { text: '• Titik Deflasi Terendah: ', options: { bold: true, fontSize: 11.5, color: C_TEXT_MAIN } },
    { text: '-2.02% di Juli (M5)', options: { bold: true, fontSize: 12, color: C_GREEN, breakLine: true } },
    { text: '• Analisis: Melimpahnya panen cabai rawit dan pasokan beras daratan Sulsel selama kondisi perairan laut tenang menjaga daya beli warga.', options: { fontSize: 11, color: C_TEXT_SUB } }
  ], {
    x: 8.2, y: 4.0, w: 4.3, h: 1.05,
    fontFace: FONT_FAMILY, margin: 0
  });

  // Card 3: Rebound Q3 September - Oktober
  s2.addShape('roundRect', {
    x: 8.0, y: 5.35, w: 4.733, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FDE68A', width: 1.5 }
  });
  s2.addText('REBOUND TEKANAN HARGA (SEP – OKT 2026)', {
    x: 8.2, y: 5.46, w: 4.3, h: 0.28,
    fontSize: 11.5, bold: true, color: C_AMBER, fontFace: FONT_FAMILY, margin: 0
  });
  s2.addText([
    { text: '• Tren Rebound: ', options: { bold: true, fontSize: 11.5, color: C_TEXT_MAIN } },
    { text: '+0.39% ke +1.57% (Sep)', options: { bold: true, fontSize: 12, color: C_AMBER, breakLine: true } },
    { text: '• Analisis: Masa peralihan musim menekan hasil panen cabai rawit lokal, diperkuat kenaikan harga beras awal Oktober (+0.84%).', options: { fontSize: 11, color: C_TEXT_SUB } }
  ], {
    x: 8.2, y: 5.75, w: 4.3, h: 1.05,
    fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 3: MARET - APRIL 2026 (HBKN)
// ==========================================
function buildSlide3(pres) {
  const s3 = pres.addSlide();
  s3.background = { color: C_BG };
  addHeader(s3, 'Analisis Periode I • HBKN', 'Maret – April 2026: Dinamika Harga Fase Ramadan & Idul Fitri', 'Eskalasi Tajam Protein Hewani & Telur Menjelang Hari Raya Sebelum Terjadi Koreksi Pasca HBKN');
  addFooter(s3, 3);

  s3.addShape('roundRect', {
    x: 0.6, y: 1.85, w: 6.8, h: 5.05,
    rectRadius: 0.12,
    fill: { color: C_CARD },
    line: { color: C_BORDER, width: 1.2 }
  });

  if (fs.existsSync(CHART_SLIDE3)) {
    s3.addImage({
      path: CHART_SLIDE3,
      x: 0.75, y: 1.95, w: 6.5, h: 4.85
    });
  }

  s3.addShape('roundRect', {
    x: 7.6, y: 1.85, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FCA5A5', width: 1.5 }
  });
  s3.addText('LONJAKAN PERMINTAAN DAGING & TELUR', {
    x: 7.85, y: 1.96, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_RED, fontFace: FONT_FAMILY, margin: 0
  });
  s3.addText('Menjelang hari raya Idul Fitri 2026, permintaan protein hewani melonjak tajam. Daging Sapi mencatat andil inflasi hingga +2.17%, sementara Telur Ayam Ras menyumbang andil +1.35% akibat kebutuhan jamuan dan kue hari raya.', {
    x: 7.85, y: 2.26, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s3.addShape('roundRect', {
    x: 7.6, y: 3.6, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: '86EFAC', width: 1.5 }
  });
  s3.addText('KOREKSI HARGA PASCA-HARI RAYA (APRIL W2)', {
    x: 7.85, y: 3.71, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_GREEN, fontFace: FONT_FAMILY, margin: 0
  });
  s3.addText('Setelah puncak lebaran selesai, konsumsi masyarakat melandai normal sementara pasokan sayuran daratan kembali lancar, memicu deflasi sesaat -3.29% di minggu ke-2 sebelum stabil kembali di akhir bulan.', {
    x: 7.85, y: 4.01, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s3.addShape('roundRect', {
    x: 7.6, y: 5.35, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'BAE6FD', width: 1.5 }
  });
  s3.addText('KOMODITAS KUNCI PERIODE HBKN 2026', {
    x: 7.85, y: 5.46, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_PRIMARY, fontFace: FONT_FAMILY, margin: 0
  });
  s3.addText([
    { text: '• Daging Sapi: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil maksimal +2.17% (April W1), pasokan ternak lokal terbatas.', options: { fontSize: 11, color: C_TEXT_SUB, breakLine: true } },
    { text: '• Telur Ayam Ras: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil +1.35%, ketergantungan pasokan dari sentra Sidrap/Maros.', options: { fontSize: 11, color: C_TEXT_SUB, breakLine: true } },
    { text: '• Daging Ayam Ras: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil +0.92%, konsumsi jamuan keluarga meningkat tajam.', options: { fontSize: 11, color: C_TEXT_SUB } }
  ], {
    x: 7.85, y: 5.76, w: 4.6, h: 1.05,
    fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 4: MEI - JULI 2026 (DEFLASI)
// ==========================================
function buildSlide4(pres) {
  const s4 = pres.addSlide();
  s4.background = { color: C_BG };
  addHeader(s4, 'Analisis Periode II • Panen Raya', 'Mei – Juli 2026: Tren Deflasi Konsisten Pasca Panen Raya', 'IPH Bergerak Negatif Hingga Menyentuh -2.02% Didorong Melimpahnya Pasokan Sayuran & Bawang');
  addFooter(s4, 4);

  s4.addShape('roundRect', {
    x: 0.6, y: 1.85, w: 6.8, h: 5.05,
    rectRadius: 0.12,
    fill: { color: C_CARD },
    line: { color: C_BORDER, width: 1.2 }
  });

  if (fs.existsSync(CHART_SLIDE4)) {
    s4.addImage({
      path: CHART_SLIDE4,
      x: 0.75, y: 1.95, w: 6.5, h: 4.85
    });
  }

  s4.addShape('roundRect', {
    x: 7.6, y: 1.85, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: '86EFAC', width: 1.5 }
  });
  s4.addText('PASOKAN PANEN HORTIKULTURA MELIMPAH', {
    x: 7.85, y: 1.96, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_GREEN, fontFace: FONT_FAMILY, margin: 0
  });
  s4.addText('Sepanjang Juli 2026, produksi cabai dan bawang merah di sentra daratan Sulsel (Enrekang, Jeneponto, Bantaeng) melimpah. Pasokan masuk lancar ke Selayar melalui pelabuhan feri Bira - Pamatata dengan volume tinggi.', {
    x: 7.85, y: 2.26, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s4.addShape('roundRect', {
    x: 7.6, y: 3.6, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'BAE6FD', width: 1.5 }
  });
  s4.addText('5 MINGGU DEFLASI BERUNTUN DI JULI 2026', {
    x: 7.85, y: 3.71, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_PRIMARY, fontFace: FONT_FAMILY, margin: 0
  });
  s4.addText('Bulan Juli mencatat deflasi mingguan berurutan: M1 (-1.31%), M2 (-1.62%), M3 (-1.82%), M4 (-1.97%), dan M5 (-2.02%). Kondisi ini memberikan bantalan daya beli yang sangat sehat bagi masyarakat Kepulauan Selayar.', {
    x: 7.85, y: 4.01, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s4.addShape('roundRect', {
    x: 7.6, y: 5.35, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: '86EFAC', width: 1.5 }
  });
  s4.addText('KOMODITAS PENYUMBANG DEFLASI UTAMA', {
    x: 7.85, y: 5.46, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_GREEN, fontFace: FONT_FAMILY, margin: 0
  });
  s4.addText([
    { text: '• Cabai Rawit: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil deflasi terdalam (-0.64%), harga eceran turun stabil di pasar.', options: { fontSize: 11, color: C_TEXT_SUB, breakLine: true } },
    { text: '• Daging Ayam Ras: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil deflasi (-0.61%), pasokan karkas melimpah pasca HBKN.', options: { fontSize: 11, color: C_TEXT_SUB, breakLine: true } },
    { text: '• Bawang Merah: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil deflasi (-0.42%), suplai daratan Sulawesi sangat lancar.', options: { fontSize: 11, color: C_TEXT_SUB } }
  ], {
    x: 7.85, y: 5.76, w: 4.6, h: 1.05,
    fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 5: SEP - OKT 2026 (REBOUND)
// ==========================================
function buildSlide5(pres) {
  const s5 = pres.addSlide();
  s5.background = { color: C_BG };
  addHeader(s5, 'Analisis Periode III • Musim Peralihan', 'September – Oktober 2026: Rebound Inflasi Komoditas Pangan', 'IPH Kembali Merangkak Positif Dipicu Lonjakan Cabai Rawit & Kenaikan Bertahap Harga Beras');
  addFooter(s5, 5);

  s5.addShape('roundRect', {
    x: 0.6, y: 1.85, w: 6.8, h: 5.05,
    rectRadius: 0.12,
    fill: { color: C_CARD },
    line: { color: C_BORDER, width: 1.2 }
  });

  if (fs.existsSync(CHART_SLIDE5)) {
    s5.addImage({
      path: CHART_SLIDE5,
      x: 0.75, y: 1.95, w: 6.5, h: 4.85
    });
  }

  s5.addShape('roundRect', {
    x: 7.6, y: 1.85, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FDE68A', width: 1.5 }
  });
  s5.addText('PERALIHAN MUSIM & PENURUNAN PANEN HORTIKULTURA', {
    x: 7.85, y: 1.96, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_AMBER, fontFace: FONT_FAMILY, margin: 0
  });
  s5.addText('Memasuki akhir kuartal III 2026, panen cabai lokal di pulau Selayar mulai berkurang. Keterbatasan suplai menyebabkan harga cabai rawit dan cabai merah kembali merangkak naik di pasar tradisional.', {
    x: 7.85, y: 2.26, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s5.addShape('roundRect', {
    x: 7.6, y: 3.6, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FCA5A5', width: 1.5 }
  });
  s5.addText('TEKANAN BERAS DI AWAL OKTOBER 2026', {
    x: 7.85, y: 3.71, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_RED, fontFace: FONT_FAMILY, margin: 0
  });
  s5.addText('Pada minggu ke-1 Oktober 2026, IPH berada di level +0.84% dengan Beras sebagai komoditas bergejolak utama. Pergerakan harga gabah daratan mulai terasa pada harga eceran beras medium di Kepulauan Selayar.', {
    x: 7.85, y: 4.01, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s5.addShape('roundRect', {
    x: 7.6, y: 5.35, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'BAE6FD', width: 1.5 }
  });
  s5.addText('KOMODITAS PENYUMBANG KENAIKAN AKHIR Q3', {
    x: 7.85, y: 5.46, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_PRIMARY, fontFace: FONT_FAMILY, margin: 0
  });
  s5.addText([
    { text: '• Cabai Rawit: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil inflasi hingga +1.13% (September W4), fluktuasi tertinggi.', options: { fontSize: 11, color: C_TEXT_SUB, breakLine: true } },
    { text: '• Cabai Merah: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil +0.62%, permintaan stabil namun suplai lokal menipis.', options: { fontSize: 11, color: C_TEXT_SUB, breakLine: true } },
    { text: '• Beras: ', options: { bold: true, fontSize: 11, color: C_TEXT_MAIN } },
    { text: 'Andil +0.53%, menjadi pemicu utama kenaikan awal Oktober 2026.', options: { fontSize: 11, color: C_TEXT_SUB } }
  ], {
    x: 7.85, y: 5.76, w: 4.6, h: 1.05,
    fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 6: PROFIL KOMODITAS BERGEJOLAK 2026
// ==========================================
function buildSlide6(pres) {
  const s6 = pres.addSlide();
  s6.background = { color: C_BG };
  addHeader(s6, 'Analisis Komoditas 2026', 'Profil Komoditas Bergejolak Kabupaten Kepulauan Selayar', 'Cabai Rawit Memimpin Frekuensi Fluktuasi (15x), Disusul Telur Ayam Ras, Beras, dan Cabai Merah');
  addFooter(s6, 6);

  s6.addShape('roundRect', {
    x: 0.6, y: 1.85, w: 6.8, h: 5.05,
    rectRadius: 0.12,
    fill: { color: C_CARD },
    line: { color: C_BORDER, width: 1.2 }
  });

  if (fs.existsSync(CHART_SLIDE6)) {
    s6.addImage({
      path: CHART_SLIDE6,
      x: 0.75, y: 1.95, w: 6.5, h: 4.85
    });
  }

  s6.addShape('roundRect', {
    x: 7.6, y: 1.85, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FCA5A5', width: 1.5 }
  });
  s6.addText('KLASTER HORTIKULTURA: KERENTANAN TINGGI', {
    x: 7.85, y: 1.96, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_RED, fontFace: FONT_FAMILY, margin: 0
  });
  s6.addText('Cabai Rawit menjadi komoditas paling volatil dengan 15 kali tercatat sebagai pemicu gejolak utama sepanjang 2026. Sifatnya yang lekas rusak (perishable) dan ketergantungan pasokan daratan menjadikannya indikator paling sensitif.', {
    x: 7.85, y: 2.26, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s6.addShape('roundRect', {
    x: 7.6, y: 3.6, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'FDE68A', width: 1.5 }
  });
  s6.addText('KLASTER PROTEIN HEWANI: SENSITIF HBKN', {
    x: 7.85, y: 3.71, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_AMBER, fontFace: FONT_FAMILY, margin: 0
  });
  s6.addText('Telur Ayam Ras (5x gejolak) dan Daging Ayam (3x gejolak) mendominasi lonjakan harga pada momen perayaan dan hari libur. Pasokan ayam petelur lokal belum mampu memenuhi kebutuhan mandiri seluruh pulau.', {
    x: 7.85, y: 4.01, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });

  s6.addShape('roundRect', {
    x: 7.6, y: 5.35, w: 5.133, h: 1.55,
    rectRadius: 0.1,
    fill: { color: C_CARD },
    line: { color: 'BAE6FD', width: 1.5 }
  });
  s6.addText('KLASTER PANGAN POKOK: BERAS STRATEGIS', {
    x: 7.85, y: 5.46, w: 4.6, h: 0.28,
    fontSize: 11.5, bold: true, color: C_PRIMARY, fontFace: FONT_FAMILY, margin: 0
  });
  s6.addText('Beras tercatat 4 kali sebagai fluktuasi tertinggi pada 2026. Meskipun Selayar memiliki buffer stock BULOG, stabilitas harga beras tetap membutuhkan pengawasan jalur logistik laut dan kepatuhan terhadap HET pasar.', {
    x: 7.85, y: 5.76, w: 4.6, h: 1.05,
    fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 7: RENCANA KEBIJAKAN 4K 2026
// ==========================================
function buildSlide7(pres) {
  const s7 = pres.addSlide();
  s7.background = { color: C_BG };
  addHeader(s7, 'Rekomendasi Kebijakan TPID', 'Rencana Aksi Pengendalian Inflasi Daerah 2026 (Kerangka 4K)', 'Strategi Preventif Berbasis Evaluasi IPH Mingguan Untuk Menjaga Stabilitas Harga di Kepulauan Selayar');
  addFooter(s7, 7);

  const pillars = [
    {
      num: '01',
      title: 'KETERJANGKAUAN HARGA',
      color: C_PRIMARY,
      desc: 'Pelaksanaan Gerakan Pangan Murah (GPM) berkala dan operasi pasar terarah di sentra pulau, terutama pada H-14 momen HBKN Idul Fitri dan Nataru, dengan subsidi selisih harga komoditas pokok.',
      sub: 'Target: Menjaga daya beli masyarakat berpenghasilan rendah.'
    },
    {
      num: '02',
      title: 'KETERSEDIAAN PASOKAN',
      color: C_GREEN,
      desc: 'Penguatan cadangan pangan pemerintah daerah (CPPD) bersama BULOG, optimalisasi fasilitas cold storage komunal untuk cabai & bawang, serta penguatan Kerjasama Antar Daerah (KAD) dengan sentra daratan Sulsel.',
      sub: 'Target: Stok aman minimal 3-4 minggu saat cuaca laut ekstrem.'
    },
    {
      num: '03',
      title: 'KELANCARAN DISTRIBUSI',
      color: C_AMBER,
      desc: 'Pemberian dispensasi prioritas muatan bagi truk bahan pangan pokok di pelabuhan feri Bira - Pamatata, koordinasi kesiapan armada ASDP, serta subsidi ongkos angkut (SOA) maritim saat ombak tinggi.',
      sub: 'Target: Arus barang tidak terputus lebih dari 48 jam.'
    },
    {
      num: '04',
      title: 'KOMUNIKASI EFEKTIF',
      color: C_INDIGO,
      desc: 'Publikasi berkala update harga komoditas pangan melalui kanal resmi dan radio daerah untuk mencegah kepanikan belanja (panic buying), sidak penimbunan di tingkat grosir, serta imbauan belanja bijak.',
      sub: 'Target: Ekspektasi inflasi masyarakat tetap rasional dan tenang.'
    }
  ];

  const colW = 5.85;
  const rowH = 1.95;
  const xs = [0.6, 6.85];
  const ys = [1.85, 3.95];

  pillars.forEach((p, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = xs[col];
    const y = ys[row];

    s7.addShape('roundRect', {
      x, y, w: colW, h: rowH,
      rectRadius: 0.1,
      fill: { color: C_CARD },
      line: { color: C_BORDER, width: 1.2 }
    });

    s7.addShape('roundRect', {
      x: x + 0.25, y: y + 0.18, w: 0.5, h: 0.38,
      rectRadius: 0.06,
      fill: { color: 'F1F5F9' },
      line: { color: C_BORDER, width: 1 }
    });
    s7.addText(p.num, {
      x: x + 0.25, y: y + 0.18, w: 0.5, h: 0.38,
      fontSize: 12, bold: true, color: p.color, align: 'center', valign: 'middle', fontFace: FONT_FAMILY, margin: 0
    });

    s7.addText(p.title, {
      x: x + 0.88, y: y + 0.22, w: 4.7, h: 0.32,
      fontSize: 13, bold: true, color: C_TEXT_MAIN, fontFace: FONT_FAMILY, margin: 0
    });

    s7.addText(p.desc, {
      x: x + 0.25, y: y + 0.65, w: 5.35, h: 0.8,
      fontSize: 11, color: C_TEXT_SUB, fontFace: FONT_FAMILY, margin: 0
    });

    s7.addText(p.sub, {
      x: x + 0.25, y: y + 1.48, w: 5.35, h: 0.32,
      fontSize: 10.5, bold: true, italic: true, color: p.color, fontFace: FONT_FAMILY, margin: 0
    });
  });

  s7.addShape('roundRect', {
    x: 0.6, y: 6.05, w: 12.1, h: 0.85,
    rectRadius: 0.08,
    fill: { color: 'EFF6FF' },
    line: { color: '93C5FD', width: 1.2 }
  });
  s7.addText([
    { text: 'Fokus Pemantauan Komoditas Prioritas 2026: ', options: { bold: true, fontSize: 11, color: '1E40AF' } },
    { text: 'Cabai Rawit (15x volatil), Telur Ayam Ras, Daging Sapi/Ayam saat HBKN, dan Beras di awal musim hujan.\n', options: { fontSize: 11, color: C_TEXT_SUB } },
    { text: '*Rujukan Ketahanan Pangan: ', options: { bold: true, fontSize: 10.5, color: '1E40AF' } },
    { text: 'Kebijakan harga dan pasokan diarahkan untuk menjamin terpenuhinya standar Angka Kecukupan Gizi (AKG) 2.100 kkal / kapita / hari.', options: { fontSize: 10.5, color: '475569' } }
  ], {
    x: 0.85, y: 6.13, w: 11.6, h: 0.7,
    fontFace: FONT_FAMILY, margin: 0
  });
}

// ==========================================
// SLIDE 8: PENUTUP 2026 & SENSUS EKONOMI 2026
// ==========================================
function buildSlide8(pres) {
  const s8 = pres.addSlide();
  s8.background = { color: '0F172A' };

  s8.addShape('roundRect', {
    x: 0.8, y: 0.8, w: 6.0, h: 5.9,
    rectRadius: 0.15,
    fill: { color: '1E293B' },
    line: { color: '475569', width: 2 }
  });

  if (fs.existsSync(LOGO_SELAYAR)) {
    s8.addImage({ path: LOGO_SELAYAR, x: 1.3, y: 1.3, w: 1.1, h: 1.1 });
  }

  s8.addText('Terima Kasih', {
    x: 1.3, y: 2.65, w: 5.0, h: 0.7,
    fontSize: 36, bold: true, color: 'FFFFFF', fontFace: FONT_FAMILY, margin: 0
  });

  s8.addText('Sinergi Kuat Menjaga Stabilitas Harga & Kesejahteraan Masyarakat Kepulauan Selayar', {
    x: 1.3, y: 3.45, w: 5.0, h: 0.7,
    fontSize: 15, color: 'CBD5E1', fontFace: FONT_FAMILY, margin: 0
  });

  s8.addShape('roundRect', {
    x: 1.3, y: 4.3, w: 5.0, h: 1.9,
    rectRadius: 0.1,
    fill: { color: '0F172A' },
    line: { color: '475569', width: 1.2 }
  });
  s8.addText([
    { text: 'Tim Pengendalian Inflasi Daerah (TPID)\n', options: { bold: true, fontSize: 14, color: '38BDF8', breakLine: true } },
    { text: 'Kabupaten Kepulauan Selayar Tahun 2026\n\n', options: { bold: true, fontSize: 12, color: 'F1F5F9', breakLine: true } },
    { text: 'Sekretariat: ', options: { bold: true, fontSize: 11, color: '94A3B8' } },
    { text: 'Bagian Perekonomian Setda Kab. Kepulauan Selayar\n', options: { fontSize: 11, color: 'CBD5E1', breakLine: true } },
    { text: 'Mitra Data: ', options: { bold: true, fontSize: 11, color: '94A3B8' } },
    { text: 'BPS Kabupaten Kepulauan Selayar\n\n', options: { fontSize: 11, color: 'CBD5E1', breakLine: true } },
    { text: 'Dashboard IPH: ', options: { bold: true, fontSize: 11, color: '64748B' } },
    { text: 'https://ridsonap.github.io/siph/?kab=7301', options: { fontSize: 11, bold: true, color: '38BDF8' } }
  ], {
    x: 1.5, y: 4.45, w: 4.6, h: 1.6,
    fontFace: FONT_FAMILY, margin: 0
  });

  s8.addShape('roundRect', {
    x: 7.1, y: 0.8, w: 5.433, h: 5.9,
    rectRadius: 0.15,
    fill: { color: '1E293B' },
    line: { color: 'F59E0B', width: 2 }
  });

  if (fs.existsSync(LOGO_BPS)) {
    s8.addImage({ path: LOGO_BPS, x: 7.6, y: 1.3, w: 1.9, h: 0.64 });
  }
  if (fs.existsSync(LOGO_SE2026)) {
    s8.addImage({ path: LOGO_SE2026, x: 10.9, y: 1.15, w: 1.15, h: 1.15 });
  }

  s8.addShape('roundRect', {
    x: 7.6, y: 2.3, w: 3.8, h: 0.38,
    rectRadius: 0.08,
    fill: { color: 'D97706' },
    line: { color: 'FBBF24', width: 1.2 }
  });
  s8.addText('#MencatatEkonomiIndonesia', {
    x: 7.6, y: 2.3, w: 3.8, h: 0.38,
    fontSize: 11, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: FONT_FAMILY, margin: 0
  });

  s8.addText('SENSUS EKONOMI 2026\nMILIK INDONESIA', {
    x: 7.6, y: 2.85, w: 4.5, h: 0.9,
    fontSize: 22, bold: true, color: 'FFFFFF', fontFace: FONT_FAMILY, margin: 0
  });

  s8.addText('Bersama kita kawal pelaksanaan SENSUS EKONOMI 2026 untuk mewujudkan basis data ekonomi yang akurat, berdaulat, dan mendorong kemandirian perekonomian nasional.', {
    x: 7.6, y: 3.85, w: 4.5, h: 1.05,
    fontSize: 12.5, color: 'CBD5E1', fontFace: FONT_FAMILY, margin: 0
  });

  s8.addShape('roundRect', {
    x: 7.6, y: 5.05, w: 4.5, h: 1.2,
    rectRadius: 0.08,
    fill: { color: '0F172A' },
    line: { color: '475569', width: 1.2 }
  });
  s8.addText('Badan Pusat Statistik (BPS)\nMenyediakan Data Berkualitas untuk Indonesia Maju\nwww.bps.go.id', {
    x: 7.8, y: 5.2, w: 4.1, h: 0.9,
    fontSize: 11.5, color: 'CBD5E1', fontFace: FONT_FAMILY, margin: 0
  });
}

const builders = [buildSlide1, buildSlide2, buildSlide3, buildSlide4, buildSlide5, buildSlide6, buildSlide7, buildSlide8];

async function generateAll() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  builders.forEach(fn => fn(pres));

  const outPath = path.resolve('Materi IPH.pptx');
  await pres.writeFile({ fileName: outPath });
  console.log('Successfully generated senior-friendly 2026 PPTX: ' + outPath);

  // Generate single slides for thumbnail inspection
  const thumbDir = '/tmp/slide_cards_senior';
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

  for (let i = 0; i < builders.length; i++) {
    const singlePres = new pptxgen();
    singlePres.layout = 'LAYOUT_WIDE';
    builders[i](singlePres);
    const p = path.join(thumbDir, `slide_${i + 1}.pptx`);
    await singlePres.writeFile({ fileName: p });
    execSync(`qlmanage -t -s 1400 "${p}" -o "${thumbDir}" 2>&1`);
  }
  console.log('Generated senior-friendly thumbnails in: ' + thumbDir);
}

generateAll();
