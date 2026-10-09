const pptxgen = require('pptxgenjs');
const path = require('path');
const { execSync } = require('child_process');

const LOGO_SELAYAR = path.resolve('assets/logos/logo_selayar.png');
const LOGO_BPS = path.resolve('assets/logos/logo_bps.png');
const LOGO_SE2026 = path.resolve('assets/logos/logo_se2026.png');

async function testSlide(slideIndex) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  const slide = pres.addSlide();

  if (slideIndex === 1) {
    slide.background = { color: '0F172A' };
    slide.addText('Test Slide 1', { x: 1, y: 1, fontSize: 24, color: 'FFFFFF' });
    slide.addImage({ path: LOGO_SELAYAR, x: 1.3, y: 1.25, w: 0.9, h: 0.9 });
  } else if (slideIndex === 2) {
    slide.background = { color: 'F8FAFC' };
    const chartData = [{
      name: 'Rata-rata IPH Bulanan (%)',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      values: [1.72, 0.02, -0.33, 0.29, -1.40, 1.49, 0.28, 0.78, -1.07, -0.03, -0.11, 1.73]
    }];
    slide.addChart(pres.ChartType.line, chartData, {
      x: 0.8, y: 2.0, w: 6.8, h: 4.7,
      showTitle: true,
      title: 'Rata-rata IPH Bulanan Selayar 2025 (%)',
      titleFontSize: 13,
      showValue: true,
      chartColors: ['0284C7'],
      valAxisLabelColor: '64748B',
      catAxisLabelColor: '0F172A',
      lineSize: 2.5,
      lineSmooth: true,
      showLegend: false
    });
  } else if (slideIndex === 3) {
    slide.background = { color: 'F8FAFC' };
    const chartData = [{
      name: 'IPH Mingguan (%)',
      labels: ['M1 (Est)', 'M2', 'M3', 'M4', 'M5'],
      values: [1.08, 1.50, 1.65, 1.65, 1.94]
    }];
    slide.addChart(pres.ChartType.col, chartData, {
      x: 0.8, y: 2.0, w: 6.4, h: 4.7,
      showTitle: true,
      title: 'Perkembangan IPH Januari 2025 (%)',
      titleFontSize: 13,
      showValue: true,
      chartColors: ['DC2626'],
      valAxisLabelColor: '64748B',
      catAxisLabelColor: '0F172A',
      showLegend: false
    });
  } else if (slideIndex === 4) {
    slide.background = { color: 'F8FAFC' };
    const chartData = [{
      name: 'IPH April (%)',
      labels: ['Minggu 1', 'Minggu 2 (Puncak HBKN)', 'Minggu 3', 'Minggu 4 (Pasca Lebaran)'],
      values: [0.97, 0.97, 0.50, -0.38]
    }];
    slide.addChart(pres.ChartType.col, chartData, {
      x: 0.8, y: 2.0, w: 6.4, h: 4.7,
      showTitle: true,
      title: 'Dinamika IPH April 2025 (Fase HBKN Idul Fitri)',
      titleFontSize: 13,
      showValue: true,
      chartColors: ['0284C7'],
      valAxisLabelColor: '64748B',
      catAxisLabelColor: '0F172A',
      showLegend: false
    });
  } else if (slideIndex === 5) {
    slide.background = { color: 'F8FAFC' };
    const chartData = [{
      name: 'IPH Agustus (%)',
      labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
      values: [1.15, 0.88, 0.67, 0.40]
    }];
    slide.addChart(pres.ChartType.line, chartData, {
      x: 0.8, y: 2.0, w: 6.4, h: 4.7,
      showTitle: true,
      title: 'Tren Penurunan IPH Agustus 2025 (Dampak Penyaluran Beras)',
      titleFontSize: 13,
      showValue: true,
      chartColors: ['16A34A'],
      valAxisLabelColor: '64748B',
      catAxisLabelColor: '0F172A',
      lineSize: 3,
      showLegend: false
    });
  } else if (slideIndex === 6) {
    slide.background = { color: 'F8FAFC' };
    const chartData = [{
      name: 'IPH Desember (%)',
      labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4 (Puncak Akhir Tahun)'],
      values: [1.05, 1.64, 2.03, 2.19]
    }];
    slide.addChart(pres.ChartType.col, chartData, {
      x: 0.8, y: 2.0, w: 6.4, h: 4.7,
      showTitle: true,
      title: 'Kenaikan IPH Mingguan Desember 2025 (%)',
      titleFontSize: 13,
      showValue: true,
      chartColors: ['DC2626'],
      valAxisLabelColor: '64748B',
      catAxisLabelColor: '0F172A',
      showLegend: false
    });
  } else if (slideIndex === 7) {
    slide.background = { color: 'F8FAFC' };
    slide.addText('Rencana Kebijakan', { x: 1, y: 1, fontSize: 20 });
  } else if (slideIndex === 8) {
    slide.background = { color: '0F172A' };
    slide.addImage({ path: LOGO_SE2026, x: 10.9, y: 1.15, w: 1.1, h: 1.1 });
  }

  const outPath = `/tmp/test_slide_${slideIndex}.pptx`;
  await pres.writeFile({ fileName: outPath });

  try {
    const cmd = `osascript -e '
      tell application "Microsoft PowerPoint"
        set f to POSIX file "${outPath}" as alias
        open f
        set sCount to count of slides of active presentation
        close active presentation saving no
        return sCount
      end tell
    '`;
    const res = execSync(cmd, { encoding: 'utf8' }).trim();
    console.log(`Slide ${slideIndex}: OK (slides: ${res})`);
  } catch (err) {
    console.log(`Slide ${slideIndex}: FAILED (${err.message.split('\n')[0]})`);
  }
}

async function run() {
  for (const i of [1, 2, 3, 4, 5, 6, 7, 8]) {
    await testSlide(i);
  }
}
run();
