// SIPH Sulsel Interactive Dashboard Logic
(function() {
  'use strict';

  let rawData = null;
  let geoData = null;
  let currentPeriod = null;
  let mapChart = null;
  let barChart = null;
  let timeSeriesChart = null;
  let commodityChart = null;
  let selectedKabForTimeline = ['Rata-rata Sulsel', 'Kab. Takalar', 'Kab. Gowa', 'Kab. Maros'];

  // DOM Elements
  const periodSelect = document.getElementById('periodSelect');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportCsvBtnMobile = document.getElementById('exportCsvBtnMobile');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const tableSearchInput = document.getElementById('tableSearchInput');
  const tableStatusFilter = document.getElementById('tableStatusFilter');
  const filterAllBtn = document.getElementById('filterAllBtn');

  // KPI Elements
  const kpiAvgVal = document.getElementById('kpiAvgVal');
  const kpiAvgBadge = document.getElementById('kpiAvgBadge');
  const kpiPeriodLabel = document.getElementById('kpiPeriodLabel');
  const kpiNaikCount = document.getElementById('kpiNaikCount');
  const kpiTurunCount = document.getElementById('kpiTurunCount');
  const kpiStabilCount = document.getElementById('kpiStabilCount');
  const kpiGainerVal = document.getElementById('kpiGainerVal');
  const kpiGainerName = document.getElementById('kpiGainerName');
  const kpiLoserTitle = document.getElementById('kpiLoserTitle');
  const kpiLoserVal = document.getElementById('kpiLoserVal');
  const kpiLoserName = document.getElementById('kpiLoserName');
  const kpiLoserSubtext = document.getElementById('kpiLoserSubtext');
  const kpiThreatName = document.getElementById('kpiThreatName');
  const narrativeInsightText = document.getElementById('narrativeInsightText');
  const rankingPeriodBadge = document.getElementById('rankingPeriodBadge');
  const dataTableBody = document.getElementById('dataTableBody');
  const tableRowsCount = document.getElementById('tableRowsCount');
  const tableRowsCountMobile = document.getElementById('tableRowsCountMobile');
  const kabFiltersContainer = document.getElementById('kabFiltersContainer');

  // Load Data
  async function init() {
    try {
      const [iphRes, geoRes] = await Promise.all([
        fetch('data/iph_sulsel.json'),
        fetch('data/sulsel_geo.json')
      ]);

      rawData = await iphRes.json();
      geoData = await geoRes.json();

      // Register map to ECharts
      echarts.registerMap('sulsel', geoData);
      document.getElementById('mapLoading')?.remove();

      // Populate Period Select (reverse order: newest first)
      const periods = [...rawData.periods].reverse();
      periods.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = p.period_key;
        opt.textContent = `${p.label} [IPH: ${p.avg_iph > 0 ? '+' : ''}${p.avg_iph}%]`;
        if (idx === 0) opt.selected = true;
        periodSelect.appendChild(opt);
      });

      // Default to newest period
      currentPeriod = periods[0];

      // Setup Regency Chips for Timeline
      initRegencyChips();

      // Initialize Charts
      initCharts();

      // Render Current View
      updateView();

      // Setup Listeners
      setupEventListeners();

    } catch (err) {
      console.error('Failed to load SIPH data:', err);
      alert('Gagal memuat data SIPH Sulsel. Periksa koneksi atau berkas data.');
    }
  }

  function setupEventListeners() {
    periodSelect.addEventListener('change', (e) => {
      currentPeriod = rawData.periods.find(p => p.period_key === e.target.value);
      updateView();
    });

    tableSearchInput.addEventListener('input', renderTable);
    tableStatusFilter.addEventListener('change', renderTable);

    exportCsvBtn.addEventListener('click', exportCurrentPeriodCsv);
    exportCsvBtnMobile?.addEventListener('click', exportCurrentPeriodCsv);
    downloadJsonBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siph_sulsel_${currentPeriod.period_key}.json`;
      a.click();
    });

    filterAllBtn.addEventListener('click', () => {
      // Zoom out timeline to full range
      if (timeSeriesChart) {
        timeSeriesChart.dispatchAction({
          type: 'dataZoom',
          start: 0,
          end: 100
        });
      }
      document.getElementById('timeSeriesChart').scrollIntoView({ behavior: 'smooth' });
    });

    window.addEventListener('resize', () => {
      renderMapChart();
      renderBarRanking();
      renderTimeSeriesChart();
      renderCommodityChart();
      mapChart?.resize();
      barChart?.resize();
      timeSeriesChart?.resize();
      commodityChart?.resize();
    });
  }

  function initRegencyChips() {
    kabFiltersContainer.innerHTML = '';
    const topChoices = ['Rata-rata Sulsel', 'Kab. Takalar', 'Kab. Gowa', 'Kab. Maros', 'Kab. Bantaeng', 'Kab. Luwu', 'Kab. Bone'];
    
    topChoices.forEach(name => {
      const chip = document.createElement('button');
      chip.className = `chip-filter text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 transition ${
        selectedKabForTimeline.includes(name) ? 'active bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`;
      chip.textContent = name.replace('Kab. ', '');
      chip.addEventListener('click', () => {
        if (selectedKabForTimeline.includes(name)) {
          if (selectedKabForTimeline.length > 1) {
            selectedKabForTimeline = selectedKabForTimeline.filter(k => k !== name);
          }
        } else {
          selectedKabForTimeline.push(name);
        }
        initRegencyChips();
        renderTimeSeriesChart();
      });
      kabFiltersContainer.appendChild(chip);
    });
  }

  function updateView() {
    if (!currentPeriod) return;

    renderKPIs();
    renderNarrative();
    renderMapChart();
    renderBarRanking();
    renderTimeSeriesChart();
    renderCommodityChart();
    renderTable();
  }

  // 1. KPI Cards
  function renderKPIs() {
    const p = currentPeriod;
    const avg = p.avg_iph;

    kpiAvgVal.textContent = `${avg > 0 ? '+' : ''}${avg.toFixed(2)}%`;
    kpiAvgVal.className = `text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${
      avg > 0 ? 'text-rose-600' : (avg < 0 ? 'text-emerald-600' : 'text-slate-800')
    }`;

    if (avg > 0) {
      kpiAvgBadge.textContent = 'INFLASI';
      kpiAvgBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-700';
    } else if (avg < 0) {
      kpiAvgBadge.textContent = 'DEFLASI';
      kpiAvgBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700';
    } else {
      kpiAvgBadge.textContent = 'STABIL';
      kpiAvgBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700';
    }

    kpiPeriodLabel.textContent = p.label;
    kpiNaikCount.textContent = p.counts.naik;
    kpiTurunCount.textContent = p.counts.turun;
    kpiStabilCount.textContent = `${p.counts.stabil} Wilayah Stabil`;

    if (p.top_gainer && p.top_gainer.iph !== null) {
      kpiGainerVal.textContent = `${p.top_gainer.iph > 0 ? '+' : ''}${p.top_gainer.iph.toFixed(2)}%`;
      kpiGainerName.textContent = p.top_gainer.name;
    } else {
      kpiGainerVal.textContent = '-';
      kpiGainerName.textContent = '-';
    }

    if (p.top_loser && p.top_loser.iph !== null) {
      if (p.top_loser.iph > 0) {
        kpiLoserTitle.textContent = 'Kenaikan Terendah';
        kpiLoserTitle.parentElement.className = 'text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1';
        kpiLoserVal.className = 'text-xl sm:text-2xl font-bold font-mono text-slate-700';
        kpiLoserVal.textContent = `+${p.top_loser.iph.toFixed(2)}%`;
        kpiLoserSubtext.textContent = 'Kenaikan harga paling minim';
      } else {
        kpiLoserTitle.textContent = '▼ Penurunan Terdalam';
        kpiLoserTitle.parentElement.className = 'text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1';
        kpiLoserVal.className = 'text-xl sm:text-2xl font-bold font-mono text-emerald-600';
        kpiLoserVal.textContent = `${p.top_loser.iph.toFixed(2)}%`;
        kpiLoserSubtext.textContent = 'Deflasi mingguan terbesar';
      }
      kpiLoserName.textContent = p.top_loser.name;
    } else {
      kpiLoserTitle.textContent = '▼ Penurunan Terdalam';
      kpiLoserVal.textContent = '-';
      kpiLoserName.textContent = '-';
    }

    kpiThreatName.textContent = p.top_threat || 'Cabai Rawit';
    rankingPeriodBadge.textContent = p.period_key;
  }

  // 2. Narrative Policy Insight
  function renderNarrative() {
    const p = currentPeriod;
    const avg = p.avg_iph;
    const trendText = avg > 0 ? 'mengalami tren kenaikan rata-rata harga pangan' : (avg < 0 ? 'mencatatkan deflasi / penurunan harga rata-rata' : 'berada dalam kondisi harga yang relatif stabil');
    const threatText = p.top_threat && p.top_threat !== '-' ? `dengan komoditas pemicu gejolak dominan adalah <strong>${p.top_threat}</strong>` : '';
    const gainerText = p.top_gainer ? `Tekanan inflasi tertinggi dialami oleh <strong>${p.top_gainer.name}</strong> (${p.top_gainer.iph > 0 ? '+' : ''}${p.top_gainer.iph}%)` : '';

    narrativeInsightText.innerHTML = `Pada <strong>${p.label}</strong>, Sulawesi Selatan ${trendText} sebesar <strong>${avg > 0 ? '+' : ''}${avg}%</strong>. Sebanyak <strong>${p.counts.naik}</strong> kabupaten/kota berstatus naik, <strong>${p.counts.turun}</strong> daerah turun, ${threatText}. ${gainerText}. Prioritaskan pemantauan rantai pasok dan operasi pasar terpadu TPID.`;
  }

  // 3. Initialize Chart Instances
  function initCharts() {
    mapChart = echarts.init(document.getElementById('mapChartContainer'));
    barChart = echarts.init(document.getElementById('barRankingChart'));
    timeSeriesChart = echarts.init(document.getElementById('timeSeriesChart'));
    commodityChart = echarts.init(document.getElementById('commodityBarChart'));

    // Map click handler to focus on timeline
    mapChart.on('click', (params) => {
      if (params.name && !selectedKabForTimeline.includes(params.name)) {
        selectedKabForTimeline.push(params.name);
        initRegencyChips();
        renderTimeSeriesChart();
        document.getElementById('timeSeriesChart').scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 4. Map Chart
  function renderMapChart() {
    const p = currentPeriod;
    const isMobile = window.innerWidth < 640;
    const recMap = {};
    p.records.forEach(r => { recMap[r.nama_kab] = r; });

    // Build series data matching GeoJSON feature names
    const mapData = geoData.features.map(f => {
      const name = f.properties.name;
      const rec = recMap[name];
      return {
        name: name,
        value: rec && rec.iph !== null ? rec.iph : null,
        record: rec
      };
    });

    const option = {
      tooltip: {
        trigger: 'item',
        className: 'echarts-tooltip',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: isMobile ? 11 : 12 },
        formatter: (params) => {
          const rec = params.data?.record;
          if (!rec) {
            return `<strong>${params.name}</strong><br/><span style="color:#94a3b8">Data IHK Bulanan / Non-IPH</span>`;
          }
          const iphColor = rec.iph > 0 ? '#fb7185' : (rec.iph < 0 ? '#34d399' : '#94a3b8');
          const commList = rec.komoditas && rec.komoditas.length > 0 
            ? rec.komoditas.map(c => `<li>• ${c.nama}: <span style="font-family:monospace">${c.kontribusi > 0 ? '+' : ''}${c.kontribusi}</span></li>`).join('')
            : '<li>• Tidak ada data andil</li>';

          return `
            <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:${isMobile ? 160 : 180}px;">
              <div style="font-weight:700; font-size:${isMobile ? 12 : 13}px; margin-bottom:4px; border-bottom:1px solid #334155; padding-bottom:3px;">
                ${rec.nama_kab}
              </div>
              <div style="display:flex; justify-content:space-between; margin:4px 0;">
                <span style="color:#94a3b8">IPH:</span>
                <strong style="color:${iphColor}; font-family:monospace; font-size:${isMobile ? 12 : 13}px;">${rec.iph > 0 ? '+' : ''}${rec.iph}% (${rec.status})</strong>
              </div>
              <div style="margin-top:6px; color:#cbd5e1; font-size:11px;">
                <div style="color:#94a3b8; font-weight:600; margin-bottom:2px;">Andil Komoditas:</div>
                <ul style="padding-left:0; list-style:none; margin:0; line-height:1.4;">${commList}</ul>
              </div>
              <div style="margin-top:6px; padding-top:4px; border-top:1px dashed #334155; color:#94a3b8; font-size:11px;">
                Fluktuasi: <strong style="color:#f8fafc">${rec.fluktuasi_tertinggi || '-'}</strong>
              </div>
            </div>
          `;
        }
      },
      visualMap: {
        min: -3,
        max: 3,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        itemWidth: isMobile ? 12 : 16,
        itemHeight: isMobile ? 90 : 130,
        inRange: {
          color: ['#10b981', '#6ee7b7', '#f8fafc', '#fca5a5', '#e11d48']
        },
        text: ['+3% Inflasi', '-3% Deflasi'],
        textStyle: { color: '#64748b', fontSize: isMobile ? 10 : 11 }
      },
      series: [
        {
          name: 'IPH Sulsel',
          type: 'map',
          map: 'sulsel',
          roam: !isMobile, // Disable roam on mobile so vertical page scroll is not trapped
          zoom: isMobile ? 1.2 : 1.25,
          center: isMobile ? [120.1, -3.85] : [120.2, -4.0],
          emphasis: {
            label: { show: true, color: '#0f172a', fontWeight: 'bold' },
            itemStyle: { areaColor: '#fde047', borderColor: '#0f172a', borderWidth: 1.5 }
          },
          select: {
            itemStyle: { areaColor: '#facc15' }
          },
          itemStyle: {
            borderColor: '#cbd5e1',
            borderWidth: 0.8,
            areaColor: '#f1f5f9'
          },
          data: mapData
        }
      ]
    };

    mapChart.setOption(option);
  }

  // 5. Horizontal Bar Ranking
  function renderBarRanking() {
    const p = currentPeriod;
    const isMobile = window.innerWidth < 640;
    const sorted = [...p.records].sort((a, b) => a.iph - b.iph);

    const names = sorted.map(r => 
      r.nama_kab
        .replace('Kab. ', '')
        .replace('Kota ', '')
        .replace('Pangkajene Kepulauan', 'Pangkep')
        .replace('Kepulauan Selayar', 'Selayar')
    );
    const values = sorted.map(r => r.iph);

    const option = {
      grid: { top: 10, right: isMobile ? 15 : 30, bottom: 25, left: isMobile ? 76 : 120 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params[0];
          const rec = sorted[item.dataIndex];
          return `<strong>${rec.nama_kab}</strong><br/>IPH: <strong>${rec.iph > 0 ? '+' : ''}${rec.iph}%</strong> (${rec.status})<br/>Fluktuasi: ${rec.fluktuasi_tertinggi}`;
        }
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: isMobile ? 10 : 11, formatter: '{value}%' }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisTick: { show: false },
        axisLabel: { color: '#334155', fontSize: isMobile ? 10 : 11, fontWeight: 500 }
      },
      series: [
        {
          type: 'bar',
          data: values.map(val => ({
            value: val,
            itemStyle: {
              color: val > 0 ? '#f43f5e' : (val < 0 ? '#10b981' : '#94a3b8'),
              borderRadius: val > 0 ? [0, 4, 4, 0] : [4, 0, 0, 4]
            }
          })),
          barWidth: isMobile ? 10 : 12
        }
      ]
    };

    barChart.setOption(option);
  }

  // 6. Time Series Multi-Line Explorer
  function renderTimeSeriesChart() {
    const periods = rawData.periods;
    const isMobile = window.innerWidth < 640;
    const labels = periods.map(p => p.period_key);

    const seriesList = [];

    // Series 1: Rata-rata Sulsel
    if (selectedKabForTimeline.includes('Rata-rata Sulsel')) {
      seriesList.push({
        name: 'Rata-rata Sulsel',
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: isMobile ? 2.2 : 3, color: '#0f172a' },
        itemStyle: { color: '#0f172a' },
        data: periods.map(p => p.avg_iph)
      });
    }

    // Regencies series
    const palette = ['#e11d48', '#0284c7', '#16a34a', '#d97706', '#9333ea', '#0d9488'];
    let cIdx = 0;

    for (const [code, info] of Object.entries(rawData.regencies_time_series)) {
      if (selectedKabForTimeline.includes(info.name)) {
        const color = palette[cIdx % palette.length];
        cIdx++;
        seriesList.push({
          name: info.name,
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: isMobile ? 1.5 : 1.8, color: color },
          itemStyle: { color: color },
          data: info.series.map(s => s.iph)
        });
      }
    }

    const option = {
      grid: { top: 25, right: isMobile ? 12 : 20, bottom: isMobile ? 70 : 65, left: isMobile ? 38 : 45 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { color: '#94a3b8' } },
        formatter: (params) => {
          let html = `<div style="font-weight:700; font-size:12px; margin-bottom:4px;">${params[0].axisValue}</div>`;
          params.forEach(p => {
            html += `<div style="display:flex; justify-content:space-between; gap:12px; font-size:11px;">
              <span style="color:${p.color};">• ${p.seriesName.replace('Kab. ', '')}:</span>
              <strong>${p.value !== null && p.value !== undefined ? (p.value > 0 ? '+' : '') + p.value + '%' : '-'}</strong>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        bottom: 0,
        itemWidth: isMobile ? 14 : 25,
        itemHeight: isMobile ? 8 : 12,
        textStyle: { color: '#475569', fontSize: isMobile ? 10 : 11 },
        icon: 'roundRect'
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: {
          color: '#64748b',
          fontSize: isMobile ? 9 : 10,
          formatter: (val) => val.split('-').slice(0, 2).join('-')
        }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { lineStyle: { color: '#f8fafc' } },
        axisLabel: { color: '#64748b', fontSize: isMobile ? 9 : 10, formatter: '{value}%' }
      },
      dataZoom: [
        { type: 'inside', start: 70, end: 100 },
        {
          type: 'slider',
          start: 70,
          end: 100,
          height: isMobile ? 14 : 18,
          bottom: isMobile ? 22 : 25,
          borderColor: '#e2e8f0',
          fillerColor: 'rgba(15, 23, 42, 0.1)',
          textStyle: { fontSize: isMobile ? 9 : 10 }
        }
      ],
      series: seriesList
    };

    timeSeriesChart.setOption(option, true);
  }

  // 7. Commodity Frequency Chart
  function renderCommodityChart() {
    const isMobile = window.innerWidth < 640;
    const threats = rawData.top_overall_commodities.slice(0, 8);
    const names = threats.map(t => t.name).reverse();
    const counts = threats.map(t => t.count).reverse();

    const option = {
      grid: { top: 10, right: isMobile ? 25 : 35, bottom: 20, left: isMobile ? 95 : 120 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const item = params[0];
          return `<strong>${item.name}</strong><br/>Muncul sebagai Fluktuasi Tertinggi: <strong>${item.value} kali</strong>`;
        }
      },
      xAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: isMobile ? 10 : 11 }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisTick: { show: false },
        axisLabel: { color: '#334155', fontSize: isMobile ? 10 : 11, fontWeight: 500 }
      },
      series: [
        {
          type: 'bar',
          data: counts,
          barWidth: isMobile ? 11 : 14,
          itemStyle: {
            color: '#f59e0b',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };

    commodityChart.setOption(option);
  }

  // 8. Detailed Data Table
  function renderTable() {
    const p = currentPeriod;
    const query = (tableSearchInput.value || '').toLowerCase().trim();
    const statusFilter = tableStatusFilter.value;

    let filtered = p.records.filter(r => {
      const matchSearch = r.nama_kab.toLowerCase().includes(query) || r.kode_kab.includes(query);
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });

    dataTableBody.innerHTML = '';
    tableRowsCount.textContent = `Menampilkan ${filtered.length} dari ${p.records.length} daerah`;
    if (tableRowsCountMobile) {
      tableRowsCountMobile.textContent = `${filtered.length} daerah`;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

      const iphBadgeColor = r.status === 'Naik' ? 'text-rose-600 bg-rose-50' : (r.status === 'Turun' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-50');
      const commBadges = r.komoditas && r.komoditas.length > 0 
        ? r.komoditas.map(c => `<span class="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-0.5 font-medium">${c.nama} (${c.kontribusi > 0 ? '+' : ''}${c.kontribusi})</span>`).join('')
        : '<span class="text-slate-400">-</span>';

      tr.innerHTML = `
        <td class="px-4 py-3 font-mono text-slate-400">${r.kode_kab}</td>
        <td class="px-4 py-3 font-semibold text-slate-800">${r.nama_kab}</td>
        <td class="px-4 py-3 text-right font-mono font-bold ${r.iph > 0 ? 'text-rose-600' : (r.iph < 0 ? 'text-emerald-600' : 'text-slate-600')}">
          ${r.iph !== null ? (r.iph > 0 ? '+' : '') + r.iph.toFixed(2) + '%' : '-'}
        </td>
        <td class="px-4 py-3 text-center">
          <span class="px-2 py-0.5 rounded text-[11px] font-bold ${iphBadgeColor}">${r.status}</span>
        </td>
        <td class="px-4 py-3 max-w-xs">${commBadges}</td>
        <td class="px-4 py-3 font-medium text-slate-700">${r.fluktuasi_tertinggi || '-'}</td>
        <td class="px-4 py-3 text-right font-mono text-slate-500">${r.cv !== null ? r.cv.toFixed(4) : '-'}</td>
      `;
      dataTableBody.appendChild(tr);
    });
  }

  // 9. Export CSV Functionality
  function exportCurrentPeriodCsv() {
    const p = currentPeriod;
    const headers = ['Periode', 'Kode_Kab', 'Nama_Kabupaten', 'IPH_Persen', 'Status', 'Komoditas_Utama', 'Fluktuasi_Tertinggi', 'Nilai_CV'];
    const rows = p.records.map(r => {
      const comms = r.komoditas ? r.komoditas.map(c => `${c.nama}(${c.kontribusi})`).join('; ') : '';
      return [
        p.period_key,
        r.kode_kab,
        `"${r.nama_kab}"`,
        r.iph !== null ? r.iph : '',
        r.status,
        `"${comms}"`,
        `"${r.fluktuasi_tertinggi || ''}"`,
        r.cv !== null ? r.cv : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPH_Sulsel_${p.period_key}.csv`;
    link.click();
  }

  // Start app
  init();
})();
