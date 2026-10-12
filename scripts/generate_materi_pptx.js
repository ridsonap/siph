// Deck "Materi IPH 2026" Kab. Kepulauan Selayar — versi sederhana & berbasis data.
// Semua angka dihitung dari data/iph_sulsel.json (hasil scripts/build_data.py),
// sehingga deck selalu konsisten dengan dashboard SIPH.
// Grafik digambar dengan bentuk (shape) + teks biasa agar tetap utuh & bisa diedit
// saat diimpor ke Canva (chart native PowerPoint tidak ikut terimpor).
const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const KAB = '7301';
const YEAR = 2026;
const LEBARAN = '21 Maret 2026'; // Idul Fitri 1447 H, ketetapan Kemenag (sidang isbat 19 Maret 2026)
// Bulan Idul Fitri tahun-tahun sebelumnya (2023: 22 Apr, 2024: 10 Apr, 2025: 31 Mar)
const LEBARAN_MONTH = { 2023: 4, 2024: 4, 2025: 3 };

// ---------- Warna & tipografi ----------
const FONT = 'Arial';
const NAVY = '0F2A44';
const INK = '1F2937';
const MUTED = '5B6573';
const LINE = 'D7DDE4';
const BG = 'FFFFFF';
const SOFT = 'F2F5F8';
const UP = 'C2410C';     // naik / inflasi
const UP_SOFT = 'FDEDE4';
const DOWN = '15803D';   // turun / deflasi
const DOWN_SOFT = 'E5F4EA';
const ACCENT = '0E7490';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// ---------- Data ----------
const raw = JSON.parse(fs.readFileSync(path.resolve('data/iph_sulsel.json'), 'utf8'));
const weeks = raw.periods
  .filter(p => p.year === YEAR)
  .map(p => ({ p, r: p.records.find(r => r.kode_kab === KAB) }))
  .filter(x => x.r && x.r.iph !== null)
  .map(({ p, r }) => ({
    key: p.period_key, month: p.month, week: p.week,
    label: `${MONTHS[p.month]} M${p.week}`,
    iph: r.iph, fluk: r.fluktuasi_tertinggi, comms: r.komoditas
  }));
if (!weeks.length) throw new Error(`Tidak ada data ${KAB} tahun ${YEAR}`);

const round2 = v => Math.round(v * 100 + (v >= 0 ? 1e-9 : -1e-9)) / 100;
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const nWeeks = weeks.length;
const nUp = weeks.filter(w => w.iph > 0).length;
const nDown = weeks.filter(w => w.iph < 0).length;
const avgAll = round2(mean(weeks.map(w => w.iph)));
const maxW = weeks.reduce((a, b) => (b.iph > a.iph ? b : a));
const minW = weeks.reduce((a, b) => (b.iph < a.iph ? b : a));
const firstW = weeks[0], lastW = weeks[weeks.length - 1];

const monthList = [...new Set(weeks.map(w => w.month))];
const monthly = monthList.map(m => {
  const ws = weeks.filter(w => w.month === m);
  return { month: m, avg: round2(mean(ws.map(w => w.iph))), n: ws.length, min: Math.min(...ws.map(w => w.iph)), max: Math.max(...ws.map(w => w.iph)) };
});
const topMonth = monthly.reduce((a, b) => (b.avg > a.avg ? b : a));

// Apakah kenaikan sekitar Lebaran juga terjadi di tahun-tahun sebelumnya? (rata-rata bulan Lebaran / sesudahnya > +1%)
const monthAvg = (y, m) => {
  const v = raw.periods.filter(p => p.year === y && p.month === m)
    .map(p => (p.records.find(r => r.kode_kab === KAB) || {}).iph).filter(x => x !== undefined && x !== null);
  return v.length ? mean(v) : null;
};
const lebaranYears = Object.entries(LEBARAN_MONTH)
  .filter(([y, m]) => Math.max(monthAvg(+y, m) ?? -9, monthAvg(+y, m + 1) ?? -9) > 1)
  .map(([y]) => y);

