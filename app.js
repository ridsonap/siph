/* SIPH Sulsel — dashboard Indeks Perkembangan Harga (IPH).
 * Semua teks, daftar tahun, periode, dan wilayah dibentuk dari data/iph_sulsel.json,
 * sehingga data baru cukup ditambahkan lewat scripts/build_data.py tanpa mengubah kode ini. */
(() => {
  'use strict';

  const C = { up: '#c2410c', down: '#15803d', na: '#d9dee3', ink: '#16202b', muted: '#5d6874', faint: '#8a949e', line: '#e3e7eb', accent: '#0e7490', mid: '#f4f4f2' };
  const MONTH = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const MON3 = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const nf = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ---------- Format ----------
  const fmt = v => (v === null || v === undefined || Number.isNaN(v)) ? '–'
    : `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf.format(Math.abs(v))}%`;
  const fmtNum = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${nf.format(Math.abs(v))}`;
  const tone = v => v > 0 ? 'up' : v < 0 ? 'down' : '';
  const shortName = n => n.replace(/^Kab\.\s*/, '').replace(/^Kota\s+/, 'Kota ');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const round2 = v => Math.round(v * 100) / 100;
  const $ = id => document.getElementById(id);

  // ---------- Model ----------
  let periods = [];          // [{key, year, month, week, label, short, recs:[...], avg}]
  let kabs = [];             // [{code, name}] wilayah yang pernah punya rilis IPH
  const kabName = {};
  let geo = null;

  function buildModel(raw) {
    periods = raw.periods
      .map(p => {
        const recs = p.records.filter(r => r.iph !== null && r.iph !== undefined);
        return {
          key: p.period_key, year: p.year, month: p.month, week: p.week,
          label: `${MONTH[p.month]} ${p.year}, minggu ${p.week}`,
          short: `${MON3[p.month]} M${p.week} ’${String(p.year).slice(2)}`,
          recs,
          avg: recs.length ? round2(mean(recs.map(r => r.iph))) : null
        };
      })
      .filter(p => p.recs.length)
      .sort((a, b) => a.key.localeCompare(b.key));
    const seen = new Map();
    periods.forEach(p => p.recs.forEach(r => seen.set(r.kode_kab, r.nama_kab)));
    Object.entries(raw.regencies_time_series || {}).forEach(([code, v]) => { kabName[code] = v.name; });
    seen.forEach((name, code) => { kabName[code] = name; });
    kabs = [...seen.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => shortName(a.name).localeCompare(shortName(b.name)));
  }

  const years = () => [...new Set(periods.map(p => p.year))].sort((a, b) => b - a);
  const recOf = (p, code) => p.recs.find(r => r.kode_kab === code);
  const sortedComms = (r, sign) => (r.komoditas || [])
    .filter(c => sign === undefined || Math.sign(c.kontribusi) === sign)
    .sort((a, b) => Math.abs(b.kontribusi) - Math.abs(a.kontribusi));
  const mainDriver = r => (sortedComms(r, Math.sign(r.iph))[0] || {}).nama;
  const countBy = (items, key) => {
    const m = new Map();
    items.forEach(it => { const k = key(it); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const flukOf = r => (r.fluktuasi_tertinggi && r.fluktuasi_tertinggi !== '-') ? r.fluktuasi_tertinggi : null;

  // ---------- State & URL ----------
  const state = { view: 'sulsel', pIdx: 0, kab: null, year: null, compare: '', search: '', showAll: false };

  function readUrl() {
    const q = new URLSearchParams(location.search);
    const kab = q.get('kab');
    const per = q.get('periode');
    const th = q.get('tahun');
    state.pIdx = periods.length - 1;
    if (per) { const i = periods.findIndex(p => p.key === per); if (i >= 0) state.pIdx = i; }
    if (kab && kabName[kab] && kabs.some(k => k.code === kab)) {
      state.view = 'kab';
      state.kab = kab;
    }
    state.year = th === 'semua' ? 'semua' : (th && years().includes(+th) ? +th : years()[0]);
  }

  function writeUrl() {
    const q = new URLSearchParams();
    if (state.view === 'kab') { q.set('kab', state.kab); q.set('tahun', state.year); }
    else if (state.pIdx !== periods.length - 1) q.set('periode', periods[state.pIdx].key);
    const s = q.toString();
    history.replaceState(null, '', s ? `?${s}` : location.pathname);
  }

  // ---------- Charts ----------
  const charts = {};
  const chart = id => (charts[id] = charts[id] || echarts.init($(id), null, { renderer: 'canvas' }));
  const baseText = { fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', color: C.muted, fontSize: 12 };
  const tooltipBase = { backgroundColor: '#fff', borderColor: C.line, textStyle: { color: C.ink, fontSize: 13 }, extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,.08);border-radius:10px;' };

  // ---------- Bar list (HTML) ----------
  function barList(el, rows, opts = {}) {
    if (!rows.length) { el.innerHTML = `<p class="empty">${opts.empty || 'Tidak ada data.'}</p>`; return; }
    const max = Math.max(...rows.map(r => Math.abs(r.value)));
    el.innerHTML = rows.map(r => `
      <div class="bar-row">
        <span class="bar-name" title="${esc(r.name)}">${esc(r.name)}</span>
        <span class="bar-track">
          <span class="bar-fill ${r.cls || ''}" style="width:${Math.max(3, Math.abs(r.value) / max * (r.note ? 45 : 65))}%"></span>
          <span class="bar-val ${r.cls === 'muted' ? '' : (r.cls || '')}">${esc(r.text)}</span>${r.note ? `<span class="bar-note">${esc(r.note)}</span>` : ''}
        </span>
      </div>`).join('');
  }

  // =====================================================================
  // TAMPILAN SULAWESI SELATAN
  // =====================================================================
  function renderSulsel() {
    const p = periods[state.pIdx];
    const prev = periods[state.pIdx - 1];
    const recs = [...p.recs].sort((a, b) => b.iph - a.iph);
    const n = recs.length;
    const nUp = recs.filter(r => r.iph > 0).length;
    const nDown = recs.filter(r => r.iph < 0).length;
    const top = recs[0], bottom = recs[n - 1];

    $('periodSelect').value = p.key;
    $('prevPeriod').disabled = state.pIdx === 0;
    $('nextPeriod').disabled = state.pIdx === periods.length - 1;

    // Kalimat kesimpulan
    const majorityUp = nUp >= nDown;
    const lead = majorityUp
      ? `harga naik di <strong>${nUp} dari ${n}</strong> kab/kota yang dirilis`
      : `harga turun di <strong>${nDown} dari ${n}</strong> kab/kota yang dirilis`;
    const delta = prev ? `, ${p.avg > prev.avg ? 'lebih tinggi' : p.avg < prev.avg ? 'lebih rendah' : 'sama'} dibanding minggu lalu (${fmt(prev.avg)})` : '';
    const ext = majorityUp ? top : bottom;
    const drv = mainDriver(ext);
    $('sHeadline').innerHTML = `<strong>${esc(p.label)}:</strong> ${lead}. Rata-rata IPH Sulsel <strong class="${tone(p.avg)}">${fmt(p.avg)}</strong>${delta}. ` +
      `${majorityUp ? 'Kenaikan tertinggi' : 'Penurunan terdalam'} di <strong>${esc(ext.nama_kab)}</strong> (${fmt(ext.iph)})${drv ? `, terutama karena ${esc(drv.toLowerCase())}` : ''}.`;

    // KPI
    $('kAvg').textContent = fmt(p.avg);
    $('kAvg').className = `kpi-value ${tone(p.avg)}`;
    $('kAvgSub').textContent = prev ? `Minggu lalu ${fmt(prev.avg)}` : 'Rilis pertama';
    $('kCount').textContent = `${nUp} : ${nDown}`;
    const sp = $('kSplit').children;
    sp[0].style.width = `${nUp / n * 100}%`; sp[1].style.width = `${nDown / n * 100}%`;
    $('kMax').textContent = fmt(top.iph);
    $('kMax').className = `kpi-value ${tone(top.iph)}`;
    $('kMaxLabel').textContent = top.iph > 0 ? 'Kenaikan tertinggi' : 'Penurunan terkecil';
    $('kMaxSub').textContent = top.nama_kab;
    $('kMin').textContent = fmt(bottom.iph);
    $('kMin').className = `kpi-value ${tone(bottom.iph)}`;
    $('kMinLabel').textContent = bottom.iph < 0 ? 'Penurunan terdalam' : 'Kenaikan terendah';
    $('kMinSub').textContent = bottom.nama_kab;

    renderMap(p);
    renderRank(recs);
    renderTrend();

    // Penyumbang minggu ini (sesuai arah mayoritas)
    const sign = majorityUp ? 1 : -1;
    const drivers = countBy(recs.flatMap(r => sortedComms(r, sign).map(c => c.nama)), x => x).slice(0, 7);
    document.querySelector('#weekDrivers').previousElementSibling.querySelector('h2').textContent =
      majorityUp ? 'Penyumbang kenaikan minggu ini' : 'Penyumbang penurunan minggu ini';
    document.querySelector('#weekDrivers').previousElementSibling.querySelector('p').textContent =
      `Jumlah kab/kota yang menyebut komoditas ini sebagai penyumbang ${majorityUp ? 'kenaikan' : 'penurunan'}.`;
    barList($('weekDrivers'), drivers.map(([name, c]) => ({ name, value: c, text: `${c} dari ${n}`, cls: majorityUp ? 'up' : 'down' })));

    // Paling sering bergejolak di tahun berjalan
    const yearPeriods = periods.filter(q => q.year === p.year && q.key <= p.key);
    const vol = countBy(yearPeriods.flatMap(q => q.recs), flukOf).slice(0, 7);
    $('yearVolatileTitle').textContent = `Paling sering bergejolak, ${p.year}`;
    barList($('yearVolatile'), vol.map(([name, c], i) => ({ name, value: c, text: `${c}×`, cls: i === 0 ? '' : 'muted' })));
    $('yearVolatile').previousElementSibling.querySelector('p').textContent =
      `Jumlah kali tercatat sebagai komoditas dengan fluktuasi harga tertinggi, ${MON3[yearPeriods[0].month]}–${MON3[p.month]} ${p.year} (${yearPeriods.length} minggu).`;

    renderWeekTable(recs);
    writeUrl();
  }

  function renderMap(p) {
    if (!geo) return;
    const byName = new Map(p.recs.map(r => [r.nama_kab, r]));
    const data = geo.features.map(f => {
      const r = byName.get(f.properties.name);
      return r ? { name: f.properties.name, value: r.iph, code: r.kode_kab, rec: r }
        : { name: f.properties.name, value: '-', code: f.properties.code, itemStyle: { areaColor: C.na } };
    });
    const lim = Math.max(2, Math.ceil(Math.max(...p.recs.map(r => Math.abs(r.iph)))));
    chart('mapChart').setOption({
      textStyle: baseText,
      tooltip: {
        ...tooltipBase,
        formatter: d => {
          const r = d.data && d.data.rec;
          if (!r) return `<b>${esc(d.name)}</b><br><span style="color:${C.muted}">Tidak ada rilis IPH minggu ini</span>`;
          const comms = sortedComms(r).slice(0, 3).map(c => `${esc(c.nama)} ${fmtNum(c.kontribusi)}`).join('<br>');
          return `<b>${esc(r.nama_kab)}</b><br>IPH <b style="color:${r.iph > 0 ? C.up : C.down}">${fmt(r.iph)}</b>` +
            (comms ? `<br><span style="color:${C.muted}">Andil:</span><br>${comms}` : '');
        }
      },
      visualMap: { show: false, min: -lim, max: lim, inRange: { color: [C.down, '#9fd0ac', C.mid, '#f3b08f', C.up] }, calculable: false },
      series: [{
        type: 'map', map: 'sulsel', roam: false, layoutCenter: ['50%', '50%'], layoutSize: '98%',
        selectedMode: false, data,
        itemStyle: { borderColor: '#fff', borderWidth: 0.8, areaColor: C.na },
        emphasis: { label: { show: true, color: C.ink, fontSize: 12, fontWeight: 600 }, itemStyle: { areaColor: undefined, borderColor: C.ink, borderWidth: 1.2 } },
        label: { show: false }
      }]
    }, true);
  }

  function renderRank(recs) {
    const asc = [...recs].reverse();
    const el = $('rankChart');
    el.style.height = `${Math.max(300, asc.length * 26 + 40)}px`;
    const c = chart('rankChart');
    c.resize();
    c.setOption({
      textStyle: baseText,
      grid: { left: 8, right: 64, top: 4, bottom: 4, containLabel: true },
      tooltip: { ...tooltipBase, trigger: 'item', formatter: d => `<b>${esc(asc[d.dataIndex].nama_kab)}</b><br>IPH ${fmt(d.value)}` },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', data: asc.map(r => shortName(r.nama_kab)), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: C.ink, fontSize: 13 } },
      series: [{
        type: 'bar', barWidth: 14, cursor: 'pointer',
        data: asc.map(r => ({ value: r.iph, itemStyle: { color: r.iph >= 0 ? C.up : C.down, borderRadius: r.iph >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3] } })),
        label: { show: true, position: 'right', formatter: d => fmt(d.value), color: C.ink, fontWeight: 600, fontSize: 12 },
        markLine: { silent: true, symbol: 'none', data: [{ xAxis: 0 }], lineStyle: { color: C.faint, type: 'solid', width: 1 }, label: { show: false } }
      }]
    }, true);
  }

  function renderTrend() {
    const c = chart('trendChart');
    const keepZoom = c.getOption() && c.getOption().dataZoom ? c.getOption().dataZoom[0] : null;
    const cur = periods[state.pIdx];
    const series = [{
      name: 'Rata-rata Sulsel', type: 'line', data: periods.map(p => p.avg), showSymbol: false,
      lineStyle: { width: 2.4, color: C.ink }, itemStyle: { color: C.ink },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,32,43,.10)' }, { offset: 1, color: 'rgba(22,32,43,0)' }] } },
      markLine: {
        silent: true, symbol: 'none', label: { show: false },
        data: [{ yAxis: 0, lineStyle: { color: C.faint, type: 'solid', width: 1 } }, { xAxis: cur.short, lineStyle: { color: C.accent, type: 'dashed', width: 1.2 } }]
      }
    }];
    if (state.compare) {
      series.push({
        name: shortName(kabName[state.compare]), type: 'line', connectNulls: false, showSymbol: false,
        data: periods.map(p => { const r = recOf(p, state.compare); return r ? r.iph : null; }),
        lineStyle: { width: 1.8, color: C.accent }, itemStyle: { color: C.accent }
      });
    }
    const n = periods.length;
    const start = keepZoom ? keepZoom.start : Math.max(0, 100 - (52 / n) * 100);
    const end = keepZoom ? keepZoom.end : 100;
    c.setOption({
      textStyle: baseText,
      legend: state.compare ? { top: 0, right: 0, textStyle: { color: C.ink }, icon: 'roundRect', itemHeight: 4 } : { show: false },
      grid: { left: 8, right: 16, top: state.compare ? 30 : 12, bottom: 56, containLabel: true },
      tooltip: { ...tooltipBase, trigger: 'axis', valueFormatter: v => fmt(v) },
      xAxis: { type: 'category', data: periods.map(p => p.short), boundaryGap: false, axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel: { color: C.muted } },
      yAxis: { type: 'value', axisLabel: { formatter: v => `${v > 0 ? '+' : ''}${v}%`, color: C.muted }, splitLine: { lineStyle: { color: '#f0f2f4' } } },
      dataZoom: [{ type: 'slider', start, end, height: 22, bottom: 8, borderColor: C.line, fillerColor: 'rgba(14,116,144,.12)', handleStyle: { color: '#fff', borderColor: C.faint }, textStyle: { color: C.muted }, showDetail: false, brushSelect: false }, { type: 'inside', start, end }],
      series
    }, true);
  }

  function renderWeekTable(recs) {
    const q = state.search.trim().toLowerCase();
    const rows = recs.filter(r => !q || r.nama_kab.toLowerCase().includes(q) ||
      (r.komoditas || []).some(c => c.nama.toLowerCase().includes(q)) || (r.fluktuasi_tertinggi || '').toLowerCase().includes(q));
    $('weekTable').innerHTML = rows.length ? rows.map(r => `
      <tr class="clickable" data-kab="${r.kode_kab}" tabindex="0">
        <td class="name">${esc(r.nama_kab)}</td>
        <td class="num ${tone(r.iph)}">${fmt(r.iph)}</td>
        <td><span class="chips">${sortedComms(r).slice(0, 3).map(c => `<span><b>${esc(c.nama)}</b> ${fmtNum(c.kontribusi)}</span>`).join('') || '–'}</span></td>
        <td>${flukOf(r) ? `<span class="tag">${esc(r.fluktuasi_tertinggi)}</span>` : '–'}</td>
      </tr>`).join('') : `<tr><td colspan="4" class="empty">Tidak ada wilayah yang cocok.</td></tr>`;
    $('tableNote').textContent = `${rows.length} dari ${recs.length} kab/kota. Klik baris untuk membuka profil wilayah.`;
  }

  // =====================================================================
  // TAMPILAN KABUPATEN/KOTA
  // =====================================================================
  function renderKab() {
    const code = state.kab;
    const name = kabName[code];
    const kabYears = [...new Set(periods.filter(p => recOf(p, code)).map(p => p.year))].sort((a, b) => b - a);
    if (state.year !== 'semua' && !kabYears.includes(state.year)) state.year = kabYears[0];
    $('kabSelect').value = code;
    $('yearSelect').innerHTML = kabYears.map(y => `<option value="${y}">${y}</option>`).join('') +
      (kabYears.length > 1 ? `<option value="semua">Semua tahun (${kabYears[kabYears.length - 1]}–${kabYears[0]})</option>` : '');
    $('yearSelect').value = String(state.year);

    const ps = periods.filter(p => (state.year === 'semua' || p.year === state.year) && recOf(p, code));
    const rows = ps.map(p => ({ p, r: recOf(p, code) }));
    const yearText = state.year === 'semua' ? `${kabYears[kabYears.length - 1]}–${kabYears[0]}` : String(state.year);

    const vals = rows.map(x => x.r.iph);
    const avg = round2(mean(vals));
    const nUp = vals.filter(v => v > 0).length, nDown = vals.filter(v => v < 0).length;
    const hi = rows.reduce((a, b) => (b.r.iph > a.r.iph ? b : a));
    const lo = rows.reduce((a, b) => (b.r.iph < a.r.iph ? b : a));
    const last = rows[rows.length - 1];
    const freq = countBy(rows.map(x => x.r), flukOf);

    const upMax = new Map(), downMin = new Map();
    rows.forEach(({ p, r }) => (r.komoditas || []).forEach(c => {
      if (c.kontribusi > 0 && (!upMax.has(c.nama) || c.kontribusi > upMax.get(c.nama).v)) upMax.set(c.nama, { v: c.kontribusi, p });
      if (c.kontribusi < 0 && (!downMin.has(c.nama) || c.kontribusi < downMin.get(c.nama).v)) downMin.set(c.nama, { v: c.kontribusi, p });
    }));

    $('kHeadline').innerHTML = `<strong>${esc(name)}, ${yearText}:</strong> rata-rata IPH <strong class="${tone(avg)}">${fmt(avg)}</strong> dari ${rows.length} minggu ` +
      `(${nUp} naik, ${nDown} turun). Kenaikan tertinggi <strong class="up">${fmt(hi.r.iph)}</strong> pada ${esc(hi.p.label)}` +
      `${mainDriver(hi.r) ? ` (terutama ${esc(mainDriver(hi.r).toLowerCase())})` : ''}; penurunan terdalam <strong class="down">${fmt(lo.r.iph)}</strong> pada ${esc(lo.p.label)}.` +
      (freq.length ? ` Komoditas paling sering bergejolak: <strong>${esc(freq[0][0])}</strong> (${freq[0][1]} kali).` : '');

    $('kbLatest').textContent = fmt(last.r.iph);
    $('kbLatest').className = `kpi-value ${tone(last.r.iph)}`;
    $('kbLatestSub').textContent = last.p.label;
    $('kbAvg').textContent = fmt(avg);
    $('kbAvg').className = `kpi-value ${tone(avg)}`;
    $('kbAvgSub').textContent = `${rows.length} minggu, ${yearText}`;
    $('kbCount').textContent = `${nUp} : ${nDown}`;
    const sp = $('kbSplit').children;
    sp[0].style.width = `${nUp / rows.length * 100}%`; sp[1].style.width = `${nDown / rows.length * 100}%`;
    $('kbVol').textContent = freq.length ? freq[0][0] : '–';
    $('kbVolSub').textContent = freq.length ? `${freq[0][1]} dari ${rows.length} minggu` : 'Tidak ada catatan';

    renderKabChart(rows, code);

    barList($('kbUp'), [...upMax.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 5)
      .map(([nm, o]) => ({ name: nm, value: o.v, text: fmtNum(o.v), note: o.p.short, cls: 'up' })), { empty: 'Tidak ada andil kenaikan.' });
    barList($('kbDown'), [...downMin.entries()].sort((a, b) => a[1].v - b[1].v).slice(0, 5)
      .map(([nm, o]) => ({ name: nm, value: o.v, text: fmtNum(o.v), note: o.p.short, cls: 'down' })), { empty: 'Tidak ada andil penurunan.' });
    barList($('kbFreq'), freq.slice(0, 5).map(([nm, c], i) => ({ name: nm, value: c, text: `${c}×`, cls: i === 0 ? '' : 'muted' })), { empty: 'Tidak ada catatan fluktuasi.' });

    const hist = [...rows].reverse();
    const limit = state.showAll ? hist.length : 10;
    $('kabMore').hidden = hist.length <= 10;
    $('kabMore').textContent = state.showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${hist.length} minggu)`;
    $('kabTable').innerHTML = hist.slice(0, limit).map(({ p, r }) => `
      <tr>
        <td class="name">${esc(p.label)}</td>
        <td class="num ${tone(r.iph)}">${fmt(r.iph)}</td>
        <td><span class="chips">${sortedComms(r).slice(0, 3).map(c => `<span><b>${esc(c.nama)}</b> ${fmtNum(c.kontribusi)}</span>`).join('') || '–'}</span></td>
        <td>${flukOf(r) ? `<span class="tag">${esc(r.fluktuasi_tertinggi)}</span>` : '–'}</td>
      </tr>`).join('');
    writeUrl();
  }

  function renderKabChart(rows) {
    const c = chart('kabChart');
    const many = rows.length > 60;
    c.setOption({
      textStyle: baseText,
      grid: { left: 8, right: 16, top: 12, bottom: many ? 56 : 8, containLabel: true },
      tooltip: {
        ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: items => {
          const i = items[0].dataIndex; const { p, r } = rows[i];
          const comms = sortedComms(r).slice(0, 3).map(x => `${esc(x.nama)} ${fmtNum(x.kontribusi)}`).join('<br>');
          return `<b>${esc(p.label)}</b><br>IPH <b style="color:${r.iph > 0 ? C.up : C.down}">${fmt(r.iph)}</b>` +
            `<br><span style="color:${C.muted}">Rata-rata Sulsel ${fmt(p.avg)}</span>` + (comms ? `<br>${comms}` : '');
        }
      },
      xAxis: { type: 'category', data: rows.map(x => x.p.short), axisLine: { lineStyle: { color: C.line } }, axisTick: { show: false }, axisLabel: { color: C.muted } },
      yAxis: { type: 'value', axisLabel: { formatter: v => `${v > 0 ? '+' : ''}${v}%`, color: C.muted }, splitLine: { lineStyle: { color: '#f0f2f4' } } },
      dataZoom: many ? [{ type: 'slider', start: Math.max(0, 100 - 52 / rows.length * 100), end: 100, height: 22, bottom: 8, borderColor: C.line, fillerColor: 'rgba(14,116,144,.12)', showDetail: false, brushSelect: false }, { type: 'inside' }] : [],
      series: [
        { name: 'IPH', type: 'bar', barMaxWidth: 18, data: rows.map(x => ({ value: x.r.iph, itemStyle: { color: x.r.iph >= 0 ? C.up : C.down, borderRadius: x.r.iph >= 0 ? [2, 2, 0, 0] : [0, 0, 2, 2] } })) },
        { name: 'Rata-rata Sulsel', type: 'line', data: rows.map(x => x.p.avg), showSymbol: false, lineStyle: { color: C.faint, width: 1.6, type: 'dashed' }, itemStyle: { color: C.faint }, z: 3 }
      ]
    }, true);
  }

  // =====================================================================
  // Navigasi, CSV, inisialisasi
  // =====================================================================
  function show(view) {
    state.view = view;
    $('viewSulsel').hidden = view !== 'sulsel';
    $('viewKab').hidden = view !== 'kab';
    $('tabSulsel').setAttribute('aria-selected', view === 'sulsel');
    $('tabKab').setAttribute('aria-selected', view === 'kab');
    if (view === 'sulsel') renderSulsel(); else renderKab();
    requestAnimationFrame(() => Object.values(charts).forEach(c => c.resize()));
  }

  function openKab(code) {
    if (!kabs.some(k => k.code === code)) return;
    state.kab = code;
    state.year = periods[state.pIdx].year;
    show('kab');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  function bind() {
    $('tabSulsel').onclick = () => show('sulsel');
    $('tabKab').onclick = () => {
      if (!state.kab) state.kab = kabs[0].code;
      show('kab');
    };
    $('helpBtn').onclick = () => $('helpDialog').showModal();

    // Pilihan minggu dikelompokkan per tahun (terbaru di atas)
    $('periodSelect').innerHTML = years().map(y => `<optgroup label="${y}">${periods.map((p, i) => ({ p, i })).filter(x => x.p.year === y).reverse()
      .map(({ p }) => `<option value="${p.key}">${MONTH[p.month]} ${p.year}, minggu ${p.week}</option>`).join('')}</optgroup>`).join('');
    $('periodSelect').onchange = e => { state.pIdx = periods.findIndex(p => p.key === e.target.value); renderSulsel(); };
    $('prevPeriod').onclick = () => { if (state.pIdx > 0) { state.pIdx--; renderSulsel(); } };
    $('nextPeriod').onclick = () => { if (state.pIdx < periods.length - 1) { state.pIdx++; renderSulsel(); } };

    $('compareSelect').innerHTML = '<option value="">—</option>' + kabs.map(k => `<option value="${k.code}">${esc(shortName(k.name))}</option>`).join('');
    $('compareSelect').onchange = e => { state.compare = e.target.value; renderTrend(); };

    $('tableSearch').oninput = e => { state.search = e.target.value; renderWeekTable([...periods[state.pIdx].recs].sort((a, b) => b.iph - a.iph)); };
    const rowOpen = e => { const tr = e.target.closest('tr[data-kab]'); if (tr) openKab(tr.dataset.kab); };
    $('weekTable').onclick = rowOpen;
    $('weekTable').onkeydown = e => { if (e.key === 'Enter') rowOpen(e); };

    $('csvWeek').onclick = () => {
      const p = periods[state.pIdx];
      downloadCsv(`IPH_Sulsel_${p.key}.csv`, ['Periode', 'Kode', 'Kab/Kota', 'IPH (%)', 'Status', 'Andil komoditas', 'Fluktuasi tertinggi', 'Nilai CV'],
        [...p.recs].sort((a, b) => b.iph - a.iph).map(r => [p.label, r.kode_kab, r.nama_kab, r.iph, r.status, andilText(r), r.fluktuasi_tertinggi || '-', r.cv ?? '']));
    };

    $('kabSelect').innerHTML = kabs.map(k => `<option value="${k.code}">${esc(k.name)}</option>`).join('');
    $('kabSelect').onchange = e => { state.kab = e.target.value; state.showAll = false; renderKab(); };
    $('yearSelect').onchange = e => { state.year = e.target.value === 'semua' ? 'semua' : +e.target.value; state.showAll = false; renderKab(); };
    $('kabMore').onclick = () => { state.showAll = !state.showAll; renderKab(); };
    $('csvKab').onclick = () => {
      const rows = periods.filter(p => (state.year === 'semua' || p.year === state.year) && recOf(p, state.kab));
      downloadCsv(`IPH_${shortName(kabName[state.kab]).replace(/\s+/g, '_')}_${state.year}.csv`,
        ['Periode', 'Kode periode', 'IPH (%)', 'Rata-rata Sulsel (%)', 'Status', 'Andil komoditas', 'Fluktuasi tertinggi', 'Nilai CV'],
        rows.map(p => { const r = recOf(p, state.kab); return [p.label, p.key, r.iph, p.avg, r.status, andilText(r), r.fluktuasi_tertinggi || '-', r.cv ?? '']; }));
    };
    $('shareBtn').onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); toast('Tautan disalin'); }
      catch { prompt('Salin tautan ini:', location.href); }
    };

    chart('mapChart').on('click', d => { if (d.data && d.data.rec) openKab(d.data.code); });
    chart('rankChart').on('click', d => {
      const recs = [...periods[state.pIdx].recs].sort((a, b) => a.iph - b.iph);
      if (recs[d.dataIndex]) openKab(recs[d.dataIndex].kode_kab);
    });

    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => Object.values(charts).forEach(c => c.resize()), 120); });
  }

  async function init() {
    try {
      const [raw, g] = await Promise.all([
        fetch('data/iph_sulsel.json').then(r => { if (!r.ok) throw new Error('data IPH'); return r.json(); }),
        fetch('data/sulsel_geo.json').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      buildModel(raw);
      if (!periods.length) throw new Error('data IPH kosong');
      if (g) { geo = g; echarts.registerMap('sulsel', g); }
      const first = periods[0], last = periods[periods.length - 1];
      $('dataInfo').textContent = `Data: ${periods.length} rilis, ${MONTH[first.month]} ${first.year} – ${last.label}` +
        (raw.meta && raw.meta.generated_at ? `; diperbarui ${new Date(raw.meta.generated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.` : '.');
      $('loading').hidden = true;
      $('viewSulsel').hidden = false; // agar ukuran grafik benar saat inisialisasi
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
