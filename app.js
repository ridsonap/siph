/* SIPH Sulsel — dashboard Indeks Perkembangan Harga (IPH).
 * Semua teks, insight, daftar tahun, periode, wilayah, dan komoditas dibentuk dari data/iph_sulsel.json,
 * sehingga data baru cukup ditambahkan lewat scripts/build_data.py tanpa mengubah kode ini. */
(() => {
  'use strict';

  const MONTH = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const MON3 = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
  const nf = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // ---------- Format ----------
  const sgn = v => v > 0 ? '+' : v < 0 ? '−' : '';
  const fmt = v => (v === null || v === undefined || Number.isNaN(v)) ? '–' : `${sgn(v)}${nf.format(Math.abs(v))}%`;
  const fmtNum = v => `${sgn(v)}${nf.format(Math.abs(v))}`;
  const fmtPt = v => `${sgn(v)}${nf.format(Math.abs(v))} poin`;
  const tone = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
  const shortName = n => n.replace(/^Kab\.\s*/, '').replace(/^Pangkajene Kepulauan$/, 'Pangkep');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const round2 = v => Math.round(v * 100) / 100;
  const $ = id => document.getElementById(id);
  const isNarrow = () => window.matchMedia('(max-width: 560px)').matches;
  const plain = html => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // ---------- Token warna (dibaca dari CSS agar tema terang/gelap konsisten) ----------
  let T = {};
  function readTokens() {
    const s = getComputedStyle(document.documentElement);
    const g = n => s.getPropertyValue(`--${n}`).trim();
    T = {};
    ['surface', 'surface-2', 'ink', 'ink-2', 'muted', 'faint', 'line', 'grid', 'up', 'up-text', 'up-soft', 'down', 'down-text', 'down-soft',
      'mid', 'na', 'na-line', 'accent', 'accent-text', 'on-strong']
      .forEach(k => { T[k.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = g(k); });
    T.div = [1, 2, 3, 4, 5].map(i => g(`div-${i}`));
    T.seq = [0, 1, 2, 3, 4].map(i => g(`seq-${i}`));
  }
  const markColor = v => v >= 0 ? T.up : T.down;
  const textColor = v => v > 0 ? T.upText : v < 0 ? T.downText : T.ink;

  // ---------- Normalisasi nama komoditas ----------
  // Nama yang sering muncul (>= 10 kali) dianggap baku; sisa salah-baca OCR dipetakan ke nama baku terdekat.
  const canonOf = new Map();
  const squash = s => s.toLowerCase().replace(/[^a-z]/g, '');
  function lev(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return d[b.length];
  }
  function buildCanon(raw) {
    const cnt = new Map();
    const add = n => cnt.set(n, (cnt.get(n) || 0) + 1);
    raw.periods.forEach(p => p.records.forEach(r => {
      (r.komoditas || []).forEach(c => add(c.nama));
      if (r.fluktuasi_tertinggi && r.fluktuasi_tertinggi !== '-') add(r.fluktuasi_tertinggi);
    }));
    const base = [...cnt].filter(([, n]) => n >= 10).map(([k]) => [k, squash(k)]);
    const fish = base.find(([c]) => /^ikan kembung/i.test(c));
    cnt.forEach((n, name) => {
      if (n >= 10) { canonOf.set(name, name); return; }
      const s = squash(name);
      let hit = null;
      if (fish && /gembolo|banyar|gembung|asoaso|^aso$|kembung/.test(s)) hit = fish[0];
      if (!hit) {
        let best = null, bd = Infinity;
        base.forEach(([c, cs]) => { const d = lev(s, cs); if (d < bd) { bd = d; best = c; } });
        if (best && bd <= Math.max(2, Math.floor(s.length * 0.25))) hit = best;
      }
      if (!hit && s.length >= 3) {
        const m = base.filter(([, cs]) => cs.endsWith(s) || cs.startsWith(s));
        if (m.length === 1) hit = m[0][0];
      }
      canonOf.set(name, hit); // null = tidak dikenali, diabaikan dalam agregasi
    });
  }
  const canon = n => canonOf.has(n) ? canonOf.get(n) : n;

  // ---------- Model ----------
  let periods = [];          // [{i, key, year, month, week, label, short, recs, avg, ...}]
  let kabs = [];             // [{code, name}]
  const kabName = {};
  const byKab = new Map();   // code -> Map(period_key -> rec)
  let geo = null;
  let meta = {};

  function buildModel(raw) {
    buildCanon(raw);
    meta = raw.meta || {};
    periods = raw.periods
      .map(p => {
        const recs = p.records.filter(r => r.iph !== null && r.iph !== undefined).map(r => ({
          code: r.kode_kab, name: r.nama_kab, iph: r.iph, status: r.status, cv: r.cv,
          komoditas: (r.komoditas || []).map(c => { const k = canon(c.nama); return { nama: k || c.nama, ok: k !== null, kontribusi: c.kontribusi }; }),
          fluk: (r.fluktuasi_tertinggi && r.fluktuasi_tertinggi !== '-') ? canon(r.fluktuasi_tertinggi) : null,
          flukRaw: r.fluktuasi_tertinggi
        }));
        return {
          key: p.period_key, year: p.year, month: p.month, week: p.week,
          label: `${MONTH[p.month]} ${p.year}, minggu ${p.week}`,
          short: `${MON3[p.month]} M${p.week} ’${String(p.year).slice(2)}`,
          recs
        };
      })
      .filter(p => p.recs.length)
      .sort((a, b) => a.key.localeCompare(b.key));

    periods.forEach((p, i) => {
      p.i = i;
      const vals = p.recs.map(r => r.iph);
      p.avg = round2(mean(vals));
      p.min = Math.min(...vals);
      p.max = Math.max(...vals);
      const sorted = [...p.recs].sort((a, b) => b.iph - a.iph);
      sorted.forEach((r, k) => { r.rank = k + 1; r.of = sorted.length; });
      p.hi = sorted[0]; p.lo = sorted[sorted.length - 1];
      p.recs.forEach(r => {
        if (!byKab.has(r.code)) byKab.set(r.code, new Map());
        byKab.get(r.code).set(p.key, r);
        kabName[r.code] = r.name;
      });
    });
    kabs = [...byKab.keys()].map(code => ({ code, name: kabName[code] }))
      .sort((a, b) => shortName(a.name).localeCompare(shortName(b.name)));
  }

  const years = () => [...new Set(periods.map(p => p.year))].sort((a, b) => b - a);
  const recOf = (p, code) => p && byKab.has(code) ? byKab.get(code).get(p.key) : undefined;
  const sortedComms = (r, sign) => r.komoditas
    .filter(c => sign === undefined || Math.sign(c.kontribusi) === sign)
    .sort((a, b) => Math.abs(b.kontribusi) - Math.abs(a.kontribusi));
  const mainDriver = r => (sortedComms(r, Math.sign(r.iph))[0] || {}).nama;
  const countBy = (items, key) => {
    const m = new Map();
    items.forEach(it => { const k = key(it); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };

  /** Berapa minggu berturut-turut (sampai periode i) IPH wilayah searah. */
  function streak(code, i) {
    const r0 = recOf(periods[i], code);
    if (!r0 || !r0.iph) return { n: 0, s: 0 };
    const s = Math.sign(r0.iph);
    let n = 0;
    for (let j = i; j >= 0; j--) {
      const r = recOf(periods[j], code);
      if (!r || Math.sign(r.iph) !== s) break;
      n++;
    }
    return { n, s };
  }

  /** Posisi rata-rata IPH minggu i dibanding minggu ke-sama pada bulan-bulan sebelumnya (0–100).
   *  IPH kumulatif dalam bulan, jadi M1 hanya sebanding dengan M1 (M4 dan M5 digabung); lihat monthly.js. */
  function percentile(i) {
    return IPHMonthly.weekPercentile(periods.map(p => ({ week: p.week, v: p.avg })), i);
  }
  const peerWeeks = w => IPHMonthly.weekClass(w) >= 4 ? 'minggu ke-4/5' : `minggu ke-${w}`;
  function statusOf(pct) {
    if (pct === null) return { label: 'Belum cukup riwayat', cls: '' };
    if (pct >= 90) return { label: 'Tekanan harga sangat tinggi', cls: 'up' };
    if (pct >= 70) return { label: 'Tekanan harga tinggi', cls: 'up' };
    if (pct > 30) return { label: 'Tekanan harga normal', cls: '' };
    if (pct > 10) return { label: 'Tekanan harga rendah', cls: 'down' };
    return { label: 'Tekanan harga sangat rendah', cls: 'down' };
  }
  function sameWeekLastYear(p) {
    return periods.find(q => q.year === p.year - 1 && q.month === p.month && q.week === p.week) ||
      periods.filter(q => q.year === p.year - 1 && q.month === p.month).pop();
  }

  // ---------- State & URL ----------
  const state = {
    view: 'sulsel', pIdx: 0, kab: null, year: null, compare: '', search: '',
    sort: { key: 'iph', dir: 'desc' }, showAll: false, range: 52, zoom: null,
    kom: null, komYear: null
  };

  function readUrl() {
    const q = new URLSearchParams(location.search);
    const kab = q.get('kab'), per = q.get('periode'), th = q.get('tahun'), tab = q.get('tab'), kom = q.get('kom');
    state.pIdx = periods.length - 1;
    if (per) { const i = periods.findIndex(p => p.key === per); if (i >= 0) state.pIdx = i; }
    const yr = th === 'semua' ? 'semua' : (th && years().includes(+th) ? +th : years()[0]);
    if (kab && byKab.has(kab)) { state.view = 'kab'; state.kab = kab; state.year = yr; }
    else state.year = years()[0];
    if (tab === 'komoditas') { state.view = 'kom'; state.komYear = yr; state.kom = kom; }
  }

  function writeUrl() {
    const q = new URLSearchParams();
    if (state.view === 'kab') { q.set('kab', state.kab); q.set('tahun', state.year); }
    else if (state.view === 'kom') { q.set('tab', 'komoditas'); q.set('tahun', state.komYear); if (state.kom) q.set('kom', state.kom); }
    else if (state.pIdx !== periods.length - 1) q.set('periode', periods[state.pIdx].key);
    const s = q.toString();
    history.replaceState(null, '', s ? `?${s}` : location.pathname);
  }

  // ---------- Grafik ----------
  const charts = {};
  function chart(id, setup) {
    if (!charts[id]) {
      charts[id] = echarts.init($(id), null, { renderer: 'canvas' });
      if (setup) setup(charts[id]);
    }
    return charts[id];
  }
  const base = () => ({ textStyle: { fontFamily: FONT, color: T.muted, fontSize: 12 }, animationDuration: 500, animationDurationUpdate: 350 });
  const tip = extra => ({
    backgroundColor: T.surface, borderColor: T.line, borderWidth: 1, padding: [10, 12], confine: true,
    textStyle: { color: T.ink, fontSize: 13, fontFamily: FONT },
    extraCssText: 'box-shadow:0 10px 28px rgba(0,0,0,.14);border-radius:12px;', ...extra
  });
  const tipHead = t => `<div style="font-weight:700;margin-bottom:6px">${esc(t)}</div>`;
  const tipRow = (label, val, color) => `<div style="display:flex;justify-content:space-between;gap:18px;align-items:center;line-height:1.7">` +
    `<span style="color:${T.muted}">${color ? `<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color};margin-right:6px"></i>` : ''}${esc(label)}</span><b>${val}</b></div>`;
  const tipVal = v => `<span style="color:${textColor(v)}">${fmt(v)}</span>`;
  const tipComms = r => {
    const cs = sortedComms(r).slice(0, 3);
    return cs.length ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid ${T.line};color:${T.muted};font-size:12px">Andil utama</div>` +
      cs.map(c => tipRow(c.nama, `<span style="color:${textColor(c.kontribusi)}">${fmtNum(c.kontribusi)}</span>`)).join('') : '';
  };
  const axisPct = v => `${v > 0 ? '+' : ''}${v}%`;
  const valueAxis = extra => ({
    type: 'value', axisLabel: { formatter: axisPct, color: T.muted }, splitLine: { lineStyle: { color: T.grid } },
    axisLine: { show: false }, axisTick: { show: false }, ...extra
  });
  const divergingMap = lim => ({ show: false, min: -lim, max: lim, inRange: { color: T.div }, calculable: false, seriesIndex: 0 });
  const cellLabelColor = (v, lim) => Math.abs(v) / lim > 0.55 ? T.onStrong : T.ink;

  // ---------- Ikon ----------
  const ICON = {
    spread: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    tag: '<svg viewBox="0 0 24 24"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    trend: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg>'
  };

  // ---------- Komponen HTML ----------
  function barList(el, rows, opts = {}) {
    if (!rows.length) { el.innerHTML = `<p class="empty">${opts.empty || 'Tidak ada data.'}</p>`; return; }
    const max = Math.max(...rows.map(r => Math.abs(r.value))) || 1;
    el.innerHTML = rows.map(r => `
      <div class="bar-row" ${r.attr || ''} title="${esc(r.title || r.name)}">
        <span class="bar-name">${esc(r.name)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
        <span class="bar-track">
          <span class="bar-fill ${r.cls || ''}" style="width:${Math.max(2, Math.abs(r.value) / max * (opts.scale || 55))}%"></span>
          <span class="bar-val">${esc(r.text)}</span>${r.note ? `<span class="bar-note">${esc(r.note)}</span>` : ''}
        </span>
      </div>`).join('');
  }

  const split = (up, down, total) => `<div class="split" aria-hidden="true"><i class="up" style="width:${up / total * 100}%"></i>` +
    `${total - up - down > 0 ? `<i class="flat" style="width:${(total - up - down) / total * 100}%"></i>` : ''}<i class="down" style="width:${down / total * 100}%"></i></div>`;

  function sparkSvg(vals) {
    const w = vals.length * 8, h = 24, mid = h / 2;
    const m = Math.max(0.01, ...vals.filter(v => v !== null).map(Math.abs));
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">` +
      `<line x1="0" x2="${w}" y1="${mid}" y2="${mid}" stroke="var(--line)"/>` +
      vals.map((v, k) => {
        if (v === null) return '';
        const bh = Math.max(1.5, Math.abs(v) / m * (mid - 1));
        return `<rect x="${k * 8 + 1}" y="${v >= 0 ? mid - bh : mid}" width="6" height="${bh}" rx="1.5" fill="var(--${v >= 0 ? 'up' : 'down'})" opacity="${k === vals.length - 1 ? 1 : 0.5}"/>`;
      }).join('') + '</svg>';
  }

  const commChips = r => `<span class="chips">${sortedComms(r).slice(0, 3).map(c => `<span><b>${esc(c.nama)}</b> ${fmtNum(c.kontribusi)}</span>`).join('') || '–'}</span>`;
  const flukTag = r => r.fluk ? `<span class="tag">${esc(r.fluk)}</span>` : (r.flukRaw && r.flukRaw !== '-' ? `<span class="tag">${esc(r.flukRaw)}</span>` : '–');

  // =====================================================================
  // RINGKASAN SULAWESI SELATAN
  // =====================================================================
  function weekFacts(i) {
    const p = periods[i], prev = periods[i - 1];
    const recs = [...p.recs].sort((a, b) => b.iph - a.iph);
    const n = recs.length;
    const nUp = recs.filter(r => r.iph > 0).length;
    const nDown = recs.filter(r => r.iph < 0).length;
    const majorityUp = nUp >= nDown;
    const sign = majorityUp ? 1 : -1;
    const tally = new Map();
    recs.forEach(r => sortedComms(r, sign).forEach(c => {
      if (!c.ok) return;
      const t = tally.get(c.nama) || { name: c.nama, n: 0, sum: 0 };
      t.n++; t.sum += c.kontribusi; tally.set(c.nama, t);
    }));
    const drivers = [...tally.values()].sort((a, b) => b.n - a.n || Math.abs(b.sum) - Math.abs(a.sum));
    const ext = majorityUp ? recs[0] : recs[n - 1];
    const pct = percentile(i);
    return { p, prev, recs, n, nUp, nDown, majorityUp, sign, drivers, ext, pct, status: statusOf(pct) };
  }

  function sulselNarrative(f) {
    const { p, n, nUp, nDown, majorityUp, ext, drivers } = f;
    const drv = mainDriver(ext);
    const dir = majorityUp ? 'naik' : 'turun';
    const s1 = `Harga pangan ${dir} di <strong>${majorityUp ? nUp : nDown} dari ${n}</strong> kab/kota yang dirilis.`;
    const s2 = ` ${majorityUp ? 'Kenaikan tertinggi' : 'Penurunan terdalam'} terjadi di <strong>${esc(ext.name)}</strong> (<strong class="${tone(ext.iph)}">${fmt(ext.iph)}</strong>)${drv ? `, terutama karena ${esc(drv.toLowerCase())}` : ''}.`;
    const s3 = drivers[0] ? ` Komoditas yang paling banyak mendorong ${majorityUp ? 'kenaikan' : 'penurunan'}: <strong>${esc(drivers[0].name)}</strong> (${drivers[0].n} kab/kota).` : '';
    return { html: s1 + s2 + s3, title: p.label };
  }

  function renderSulsel() {
    const i = state.pIdx;
    const f = weekFacts(i);
    const { p, prev, recs, n, nUp, nDown, majorityUp, pct, status } = f;
    const last = i === periods.length - 1;

    $('periodSelect').value = p.key;
    $('prevPeriod').disabled = i === 0;
    $('nextPeriod').disabled = last;
    $('latestBadge').hidden = !last;
    $('latestBtn').hidden = last;

    // Hero
    $('sAvg').textContent = fmt(p.avg);
    $('sAvg').className = `hero-value ${tone(p.avg)}`;
    if (prev) {
      const d = round2(p.avg - prev.avg);
      $('sDelta').className = `delta ${tone(d)}`;
      // Minggu ke-1 dibanding bulan baru, minggu sebelumnya dibanding bulan lama: selisihnya bukan perubahan harga mingguan
      const newBase = prev.month !== p.month || prev.year !== p.year;
      $('sDelta').innerHTML = `${d > 0 ? '▲' : d < 0 ? '▼' : '■'} ${fmtPt(d)} <small>vs minggu lalu${newBase ? ' · basis bulan berganti' : ''}</small>`;
    } else { $('sDelta').className = 'delta'; $('sDelta').textContent = 'Rilis pertama'; }
    $('sHeadline').innerHTML = sulselNarrative(f).html;

    $('sGauge').hidden = pct === null;
    if (pct !== null) {
      const first = periods[0];
      $('sStatus').className = `pill ${status.cls}`;
      $('sStatus').textContent = status.label;
      $('sGaugeNote').textContent = pct >= 50
        ? `lebih tinggi dari ${Math.round(pct)}% ${peerWeeks(p.week)} sejak ${MON3[first.month]} ${first.year}`
        : `lebih rendah dari ${Math.round(100 - pct)}% ${peerWeeks(p.week)} sejak ${MON3[first.month]} ${first.year}`;
      $('sGaugeMarker').style.left = `${Math.min(98, Math.max(2, pct))}%`;
    }

    renderSpark(i);
    renderInsights(f);
    renderMap(p);
    renderRank(recs, p);
    renderWeekHeat(i);
    renderTrend();
    renderDrivers(f);
    renderSeason('seasonChart', periods.map(q => ({ year: q.year, month: q.month, week: q.week, v: q.avg })), p);
    renderWeekTable();
    writeUrl();
  }

  function setPeriod(i) {
    if (i < 0 || i >= periods.length || i === state.pIdx) return;
    state.pIdx = i;
    // Tutup tooltip dan gambar ulang setelah event klik grafik selesai, agar ECharts tidak memakai tooltip yang sudah dibuang.
    Object.values(charts).forEach(c => c.dispatchAction({ type: 'hideTip' }));
    setTimeout(renderSulsel, 0);
  }

  function renderSpark(i) {
    const win = periods.slice(Math.max(0, i - 11), i + 1);
    const off = Math.max(0, i - 11);
    const c = chart('sparkChart', ch => ch.on('click', d => setPeriod(d.dataIndex + ch.__off)));
    c.__off = off;
    c.setOption({
      ...base(),
      grid: { left: 4, right: 24, top: 26, bottom: 4, containLabel: true },
      tooltip: tip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: T.grid } }, formatter: it => {
        const q = win[it[0].dataIndex];
        return tipHead(q.label) + tipRow('Rata-rata Sulsel', tipVal(q.avg)) + tipRow('Naik / turun', `${q.recs.filter(r => r.iph > 0).length} / ${q.recs.filter(r => r.iph < 0).length}`);
      } }),
      xAxis: { type: 'category', data: win.map(q => `${MON3[q.month]}\nM${q.week}`), axisLine: { lineStyle: { color: T.line } }, axisTick: { show: false },
        axisLabel: { color: T.faint, fontSize: 10.5, lineHeight: 13, interval: isNarrow() ? 1 : 0 } },
      yAxis: { type: 'value', show: false },
      series: [{
        type: 'bar', barMaxWidth: 22, cursor: 'pointer',
        data: win.map((q, k) => ({
          value: q.avg,
          itemStyle: { color: markColor(q.avg), opacity: k === win.length - 1 ? 1 : 0.38, borderRadius: q.avg >= 0 ? [4, 4, 0, 0] : [0, 0, 4, 4] },
          label: k === win.length - 1 ? { show: true, position: q.avg >= 0 ? 'top' : 'bottom', formatter: () => fmt(q.avg), color: T.ink, fontWeight: 700, fontSize: 12 } : { show: false }
        })),
        emphasis: { itemStyle: { opacity: 1 } }
      }]
    }, true);
  }

  function insightCard({ icon, iconTone = '', title, value, valueTone = '', body, extra = '', attrs = '' }) {
    return `<article class="insight" ${attrs}>
      <div class="insight-top"><span class="insight-icon ${iconTone}">${ICON[icon]}</span>${esc(title)}</div>
      <div class="insight-value ${valueTone}">${value}</div>${extra}<p>${body}</p></article>`;
  }

  function renderInsights(f) {
    const { p, prev, n, nUp, nDown, majorityUp, drivers } = f;
    const cards = [];
    // 1. Sebaran
    const share = (majorityUp ? nUp : nDown) / n;
    const dirWord = majorityUp ? 'kenaikan' : 'penurunan';
    const breadth = share >= 0.9 ? `${dirWord[0].toUpperCase() + dirWord.slice(1)} hampir merata di seluruh wilayah.`
      : share >= 0.65 ? `Sebagian besar wilayah mengalami ${dirWord}.` : 'Arah harga bercampur antarwilayah.';
    const prevUp = prev ? prev.recs.filter(r => r.iph > 0).length : null;
    cards.push(insightCard({
      icon: 'spread', iconTone: majorityUp ? 'up' : 'down', title: 'Sebaran',
      value: `${nUp} naik · ${nDown} turun`,
      extra: split(nUp, nDown, n),
      body: `${breadth}${prev ? ` Minggu lalu ${prevUp} dari ${prev.recs.length} naik.` : ''}`
    }));
    // 2. Pendorong utama
    const d0 = drivers[0];
    cards.push(d0 ? insightCard({
      icon: 'tag', iconTone: majorityUp ? 'up' : 'down', title: 'Pendorong utama', value: esc(d0.name),
      body: `Penyumbang ${dirWord} di <strong>${d0.n} dari ${n}</strong> kab/kota, andil rata-rata ${fmtNum(d0.sum / d0.n)} poin.`,
      attrs: `data-kom="${esc(d0.name)}" role="button" tabindex="0" title="Lihat analisis komoditas"`
    }) : insightCard({ icon: 'tag', title: 'Pendorong utama', value: '–', body: 'Tidak ada data andil.' }));
    // 3. Perlu perhatian: kenaikan beruntun terpanjang
    const streaks = p.recs.map(r => ({ r, ...streak(r.code, p.i) })).filter(x => x.s > 0).sort((a, b) => b.n - a.n || b.r.iph - a.r.iph);
    const s0 = streaks[0];
    if (s0 && s0.n >= 2) {
      const others = streaks.filter(x => x.n >= 3).length - (s0.n >= 3 ? 1 : 0);
      cards.push(insightCard({
        icon: 'alert', iconTone: 'up', title: 'Perlu perhatian', value: esc(shortName(s0.r.name)),
        body: `IPH naik <strong>${s0.n} minggu berturut-turut</strong>, minggu ini ${fmt(s0.r.iph)}.${others > 0 ? ` ${others} wilayah lain juga naik ≥3 minggu.` : ''}`,
        attrs: `data-kab="${s0.r.code}" role="button" tabindex="0" title="Buka profil wilayah"`
      }));
    } else {
      const top = p.hi;
      cards.push(insightCard({
        icon: 'alert', iconTone: tone(top.iph), title: 'Tertinggi minggu ini', value: esc(shortName(top.name)),
        body: `IPH ${fmt(top.iph)}. Tidak ada wilayah yang naik dua minggu berturut-turut.`,
        attrs: `data-kab="${top.code}" role="button" tabindex="0"`
      }));
    }
    // 4. Dibanding tahun lalu
    const ly = sameWeekLastYear(p);
    if (ly) {
      const d = round2(p.avg - ly.avg);
      cards.push(insightCard({
        icon: 'cal', iconTone: tone(d), title: 'Dibanding tahun lalu', value: fmtPt(d), valueTone: tone(d),
        body: `${ly.label} rata-ratanya ${fmt(ly.avg)}. Tekanan harga tahun ini <strong>${d > 0 ? 'lebih tinggi' : d < 0 ? 'lebih rendah' : 'sama'}</strong>.`
      }));
    } else {
      // IPH kumulatif dalam bulan, jadi ringkasan tahunan memakai IPH akhir tiap bulan, bukan rata-rata mingguan
      const ms = IPHMonthly.monthlyIph(periods.filter(q => q.year === p.year && q.i <= p.i)
        .map(q => ({ year: q.year, month: q.month, week: q.week, v: q.avg })));
      const up = ms.filter(m => m.v > 0).length;
      const t = tone(up - (ms.length - up));
      cards.push(insightCard({
        icon: 'cal', iconTone: t, title: `Sepanjang ${p.year}`, value: `${up} dari ${ms.length} bulan naik`, valueTone: t,
        body: `Berdasarkan IPH akhir tiap bulan dibanding bulan sebelumnya${ms.at(-1).partial ? `; ${MONTH[ms.at(-1).month]} baru sampai minggu ke-${ms.at(-1).week}` : ''}.`
      }));
    }
    $('sInsights').innerHTML = cards.join('');
  }

  function renderMap(p) {
    if (!geo) { $('mapChart').innerHTML = '<p class="empty">Peta tidak tersedia.</p>'; return; }
    const byName = new Map(p.recs.map(r => [r.name, r]));
    const decal = { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [1.5, 3.5], rotation: Math.PI / 4, color: T.naLine };
    const data = geo.features.map(f => {
      const r = byName.get(f.properties.name);
      return r ? { name: f.properties.name, value: r.iph, rec: r }
        : { name: f.properties.name, value: '-', itemStyle: { areaColor: T.na, decal } };
    });
    const lim = Math.max(2, Math.ceil(Math.max(...p.recs.map(r => Math.abs(r.iph)))));
    $('mapMin').textContent = `−${lim}%`; $('mapMax').textContent = `+${lim}%`;
    const c = chart('mapChart', ch => {
      ch.on('click', d => { if (d.data && d.data.rec) openKab(d.data.rec.code); });
      ch.on('mouseover', d => { const k = (state.rankAsc || []).findIndex(r => r.name === d.name); if (k >= 0 && charts.rankChart) charts.rankChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: k }); });
      ch.on('mouseout', () => charts.rankChart && charts.rankChart.dispatchAction({ type: 'downplay', seriesIndex: 0 }));
    });
    c.setOption({
      ...base(),
      tooltip: tip({
        formatter: d => {
          const r = d.data && d.data.rec;
          if (!r) return tipHead(d.name) + `<span style="color:${T.muted}">Tidak ada rilis IPH minggu ini</span>`;
          return tipHead(r.name) + tipRow('IPH', tipVal(r.iph)) + tipRow('Peringkat', `${r.rank} dari ${r.of}`) + tipComms(r);
        }
      }),
      visualMap: divergingMap(lim),
      series: [{
        type: 'map', map: 'sulsel', roam: false, layoutCenter: ['50%', '50%'], layoutSize: '100%', selectedMode: false, data,
        itemStyle: { borderColor: T.surface, borderWidth: 1, areaColor: T.na },
        label: { show: false },
        emphasis: { label: { show: true, color: T.ink, fontSize: 12, fontWeight: 700, fontFamily: FONT, formatter: d => shortName(d.name), textBorderColor: T.surface, textBorderWidth: 3 },
          itemStyle: { areaColor: undefined, borderColor: T.ink, borderWidth: 1.5 } }
      }]
    }, true);
  }

  function renderRank(recs, p) {
    const asc = [...recs].reverse();
    state.rankAsc = asc;
    const el = $('rankChart');
    el.style.height = `${Math.max(320, asc.length * 27 + 30)}px`;
    const c = chart('rankChart', ch => {
      ch.on('click', d => { const r = state.rankAsc[d.dataIndex]; if (r) openKab(r.code); });
      ch.on('mouseover', d => { const r = state.rankAsc[d.dataIndex]; if (r && charts.mapChart) charts.mapChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: r.name }); });
      ch.on('mouseout', () => charts.mapChart && charts.mapChart.dispatchAction({ type: 'downplay', seriesIndex: 0 }));
    });
    c.resize();
    c.setOption({
      ...base(),
      grid: { left: 16, right: 58, top: 16, bottom: 4, containLabel: true },
      tooltip: tip({ trigger: 'item', formatter: d => { const r = asc[d.dataIndex]; return tipHead(r.name) + tipRow('IPH', tipVal(r.iph)) + tipRow('vs rata-rata Sulsel', fmtPt(round2(r.iph - p.avg))) + tipComms(r); } }),
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', data: asc.map(r => shortName(r.name)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.ink, fontSize: 13, fontWeight: 500 } },
      series: [{
        type: 'bar', barWidth: 14, cursor: 'pointer',
        data: asc.map(r => ({
          value: r.iph,
          itemStyle: { color: markColor(r.iph), borderRadius: r.iph >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] },
          label: { show: true, position: r.iph >= 0 ? 'right' : 'left', formatter: () => fmt(r.iph), color: T.ink, fontWeight: 600, fontSize: 12 }
        })),
        emphasis: { itemStyle: { opacity: 0.8 } },
        markLine: {
          silent: true, symbol: 'none',
          data: [
            { xAxis: 0, lineStyle: { color: T.naLine, type: 'solid', width: 1 }, label: { show: false } },
            { xAxis: p.avg, lineStyle: { color: T.ink2, type: [4, 4], width: 1.2 }, label: { show: true, position: 'start', formatter: `Sulsel ${fmt(p.avg)}`, color: T.muted, fontSize: 11, distance: 4 } }
          ]
        }
      }]
    }, true);
  }

  function renderWeekHeat(i) {
    const W = isNarrow() ? 8 : 12;
    const win = periods.slice(Math.max(0, i - W + 1), i + 1);
    const codes = [...new Set(win.flatMap(q => q.recs.map(r => r.code)))];
    const rows = codes.map(code => {
      const vals = win.map(q => { const r = recOf(q, code); return r ? r.iph : null; });
      // Urutan: rata-rata IPH akhir bulan dalam rentang, tiap bulan dihitung sekali
      const avg = IPHMonthly.meanMonthly(win.flatMap((q, k) => vals[k] === null ? [] : [{ year: q.year, month: q.month, week: q.week, v: vals[k] }]));
      return { code, name: shortName(kabName[code]), vals, avg };
    }).sort((a, b) => a.avg - b.avg); // terbawah = rata-rata terendah, teratas = tertinggi
    const all = rows.flatMap(r => r.vals.filter(v => v !== null));
    const lim = Math.max(2, Math.ceil(Math.max(...all.map(Math.abs)) * 0.8));
    const el = $('heatChart');
    el.style.height = `${rows.length * 28 + 56}px`;
    $('heatNote').textContent = `IPH tiap wilayah, ${win.length} minggu terakhir sampai ${periods[i].label}. Wilayah diurutkan dari rata-rata IPH akhir bulan tertinggi (tiap bulan dihitung sekali). Klik kotak untuk memilih minggu.`;
    const c = chart('heatChart', ch => {
      ch.on('click', d => {
        if (d.componentType === 'yAxis') { const r = state.heatRows.find(x => x.name === d.value); if (r) openKab(r.code); return; }
        if (d.data) setPeriod(state.heatWin[d.data.value[0]].i);
      });
    });
    state.heatRows = rows; state.heatWin = win;
    c.resize();
    const data = [];
    rows.forEach((r, y) => r.vals.forEach((v, x) => { if (v !== null) data.push({ value: [x, y, v] }); }));
    c.setOption({
      ...base(),
      grid: { left: 12, right: 8, top: 8, bottom: 6, containLabel: true },
      tooltip: tip({ formatter: d => { const q = win[d.value[0]]; const r = recOf(q, rows[d.value[1]].code); return tipHead(`${r.name}`) + `<div style="color:${T.muted};margin:-4px 0 4px">${esc(q.label)}</div>` + tipRow('IPH', tipVal(r.iph)) + tipComms(r); } }),
      xAxis: {
        type: 'category', data: win.map(q => `${MON3[q.month]}\nM${q.week}`), position: 'bottom', axisLine: { show: false }, axisTick: { show: false }, splitArea: { show: false },
        axisLabel: { color: T.muted, fontSize: 11, lineHeight: 14, interval: 0, formatter: (v, k) => k === win.length - 1 ? `{cur|${v.replace('\n', '}\n{cur|')}}` : v, rich: { cur: { color: T.ink, fontWeight: 800, fontSize: 11 } } }
      },
      yAxis: { type: 'category', data: rows.map(r => r.name), axisLine: { show: false }, axisTick: { show: false }, triggerEvent: true, axisLabel: { color: T.ink, fontSize: 12.5, fontWeight: 500 } },
      visualMap: divergingMap(lim),
      series: [{
        type: 'heatmap', data, cursor: 'pointer',
        itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 2 } }
      }]
    }, true);
  }

  function trendWindow() {
    const n = periods.length, i = state.pIdx;
    if (state.zoom && i >= state.zoom[0] && i <= state.zoom[1]) return state.zoom;
    const len = state.range === 'all' ? n : state.range;
    let end = n - 1, start = Math.max(0, end - len + 1);
    if (i < start) { start = Math.max(0, i - Math.floor(len / 2)); end = Math.min(n - 1, start + len - 1); }
    return [start, end];
  }

  function renderTrend() {
    const c = chart('trendChart', ch => {
      ch.getZr().on('click', e => {
        const pt = [e.offsetX, e.offsetY];
        if (!ch.containPixel('grid', pt)) return;
        const x = ch.convertFromPixel({ seriesIndex: 2 }, pt)[0];
        setPeriod(Math.round(x));
      });
      ch.on('datazoom', () => {
        const dz = ch.getOption().dataZoom[0];
        state.zoom = [dz.startValue, dz.endValue];
      });
    });
    const cur = periods[state.pIdx];
    const [start, end] = trendWindow();
    const cmpName = state.compare ? shortName(kabName[state.compare]) : null;
    const series = [
      { name: '_lo', type: 'line', data: periods.map(p => p.min), stack: 'band', stackStrategy: 'all', symbol: 'none', lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
      { name: 'Rentang antarwilayah', type: 'line', data: periods.map(p => round2(p.max - p.min)), stack: 'band', stackStrategy: 'all', symbol: 'none', lineStyle: { opacity: 0 },
        areaStyle: { color: T.ink, opacity: 0.07 }, itemStyle: { color: T.naLine }, silent: true },
      {
        name: 'Rata-rata Sulsel', type: 'line', data: periods.map(p => p.avg), symbol: 'circle', symbolSize: 7, showSymbol: false,
        lineStyle: { width: 2.4, color: T.ink }, itemStyle: { color: T.ink, borderColor: T.surface, borderWidth: 2 }, z: 5,
        markLine: {
          silent: true, symbol: 'none', animation: false,
          data: [
            { yAxis: 0, lineStyle: { color: T.naLine, type: 'solid', width: 1 }, label: { show: false } },
            { xAxis: cur.i, lineStyle: { color: T.accent, type: 'solid', width: 1.5 }, label: { show: true, formatter: cur.short, color: T.accentText, fontWeight: 700, fontSize: 11, position: 'insideEndTop' } }
          ]
        },
        markPoint: { symbol: 'circle', symbolSize: 10, silent: true, itemStyle: { color: T.accent, borderColor: T.surface, borderWidth: 2 }, label: { show: false }, data: [{ coord: [cur.i, cur.avg] }] }
      }
    ];
    if (cmpName) {
      series.push({
        name: cmpName, type: 'line', connectNulls: false, symbol: 'circle', symbolSize: 6, showSymbol: false, z: 4,
        data: periods.map(p => { const r = recOf(p, state.compare); return r ? r.iph : null; }),
        lineStyle: { width: 2, color: T.accent }, itemStyle: { color: T.accent, borderColor: T.surface, borderWidth: 2 }
      });
    }
    c.setOption({
      ...base(),
      legend: {
        top: 0, left: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 4, itemGap: 16, textStyle: { color: T.ink2, fontSize: 12 },
        data: [{ name: 'Rata-rata Sulsel' }, { name: 'Rentang antarwilayah', itemStyle: { color: T.naLine } }, ...(cmpName ? [{ name: cmpName }] : [])], selectedMode: false
      },
      grid: { left: 4, right: 12, top: 34, bottom: 52, containLabel: true },
      tooltip: tip({
        trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: T.naLine } },
        formatter: it => {
          const p = periods[it[0].dataIndex];
          let h = tipHead(p.label) + tipRow('Rata-rata Sulsel', tipVal(p.avg), T.ink) +
            tipRow(`Tertinggi · ${shortName(p.hi.name)}`, tipVal(p.hi.iph)) + tipRow(`Terendah · ${shortName(p.lo.name)}`, tipVal(p.lo.iph));
          if (cmpName) { const r = recOf(p, state.compare); h += tipRow(cmpName, r ? tipVal(r.iph) : '–', T.accent); }
          return h + `<div style="color:${T.faint};font-size:11.5px;margin-top:4px">Klik untuk memilih minggu ini</div>`;
        }
      }),
      xAxis: { type: 'category', data: periods.map(p => p.short), boundaryGap: false, axisLine: { lineStyle: { color: T.line } }, axisTick: { show: false }, axisLabel: { color: T.muted, hideOverlap: true } },
      yAxis: valueAxis(),
      dataZoom: [
        { type: 'slider', startValue: start, endValue: end, height: 24, bottom: 6, borderColor: T.line, backgroundColor: 'transparent', fillerColor: 'rgba(91,75,219,.10)',
          dataBackground: { lineStyle: { color: T.naLine }, areaStyle: { color: T.grid } }, selectedDataBackground: { lineStyle: { color: T.accent }, areaStyle: { color: 'rgba(91,75,219,.12)' } },
          handleStyle: { color: T.surface, borderColor: T.faint }, moveHandleStyle: { color: T.naLine }, textStyle: { color: T.muted }, showDetail: false, brushSelect: false },
        { type: 'inside', startValue: start, endValue: end, zoomOnMouseWheel: 'ctrl' }
      ],
      series
    }, true);
    document.querySelectorAll('#rangeSeg button').forEach(b => b.classList.toggle('on', !state.zoom && String(state.range) === b.dataset.range));
  }

  function renderDrivers(f) {
    const { n, majorityUp, drivers } = f;
    $('driverTitle').textContent = majorityUp ? 'Penyumbang kenaikan minggu ini' : 'Penyumbang penurunan minggu ini';
    $('driverNote').textContent = `Berapa kab/kota yang menyebut komoditas ini sebagai penyumbang ${majorityUp ? 'kenaikan' : 'penurunan'}, dan rata-rata andilnya. Klik untuk analisis komoditas.`;
    barList($('weekDrivers'), drivers.slice(0, 7).map(d => ({
      name: d.name, value: d.n, text: `${d.n} dari ${n}`, note: `andil ${fmtNum(d.sum / d.n)}`, cls: majorityUp ? 'up' : 'down',
      attr: `data-kom="${esc(d.name)}" role="button" tabindex="0"`
    })), { empty: 'Tidak ada data andil.' });
  }

  /** Heatmap tahun × bulan dari deret mingguan {year, month, week, v}; menyorot bulan periode terpilih bila diberikan.
   *  Nilai tiap bulan = IPH minggu terakhir yang tersedia (IPH kumulatif dalam bulan, lihat monthly.js). */
  function renderSeason(id, entries, curP) {
    const cells = IPHMonthly.monthlyIph(entries);
    const ys = [...new Set(cells.map(a => a.year))].sort((a, b) => a - b);
    const lim = Math.max(1, Math.ceil(Math.max(...cells.map(a => Math.abs(a.v)))));
    const narrow = isNarrow();
    const el = $(id);
    el.style.height = `${ys.length * (narrow ? 34 : 42) + 40}px`;
    const c = chart(id);
    c.resize();
    c.setOption({
      ...base(),
      grid: { left: 4, right: 4, top: 4, bottom: 4, containLabel: true },
      tooltip: tip({ formatter: d => { const a = cells.find(x => x.year === ys[d.value[1]] && x.month === d.value[0] + 1); return tipHead(`${MONTH[a.month]} ${a.year}`) + tipRow('IPH akhir bulan', tipVal(a.v)) + tipRow('Dari minggu', `M${a.week}${a.partial ? ' (data parsial)' : ''}`); } }),
      xAxis: { type: 'category', data: MON3.slice(1), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.muted, fontSize: narrow ? 10 : 11.5, interval: 0 } },
      yAxis: { type: 'category', data: ys.map(String), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.ink, fontWeight: 600 } },
      visualMap: divergingMap(lim),
      series: [{
        type: 'heatmap',
        data: cells.map(a => {
          const isCur = curP && a.year === curP.year && a.month === curP.month;
          return {
            value: [a.month - 1, ys.indexOf(a.year), a.v],
            label: { show: !narrow, formatter: () => { const v1 = Math.round(a.v * 10) / 10; return `${sgn(v1)}${nf1.format(Math.abs(v1))}${a.partial ? '*' : ''}`; }, color: cellLabelColor(a.v, lim), fontSize: 11, fontWeight: 600 },
            itemStyle: isCur ? { borderColor: T.ink, borderWidth: 2 } : undefined
          };
        }),
        itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 2 } }
      }]
    }, true);

    // Kesimpulan: bulan dengan kenaikan paling konsisten antartahun (bulan berdata parsial tidak ikut dihitung)
    const note = $(`${id}Note`);
    if (note) {
      const byM = MON3.slice(1).map((_, k) => {
        const cs = cells.filter(a => a.month === k + 1 && !a.partial);
        return { m: k + 1, n: cs.length, up: cs.filter(a => a.v > 0).length, avg: cs.length ? mean(cs.map(a => a.v)) : 0 };
      }).filter(x => x.n >= 2);
      const hot = [...byM].sort((a, b) => b.up / b.n - a.up / a.n || b.avg - a.avg).slice(0, 2).filter(x => x.up / x.n >= 0.6);
      const cool = [...byM].sort((a, b) => a.avg - b.avg)[0];
      const nPartial = cells.filter(a => a.partial).length;
      note.innerHTML = (hot.length
        ? `<strong>Bulan rawan:</strong> ${hot.map(x => `${MONTH[x.m]} (naik ${x.up} dari ${x.n} tahun, rata-rata antartahun ${fmt(round2(x.avg))})`).join(' dan ')}.` +
          (cool && cool.avg < 0 ? ` Harga paling sering mereda pada ${MONTH[cool.m]}.` : '')
        : 'Belum ada bulan yang konsisten naik setiap tahun.') +
        (nPartial ? ' * Data belum sampai minggu ke-4; tidak ikut dihitung.' : '');
    }
  }

  function weekRows() {
    const p = periods[state.pIdx], prev = periods[state.pIdx - 1];
    return p.recs.map(r => {
      const pr = recOf(prev, r.code);
      const hist = [];
      for (let j = Math.max(0, state.pIdx - 7); j <= state.pIdx; j++) { const x = recOf(periods[j], r.code); hist.push(x ? x.iph : null); }
      while (hist.length < 8) hist.unshift(null);
      return { r, delta: pr ? round2(r.iph - pr.iph) : null, hist };
    });
  }

  function renderWeekTable() {
    const q = state.search.trim().toLowerCase();
    const all = weekRows();
    const { key, dir } = state.sort;
    const val = x => key === 'name' ? shortName(x.r.name) : key === 'delta' ? (x.delta ?? -Infinity) : x.r.iph;
    const rows = all.filter(({ r }) => !q || r.name.toLowerCase().includes(q) ||
      r.komoditas.some(c => c.nama.toLowerCase().includes(q)) || (r.fluk || '').toLowerCase().includes(q))
      .sort((a, b) => { const A = val(a), B = val(b); const c = typeof A === 'string' ? A.localeCompare(B) : A - B; return dir === 'asc' ? c : -c; });
    document.querySelectorAll('#weekTableEl .th-sort').forEach(b => { if (b.dataset.sort === key) b.dataset.dir = dir; else delete b.dataset.dir; });
    $('weekTable').innerHTML = rows.length ? rows.map(({ r, delta, hist }) => `
      <tr class="clickable" data-kab="${r.code}" tabindex="0">
        <td class="name">${esc(r.name)}</td>
        <td class="num ${tone(r.iph)}">${fmt(r.iph)}</td>
        <td class="num delta-sm ${tone(delta)}">${delta === null ? '–' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : ''} ${fmtNum(delta)}`}</td>
        <td class="hide-sm">${sparkSvg(hist)}</td>
        <td>${commChips(r)}</td>
        <td class="hide-sm">${flukTag(r)}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="empty">Tidak ada wilayah yang cocok.</td></tr>`;
    $('tableNote').textContent = `${rows.length} dari ${all.length} kab/kota · klik baris untuk membuka profil wilayah, klik judul kolom untuk mengurutkan.`;
  }

  // =====================================================================
  // PROFIL KABUPATEN/KOTA
  // =====================================================================
  function kabYearsOf(code) { return [...new Set(periods.filter(p => recOf(p, code)).map(p => p.year))].sort((a, b) => b - a); }

  function kabFacts() {
    const code = state.kab, name = kabName[code];
    const kabYears = kabYearsOf(code);
    if (state.year !== 'semua' && !kabYears.includes(state.year)) state.year = kabYears[0];
    const rows = periods.filter(p => (state.year === 'semua' || p.year === state.year) && recOf(p, code)).map(p => ({ p, r: recOf(p, code) }));
    const yearText = state.year === 'semua' ? `${kabYears[kabYears.length - 1]}–${kabYears[0]}` : String(state.year);
    // Ringkasan per bulan dari IPH akhir bulan: IPH kumulatif dalam bulan, jadi rata-rata mingguan bias ke minggu awal
    const byMonth = f => rows.map(x => ({ year: x.p.year, month: x.p.month, week: x.p.week, v: f(x) }));
    const months = IPHMonthly.monthlyIph(byMonth(x => x.r.iph));
    const avg = IPHMonthly.meanMonthly(byMonth(x => x.r.iph));
    const avgSulsel = IPHMonthly.meanMonthly(byMonth(x => x.p.avg));
    const nUp = months.filter(m => m.v > 0).length, nDown = months.filter(m => m.v < 0).length;
    const hi = rows.reduce((a, b) => (b.r.iph > a.r.iph ? b : a));
    const lo = rows.reduce((a, b) => (b.r.iph < a.r.iph ? b : a));
    const last = rows[rows.length - 1];
    const freq = countBy(rows.map(x => x.r), r => r.fluk);
    return { code, name, kabYears, rows, months, yearText, avg, avgSulsel, nUp, nDown, hi, lo, last, freq };
  }

  function kabNarrative(k) {
    const { name, months, yearText, avg, avgSulsel, nUp, nDown, hi, lo, freq } = k;
    const cmp = avg > avgSulsel ? 'lebih tinggi dari' : avg < avgSulsel ? 'lebih rendah dari' : 'sama dengan';
    return `Sepanjang <strong>${yearText}</strong>, rata-rata IPH akhir bulan ${esc(shortName(name))} <strong class="${tone(avg)}">${fmt(avg)}</strong>, ${cmp} Sulsel (${fmt(avgSulsel)}). ` +
      `Harga naik pada ${nUp} dan turun pada ${nDown} dari ${months.length} bulan. ` +
      `Kenaikan tertinggi <strong class="up">${fmt(hi.r.iph)}</strong> pada ${esc(hi.p.label)}${mainDriver(hi.r) ? ` (terutama ${esc(mainDriver(hi.r).toLowerCase())})` : ''}` +
      `; penurunan terdalam <strong class="down">${fmt(lo.r.iph)}</strong> pada ${esc(lo.p.label)}.` +
      (freq.length ? ` Komoditas paling sering bergejolak: <strong>${esc(freq[0][0])}</strong>.` : '');
  }

  function kpi(label, value, sub, cls = '', extra = '') {
    return `<div class="kpi"><span class="kpi-label">${esc(label)}</span><span class="kpi-value ${cls}">${value}</span>${extra}<span class="kpi-sub" title="${esc(plain(sub))}">${sub}</span></div>`;
  }
  function fact(label, value, sub, cls = '') {
    return `<div class="fact"><span>${esc(label)}</span><strong class="${cls}">${value}</strong><small title="${esc(plain(sub))}">${sub}</small></div>`;
  }

  function renderKab() {
    const k = kabFacts();
    const { code, name, kabYears, rows, months, yearText, avg, avgSulsel, nUp, nDown, hi, lo, last, freq } = k;

    $('kabSelect').value = code;
    $('yearSeg').innerHTML = kabYears.map(y => `<button data-year="${y}" class="${state.year === y ? 'on' : ''}">${y}</button>`).join('') +
      (kabYears.length > 1 ? `<button data-year="semua" class="${state.year === 'semua' ? 'on' : ''}">Semua</button>` : '');

    // Hero: minggu terakhir pada rentang terpilih
    const { p, r } = last;
    const diff = round2(r.iph - p.avg);
    $('kbEyebrow').textContent = `${name} · ${p.label}`;
    $('kbLatest').textContent = fmt(r.iph);
    $('kbLatest').className = `hero-value ${tone(r.iph)}`;
    $('kbDelta').className = `delta ${tone(diff)}`;
    $('kbDelta').innerHTML = `${fmtPt(diff)} <small>vs rata-rata Sulsel</small>`;
    $('kHeadline').innerHTML = kabNarrative(k);

    const st = streak(code, p.i);
    const prevRec = recOf(periods[p.i - 1], code);
    const prevMonth = IPHMonthly.monthlyIph(periods.slice(0, p.i).filter(q => recOf(q, code) && (q.year !== p.year || q.month !== p.month))
      .map(q => ({ year: q.year, month: q.month, week: q.week, v: recOf(q, code).iph }))).at(-1);
    $('kbFacts').innerHTML = [
      fact('Peringkat minggu itu', `${r.rank} <small style="display:inline;font-size:14px">dari ${r.of}</small>`, r.rank === 1 ? 'kenaikan tertinggi di Sulsel' : r.rank === r.of ? 'terendah di Sulsel' : '1 = IPH tertinggi'),
      fact('Arah beruntun', st.n ? `${st.s > 0 ? 'Naik' : 'Turun'} ${st.n} mgg` : 'Stabil', st.n >= 3 ? 'perlu dipantau' : 'minggu berturut-turut', st.s > 0 ? 'up' : st.s < 0 ? 'down' : ''),
      fact('Minggu sebelumnya', prevRec ? fmt(prevRec.iph) : '–', prevRec ? periods[p.i - 1].label : 'tidak ada rilis', prevRec ? tone(prevRec.iph) : ''),
      fact('Akhir bulan lalu', prevMonth ? fmt(prevMonth.v) : '–', prevMonth ? `${MONTH[prevMonth.month]} ${prevMonth.year}, minggu ${prevMonth.week}` : 'tidak ada rilis', prevMonth ? tone(prevMonth.v) : '')
    ].join('');

    $('kbKpis').innerHTML = [
      kpi('Rata-rata IPH akhir bulan', fmt(avg), `Sulsel ${fmt(avgSulsel)} · ${months.length} bulan, ${yearText}`, tone(avg)),
      kpi('Bulan naik : turun', `${nUp} : ${nDown}`, `${Math.round(nUp / months.length * 100)}% bulan harga naik`, '', split(nUp, nDown, months.length)),
      kpi('Kenaikan tertinggi', fmt(hi.r.iph), esc(hi.p.label), tone(hi.r.iph)),
      kpi('Penurunan terdalam', fmt(lo.r.iph), esc(lo.p.label), tone(lo.r.iph))
    ].join('');

    renderKabChart(rows);
    renderSeason('kabSeasonChart', periods.filter(q => recOf(q, code)).map(q => ({ year: q.year, month: q.month, week: q.week, v: recOf(q, code).iph })),
      state.year === 'semua' ? null : last.p);

    barList($('kbFreq'), freq.slice(0, 6).map(([nm, c], i) => ({
      name: nm, value: c, text: `${c} minggu`, note: `${Math.round(c / rows.length * 100)}%`, cls: i === 0 ? '' : 'muted', attr: `data-kom="${esc(nm)}" role="button" tabindex="0"`
    })), { empty: 'Tidak ada catatan fluktuasi.' });

    const drv = sign => {
      const m = new Map();
      rows.forEach(({ p: q, r: x }) => x.komoditas.forEach(c => {
        if (!c.ok || Math.sign(c.kontribusi) !== sign) return;
        const o = m.get(c.nama) || { n: 0, best: c.kontribusi, p: q };
        o.n++;
        if (Math.abs(c.kontribusi) > Math.abs(o.best)) { o.best = c.kontribusi; o.p = q; }
        m.set(c.nama, o);
      }));
      return [...m.entries()].sort((a, b) => b[1].n - a[1].n || Math.abs(b[1].best) - Math.abs(a[1].best)).slice(0, 6)
        .map(([nm, o]) => ({ name: nm, value: o.n, text: `${o.n}×`, note: `maks ${fmtNum(o.best)} · ${o.p.short}`, cls: sign > 0 ? 'up' : 'down', attr: `data-kom="${esc(nm)}" role="button" tabindex="0"` }));
    };
    barList($('kbUp'), drv(1), { empty: 'Tidak ada andil kenaikan.' });
    barList($('kbDown'), drv(-1), { empty: 'Tidak ada andil penurunan.' });

    const hist = [...rows].reverse();
    const limit = state.showAll ? hist.length : 12;
    $('kabMore').hidden = hist.length <= 12;
    $('kabMore').textContent = state.showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${hist.length} minggu)`;
    $('kabTable').innerHTML = hist.slice(0, limit).map(({ p: q, r: x }) => `
      <tr>
        <td class="name">${esc(q.label)}</td>
        <td class="num ${tone(x.iph)}">${fmt(x.iph)}</td>
        <td class="num soft hide-sm">${fmt(q.avg)}</td>
        <td class="num soft hide-sm">${x.rank}/${x.of}</td>
        <td>${commChips(x)}</td>
        <td class="hide-sm">${flukTag(x)}</td>
      </tr>`).join('');
    writeUrl();
  }

  function renderKabChart(rows) {
    const c = chart('kabChart');
    const many = rows.length > 60;
    c.setOption({
      ...base(),
      legend: { show: false },
      grid: { left: 4, right: 12, top: 12, bottom: many ? 52 : 8, containLabel: true },
      tooltip: tip({
        trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: T.grid } },
        formatter: items => {
          const { p, r } = rows[items[0].dataIndex];
          return tipHead(p.label) + tipRow('IPH', tipVal(r.iph), markColor(r.iph)) + tipRow('Rata-rata Sulsel', tipVal(p.avg), T.ink2) + tipRow('Peringkat', `${r.rank} dari ${r.of}`) + tipComms(r);
        }
      }),
      xAxis: { type: 'category', data: rows.map(x => x.p.short), axisLine: { lineStyle: { color: T.line } }, axisTick: { show: false }, axisLabel: { color: T.muted, hideOverlap: true } },
      yAxis: valueAxis(),
      dataZoom: many ? [
        { type: 'slider', start: Math.max(0, 100 - 52 / rows.length * 100), end: 100, height: 24, bottom: 6, borderColor: T.line, backgroundColor: 'transparent', fillerColor: 'rgba(91,75,219,.10)',
          handleStyle: { color: T.surface, borderColor: T.faint }, textStyle: { color: T.muted }, showDetail: false, brushSelect: false },
        { type: 'inside', zoomOnMouseWheel: 'ctrl' }] : [],
      series: [
        { name: 'IPH', type: 'bar', barMaxWidth: 16, barCategoryGap: '25%',
          data: rows.map(x => ({ value: x.r.iph, itemStyle: { color: markColor(x.r.iph), borderRadius: x.r.iph >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] } })),
          markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0 }], lineStyle: { color: T.naLine, type: 'solid', width: 1 }, label: { show: false } } },
        { name: 'Rata-rata Sulsel', type: 'line', data: rows.map(x => x.p.avg), showSymbol: false, symbol: 'circle', symbolSize: 6,
          lineStyle: { color: T.ink2, width: 1.8 }, itemStyle: { color: T.ink2 }, z: 3 }
      ]
    }, true);
  }

  // =====================================================================
  // ANALISIS KOMODITAS
  // =====================================================================
  function komStats() {
    const ps = periods.filter(p => state.komYear === 'semua' || p.year === state.komYear);
    const m = new Map();
    const get = name => {
      if (!m.has(name)) m.set(name, { name, up: 0, down: 0, fluk: 0, sumUp: 0, sumDown: 0, kabUp: new Map(), months: new Map(), moy: new Array(13).fill(0) });
      return m.get(name);
    };
    ps.forEach(p => {
      const mk = `${p.year}-${String(p.month).padStart(2, '0')}`;
      p.recs.forEach(r => {
        r.komoditas.forEach(c => {
          if (!c.ok || !c.kontribusi) return;
          const o = get(c.nama);
          const mo = o.months.get(mk) || { up: 0, down: 0 };
          if (c.kontribusi > 0) { o.up++; o.sumUp += c.kontribusi; mo.up++; o.moy[p.month]++; o.kabUp.set(r.code, (o.kabUp.get(r.code) || 0) + 1); }
          else { o.down++; o.sumDown += c.kontribusi; mo.down++; }
          o.months.set(mk, mo);
        });
        if (r.fluk) get(r.fluk).fluk++;
      });
    });
    const list = [...m.values()].sort((a, b) => (b.up + b.down) - (a.up + a.down) || b.fluk - a.fluk);
    const monthKeys = [...new Set(ps.map(p => `${p.year}-${String(p.month).padStart(2, '0')}`))];
    return { ps, list, monthKeys };
  }

  function renderKom() {
    const ys = years();
    if (state.komYear !== 'semua' && !ys.includes(state.komYear)) state.komYear = ys[0];
    $('komYearSeg').innerHTML = ys.map(y => `<button data-year="${y}" class="${state.komYear === y ? 'on' : ''}">${y}</button>`).join('') +
      `<button data-year="semua" class="${state.komYear === 'semua' ? 'on' : ''}">Semua</button>`;
    const { ps, list, monthKeys } = komStats();
    const yearText = state.komYear === 'semua' ? `${ys[ys.length - 1]}–${ys[0]}` : String(state.komYear);
    const shown = list.filter(o => o.up + o.down > 0).slice(0, 15);
    if (!state.kom || !list.some(o => o.name === state.kom)) state.kom = shown[0] && shown[0].name;
    const sel = list.find(o => o.name === state.kom);

    const flukTop = [...list].sort((a, b) => b.fluk - a.fluk)[0];
    const [a, b, c] = shown;
    $('komHeadline').innerHTML = a ? `Sepanjang <strong>${yearText}</strong> (${ps.length} minggu), <strong>${esc(a.name)}</strong> paling sering menjadi penyumbang perubahan harga ` +
      `(${a.up}× naik, ${a.down}× turun)${b ? `, disusul <strong>${esc(b.name)}</strong>${c ? ` dan <strong>${esc(c.name)}</strong>` : ''}` : ''}. ` +
      (flukTop && flukTop.fluk ? `Harga yang paling sering bergejolak: <strong>${esc(flukTop.name)}</strong> (${flukTop.fluk}×).` : '') : 'Tidak ada data komoditas.';

    const maxTot = Math.max(1, ...shown.map(o => o.up + o.down));
    $('komList').innerHTML = shown.map((o, i) => `
      <button class="kom-item" role="option" aria-selected="${o.name === state.kom}" data-kom="${esc(o.name)}">
        <span class="kom-rank">${i + 1}</span>
        <span><strong>${esc(o.name)}</strong>
          <span class="kom-mini" style="width:${(o.up + o.down) / maxTot * 100}%"><i class="up" style="width:${o.up / (o.up + o.down) * 100}%"></i><i class="down" style="width:${o.down / (o.up + o.down) * 100}%"></i></span></span>
        <span class="kom-count">${o.up + o.down}×</span>
      </button>`).join('');

    if (!sel) return;
    const peakM = sel.moy.indexOf(Math.max(...sel.moy.slice(1)), 1);
    const topKab = [...sel.kabUp.entries()].sort((x, y) => y[1] - x[1])[0];
    $('komName').textContent = sel.name;
    $('komText').innerHTML = `Menjadi penyumbang kenaikan <strong class="up">${sel.up}×</strong> dan penurunan <strong class="down">${sel.down}×</strong> sepanjang ${yearText}` +
      `${sel.up > sel.down ? ', jadi lebih sering mendorong harga naik' : sel.down > sel.up ? ', jadi lebih sering menekan harga turun' : ''}.` +
      (sel.up && peakM > 0 ? ` Paling sering mendorong kenaikan pada bulan <strong>${MONTH[peakM]}</strong>.` : '') +
      (topKab ? ` Wilayah paling sering terdampak: <strong>${esc(kabName[topKab[0]])}</strong> (${topKab[1]} minggu).` : '');
    const nRep = ps.reduce((t, q) => t + q.recs.length, 0);
    $('komStats').innerHTML = [
      fact('Penyumbang naik', `${sel.up}×`, `dari ${nRep} laporan kab/kota`, 'up'),
      fact('Penyumbang turun', `${sel.down}×`, `dari ${nRep} laporan kab/kota`, 'down'),
      fact('Andil naik rata-rata', sel.up ? fmtNum(sel.sumUp / sel.up) : '–', 'poin per kemunculan'),
      fact('Paling bergejolak', `${sel.fluk}×`, 'fluktuasi harga tertinggi')
    ].join('');

    // Grafik per bulan
    const cK = chart('komChart');
    const mLabel = mk => { const [y, mo] = mk.split('-'); return `${MON3[+mo]} ’${y.slice(2)}`; };
    cK.setOption({
      ...base(),
      grid: { left: 4, right: 12, top: 12, bottom: 8, containLabel: true },
      tooltip: tip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: T.grid } }, formatter: it => {
        const mk = monthKeys[it[0].dataIndex]; const mo = sel.months.get(mk) || { up: 0, down: 0 };
        const [y, m] = mk.split('-');
        return tipHead(`${MONTH[+m]} ${y}`) + tipRow('Penyumbang naik', `${mo.up}×`, T.up) + tipRow('Penyumbang turun', `${mo.down}×`, T.down);
      } }),
      xAxis: { type: 'category', data: monthKeys.map(mLabel), axisLine: { lineStyle: { color: T.line } }, axisTick: { show: false }, axisLabel: { color: T.muted, hideOverlap: true } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: T.muted, formatter: v => Math.abs(v) }, splitLine: { lineStyle: { color: T.grid } } },
      series: [
        { name: 'Naik', type: 'bar', stack: 'k', barMaxWidth: 22, data: monthKeys.map(mk => (sel.months.get(mk) || {}).up || 0), itemStyle: { color: T.up, borderRadius: [3, 3, 0, 0] } },
        { name: 'Turun', type: 'bar', stack: 'k', barMaxWidth: 22, data: monthKeys.map(mk => -((sel.months.get(mk) || {}).down || 0)), itemStyle: { color: T.down, borderRadius: [0, 0, 3, 3] },
          markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0 }], lineStyle: { color: T.naLine, type: 'solid', width: 1 }, label: { show: false } } }
      ]
    }, true);

    barList($('komKab'), [...sel.kabUp.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([code, n]) => ({
      name: shortName(kabName[code]), value: n, text: `${n} minggu`, cls: 'up', attr: `data-kab="${code}" role="button" tabindex="0"`
    })), { empty: 'Belum pernah menjadi penyumbang kenaikan pada rentang ini.' });

    renderKomHeat(list.filter(o => o.up > 0).sort((x, y) => y.up - x.up).slice(0, 10), monthKeys);
    writeUrl();
  }

  function renderKomHeat(top, monthKeys) {
    const all = state.komYear === 'semua';
    const cols = all ? MON3.slice(1) : monthKeys.map(mk => MON3[+mk.split('-')[1]]);
    $('komHeatNote').textContent = all
      ? 'Berapa kali komoditas disebut sebagai penyumbang kenaikan, dijumlah per bulan untuk semua tahun. Bulan yang pekat menandai musim rawan.'
      : 'Berapa kali komoditas disebut sebagai penyumbang kenaikan, per bulan. Makin pekat, makin sering.';
    const rows = [...top].reverse();
    const data = [];
    rows.forEach((o, y) => cols.forEach((_, x) => {
      const v = all ? o.moy[x + 1] : ((o.months.get(monthKeys[x]) || {}).up || 0);
      data.push([x, y, v]);
    }));
    const max = Math.max(1, ...data.map(d => d[2]));
    const el = $('komHeat');
    el.style.height = `${rows.length * 32 + 44}px`;
    const c = chart('komHeat', ch => ch.on('click', d => {
      const name = d.componentType === 'yAxis' ? d.value : state.komHeatRows[d.value[1]].name;
      if (name) { state.kom = name; renderKom(); }
    }));
    state.komHeatRows = rows;
    c.resize();
    c.setOption({
      ...base(),
      grid: { left: 4, right: 8, top: 4, bottom: 4, containLabel: true },
      tooltip: tip({ formatter: d => tipHead(rows[d.value[1]].name) + tipRow(all ? `${MONTH[d.value[0] + 1]} (semua tahun)` : `${MONTH[d.value[0] + 1]} ${state.komYear}`, `${d.value[2]}× penyumbang naik`) }),
      xAxis: { type: 'category', data: cols, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: T.muted, interval: 0, fontSize: 11.5 } },
      yAxis: { type: 'category', data: rows.map(o => o.name), axisLine: { show: false }, axisTick: { show: false }, triggerEvent: true,
        axisLabel: { color: T.ink, fontSize: 12.5, formatter: v => v === state.kom ? `{b|${v}}` : v, rich: { b: { fontWeight: 800, color: T.accentText, fontSize: 12.5 } } } },
      visualMap: { show: false, min: 0, max, inRange: { color: T.seq }, seriesIndex: 0 },
      series: [{
        type: 'heatmap', cursor: 'pointer',
        data: data.map(d => ({ value: d, label: { show: d[2] > 0, color: d[2] / max > 0.5 ? T.onStrong : T.ink, fontSize: 11, fontWeight: 600 } })),
        label: { show: true, formatter: d => d.value[2] || '' },
        itemStyle: { borderColor: T.surface, borderWidth: 2, borderRadius: 4 },
        emphasis: { itemStyle: { borderColor: T.ink, borderWidth: 2 } }
      }]
    }, true);
  }

  // =====================================================================
  // Navigasi, salin, CSV, tema, inisialisasi
  // =====================================================================
  const VIEWS = { sulsel: 'viewSulsel', kab: 'viewKab', kom: 'viewKom' };
  const RENDER = { sulsel: () => renderSulsel(), kab: () => renderKab(), kom: () => renderKom() };

  function show(view) {
    state.view = view;
    Object.entries(VIEWS).forEach(([v, id]) => { $(id).hidden = v !== view; });
    document.querySelectorAll('.tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === view));
    RENDER[view]();
    requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize()));
  }

  function openKab(code) {
    if (!byKab.has(code)) return;
    state.kab = code;
    if (state.view === 'sulsel') state.year = periods[state.pIdx].year;
    state.showAll = false;
    Object.values(charts).forEach(c => c.dispatchAction({ type: 'hideTip' }));
    setTimeout(() => show('kab'), 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openKom(name) {
    if (!name) return;
    state.kom = name;
    if (state.view === 'sulsel') state.komYear = periods[state.pIdx].year;
    else if (state.view === 'kab') state.komYear = state.year;
    show('kom');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(msg) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }
  async function copyText(text, okMsg) {
    try { await navigator.clipboard.writeText(text); toast(okMsg); }
    catch { window.prompt('Salin teks ini:', text); }
  }

  function sulselSummaryText() {
    const f = weekFacts(state.pIdx);
    const { p, prev, status, pct } = f;
    const lines = [`*Ringkasan IPH Sulawesi Selatan — ${p.label}*`, '',
      `Rata-rata IPH: ${fmt(p.avg)}${prev ? ` (${fmtPt(round2(p.avg - prev.avg))} dari minggu lalu${prev.month !== p.month || prev.year !== p.year ? '; basis bulan berganti' : ''})` : ''}.`];
    if (pct !== null) lines.push(`Status: ${status.label} (${pct >= 50 ? `lebih tinggi dari ${Math.round(pct)}%` : `lebih rendah dari ${Math.round(100 - pct)}%`} ${peerWeeks(p.week)} sejak ${MONTH[periods[0].month]} ${periods[0].year}).`);
    lines.push(plain(sulselNarrative(f).html));
    const recs = [...p.recs].sort((a, b) => b.iph - a.iph);
    lines.push('', 'IPH tertinggi:', ...recs.slice(0, 3).map((r, k) => `${k + 1}. ${r.name} ${fmt(r.iph)}`));
    lines.push('IPH terendah:', ...recs.slice(-3).reverse().map((r, k) => `${k + 1}. ${r.name} ${fmt(r.iph)}`));
    lines.push('', `Sumber: BPS, diolah SIPH Sulsel · ${location.href}`);
    return lines.join('\n');
  }
  function kabSummaryText() {
    if (!state.kab) return '';
    const k = kabFacts();
    const { p, r } = k.last;
    return [`*Ringkasan IPH ${k.name} — ${k.yearText}*`, '',
      `IPH terbaru (${p.label}): ${fmt(r.iph)}, peringkat ${r.rank} dari ${r.of} kab/kota; rata-rata Sulsel ${fmt(p.avg)}.`,
      plain(kabNarrative(k)), '', `Sumber: BPS, diolah SIPH Sulsel · ${location.href}`].join('\n');
  }

  function downloadCsv(filename, header, rows) {
    const cell = v => {
      if (typeof v === 'number') return String(v).replace('.', ',');
      const s = String(v ?? '');
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + [header, ...rows].map(r => r.map(cell).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const andilText = r => sortedComms(r).map(c => `${c.nama} (${String(c.kontribusi).replace('.', ',')})`).join(', ');

  const effectiveDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  function rerender() { readTokens(); RENDER[state.view](); }

  function bind() {
    document.querySelectorAll('.tabs [role="tab"]').forEach(b => {
      b.onclick = () => {
        const v = b.dataset.view;
        if (v === 'kab' && !state.kab) { state.kab = periods[state.pIdx].hi.code; state.year = periods[state.pIdx].year; }
        if (v === 'kom' && !state.komYear) state.komYear = periods[state.pIdx].year;
        show(v);
      };
    });
    $('helpBtn').onclick = () => $('helpDialog').showModal();
    $('themeBtn').onclick = () => {
      const next = effectiveDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('siph-theme', next); } catch (e) { /* abaikan */ }
      rerender();
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.dataset.theme) rerender(); });

    // Pilihan minggu dikelompokkan per tahun (terbaru di atas)
    $('periodSelect').innerHTML = years().map(y => `<optgroup label="${y}">${periods.filter(p => p.year === y).reverse()
      .map(p => `<option value="${p.key}">${MONTH[p.month]} ${p.year}, minggu ${p.week}</option>`).join('')}</optgroup>`).join('');
    $('periodSelect').onchange = e => setPeriod(periods.findIndex(p => p.key === e.target.value));
    $('prevPeriod').onclick = () => setPeriod(state.pIdx - 1);
    $('nextPeriod').onclick = () => setPeriod(state.pIdx + 1);
    $('latestBtn').onclick = () => setPeriod(periods.length - 1);
    document.addEventListener('keydown', e => {
      if (state.view !== 'sulsel' || e.altKey || e.ctrlKey || e.metaKey) return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) || document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft') { setPeriod(state.pIdx - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPeriod(state.pIdx + 1); e.preventDefault(); }
    });

    document.querySelectorAll('#rangeSeg button').forEach(b => {
      b.onclick = () => { state.range = b.dataset.range === 'all' ? 'all' : +b.dataset.range; state.zoom = null; renderTrend(); };
    });
    $('compareSelect').innerHTML = '<option value="">+ Bandingkan wilayah</option>' + kabs.map(k => `<option value="${k.code}">${esc(shortName(k.name))}</option>`).join('');
    $('compareSelect').onchange = e => { state.compare = e.target.value; renderTrend(); };

    $('tableSearch').oninput = e => { state.search = e.target.value; renderWeekTable(); };
    document.querySelectorAll('#weekTableEl .th-sort').forEach(b => {
      b.onclick = () => {
        const key = b.dataset.sort;
        state.sort = { key, dir: state.sort.key === key ? (state.sort.dir === 'asc' ? 'desc' : 'asc') : (key === 'name' ? 'asc' : 'desc') };
        renderWeekTable();
      };
    });

    // Delegasi klik: baris/kartu dengan data-kab atau data-kom
    const activate = e => {
      const el = e.target.closest('[data-kab], [data-kom]');
      if (!el || el.closest('.tabs')) return;
      if (el.classList.contains('kom-item')) { state.kom = el.dataset.kom; renderKom(); return; }
      if (el.dataset.kab) openKab(el.dataset.kab); else if (el.dataset.kom) openKom(el.dataset.kom);
    };
    $('main').addEventListener('click', activate);
    $('main').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-kab], [data-kom]')) { e.preventDefault(); activate(e); } });

    $('copySulsel').onclick = () => copyText(sulselSummaryText(), 'Ringkasan disalin — siap ditempel ke laporan atau WhatsApp');
    $('copyKab').onclick = () => copyText(kabSummaryText(), 'Ringkasan wilayah disalin');
    $('shareBtn').onclick = () => copyText(location.href, 'Tautan disalin');

    $('csvWeek').onclick = () => {
      const p = periods[state.pIdx];
      downloadCsv(`IPH_Sulsel_${p.key}.csv`, ['Periode', 'Kode', 'Kab/Kota', 'IPH (%)', 'Peringkat', 'Status', 'Andil komoditas', 'Fluktuasi tertinggi', 'Nilai CV'],
        [...p.recs].sort((a, b) => b.iph - a.iph).map(r => [p.label, r.code, r.name, r.iph, r.rank, r.status, andilText(r), r.fluk || r.flukRaw || '-', r.cv ?? '']));
    };

    $('kabSelect').innerHTML = kabs.map(k => `<option value="${k.code}">${esc(k.name)}</option>`).join('');
    $('kabSelect').onchange = e => { state.kab = e.target.value; state.showAll = false; renderKab(); };
    $('yearSeg').onclick = e => { const b = e.target.closest('button[data-year]'); if (!b) return; state.year = b.dataset.year === 'semua' ? 'semua' : +b.dataset.year; state.showAll = false; renderKab(); };
    $('komYearSeg').onclick = e => { const b = e.target.closest('button[data-year]'); if (!b) return; state.komYear = b.dataset.year === 'semua' ? 'semua' : +b.dataset.year; renderKom(); };
    $('kabMore').onclick = () => { state.showAll = !state.showAll; renderKab(); };
    $('csvKab').onclick = () => {
      const rows = periods.filter(p => (state.year === 'semua' || p.year === state.year) && recOf(p, state.kab));
      downloadCsv(`IPH_${shortName(kabName[state.kab]).replace(/\s+/g, '_')}_${state.year}.csv`,
        ['Periode', 'Kode periode', 'IPH (%)', 'Rata-rata Sulsel (%)', 'Peringkat', 'Status', 'Andil komoditas', 'Fluktuasi tertinggi', 'Nilai CV'],
        rows.map(p => { const r = recOf(p, state.kab); return [p.label, p.key, r.iph, p.avg, `${r.rank}/${r.of}`, r.status, andilText(r), r.fluk || r.flukRaw || '-', r.cv ?? '']; }));
    };

    let t, wasNarrow = isNarrow();
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (isNarrow() !== wasNarrow) { wasNarrow = isNarrow(); RENDER[state.view](); }
        Object.values(charts).forEach(c => c.resize());
      }, 150);
    });
  }

  async function init() {
    try {
      if (typeof echarts === 'undefined') throw new Error('pustaka grafik (periksa koneksi internet)');
      readTokens();
      const [raw, g] = await Promise.all([
        fetch('data/iph_sulsel.json').then(r => { if (!r.ok) throw new Error('data IPH'); return r.json(); }),
        fetch('data/sulsel_geo.json').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      buildModel(raw);
      if (!periods.length) throw new Error('data IPH kosong');
      if (g) { geo = g; echarts.registerMap('sulsel', g); }
      const first = periods[0], last = periods[periods.length - 1];
      $('dataInfo').textContent = `${periods.length} rilis mingguan, ${MONTH[first.month]} ${first.year} – ${last.label}` +
        (meta.generated_at ? `; diperbarui ${new Date(meta.generated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.` : '.');
      // Tunggu font agar lebar label grafik diukur dengan font yang benar.
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
      $('loading').hidden = true;
      readUrl();
      bind();
      show(state.view);
    } catch (err) {
      $('loading').hidden = true;
      $('loadError').hidden = false;
      $('loadError').textContent = `Gagal memuat ${err.message}. Coba muat ulang halaman.`;
      console.error(err);
    }
  }

  init();
})();