// Rangkaian minggu turun terpanjang
let streak = { len: 0 }, cur = null;
weeks.forEach((w, i) => {
  if (w.iph < 0) { cur = cur ? { ...cur, end: i, len: cur.len + 1 } : { start: i, end: i, len: 1 }; if (cur.len > streak.len) streak = cur; }
  else cur = null;
});

// Andil kenaikan tertinggi per komoditas (minggu dengan andil positif)
const maxUp = {};
weeks.forEach(w => w.comms.forEach(c => {
  if (c.kontribusi > 0 && (!maxUp[c.nama] || c.kontribusi > maxUp[c.nama].v)) maxUp[c.nama] = { v: c.kontribusi, w };
}));
const upRank = Object.entries(maxUp).sort((a, b) => b[1].v - a[1].v);

// Frekuensi komoditas berfluktuasi tertinggi
const flukCount = {};
weeks.forEach(w => { if (w.fluk && w.fluk !== '-') flukCount[w.fluk] = (flukCount[w.fluk] || 0) + 1; });
const flukRank = Object.entries(flukCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const flukWeeks = name => weeks.filter(w => w.fluk === name);

const pct = (v, sign = true) => `${sign && v > 0 ? '+' : ''}${v.toFixed(2).replace('.', ',').replace('-', '−')}%`;

// Angka kunci untuk narasi
const apr = monthly.find(m => m.month === 4);
const sapi = maxUp['Daging Sapi'], ayam = maxUp['Daging Ayam Ras'], rawit = maxUp['Cabai Rawit'];
const rawitFluk = flukCount['Cabai Rawit'] || 0;
const berasWeeks = flukWeeks('Beras');
const berasAllFirstWeek = berasWeeks.length > 0 && berasWeeks.every(w => w.week === 1);
const rawitSep = weeks.filter(w => w.month === 9).map(w => (w.comms.find(c => c.nama === 'Cabai Rawit') || {}).kontribusi).filter(v => v !== undefined);

// ---------- Pustaka gambar ----------
function img(p) {
  const f = path.resolve(p);
  return fs.existsSync(f) ? `image/png;base64,${fs.readFileSync(f).toString('base64')}` : null;
}
const LOGO_SELAYAR = img('assets/logos/logo_selayar.png');
const LOGO_BPS = img('assets/logos/logo_bps.png');
const LOGO_SE = img('assets/logos/logo_se2026.png');

function text(slide, t, o) {
  slide.addText(t, { fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: 'top', ...o });
}

function frame(slide, n, title, kicker) {
  slide.background = { color: BG };
  text(slide, kicker.toUpperCase(), { x: 0.6, y: 0.42, w: 9.5, h: 0.3, fontSize: 13, bold: true, color: ACCENT, charSpacing: 1 });
  text(slide, title, { x: 0.6, y: 0.75, w: 10.6, h: 0.95, fontSize: 28, bold: true, color: NAVY, valign: 'top' });
  if (LOGO_BPS) slide.addImage({ data: LOGO_BPS, x: 11.35, y: 0.42, w: 1.4, h: 0.47 });
  text(slide, `Sumber: BPS, Indeks Perkembangan Harga (IPH) mingguan Kab. Kepulauan Selayar ${YEAR}, diolah.`, {
    x: 0.6, y: 7.0, w: 10.5, h: 0.3, fontSize: 11, color: MUTED
  });
  text(slide, String(n), { x: 12.15, y: 7.0, w: 0.6, h: 0.3, fontSize: 11, color: MUTED, align: 'right' });
}

function card(slide, x, y, w, h, fill = SOFT) {
  slide.addShape('roundRect', { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill, width: 0 } });
}

// Grafik batang horizontal dari shape: items [{label, value, valueText, color}]
function hbars(slide, { x, y, w, rowH, labelW, items, max }) {
  const barMaxW = w - labelW - 1.3;
  items.forEach((it, i) => {
    const yy = y + i * rowH;
    text(slide, it.label, { x, y: yy, w: labelW - 0.15, h: rowH * 0.7, fontSize: 16, valign: 'middle', align: 'right' });
    const bw = Math.max(0.04, (Math.abs(it.value) / max) * barMaxW);
    slide.addShape('rect', { x: x + labelW, y: yy + rowH * 0.12, w: bw, h: rowH * 0.46, fill: { color: it.color }, line: { color: it.color, width: 0 } });
    text(slide, it.valueText, { x: x + labelW + bw + 0.12, y: yy, w: 1.2, h: rowH * 0.7, fontSize: 16, bold: true, color: it.color, valign: 'middle' });
  });
}

