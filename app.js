// SIPH Sulsel Interactive Dashboard Logic
(function() {
  'use strict';

  let rawData = null;
  let geoData = null;
  let currentPeriod = null;
  let currentTab = 'sulsel'; // 'sulsel' | 'kabupaten'
  let selectedKabCode = '7301'; // Default: Kab. Kepulauan Selayar
  let selectedKabYear = '2026';
  let selectedKabMonth = 'ALL';
  let selectedKabCommodity = 'ALL';

  // Chart Instances
  let mapChart = null;
  let barChart = null;
  let timeSeriesChart = null;
  let commodityChart = null;
  let kabTimeSeriesChart = null;
  let kabThreatChart = null;
  let selectedKabForTimeline = ['Rata-rata Sulsel', 'Kab. Takalar', 'Kab. Gowa', 'Kab. Maros'];

  // DOM Elements - Navigation & Quick Pick
  const tabSulselBtn = document.getElementById('tabSulselBtn');
  const tabKabupatenBtn = document.getElementById('tabKabupatenBtn');
  const viewSulsel = document.getElementById('viewSulsel');
  const viewKabupaten = document.getElementById('viewKabupaten');
  const headerQuickKabSelect = document.getElementById('headerQuickKabSelect');
  const headerQuickKabContainer = document.getElementById('headerQuickKabContainer');
  const headerPeriodWrapper = document.getElementById('headerPeriodWrapper');

  // DOM Elements - Sulsel View
  const periodSelect = document.getElementById('periodSelect');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportCsvBtnMobile = document.getElementById('exportCsvBtnMobile');
  const downloadJsonBtn = document.getElementById('downloadJsonBtn');
  const tableSearchInput = document.getElementById('tableSearchInput');
  const tableStatusFilter = document.getElementById('tableStatusFilter');
  const filterAllBtn = document.getElementById('filterAllBtn');

  // KPI Elements - Sulsel View
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

  // DOM Elements - Kabupaten View
  const kabSelect = document.getElementById('kabSelect');
  const kabYearSelect = document.getElementById('kabYearSelect');
  const kabMonthSelect = document.getElementById('kabMonthSelect');
  const kabCommoditySelect = document.getElementById('kabCommoditySelect');
  const kabShareLinkBtn = document.getElementById('kabShareLinkBtn');
  const kabShareLinkText = document.getElementById('kabShareLinkText');
  const kabExportCsvBtn = document.getElementById('kabExportCsvBtn');
  const kabOpenSlideModalBtn = document.getElementById('kabOpenSlideModalBtn');
  const kabQuickChipsContainer = document.getElementById('kabQuickChipsContainer');

  const kabTitleHeader = document.getElementById('kabTitleHeader');
  const kabBadgeStatusType = document.getElementById('kabBadgeStatusType');
  const kabSubtitleHeader = document.getElementById('kabSubtitleHeader');
  const kabChartLineTitle = document.getElementById('kabChartLineTitle');
  const kabLineYearBadge = document.getElementById('kabLineYearBadge');
  const kabTableHeading = document.getElementById('kabTableHeading');
  const kabNarrativeText = document.getElementById('kabNarrativeText');
  const kabScrollToHistoryBtn = document.getElementById('kabScrollToHistoryBtn');

  // KPI Elements - Kabupaten View
  const kabKpiLatestVal = document.getElementById('kabKpiLatestVal');
  const kabKpiLatestBadge = document.getElementById('kabKpiLatestBadge');
  const kabKpiLatestSub = document.getElementById('kabKpiLatestSub');
  const kabKpiRankVal = document.getElementById('kabKpiRankVal');
  const kabKpiRankSub = document.getElementById('kabKpiRankSub');
  const kabKpiAvgVal = document.getElementById('kabKpiAvgVal');
  const kabKpiAvgSub = document.getElementById('kabKpiAvgSub');
  const kabKpiPeakVal = document.getElementById('kabKpiPeakVal');
  const kabKpiPeakLabel = document.getElementById('kabKpiPeakLabel');
  const kabKpiTroughVal = document.getElementById('kabKpiTroughVal');
  const kabKpiTroughLabel = document.getElementById('kabKpiTroughLabel');
  const kabKpiThreatVal = document.getElementById('kabKpiThreatVal');
  const kabKpiThreatSub = document.getElementById('kabKpiThreatSub');

  // Driver Lists & Table - Kabupaten View
  const kabTopInflationList = document.getElementById('kabTopInflationList');
  const kabTopDeflationList = document.getElementById('kabTopDeflationList');
  const kabTableSearchInput = document.getElementById('kabTableSearchInput');
  const kabTableStatusFilter = document.getElementById('kabTableStatusFilter');
  const kabDataTableBody = document.getElementById('kabDataTableBody');
  const kabTableRowsCount = document.getElementById('kabTableRowsCount');

  // Slide Modal Elements
  const slideModal = document.getElementById('slideModal');
  const slideModalTitle = document.getElementById('slideModalTitle');
  const slideModalSubtitle = document.getElementById('slideModalSubtitle');
  const slideModalPrintBtn = document.getElementById('slideModalPrintBtn');
  const slideModalCloseBtn = document.getElementById('slideModalCloseBtn');
  const slidePrintArea = document.getElementById('slidePrintArea');

  // List of 24 Regencies in Sulsel
  const KAB_LIST = [
    { code: '7301', name: 'Kab. Kepulauan Selayar', isIHK: false },
    { code: '7302', name: 'Kab. Bulukumba', isIHK: true },
    { code: '7303', name: 'Kab. Bantaeng', isIHK: false },
    { code: '7304', name: 'Kab. Jeneponto', isIHK: false },
    { code: '7305', name: 'Kab. Takalar', isIHK: false },
    { code: '7306', name: 'Kab. Gowa', isIHK: false },
    { code: '7307', name: 'Kab. Sinjai', isIHK: false },
    { code: '7308', name: 'Kab. Maros', isIHK: false },
    { code: '7309', name: 'Kab. Pangkajene Kepulauan', isIHK: false },
    { code: '7310', name: 'Kab. Barru', isIHK: false },
    { code: '7311', name: 'Kab. Bone', isIHK: true },
    { code: '7312', name: 'Kab. Soppeng', isIHK: false },
    { code: '7313', name: 'Kab. Wajo', isIHK: false },
    { code: '7314', name: 'Kab. Sidenreng Rappang', isIHK: false },
    { code: '7315', name: 'Kab. Pinrang', isIHK: false },
    { code: '7316', name: 'Kab. Enrekang', isIHK: false },
    { code: '7317', name: 'Kab. Luwu', isIHK: false },
    { code: '7318', name: 'Kab. Tana Toraja', isIHK: false },
    { code: '7322', name: 'Kab. Luwu Utara', isIHK: false },
    { code: '7325', name: 'Kab. Luwu Timur', isIHK: false },
    { code: '7326', name: 'Kab. Toraja Utara', isIHK: false },
    { code: '7371', name: 'Kota Makassar', isIHK: true },
    { code: '7372', name: 'Kota Parepare', isIHK: true },
    { code: '7373', name: 'Kota Palopo', isIHK: true }
  ];

  // Resolve Initial Kabupaten (from URL param or LocalStorage)
  function resolveInitialKab() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('kab') || urlParams.get('daerah') || window.location.hash.replace('#', '');
      if (query) {
        const q = query.toLowerCase().trim();
        const found = KAB_LIST.find(k => k.code === q || k.name.toLowerCase().includes(q) || k.code.includes(q));
        if (found) {
          currentTab = 'kabupaten';
          return found.code;
        }
      }
      const saved = localStorage.getItem('siph_preferred_kab');
      if (saved && KAB_LIST.some(k => k.code === saved)) {
        return saved;
      }
    } catch (_) {}
    return '7301'; // Default: Kab. Kepulauan Selayar
  }

  // Initialize Application
  async function init() {
    try {
      selectedKabCode = resolveInitialKab();

      const [iphRes, geoRes] = await Promise.all([
        fetch('data/iph_sulsel.json'),
        fetch('data/sulsel_geo.json')
      ]);

      rawData = await iphRes.json();
      geoData = await geoRes.json();

      // Register map to ECharts
      echarts.registerMap('sulsel', geoData);
      document.getElementById('mapLoading')?.remove();

      // Populate Sulsel Period Select
      const periods = [...rawData.periods].reverse();
      periods.forEach((p, idx) => {
        const opt = document.createElement('option');
        opt.value = p.period_key;
        opt.textContent = `${p.label} [IPH: ${p.avg_iph > 0 ? '+' : ''}${p.avg_iph}%]`;
        if (idx === 0) opt.selected = true;
        periodSelect.appendChild(opt);
      });
      currentPeriod = periods[0];

      // Populate Selectors
      populateKabupatenSelect();
      populateHeaderQuickSelect();
      updateCommodityDropdown(selectedKabCode);
      renderQuickChips();

      // Setup Regency Chips for Timeline
      initRegencyChips();

      // Initialize Charts
      initCharts();

      // Render Current Views
      updateView();
      renderKabupatenView();

      // Switch to kabupaten tab if opened via direct link
      if (currentTab === 'kabupaten') {
        switchTab('kabupaten');
      }

      // Setup Listeners
      setupEventListeners();

      // Expose switch helper to global window for cross-component navigation
      window.switchAndAnalyze = function(code) {
        setKabupaten(code);
        switchTab('kabupaten');
      };

    } catch (err) {
      console.error('Failed to load SIPH data:', err);
      alert('Gagal memuat data SIPH Sulsel. Periksa koneksi atau berkas data.');
    }
  }

  function setKabupaten(code) {
    selectedKabCode = code;
    try {
      localStorage.setItem('siph_preferred_kab', code);
      const url = new URL(window.location);
      url.searchParams.delete('daerah');
      url.searchParams.set('kab', code);
      window.history.replaceState({}, '', url);
    } catch (_) {}

    if (kabSelect) kabSelect.value = code;
    if (headerQuickKabSelect) headerQuickKabSelect.value = code;

    selectedKabCommodity = 'ALL';
    updateCommodityDropdown(code);
    renderQuickChips();
    renderKabupatenView();
  }

  function populateKabupatenSelect() {
    if (!kabSelect) return;
    kabSelect.innerHTML = '';

    const optgroupIPH = document.createElement('optgroup');
    optgroupIPH.label = 'Kelompok IPH (16 Daerah)';

    const optgroupIHK = document.createElement('optgroup');
    optgroupIHK.label = 'Kelompok IHK (8 Daerah)';

    KAB_LIST.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k.code;
      opt.textContent = `${k.name} (${k.code})`;
      if (k.code === selectedKabCode) opt.selected = true;

      if (k.isIHK) {
        optgroupIHK.appendChild(opt);
      } else {
        optgroupIPH.appendChild(opt);
      }
    });

    kabSelect.appendChild(optgroupIPH);
    kabSelect.appendChild(optgroupIHK);
  }

  function populateHeaderQuickSelect() {
    if (!headerQuickKabSelect) return;
    headerQuickKabSelect.innerHTML = '<option value="" disabled selected>Pilih Kab/Kota...</option>';

    const optgroupIPH = document.createElement('optgroup');
    optgroupIPH.label = 'Kelompok IPH (16 Daerah)';

    const optgroupIHK = document.createElement('optgroup');
    optgroupIHK.label = 'Kelompok IHK (8 Daerah)';

    KAB_LIST.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k.code;
      opt.textContent = `${k.name}`;
      if (k.isIHK) optgroupIHK.appendChild(opt);
      else optgroupIPH.appendChild(opt);
    });

    headerQuickKabSelect.appendChild(optgroupIPH);
    headerQuickKabSelect.appendChild(optgroupIHK);
  }

  function renderQuickChips() {
    // Disabled - "pilih cepat daerah" removed as requested
  }

  function updateCommodityDropdown(code) {
    if (!kabCommoditySelect) return;
    kabCommoditySelect.innerHTML = '<option value=\"ALL\" selected>Semua Komoditas</option>';

    const commSet = new Set();
    const matchedKab = KAB_LIST.find(k => k.code === code);
    const kabName = matchedKab ? matchedKab.name.toLowerCase() : '';

    rawData?.periods?.forEach(p => {
      const rec = p.records.find(r => r.kode_kab === code || (kabName && r.nama_kab.toLowerCase().includes(kabName.replace('kab. ', ''))));
      if (rec) {
        if (rec.fluktuasi_tertinggi && rec.fluktuasi_tertinggi !== '-') {
          commSet.add(rec.fluktuasi_tertinggi);
        }
        (rec.komoditas || []).forEach(c => {
          if (c.nama) commSet.add(c.nama);
        });
      }
    });

    const sortedComms = [...commSet].sort((a, b) => a.localeCompare(b));
    sortedComms.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === selectedKabCommodity) opt.selected = true;
      kabCommoditySelect.appendChild(opt);
    });
  }

  function switchTab(tab) {
    currentTab = tab;
    if (tab === 'sulsel') {
      tabSulselBtn.className = 'flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition bg-slate-900 text-white shadow-sm cursor-pointer';
      tabKabupatenBtn.className = 'flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer';
      viewSulsel.classList.remove('hidden');
      viewKabupaten.classList.add('hidden');
      headerPeriodWrapper?.classList.remove('hidden');
      exportCsvBtnMobile?.classList.remove('hidden');
      headerQuickKabContainer?.classList.remove('sm:hidden');
      setTimeout(() => {
        mapChart?.resize();
        barChart?.resize();
        timeSeriesChart?.resize();
        commodityChart?.resize();
      }, 50);
    } else {
      tabKabupatenBtn.className = 'flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition bg-slate-900 text-white shadow-sm cursor-pointer';
      tabSulselBtn.className = 'flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 cursor-pointer';
      viewSulsel.classList.add('hidden');
      viewKabupaten.classList.remove('hidden');
      headerPeriodWrapper?.classList.add('hidden');
      exportCsvBtnMobile?.classList.add('hidden');
      headerQuickKabContainer?.classList.add('sm:hidden');
      renderKabupatenView();
      setTimeout(() => {
        kabTimeSeriesChart?.resize();
        kabThreatChart?.resize();
      }, 50);
    }
  }

  function setupEventListeners() {
    // Tab switching
    tabSulselBtn?.addEventListener('click', () => switchTab('sulsel'));
    tabKabupatenBtn?.addEventListener('click', () => switchTab('kabupaten'));

    // Quick header regency select
    headerQuickKabSelect?.addEventListener('change', (e) => {
      if (e.target.value) {
        window.switchAndAnalyze(e.target.value);
      }
    });

    // Sulsel period change
    periodSelect?.addEventListener('change', (e) => {
      currentPeriod = rawData.periods.find(p => p.period_key === e.target.value);
      updateView();
    });

    // Sulsel Table filters
    tableSearchInput?.addEventListener('input', renderTable);
    tableStatusFilter?.addEventListener('change', renderTable);

    // Sulsel Exports
    exportCsvBtn?.addEventListener('click', exportCurrentPeriodCsv);
    exportCsvBtnMobile?.addEventListener('click', exportCurrentPeriodCsv);
    downloadJsonBtn?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `siph_sulsel_${currentPeriod.period_key}.json`;
      a.click();
    });

    filterAllBtn?.addEventListener('click', () => {
      if (timeSeriesChart) {
        timeSeriesChart.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
      }
      document.getElementById('timeSeriesChart')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Kabupaten Selectors
    kabSelect?.addEventListener('change', (e) => {
      setKabupaten(e.target.value);
    });

    kabYearSelect?.addEventListener('change', (e) => {
      selectedKabYear = e.target.value;
      renderKabupatenView();
    });

    kabMonthSelect?.addEventListener('change', (e) => {
      selectedKabMonth = e.target.value;
      renderKabupatenView();
    });

    kabCommoditySelect?.addEventListener('change', (e) => {
      selectedKabCommodity = e.target.value;
      renderKabupatenView();
    });

    // Share link button
    kabShareLinkBtn?.addEventListener('click', () => {
      try {
        const url = new URL(window.location);
        url.searchParams.set('kab', selectedKabCode);
        const shareUrl = url.toString();
        navigator.clipboard.writeText(shareUrl).then(() => {
          if (kabShareLinkText) kabShareLinkText.textContent = '✓ Tersalin!';
          setTimeout(() => {
            if (kabShareLinkText) kabShareLinkText.textContent = 'Bagikan';
          }, 2000);
        }).catch(() => {
          prompt('Salin tautan daerah ini:', shareUrl);
        });
      } catch (_) {}
    });

    kabExportCsvBtn?.addEventListener('click', exportKabupatenCsv);
    kabOpenSlideModalBtn?.addEventListener('click', openSlideModal);

    kabTableSearchInput?.addEventListener('input', renderKabupatenTable);
    kabTableStatusFilter?.addEventListener('change', renderKabupatenTable);

    kabScrollToHistoryBtn?.addEventListener('click', () => {
      document.getElementById('kabHistorySection')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Slide Modal Controls
    slideModalCloseBtn?.addEventListener('click', closeSlideModal);
    slideModal?.addEventListener('click', (e) => {
      if (e.target === slideModal) closeSlideModal();
    });
    slideModalPrintBtn?.addEventListener('click', () => {
      window.print();
    });

    // Window Resize
    window.addEventListener('resize', () => {
      if (currentTab === 'sulsel') {
        mapChart?.resize();
        barChart?.resize();
        timeSeriesChart?.resize();
        commodityChart?.resize();
      } else {
        kabTimeSeriesChart?.resize();
        kabThreatChart?.resize();
      }
    });
  }

  function initRegencyChips() {
    if (!kabFiltersContainer) return;
    kabFiltersContainer.innerHTML = '';
    const topChoices = ['Rata-rata Sulsel', 'Kab. Kepulauan Selayar', 'Kab. Takalar', 'Kab. Gowa', 'Kab. Maros', 'Kab. Bantaeng', 'Kab. Luwu', 'Kab. Bone'];
    
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

  // ==========================================
  // SULSEL PROVINCE VIEW LOGIC
  // ==========================================
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

  function renderNarrative() {
    const p = currentPeriod;
    const avg = p.avg_iph;
    const trendText = avg > 0 ? 'mengalami tren kenaikan rata-rata harga pangan' : (avg < 0 ? 'mencatatkan deflasi / penurunan harga rata-rata' : 'berada dalam kondisi harga yang relatif stabil');
    const threatText = p.top_threat && p.top_threat !== '-' ? `dengan komoditas pemicu gejolak dominan adalah <strong>${p.top_threat}</strong>` : '';
    const gainerText = p.top_gainer ? `Tekanan inflasi tertinggi dialami oleh <strong>${p.top_gainer.name}</strong> (${p.top_gainer.iph > 0 ? '+' : ''}${p.top_gainer.iph}%)` : '';

    narrativeInsightText.innerHTML = `Pada <strong>${p.label}</strong>, Sulawesi Selatan ${trendText} sebesar <strong>${avg > 0 ? '+' : ''}${avg}%</strong>. Sebanyak <strong>${p.counts.naik}</strong> kabupaten/kota berstatus naik, <strong>${p.counts.turun}</strong> daerah turun, ${threatText}. ${gainerText}. Prioritaskan pemantauan rantai pasok dan operasi pasar terpadu TPID.`;
  }

  function initCharts() {
    mapChart = echarts.init(document.getElementById('mapChartContainer'));
    barChart = echarts.init(document.getElementById('barRankingChart'));
    timeSeriesChart = echarts.init(document.getElementById('timeSeriesChart'));
    commodityChart = echarts.init(document.getElementById('commodityBarChart'));
    kabTimeSeriesChart = echarts.init(document.getElementById('kabTimeSeriesChart'));
    kabThreatChart = echarts.init(document.getElementById('kabThreatChart'));

    // Map click handler to open regency analysis
    mapChart.on('click', (params) => {
      if (params.name) {
        const found = KAB_LIST.find(k => k.name.toLowerCase() === params.name.toLowerCase() || params.name.toLowerCase().includes(k.name.toLowerCase().replace('kab. ', '')));
        if (found) {
          window.switchAndAnalyze(found.code);
        }
      }
    });

    // Bar ranking click handler
    barChart.on('click', (params) => {
      const p = currentPeriod;
      const sorted = [...p.records].sort((a, b) => a.iph - b.iph);
      const rec = sorted[params.dataIndex];
      if (rec && rec.kode_kab) {
        window.switchAndAnalyze(rec.kode_kab);
      }
    });
  }

  function renderMapChart() {
    const p = currentPeriod;
    const isMobile = window.innerWidth < 640;
    const recMap = {};
    p.records.forEach(r => { recMap[r.nama_kab] = r; });

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
            return `<strong>${params.name}</strong><br/><span style=\"color:#94a3b8\">Kota / Kab. IHK (Inflasi Bulanan)</span><br/><span style=\"color:#38bdf8; font-size:11px;\">Klik untuk analisis detail →</span>`;
          }
          const iphColor = rec.iph > 0 ? '#fb7185' : (rec.iph < 0 ? '#34d399' : '#94a3b8');
          const commList = rec.komoditas && rec.komoditas.length > 0 
            ? rec.komoditas.map(c => `<li>• ${c.nama}: <span style=\"font-family:monospace\">${c.kontribusi > 0 ? '+' : ''}${c.kontribusi}</span></li>`).join('')
            : '<li>• Tidak ada data andil</li>';

          return `
            <div style=\"font-family:'Plus Jakarta Sans',sans-serif; min-width:${isMobile ? 160 : 190}px;\">
              <div style=\"font-weight:700; font-size:${isMobile ? 12 : 13}px; margin-bottom:4px; border-bottom:1px solid #334155; padding-bottom:3px; display:flex; justify-content:space-between;\">
                <span>${rec.nama_kab}</span>
              </div>
              <div style=\"display:flex; justify-content:space-between; margin:4px 0;\">
                <span style=\"color:#94a3b8\">IPH:</span>
                <strong style=\"color:${iphColor}; font-family:monospace; font-size:${isMobile ? 12 : 13}px;\">${rec.iph > 0 ? '+' : ''}${rec.iph}% (${rec.status})</strong>
              </div>
              <div style=\"margin-top:6px; color:#cbd5e1; font-size:11px;\">
                <div style=\"color:#94a3b8; font-weight:600; margin-bottom:2px;\">Andil Komoditas:</div>
                <ul style=\"padding-left:0; list-style:none; margin:0; line-height:1.4;\">${commList}</ul>
              </div>
              <div style=\"margin-top:6px; padding-top:4px; border-top:1px dashed #334155; color:#94a3b8; font-size:11px;\">
                Fluktuasi: <strong style=\"color:#f8fafc\">${rec.fluktuasi_tertinggi || '-'}</strong>
              </div>
              <div style=\"margin-top:6px; padding-top:4px; border-top:1px solid #334155; text-align:right;\">
                <span style=\"color:#38bdf8; font-weight:600; font-size:11px; cursor:pointer;\">Klik untuk analisis mandiri →</span>
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
          roam: !isMobile,
          zoom: isMobile ? 1.2 : 1.25,
          center: isMobile ? [120.1, -3.85] : [120.2, -4.0],
          emphasis: {
            label: { show: true, color: '#0f172a', fontWeight: 'bold' },
            itemStyle: { areaColor: '#fde047', borderColor: '#0f172a', borderWidth: 1.5 }
          },
          select: { itemStyle: { areaColor: '#facc15' } },
          itemStyle: { borderColor: '#cbd5e1', borderWidth: 0.8, areaColor: '#f1f5f9' },
          data: mapData
        }
      ]
    };

    mapChart.setOption(option);
  }

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
          return `<strong>${rec.nama_kab}</strong><br/>IPH: <strong>${rec.iph > 0 ? '+' : ''}${rec.iph}%</strong> (${rec.status})<br/>Fluktuasi: ${rec.fluktuasi_tertinggi}<br/><span style=\"color:#0284c7;font-size:11px;\">Klik bar untuk analisis daerah ini →</span>`;
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

  function renderTimeSeriesChart() {
    const periods = rawData.periods;
    const isMobile = window.innerWidth < 640;
    const labels = periods.map(p => p.period_key);

    const seriesList = [];

    // Series 1: Sulsel Average
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
          let html = `<div style=\"font-weight:700; font-size:12px; margin-bottom:4px;\">${params[0].axisValue}</div>`;
          params.forEach(p => {
            html += `<div style=\"display:flex; justify-content:space-between; gap:12px; font-size:11px;\">
              <span style=\"color:${p.color};\">• ${p.seriesName.replace('Kab. ', '')}:</span>
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
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100 cursor-pointer';

      const iphBadgeColor = r.status === 'Naik' ? 'text-rose-600 bg-rose-50' : (r.status === 'Turun' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-50');
      const commBadges = r.komoditas && r.komoditas.length > 0 
        ? r.komoditas.map(c => `<span class=\"inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-0.5 font-medium\">${c.nama} (${c.kontribusi > 0 ? '+' : ''}${c.kontribusi})</span>`).join('')
        : '<span class=\"text-slate-400\">-</span>';

      tr.innerHTML = `
        <td class=\"px-4 py-3 font-mono text-slate-400\">${r.kode_kab}</td>
        <td class=\"px-4 py-3 font-semibold text-slate-800 flex items-center justify-between\">
          <span>${r.nama_kab}</span>
          <span class=\"text-[10px] text-blue-600 hover:underline\">Analisis →</span>
        </td>
        <td class=\"px-4 py-3 text-right font-mono font-bold ${r.iph > 0 ? 'text-rose-600' : (r.iph < 0 ? 'text-emerald-600' : 'text-slate-600')}\">
          ${r.iph !== null ? (r.iph > 0 ? '+' : '') + r.iph.toFixed(2) + '%' : '-'}
        </td>
        <td class=\"px-4 py-3 text-center\">
          <span class=\"px-2 py-0.5 rounded text-[11px] font-bold ${iphBadgeColor}\">${r.status}</span>
        </td>
        <td class=\"px-4 py-3 max-w-xs\">${commBadges}</td>
        <td class=\"px-4 py-3 font-medium text-slate-700\">${r.fluktuasi_tertinggi || '-'}</td>
        <td class=\"px-4 py-3 text-right font-mono text-slate-500\">${r.cv !== null ? r.cv.toFixed(4) : '-'}</td>
      `;

      tr.addEventListener('click', () => {
        window.switchAndAnalyze(r.kode_kab);
      });

      dataTableBody.appendChild(tr);
    });
  }

  function exportCurrentPeriodCsv() {
    const p = currentPeriod;
    const headers = ['Periode', 'Kode_Kab', 'Nama_Kabupaten', 'IPH_Persen', 'Status', 'Komoditas_Utama', 'Fluktuasi_Tertinggi', 'Nilai_CV'];
    const rows = p.records.map(r => {
      const comms = r.komoditas ? r.komoditas.map(c => `${c.nama}(${c.kontribusi})`).join('; ') : '';
      return [
        p.period_key,
        r.kode_kab,
        `\"${r.nama_kab}\"`,
        r.iph !== null ? r.iph : '',
        r.status,
        `\"${comms}\"`,
        `\"${r.fluktuasi_tertinggi || ''}\"`,
        r.cv !== null ? r.cv : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\
');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPH_Sulsel_${p.period_key}.csv`;
    link.click();
  }

  // ==========================================
  // KABUPATEN DEDICATED ANALYSIS LOGIC
  // ==========================================
  function computeKabupatenData(kabCode, yearFilter, monthFilter = 'ALL', commodityFilter = 'ALL') {
    if (!rawData) return null;

    const matchedKab = KAB_LIST.find(k => k.code === kabCode) || {
      code: kabCode,
      name: rawData.regencies_time_series[kabCode]?.name || `Kabupaten ${kabCode}`,
      isIHK: false
    };

    const weeklyRecords = [];

    rawData.periods.forEach(p => {
      const pk = p.period_key; // e.g. "2026-04-W2"
      if (yearFilter !== 'ALL' && !pk.startsWith(yearFilter)) return;

      if (monthFilter !== 'ALL') {
        const parts = pk.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m !== parseInt(monthFilter, 10)) return;
        }
      }

      const sulselAvg = p.avg_iph;
      const sortedValid = [...p.records]
        .filter(r => r.iph !== null)
        .sort((a, b) => b.iph - a.iph);

      let targetRec = null;
      let targetRank = null;

      sortedValid.forEach((r, idx) => {
        if (r.kode_kab === kabCode || r.nama_kab.toLowerCase().includes(matchedKab.name.toLowerCase().replace('kab. ', ''))) {
          targetRec = r;
          targetRank = idx + 1;
        }
      });

      if (!targetRec) {
        targetRec = p.records.find(r => r.kode_kab === kabCode || r.nama_kab.toLowerCase().includes(matchedKab.name.toLowerCase().replace('kab. ', '')));
      }

      if (targetRec) {
        if (commodityFilter !== 'ALL') {
          const commList = targetRec.komoditas || [];
          const matchesComm = commList.some(c => c.nama.toLowerCase() === commodityFilter.toLowerCase()) ||
                              (targetRec.fluktuasi_tertinggi && targetRec.fluktuasi_tertinggi.toLowerCase() === commodityFilter.toLowerCase());
          if (!matchesComm) return;
        }

        weeklyRecords.push({
          period_key: pk,
          label: p.label,
          sulsel_avg: sulselAvg,
          iph: targetRec.iph,
          status: targetRec.status,
          rank: targetRank,
          total_daerah: sortedValid.length,
          komoditas: targetRec.komoditas || [],
          fluktuasi_tertinggi: targetRec.fluktuasi_tertinggi,
          cv: targetRec.cv
        });
      }
    });

    // Valid records with IPH value
    const validRecs = weeklyRecords.filter(r => r.iph !== null && r.iph !== undefined);
    const iphVals = validRecs.map(r => r.iph);
    const avgIph = iphVals.length > 0 ? (iphVals.reduce((a, b) => a + b, 0) / iphVals.length) : null;

    let peakRecord = null;
    let troughRecord = null;
    if (validRecs.length > 0) {
      peakRecord = validRecs.reduce((prev, curr) => (curr.iph > prev.iph ? curr : prev), validRecs[0]);
      troughRecord = validRecs.reduce((prev, curr) => (curr.iph < prev.iph ? curr : prev), validRecs[0]);
    }

    // Threat and contribution analysis
    const threatCounts = {};
    const posComms = {};
    const negComms = {};

    weeklyRecords.forEach(r => {
      const t = r.fluktuasi_tertinggi;
      if (t && t !== '-') {
        threatCounts[t] = (threatCounts[t] || 0) + 1;
      }
      r.komoditas.forEach(c => {
        const name = c.nama;
        const val = c.kontribusi;
        if (val > 0) {
          if (!posComms[name]) posComms[name] = [];
          posComms[name].push(val);
        } else if (val < 0) {
          if (!negComms[name]) negComms[name] = [];
          negComms[name].push(val);
        }
      });
    });

    const topThreats = Object.entries(threatCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topInflationDrivers = Object.entries(posComms)
      .map(([name, vals]) => ({
        name,
        count: vals.length,
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        max: Math.max(...vals)
      }))
      .sort((a, b) => b.count - a.count || b.avg - a.avg);

    const topDeflationDrivers = Object.entries(negComms)
      .map(([name, vals]) => ({
        name,
        count: vals.length,
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
        min: Math.min(...vals)
      }))
      .sort((a, b) => b.count - a.count || a.avg - b.avg);

    const counts = {
      naik: weeklyRecords.filter(r => r.status === 'Naik').length,
      turun: weeklyRecords.filter(r => r.status === 'Turun').length,
      stabil: weeklyRecords.filter(r => r.status === 'Stabil').length
    };

    return {
      code: matchedKab.code,
      name: matchedKab.name,
      isIHK: matchedKab.isIHK,
      year: yearFilter,
      month: monthFilter,
      commodity: commodityFilter,
      total_releases: weeklyRecords.length,
      avg_iph: avgIph,
      latest_record: weeklyRecords.length > 0 ? weeklyRecords[weeklyRecords.length - 1] : null,
      peak_record: peakRecord,
      trough_record: troughRecord,
      counts: counts,
      top_threats: topThreats,
      top_inflation_drivers: topInflationDrivers.slice(0, 5),
      top_deflation_drivers: topDeflationDrivers.slice(0, 5),
      weekly_history: weeklyRecords
    };
  }

  function renderKabupatenView() {
    const data = computeKabupatenData(selectedKabCode, selectedKabYear, selectedKabMonth, selectedKabCommodity);
    if (!data) return;

    // Header info
    kabTitleHeader.textContent = data.name;
    kabBadgeStatusType.textContent = data.isIHK ? 'Kota / Kab. IHK' : '16 Daerah IPH BPS';
    kabBadgeStatusType.className = `text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold ${
      data.isIHK ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-sky-100 text-sky-800 border border-sky-200'
    }`;

    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthStr = selectedKabMonth !== 'ALL' ? ` • ${monthNames[parseInt(selectedKabMonth, 10)]}` : '';
    const commStr = selectedKabCommodity !== 'ALL' ? ` • Komoditas: ${selectedKabCommodity}` : '';
    kabSubtitleHeader.textContent = `Profil analitik IPH ${data.name} periode ${data.year === 'ALL' ? '2023–2026' : data.year}${monthStr}${commStr} untuk bahan paparan pimpinan & TPID`;

    kabChartLineTitle.textContent = `Tren IPH ${data.name} vs Rata-Rata Sulsel`;
    kabLineYearBadge.textContent = `${data.year === 'ALL' ? '2023–2026' : data.year}${monthStr}`;
    kabTableHeading.textContent = `Riwayat Rilis Mingguan: ${data.name}`;

    // KPI 1: Latest IPH
    const lat = data.latest_record;
    if (lat && lat.iph !== null && lat.iph !== undefined) {
      kabKpiLatestVal.textContent = `${lat.iph > 0 ? '+' : ''}${lat.iph.toFixed(2)}%`;
      kabKpiLatestVal.className = `text-xl sm:text-3xl font-extrabold tracking-tight font-mono ${
        lat.iph > 0 ? 'text-rose-600' : (lat.iph < 0 ? 'text-emerald-600' : 'text-slate-800')
      }`;
      kabKpiLatestBadge.textContent = lat.status.toUpperCase();
      kabKpiLatestBadge.className = `text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold ${
        lat.status === 'Naik' ? 'bg-rose-100 text-rose-700' : (lat.status === 'Turun' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700')
      }`;
      const devSulsel = (lat.iph - lat.sulsel_avg).toFixed(2);
      kabKpiLatestSub.textContent = `${lat.label} (Deviasi Sulsel: ${devSulsel > 0 ? '+' : ''}${devSulsel}%)`;
    } else {
      kabKpiLatestVal.textContent = data.isIHK ? 'IHK Bulanan' : '-';
      kabKpiLatestVal.className = 'text-xl sm:text-2xl font-bold font-mono text-slate-500';
      kabKpiLatestBadge.textContent = data.isIHK ? 'IHK' : 'N/A';
      kabKpiLatestBadge.className = 'text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700';
      kabKpiLatestSub.textContent = data.isIHK ? 'Diukur via Inflasi Bulanan' : 'Tidak ada data rilis terbaru';
    }

    // KPI 2: Rank in Sulsel
    if (lat && lat.rank) {
      kabKpiRankVal.textContent = `#${lat.rank}`;
      kabKpiRankSub.textContent = `Dari ${lat.total_daerah} daerah aktif (Sulsel: ${lat.sulsel_avg > 0 ? '+' : ''}${lat.sulsel_avg}%)`;
    } else {
      kabKpiRankVal.textContent = '-';
      kabKpiRankSub.textContent = 'Non-pemantauan mingguan';
    }

    // KPI 3: Average IPH
    if (data.avg_iph !== null) {
      kabKpiAvgVal.textContent = `${data.avg_iph > 0 ? '+' : ''}${data.avg_iph.toFixed(2)}%`;
      kabKpiAvgVal.className = `text-xl sm:text-3xl font-extrabold tracking-tight font-mono ${
        data.avg_iph > 0 ? 'text-rose-600' : (data.avg_iph < 0 ? 'text-emerald-600' : 'text-slate-800')
      }`;
      kabKpiAvgSub.textContent = `${data.total_releases} minggu (Naik ${data.counts.naik}x, Turun ${data.counts.turun}x)`;
    } else {
      kabKpiAvgVal.textContent = '-';
      kabKpiAvgSub.textContent = 'Belum ada data agregat';
    }

    // KPI 4: Peak & Trough
    if (data.peak_record && data.trough_record) {
      kabKpiPeakVal.textContent = `${data.peak_record.iph > 0 ? '+' : ''}${data.peak_record.iph.toFixed(2)}%`;
      kabKpiPeakLabel.textContent = data.peak_record.label.replace(' 2026', '').replace(' 2025', '').replace(' 2024', '');
      kabKpiTroughVal.textContent = `${data.trough_record.iph.toFixed(2)}%`;
      kabKpiTroughLabel.textContent = data.trough_record.label.replace(' 2026', '').replace(' 2025', '').replace(' 2024', '');
    } else {
      kabKpiPeakVal.textContent = '-';
      kabKpiTroughVal.textContent = '-';
    }

    // KPI 5: Top Threat
    if (data.top_threats.length > 0) {
      kabKpiThreatVal.textContent = data.top_threats[0].name;
      kabKpiThreatSub.textContent = `Pemicu fluktuasi ${data.top_threats[0].count} kali rilis`;
    } else {
      kabKpiThreatVal.textContent = '-';
      kabKpiThreatSub.textContent = 'Tidak tercatat';
    }

    // Dynamic Narrative
    renderKabupatenNarrative(data);

    // Charts
    renderKabupatenCharts(data);

    // Top drivers lists
    renderKabupatenDrivers(data);

    // Table
    renderKabupatenTable();
  }

  function renderKabupatenNarrative(data) {
    if (data.isIHK && data.total_releases === 0) {
      kabNarrativeText.innerHTML = `<strong>${data.name}</strong> merupakan wilayah dengan penghitungan <strong>Indeks Harga Konsumen (IHK)</strong> bulanan oleh BPS, sehingga dinamika harga pokok mingguan tidak dihitung melalui formulasi IPH mingguan reguler. Pemantauan harga dapat dirujuk melalui Rilis Berita Resmi Statistik (BRS) Inflasi Bulanan BPS.`;
      return;
    }

    const avgStr = data.avg_iph !== null ? `${data.avg_iph > 0 ? '+' : ''}${data.avg_iph.toFixed(2)}%` : '0.00%';
    const avgStatus = data.avg_iph > 0 ? 'mengalami rata-rata tekanan inflasi' : (data.avg_iph < 0 ? 'mencatatkan tren rata-rata deflasi' : 'berada dalam kondisi relatif stabil');
    const peakInfo = data.peak_record ? `Titik puncak inflasi tertinggi terjadi pada <strong>${data.peak_record.label} (${data.peak_record.iph > 0 ? '+' : ''}${data.peak_record.iph}%)</strong>` : '';
    const mainThreat = data.top_threats.length > 0 ? `Komoditas yang paling sering memicu lonjakan harga adalah <strong>${data.top_threats[0].name}</strong> (${data.top_threats[0].count} kali).` : '';
    
    const isIsland = data.name.toLowerCase().includes('selayar') || data.name.toLowerCase().includes('pangkep');
    const logisticNote = isIsland 
      ? 'Sebagai wilayah kepulauan, stabilitas harga sangat dipengaruhi oleh kelancaran transportasi laut penyeberangan serta fluktuasi hasil perikanan tangkap.' 
      : 'Sebagai daerah sentra/konsumen daratan, stabilitas harga dipengaruhi oleh kelancaran pasokan antar-daerah dan fluktuasi musiman hortikultura.';

    kabNarrativeText.innerHTML = `Pada periode <strong>${data.year === 'ALL' ? '2023–2026' : data.year}</strong>, <strong>${data.name}</strong> ${avgStatus} dengan rata-rata IPH sebesar <strong>${avgStr}</strong> dari total <strong>${data.total_releases}</strong> rilis mingguan terpilih. ${peakInfo}. ${mainThreat} ${logisticNote} Disarankan penguatan strategi 4K TPID secara berkala.`;
  }

  function renderKabupatenCharts(data) {
    const isMobile = window.innerWidth < 640;
    const history = data.weekly_history;
    const labels = history.map(h => h.period_key);
    const kabIphSeries = history.map(h => h.iph);
    const sulselAvgSeries = history.map(h => h.sulsel_avg);

    // Line Chart: Regency vs Sulsel Benchmark
    const lineOption = {
      grid: { top: 30, right: isMobile ? 12 : 25, bottom: isMobile ? 65 : 60, left: isMobile ? 38 : 45 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', lineStyle: { color: '#94a3b8' } },
        formatter: (params) => {
          let html = `<div style=\"font-weight:700; font-size:12px; margin-bottom:4px;\">${params[0].axisValue}</div>`;
          params.forEach(p => {
            html += `<div style=\"display:flex; justify-content:space-between; gap:12px; font-size:11px;\">
              <span style=\"color:${p.color};\">• ${p.seriesName}:</span>
              <strong>${p.value !== null && p.value !== undefined ? (p.value > 0 ? '+' : '') + p.value + '%' : '-'}</strong>
            </div>`;
          });
          const rec = history[params[0].dataIndex];
          if (rec && rec.fluktuasi_tertinggi && rec.fluktuasi_tertinggi !== '-') {
            html += `<div style=\"margin-top:4px; padding-top:4px; border-top:1px dashed #475569; font-size:10px; color:#94a3b8;\">
              Pemicu: <span style=\"color:#f8fafc;\">${rec.fluktuasi_tertinggi}</span>
            </div>`;
          }
          return html;
        }
      },
      legend: {
        bottom: 0,
        itemWidth: isMobile ? 14 : 20,
        itemHeight: isMobile ? 8 : 10,
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
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: isMobile ? 14 : 18,
          bottom: isMobile ? 22 : 25,
          borderColor: '#e2e8f0',
          fillerColor: 'rgba(225, 29, 72, 0.1)',
          textStyle: { fontSize: isMobile ? 9 : 10 }
        }
      ],
      series: [
        {
          name: data.name.replace('Kab. ', ''),
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 4,
          lineStyle: { width: isMobile ? 2.2 : 2.8, color: '#e11d48' },
          itemStyle: { color: '#e11d48' },
          data: kabIphSeries
        },
        {
          name: 'Rata-Rata Sulsel',
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.8, color: '#0f172a', type: 'dashed' },
          itemStyle: { color: '#0f172a' },
          data: sulselAvgSeries
        }
      ]
    };

    kabTimeSeriesChart.setOption(lineOption, true);

    // Threat Bar Chart for Regency
    const threats = data.top_threats.slice(0, 6);
    const threatNames = threats.map(t => t.name).reverse();
    const threatCounts = threats.map(t => t.count).reverse();

    const threatOption = {
      grid: { top: 15, right: isMobile ? 25 : 35, bottom: 20, left: isMobile ? 95 : 120 },
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
        data: threatNames.length > 0 ? threatNames : ['Tidak ada data'],
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisTick: { show: false },
        axisLabel: { color: '#334155', fontSize: isMobile ? 10 : 11, fontWeight: 500 }
      },
      series: [
        {
          type: 'bar',
          data: threatCounts.length > 0 ? threatCounts : [0],
          barWidth: isMobile ? 11 : 14,
          itemStyle: {
            color: '#f59e0b',
            borderRadius: [0, 4, 4, 0]
          }
        }
      ]
    };

    kabThreatChart.setOption(threatOption, true);
  }

  function renderKabupatenDrivers(data) {
    // Top Inflation Drivers (Positive)
    kabTopInflationList.innerHTML = '';
    if (data.top_inflation_drivers.length === 0) {
      kabTopInflationList.innerHTML = '<div class=\"text-xs text-slate-400 py-3 text-center\">Tidak ada komoditas dengan andil positif tercatat</div>';
    } else {
      data.top_inflation_drivers.forEach(d => {
        const item = document.createElement('div');
        item.className = 'p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 flex items-center justify-between text-xs';
        item.innerHTML = `
          <div>
            <div class=\"font-bold text-slate-900\">${d.name}</div>
            <div class=\"text-[10px] text-slate-500\">Muncul ${d.count} kali • Puncak andil: +${d.max.toFixed(2)}%</div>
          </div>
          <div class=\"text-right\">
            <div class=\"font-mono font-bold text-rose-600 text-sm\">+${d.avg.toFixed(2)}%</div>
            <div class=\"text-[10px] text-slate-400\">Rata-rata andil</div>
          </div>
        `;
        kabTopInflationList.appendChild(item);
      });
    }

    // Top Deflation Drivers (Negative)
    kabTopDeflationList.innerHTML = '';
    if (data.top_deflation_drivers.length === 0) {
      kabTopDeflationList.innerHTML = '<div class=\"text-xs text-slate-400 py-3 text-center\">Tidak ada komoditas dengan andil negatif tercatat</div>';
    } else {
      data.top_deflation_drivers.forEach(d => {
        const item = document.createElement('div');
        item.className = 'p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs';
        item.innerHTML = `
          <div>
            <div class=\"font-bold text-slate-900\">${d.name}</div>
            <div class=\"text-[10px] text-slate-500\">Muncul ${d.count} kali • Penurunan max: ${d.min.toFixed(2)}%</div>
          </div>
          <div class=\"text-right\">
            <div class=\"font-mono font-bold text-emerald-600 text-sm\">${d.avg.toFixed(2)}%</div>
            <div class=\"text-[10px] text-slate-400\">Rata-rata andil</div>
          </div>
        `;
        kabTopDeflationList.appendChild(item);
      });
    }
  }

  function renderKabupatenTable() {
    const data = computeKabupatenData(selectedKabCode, selectedKabYear, selectedKabMonth, selectedKabCommodity);
    if (!data) return;

    const query = (kabTableSearchInput?.value || '').toLowerCase().trim();
    const statusFilter = kabTableStatusFilter?.value || 'ALL';

    const filtered = data.weekly_history.filter(r => {
      const matchPeriod = r.period_key.toLowerCase().includes(query) || r.label.toLowerCase().includes(query);
      const matchComm = r.komoditas.some(c => c.nama.toLowerCase().includes(query)) || (r.fluktuasi_tertinggi && r.fluktuasi_tertinggi.toLowerCase().includes(query));
      const matchSearch = matchPeriod || matchComm;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });

    kabDataTableBody.innerHTML = '';
    kabTableRowsCount.textContent = `Menampilkan ${filtered.length} dari ${data.weekly_history.length} rilis mingguan`;

    if (filtered.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan=\"8\" class=\"px-4 py-8 text-center text-slate-400 text-xs\">Tidak ada data rilis mingguan yang sesuai dengan filter.</td>`;
      kabDataTableBody.appendChild(tr);
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

      const iphBadgeColor = r.status === 'Naik' ? 'text-rose-600 bg-rose-50' : (r.status === 'Turun' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 bg-slate-50');
      const commBadges = r.komoditas && r.komoditas.length > 0 
        ? r.komoditas.map(c => `<span class=\"inline-block bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-0.5 font-medium\">${c.nama} (${c.kontribusi > 0 ? '+' : ''}${c.kontribusi})</span>`).join('')
        : '<span class=\"text-slate-400\">-</span>';

      tr.innerHTML = `
        <td class=\"px-4 py-3 font-medium text-slate-900\">${r.label}</td>
        <td class=\"px-4 py-3 text-right font-mono font-bold ${r.iph > 0 ? 'text-rose-600' : (r.iph < 0 ? 'text-emerald-600' : 'text-slate-600')}\">
          ${r.iph !== null && r.iph !== undefined ? (r.iph > 0 ? '+' : '') + r.iph.toFixed(2) + '%' : '-'}
        </td>
        <td class=\"px-4 py-3 text-center\">
          <span class=\"px-2 py-0.5 rounded text-[11px] font-bold ${iphBadgeColor}\">${r.status}</span>
        </td>
        <td class=\"px-4 py-3 text-right font-mono text-slate-600\">
          ${r.sulsel_avg > 0 ? '+' : ''}${r.sulsel_avg}%
        </td>
        <td class=\"px-4 py-3 text-center font-mono font-bold text-slate-700\">
          ${r.rank ? `#${r.rank} / ${r.total_daerah}` : '-'}
        </td>
        <td class=\"px-4 py-3 max-w-xs\">${commBadges}</td>
        <td class=\"px-4 py-3 font-medium text-slate-700\">${r.fluktuasi_tertinggi || '-'}</td>
        <td class=\"px-4 py-3 text-right font-mono text-slate-500\">${r.cv !== null && r.cv !== undefined ? r.cv.toFixed(4) : '-'}</td>
      `;
      kabDataTableBody.appendChild(tr);
    });
  }

  function exportKabupatenCsv() {
    const data = computeKabupatenData(selectedKabCode, selectedKabYear, selectedKabMonth, selectedKabCommodity);
    if (!data || data.weekly_history.length === 0) {
      alert('Tidak ada data rilis untuk diekspor.');
      return;
    }

    const headers = ['Periode_Key', 'Label_Minggu', 'Kode_Kab', 'Nama_Daerah', 'IPH_Persen', 'Status', 'RataRata_Sulsel', 'Peringkat_Sulsel', 'Komoditas_Andil', 'Fluktuasi_Tertinggi', 'Nilai_CV'];
    const rows = data.weekly_history.map(r => {
      const comms = r.komoditas ? r.komoditas.map(c => `${c.nama}(${c.kontribusi})`).join('; ') : '';
      return [
        r.period_key,
        `\"${r.label}\"`,
        data.code,
        `\"${data.name}\"`,
        r.iph !== null && r.iph !== undefined ? r.iph : '',
        r.status,
        r.sulsel_avg,
        r.rank || '',
        `\"${comms}\"`,
        `\"${r.fluktuasi_tertinggi || ''}\"`,
        r.cv !== null && r.cv !== undefined ? r.cv : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\
');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IPH_${data.name.replace(/\\s+/g, '_')}_${data.year}.csv`;
    link.click();
  }

  // ==========================================
  // SLIDE DECK PRESENTATION MODAL LOGIC
  // ==========================================
  function openSlideModal() {
    const data = computeKabupatenData(selectedKabCode, selectedKabYear, selectedKabMonth, selectedKabCommodity);
    if (!data) return;

    slideModalTitle.textContent = `Bahan Paparan Pimpinan Daerah: ${data.name}`;
    slideModalSubtitle.textContent = `Ringkasan Eksekutif Dinamika IPH Tahun ${data.year === 'ALL' ? '2023–2026' : data.year} untuk Rapat Koordinasi TPID`;

    renderSlideDeckContent(data);
    slideModal.classList.remove('hidden');
    slideModal.classList.add('flex');
  }

  function closeSlideModal() {
    slideModal.classList.add('hidden');
    slideModal.classList.remove('flex');
  }

  function renderSlideDeckContent(data) {
    const isIsland = data.name.toLowerCase().includes('selayar') || data.name.toLowerCase().includes('pangkep');
    const lat = data.latest_record;
    const avgStr = data.avg_iph !== null ? `${data.avg_iph > 0 ? '+' : ''}${data.avg_iph.toFixed(2)}%` : '0.00%';
    const peakStr = data.peak_record ? `${data.peak_record.label} (${data.peak_record.iph > 0 ? '+' : ''}${data.peak_record.iph}%)` : '-';
    const troughStr = data.trough_record ? `${data.trough_record.label} (${data.trough_record.iph}%)` : '-';
    const threatStr = data.top_threats.length > 0 ? `${data.top_threats[0].name} (tercatat ${data.top_threats[0].count}x)` : 'Hortikultura Musiman';

    // Top drivers table rows
    const posRows = data.top_inflation_drivers.map((d, i) => `
      <tr class=\"border-b border-slate-100\">
        <td class=\"py-1 px-2 font-medium text-slate-800\">${i+1}. ${d.name}</td>
        <td class=\"py-1 px-2 text-center text-slate-500\">${d.count}x</td>
        <td class=\"py-1 px-2 text-right font-mono font-bold text-rose-600\">+${d.avg.toFixed(2)}%</td>
      </tr>
    `).join('');

    const negRows = data.top_deflation_drivers.map((d, i) => `
      <tr class=\"border-b border-slate-100\">
        <td class=\"py-1 px-2 font-medium text-slate-800\">${i+1}. ${d.name}</td>
        <td class=\"py-1 px-2 text-center text-slate-500\">${d.count}x</td>
        <td class=\"py-1 px-2 text-right font-mono font-bold text-emerald-600\">${d.avg.toFixed(2)}%</td>
      </tr>
    `).join('');

    // Specific 4K Recommendations
    let action1 = 'Gelar Gerakan Pangan Murah (GPM) dan Operasi Pasar secara terarah di titik pasar strategis menjelang momentum HBKN.';
    let action2 = 'Perkuat Kerjasama Antar Daerah (KAD) dengan kabupaten sentra komoditas pangan surplus di Sulawesi Selatan.';
    let action3 = isIsland 
      ? 'Fasilitasi subsidi ongkos angkut logistik penyeberangan laut (Bira-Pamatata) dan prioritas muatan bahan pokok saat cuaca buruk.' 
      : 'Pengawasan berkala terhadap jalur logistik darat dan antisipasi hambatan distribusi pangan dari sentra produksi.';
    let action4 = 'Publikasi rutin panel harga pasar rakyat kepada masyarakat guna menjaga ekspektasi dan mencegah panic buying.';

    slidePrintArea.innerHTML = `
      <!-- SLIDE 1: COVER & EXECUTIVE SUMMARY -->
      <div class=\"slide-card bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5\">
        <div class=\"flex items-center justify-between border-b border-slate-200 pb-4\">
          <div>
            <div class=\"text-[11px] font-bold text-rose-600 tracking-wider uppercase\">Paparan Rapat Koordinasi TPID</div>
            <h2 class=\"text-xl sm:text-2xl font-extrabold text-slate-900\">${data.name.toUpperCase()}</h2>
            <p class=\"text-xs text-slate-500\">Evaluasi Perkembangan Indeks Perkembangan Harga (IPH) — Tahun ${data.year === 'ALL' ? '2023–2026' : data.year}</p>
          </div>
          <div class=\"text-right\">
            <span class=\"inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white\">Slide 1 / 4</span>
          </div>
        </div>

        <div class=\"grid grid-cols-2 md:grid-cols-4 gap-3\">
          <div class=\"p-3 bg-slate-50 rounded-xl border border-slate-200\">
            <div class=\"text-[10px] text-slate-500 font-bold uppercase\">IPH Terkini (${lat ? lat.label.split('(')[0] : '-'})</div>
            <div class=\"text-xl font-mono font-extrabold ${lat && lat.iph > 0 ? 'text-rose-600' : 'text-emerald-600'}\">
              ${lat && lat.iph !== null ? (lat.iph > 0 ? '+' : '') + lat.iph.toFixed(2) + '%' : '-'}
            </div>
            <div class=\"text-[10px] text-slate-400\">${lat ? `Status: ${lat.status}` : '-'}</div>
          </div>
          <div class=\"p-3 bg-slate-50 rounded-xl border border-slate-200\">
            <div class=\"text-[10px] text-slate-500 font-bold uppercase\">Peringkat di Sulsel</div>
            <div class=\"text-xl font-mono font-extrabold text-slate-800\">${lat && lat.rank ? `#${lat.rank} / ${lat.total_daerah}` : '-'}</div>
            <div class=\"text-[10px] text-slate-400\">Sulsel: ${lat ? (lat.sulsel_avg > 0 ? '+' : '') + lat.sulsel_avg + '%' : '-'}</div>
          </div>
          <div class=\"p-3 bg-slate-50 rounded-xl border border-slate-200\">
            <div class=\"text-[10px] text-slate-500 font-bold uppercase\">Rata-Rata Tahunan</div>
            <div class=\"text-xl font-mono font-extrabold text-slate-800\">${avgStr}</div>
            <div class=\"text-[10px] text-slate-400\">${data.total_releases} Rilis Mingguan</div>
          </div>
          <div class=\"p-3 bg-slate-50 rounded-xl border border-slate-200\">
            <div class=\"text-[10px] text-slate-500 font-bold uppercase\">Komoditas Fluktuatif</div>
            <div class=\"text-base font-bold text-amber-600 truncate\">${data.top_threats[0]?.name || '-'}</div>
            <div class=\"text-[10px] text-slate-400\">Fluktuasi terbanyak</div>
          </div>
        </div>

        <div class=\"p-4 bg-slate-900 text-slate-200 rounded-xl text-xs sm:text-sm leading-relaxed\">
          <span class=\"font-bold text-white block mb-1\">📌 Ringkasan Eksekutif Dinamika Harga:</span>
          Secara umum pada periode evaluasi, ${data.name} mencatatkan rata-rata IPH sebesar <strong>${avgStr}</strong> dengan frekuensi ${data.counts.naik} kali minggu inflasi dan ${data.counts.turun} kali deflasi. Tekanan inflasi tertinggi teridentifikasi pada momentum HBKN/musim paceklik, dipicu terutama oleh komoditas <strong>${threatStr}</strong>.
        </div>
      </div>

      <!-- SLIDE 2: EVALUASI TREN & TITIK KRITIS -->
      <div class=\"slide-card bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5\">
        <div class=\"flex items-center justify-between border-b border-slate-200 pb-4\">
          <div>
            <div class=\"text-[11px] font-bold text-rose-600 tracking-wider uppercase\">Dinamika & Volatilitas Harga</div>
            <h2 class=\"text-lg sm:text-xl font-extrabold text-slate-900\">Evaluasi Titik Kritis dan Tren Mingguan</h2>
          </div>
          <span class=\"inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white\">Slide 2 / 4</span>
        </div>

        <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
          <div class=\"p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2\">
            <div class=\"flex items-center gap-2\">
              <span class=\"w-3 h-3 rounded-full bg-rose-600\"></span>
              <span class=\"text-xs font-bold text-rose-900 uppercase\">Puncak Inflasi Tertinggi (Max Peak)</span>
            </div>
            <div class=\"text-2xl font-mono font-extrabold text-rose-700\">${peakStr}</div>
            <p class=\"text-xs text-rose-800 leading-relaxed\">
              Lonjakan harga tertinggi dipicu oleh kenaikan drastis komoditas daging sapi/unggas dan aneka cabai akibat lonjakan permintaan musiman masyarakat.
            </p>
          </div>

          <div class=\"p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2\">
            <div class=\"flex items-center gap-2\">
              <span class=\"w-3 h-3 rounded-full bg-emerald-600\"></span>
              <span class=\"text-xs font-bold text-emerald-900 uppercase\">Titik Deflasi Terendah (Deep Trough)</span>
            </div>
            <div class=\"text-2xl font-mono font-extrabold text-emerald-700\">${troughStr}</div>
            <p class=\"text-xs text-emerald-800 leading-relaxed\">
              Penurunan harga terjadi saat pasokan komoditas hortikultura melimpah pasca panen raya dan normalisasi konsumsi setelah perayaan hari besar.
            </p>
          </div>
        </div>

        <div class=\"p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700\">
          <span class=\"font-bold text-slate-900\">Catatan Karakteristik Daerah:</span> ${isIsland ? 'Stabilitas harga sangat rentan terhadap kendala transportasi laut antar-pulau dan perubahan cuaca maritim di Selat Selayar.' : 'Stabilitas harga sangat dipengaruhi oleh kelancaran pasokan antar-daerah dan fluktuasi harga sentra produksi utama di Sulsel.'}
        </div>
      </div>

      <!-- SLIDE 3: KOMODITAS KUNCI (DRIVERS) -->
      <div class=\"slide-card bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5\">
        <div class=\"flex items-center justify-between border-b border-slate-200 pb-4\">
          <div>
            <div class=\"text-[11px] font-bold text-rose-600 tracking-wider uppercase\">Faktor Komoditas</div>
            <h2 class=\"text-lg sm:text-xl font-extrabold text-slate-900\">Pemetaan Komoditas Pemicu Inflasi & Deflasi</h2>
          </div>
          <span class=\"inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white\">Slide 3 / 4</span>
        </div>

        <div class=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
          <div class=\"space-y-2\">
            <div class=\"text-xs font-bold text-rose-700 flex items-center gap-1\">
              <span>▲</span>
              <span>Top Komoditas Pendorong Inflasi</span>
            </div>
            <div class=\"border border-slate-200 rounded-xl overflow-hidden\">
              <table class=\"w-full text-xs\">
                <thead class=\"bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]\">
                  <tr>
                    <th class=\"py-1.5 px-2 text-left\">Komoditas</th>
                    <th class=\"py-1.5 px-2 text-center\">Frekuensi</th>
                    <th class=\"py-1.5 px-2 text-right\">Rata-Rata Andil</th>
                  </tr>
                </thead>
                <tbody>
                  ${posRows || '<tr><td colspan=\"3\" class=\"text-center py-2 text-slate-400\">Tidak ada data</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <div class=\"space-y-2\">
            <div class=\"text-xs font-bold text-emerald-700 flex items-center gap-1\">
              <span>▼</span>
              <span>Top Komoditas Pendorong Deflasi</span>
            </div>
            <div class=\"border border-slate-200 rounded-xl overflow-hidden\">
              <table class=\"w-full text-xs\">
                <thead class=\"bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]\">
                  <tr>
                    <th class=\"py-1.5 px-2 text-left\">Komoditas</th>
                    <th class=\"py-1.5 px-2 text-center\">Frekuensi</th>
                    <th class=\"py-1.5 px-2 text-right\">Rata-Rata Andil</th>
                  </tr>
                </thead>
                <tbody>
                  ${negRows || '<tr><td colspan=\"3\" class=\"text-center py-2 text-slate-400\">Tidak ada data</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- SLIDE 4: REKOMENDASI KEBIJAKAN 4K TPID -->
      <div class=\"slide-card bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5\">
        <div class=\"flex items-center justify-between border-b border-slate-200 pb-4\">
          <div>
            <div class=\"text-[11px] font-bold text-rose-600 tracking-wider uppercase\">Rekomendasi Kebijakan</div>
            <h2 class=\"text-lg sm:text-xl font-extrabold text-slate-900\">Rencana Aksi Pengendalian Inflasi (Kerangka 4K)</h2>
          </div>
          <span class=\"inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white\">Slide 4 / 4</span>
        </div>

        <div class=\"grid grid-cols-1 md:grid-cols-2 gap-3 text-xs\">
          <div class=\"p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1\">
            <div class=\"font-bold text-slate-900 flex items-center gap-2\">
              <span class=\"w-2.5 h-2.5 rounded-full bg-rose-500\"></span>
              <span>1. Keterjangkauan Harga</span>
            </div>
            <p class=\"text-slate-600 leading-relaxed\">${action1}</p>
          </div>

          <div class=\"p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1\">
            <div class=\"font-bold text-slate-900 flex items-center gap-2\">
              <span class=\"w-2.5 h-2.5 rounded-full bg-amber-500\"></span>
              <span>2. Ketersediaan Pasokan</span>
            </div>
            <p class=\"text-slate-600 leading-relaxed\">${action2}</p>
          </div>

          <div class=\"p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1\">
            <div class=\"font-bold text-slate-900 flex items-center gap-2\">
              <span class=\"w-2.5 h-2.5 rounded-full bg-sky-500\"></span>
              <span>3. Kelancaran Distribusi</span>
            </div>
            <p class=\"text-slate-600 leading-relaxed\">${action3}</p>
          </div>

          <div class=\"p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1\">
            <div class=\"font-bold text-slate-900 flex items-center gap-2\">
              <span class=\"w-2.5 h-2.5 rounded-full bg-emerald-500\"></span>
              <span>4. Komunikasi Efektif</span>
            </div>
            <p class=\"text-slate-600 leading-relaxed\">${action4}</p>
          </div>
        </div>

        <div class=\"pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400\">
          <span>TPID ${data.name}</span>
          <span>SIPH Sulsel 2026</span>
        </div>
      </div>
    `;
  }

  // Start app
  init();
})();