// ---------- Slide ----------
function slideCover(pres) {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  if (LOGO_SELAYAR) s.addImage({ data: LOGO_SELAYAR, x: 0.8, y: 0.7, w: 0.95, h: 0.95 });
  if (LOGO_BPS) s.addImage({ data: LOGO_BPS, x: 2.0, y: 0.92, w: 1.6, h: 0.53 });
  text(s, 'HIGH LEVEL MEETING TPID & CAPACITY BUILDING NERACA PANGAN DAERAH 2026', {
    x: 0.8, y: 2.25, w: 11.5, h: 0.35, fontSize: 14, bold: true, color: '7DD3E8', charSpacing: 1
  });
  text(s, 'Perkembangan Harga Pangan\nKabupaten Kepulauan Selayar 2026', {
    x: 0.8, y: 2.75, w: 11.5, h: 1.9, fontSize: 40, bold: true, color: 'FFFFFF', lineSpacingMultiple: 1.05
  });
  text(s, `Indeks Perkembangan Harga (IPH) mingguan, ${MONTHS_FULL[firstW.month]} – ${MONTHS_FULL[lastW.month]} ${YEAR} (${nWeeks} rilis)`, {
    x: 0.8, y: 4.75, w: 11.5, h: 0.45, fontSize: 20, color: 'D6E2EE'
  });
  text(s, 'Badan Pusat Statistik Kabupaten Kepulauan Selayar', { x: 0.8, y: 6.55, w: 8, h: 0.35, fontSize: 14, color: 'A9BACB' });
}

function slideSummary(pres, n) {
  const s = pres.addSlide();
  frame(s, n, `Harga relatif stabil sepanjang ${YEAR}, tetapi sempat melonjak di ${MONTHS_FULL[topMonth.month]}`, 'Ringkasan');
  const stats = [
    { big: pct(avgAll), lab: 'Rata-rata IPH', sub: `per minggu, dari ${nWeeks} minggu (${MONTHS[firstW.month]}–${MONTHS[lastW.month]})`, color: NAVY },
    { big: `${nUp} : ${nDown}`, lab: 'Minggu naik : turun', sub: 'Lebih sering turun daripada naik', color: NAVY },
    { big: pct(maxW.iph), lab: 'Kenaikan tertinggi', sub: `${maxW.label} (pasca-Lebaran)`, color: UP },
    { big: pct(minW.iph), lab: 'Penurunan terdalam', sub: `${minW.label}`, color: DOWN }
  ];
  const w = 2.85, gap = 0.2;
  stats.forEach((st, i) => {
    const x = 0.6 + i * (w + gap);
    card(s, x, 2.0, w, 2.55);
    text(s, st.big, { x: x + 0.25, y: 2.25, w: w - 0.4, h: 0.9, fontSize: 40, bold: true, color: st.color });
    text(s, st.lab, { x: x + 0.25, y: 3.2, w: w - 0.4, h: 0.4, fontSize: 17, bold: true });
    text(s, st.sub, { x: x + 0.25, y: 3.65, w: w - 0.4, h: 0.7, fontSize: 15, color: MUTED });
  });
  text(s, [
    { text: 'Pesan utama: ', options: { bold: true, color: NAVY } },
    { text: `gejolak ${YEAR} dipicu dua momen — daging setelah Lebaran (April) dan cabai rawit (September). ` +
      (lebaranYears.length ? `Kenaikan sekitar Lebaran juga terjadi pada ${lebaranYears.join(' dan ')}, sehingga dapat diantisipasi lebih awal.` : '') }
  ], { x: 0.6, y: 5.05, w: 12.1, h: 1.2, fontSize: 19, lineSpacingMultiple: 1.15 });
}

function slideTrend(pres, n) {
  const s = pres.addSlide();
  frame(s, n, `${MONTHS_FULL[topMonth.month]} tertinggi; harga turun ${streak.len} minggu berturut-turut sesudahnya`, 'Tren bulanan');
  const x0 = 0.9, y0 = 1.95, w = 11.6, h = 3.3;
  const top = Math.max(...monthly.map(m => m.avg), 0.5) * 1.15;
  const bot = Math.min(...monthly.map(m => m.avg), -0.5) * 1.3;
  const unit = h / (top - bot);
  const zeroY = y0 + top * unit;
  const slot = w / monthly.length;
  s.addShape('line', { x: x0, y: zeroY, w, h: 0, line: { color: '9AA5B1', width: 1.25 } });
  monthly.forEach((m, i) => {
    const cx = x0 + i * slot;
    const bh = Math.max(0.03, Math.abs(m.avg) * unit);
    const color = m.avg >= 0 ? UP : DOWN;
    const by = m.avg >= 0 ? zeroY - bh : zeroY;
    s.addShape('rect', { x: cx + slot * 0.2, y: by, w: slot * 0.6, h: bh, fill: { color }, line: { color, width: 0 } });
    const ly = m.avg >= 0 ? by - 0.42 : by + bh + 0.06;
    text(s, pct(m.avg), { x: cx, y: ly, w: slot, h: 0.36, fontSize: 15, bold: true, color, align: 'center' });
    text(s, MONTHS[m.month], { x: cx, y: y0 + h + 0.08, w: slot, h: 0.35, fontSize: 16, align: 'center', color: INK });
  });
  text(s, 'Rata-rata IPH mingguan per bulan (%)', { x: x0, y: y0 - 0.1, w: 6, h: 0.3, fontSize: 13, color: MUTED });

  const s1 = weeks[streak.start], s2 = weeks[streak.end];
  const phases = [
    { t: `${MONTHS_FULL[topMonth.month]}: ${pct(apr.min)} s.d. ${pct(apr.max)}`, d: `Harga daging tetap tinggi setelah Idul Fitri (${LEBARAN}).`, c: UP, f: UP_SOFT },
    { t: `${MONTHS_FULL[s1.month]}–${MONTHS_FULL[s2.month]}: ${streak.len} minggu turun`, d: `Titik terendah ${pct(minW.iph)} pada ${minW.label}.`, c: DOWN, f: DOWN_SOFT },
    { t: 'September: naik kembali', d: `Didorong cabai rawit; Okt M1 masih ${pct(lastW.iph)}.`, c: UP, f: UP_SOFT }
  ];
  const pw = (12.1 - 0.4) / 3;
  phases.forEach((p, i) => {
    const x = 0.6 + i * (pw + 0.2);
    card(s, x, 5.82, pw, 1.0, p.f);
    text(s, p.t, { x: x + 0.2, y: 5.92, w: pw - 0.3, h: 0.35, fontSize: 16, bold: true, color: p.c });
    text(s, p.d, { x: x + 0.2, y: 6.3, w: pw - 0.3, h: 0.45, fontSize: 14, color: INK });
  });
}

function slideDrivers(pres, n) {
  const s = pres.addSlide();
  frame(s, n, 'Dua pemicu kenaikan: daging setelah Lebaran, cabai rawit di September', 'Komoditas pendorong naik');
  const items = upRank.slice(0, 5).map(([name, o]) => ({
    label: name, value: o.v, valueText: pct(round2(o.v)), color: ['Daging Sapi', 'Daging Ayam Ras', 'Cabai Rawit'].includes(name) ? UP : '9AA5B1'
  }));
  text(s, 'Andil tertinggi terhadap kenaikan IPH, per komoditas (%)', { x: 0.6, y: 1.95, w: 7, h: 0.3, fontSize: 13, color: MUTED });
  hbars(s, { x: 0.6, y: 2.4, w: 7.0, rowH: 0.78, labelW: 2.4, items, max: items[0].value });

  const notes = [
    { h: 'Daging sapi & daging ayam ras', b: `Andil ${pct(round2(sapi.v))} dan ${pct(round2(ayam.v))}, bertahan selama ${apr.n} minggu April — harga belum turun setelah Lebaran.` },
    { h: 'Cabai rawit', b: `Andil naik sepanjang September dari ${pct(round2(rawitSep[0]))} ke ${pct(round2(Math.max(...rawitSep)))}, dan menjadi pendorong utama kenaikan kembali.` }
  ];
  notes.forEach((nt, i) => {
    const y = 2.35 + i * 2.0;
    card(s, 8.1, y, 4.65, 1.8, UP_SOFT);
    text(s, nt.h, { x: 8.35, y: y + 0.18, w: 4.2, h: 0.4, fontSize: 18, bold: true, color: UP });
    text(s, nt.b, { x: 8.35, y: y + 0.62, w: 4.2, h: 1.1, fontSize: 15, lineSpacingMultiple: 1.1 });
  });
}

function slideVolatile(pres, n) {
  const s = pres.addSlide();
  const flukTotal = flukRank.reduce((a, [, c]) => a + c, 0);
  frame(s, n, `Cabai rawit paling sering bergejolak: ${rawitFluk} dari ${nWeeks} minggu`, 'Komoditas paling bergejolak');
  const top = flukRank.slice(0, 4);
  const restCount = flukTotal - top.reduce((a, [, c]) => a + c, 0);
  const items = top.map(([name, c], i) => ({ label: name, value: c, valueText: `${c}x`, color: i === 0 ? ACCENT : '7FA9B5' }));
  if (restCount > 0) items.push({ label: 'Lainnya', value: restCount, valueText: `${restCount}x`, color: 'B8C2CC' });
  text(s, 'Berapa kali tercatat sebagai komoditas dengan fluktuasi harga tertinggi', { x: 0.6, y: 1.95, w: 7.5, h: 0.3, fontSize: 13, color: MUTED });
  hbars(s, { x: 0.6, y: 2.4, w: 7.0, rowH: 0.78, labelW: 2.4, items, max: items[0].value });

  card(s, 8.1, 2.35, 4.65, 3.8);
  text(s, 'Yang perlu diperhatikan', { x: 8.35, y: 2.55, w: 4.2, h: 0.4, fontSize: 18, bold: true, color: NAVY });
  const bullets = [
    `Cabai rawit bergejolak hampir setengah dari seluruh minggu (${Math.round(100 * rawitFluk / nWeeks)}%).`,
    berasAllFirstWeek ? `Beras bergejolak ${berasWeeks.length} kali — selalu di minggu pertama bulan.` : `Beras bergejolak ${berasWeeks.length} kali.`,
    `Telur ayam ras bergejolak ${flukCount['Telur Ayam Ras'] || 0} kali, sebagian besar sekitar Lebaran dan Juni.`
  ];
  text(s, bullets.map((b, i) => ({ text: b, options: { bullet: true, breakLine: i < bullets.length - 1, paraSpaceAfter: 10 } })), {
    x: 8.35, y: 3.05, w: 4.2, h: 3.0, fontSize: 16, lineSpacingMultiple: 1.05
  });
}

function slideActions(pres, n) {
  const s = pres.addSlide();
  frame(s, n, 'Tiga langkah prioritas TPID, sesuai pola harga 2026', 'Rekomendasi');
  const acts = [
    { tag: 'Keterjangkauan & pasokan', h: 'Daging sapi & ayam ras', a: 'Operasi pasar / Gerakan Pangan Murah dari H-14 hingga ±6 minggu setelah Lebaran.', d: `Data: IPH April ${pct(apr.min)} s.d. ${pct(apr.max)} selama ${apr.n} minggu.` },
    { tag: 'Ketersediaan & distribusi', h: 'Cabai rawit', a: 'Kerja sama antardaerah (KAD) dengan sentra cabai di daratan Sulsel, mulai Agustus sebelum harga naik.', d: `Data: bergejolak ${rawitFluk} dari ${nWeeks} minggu; andil hingga ${pct(round2(rawit.v))}.` },
    { tag: 'Komunikasi & pengawasan', h: 'Beras', a: 'Cek stok SPHP/BULOG dan kepatuhan HET di pasar pada minggu pertama setiap bulan.', d: `Data: ${berasWeeks.length} kali bergejolak${berasAllFirstWeek ? ', semuanya di minggu pertama' : ''}.` }
  ];
  const w = (12.1 - 0.4) / 3;
  acts.forEach((ac, i) => {
    const x = 0.6 + i * (w + 0.2);
    card(s, x, 1.95, w, 4.75);
    s.addShape('ellipse', { x: x + 0.3, y: 2.2, w: 0.7, h: 0.7, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    text(s, String(i + 1), { x: x + 0.3, y: 2.2, w: 0.7, h: 0.7, fontSize: 24, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
    text(s, ac.tag.toUpperCase(), { x: x + 1.15, y: 2.32, w: w - 1.3, h: 0.5, fontSize: 12, bold: true, color: ACCENT, valign: 'middle' });
    text(s, ac.h, { x: x + 0.3, y: 3.15, w: w - 0.55, h: 0.45, fontSize: 21, bold: true, color: NAVY });
    text(s, ac.a, { x: x + 0.3, y: 3.7, w: w - 0.55, h: 1.75, fontSize: 17, lineSpacingMultiple: 1.1 });
    s.addShape('line', { x: x + 0.3, y: 5.6, w: w - 0.6, h: 0, line: { color: LINE, width: 1 } });
    text(s, ac.d, { x: x + 0.3, y: 5.75, w: w - 0.55, h: 0.8, fontSize: 14, color: MUTED, italic: true });
  });
}

function slideClosing(pres) {
  const s = pres.addSlide();
  s.background = { color: NAVY };
  if (LOGO_SELAYAR) s.addImage({ data: LOGO_SELAYAR, x: 0.8, y: 0.7, w: 0.95, h: 0.95 });
  if (LOGO_BPS) s.addImage({ data: LOGO_BPS, x: 2.0, y: 0.92, w: 1.6, h: 0.53 });
  if (LOGO_SE) s.addImage({ data: LOGO_SE, x: 11.35, y: 0.6, w: 1.2, h: 1.2 });
  text(s, 'Terima kasih', { x: 0.8, y: 2.6, w: 11, h: 1.0, fontSize: 44, bold: true, color: 'FFFFFF' });
  text(s, 'Pantau IPH mingguan Selayar di dashboard SIPH Sulsel:', { x: 0.8, y: 3.8, w: 11, h: 0.45, fontSize: 20, color: 'D6E2EE' });
  text(s, 'ridsonap.github.io/siph/?kab=7301', {
    x: 0.8, y: 4.3, w: 11, h: 0.5, fontSize: 24, bold: true, color: '7DD3E8',
    hyperlink: { url: 'https://ridsonap.github.io/siph/?kab=7301' }
  });
  text(s, 'BPS Kabupaten Kepulauan Selayar  •  #MencatatEkonomiIndonesia — Sensus Ekonomi 2026', {
    x: 0.8, y: 6.55, w: 11.5, h: 0.35, fontSize: 14, color: 'A9BACB'
  });
}

async function main() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = `Perkembangan Harga Pangan Kab. Kepulauan Selayar ${YEAR}`;
  pres.author = 'BPS Kabupaten Kepulauan Selayar';
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  slideCover(pres);
  slideSummary(pres, 2);
  slideTrend(pres, 3);
  slideDrivers(pres, 4);
  slideVolatile(pres, 5);
  slideActions(pres, 6);
  slideClosing(pres);
  const out = path.resolve('Materi_IPH_2026.pptx');
  await pres.writeFile({ fileName: out });
  console.log(`Deck tersimpan: ${out}`);
  console.log(`Ringkasan data: ${nWeeks} minggu, rata-rata ${pct(avgAll)}, naik ${nUp} / turun ${nDown}, ` +
    `maks ${pct(maxW.iph)} (${maxW.label}), min ${pct(minW.iph)} (${minW.label}), streak turun ${streak.len}, ` +
    `fluktuasi: ${flukRank.map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

main();
