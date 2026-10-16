// Tests for monthly.js. Run: node scripts/test_monthly.js
const assert = require('node:assert/strict');
const { monthlyIph, meanMonthly, weekPercentile } = require('../monthly.js');

const week = (year, month, w, v) => ({ year, month, week: w, v });
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`); }
}

// Weekly IPH is month-to-date vs the previous month's average (BPS), so the month's value is its last week, not the mean.
test('July 2026 Sulsel takes the M5 value', () => {
  const [m] = monthlyIph([-1.22, -1.56, -1.75, -1.86, -1.96].map((v, i) => week(2026, 7, i + 1, v)));
  assert.equal(m.v, -1.96);
  assert.equal(m.week, 5);
  assert.equal(m.partial, false);
});

test('input order does not matter', () => {
  const [m] = monthlyIph([week(2026, 9, 4, 3.3), week(2026, 9, 1, 1.92), week(2026, 9, 3, 2.95)]);
  assert.equal(m.v, 3.3);
  assert.equal(m.week, 4);
});

test('month that stops before M4 is partial', () => {
  const [m] = monthlyIph([week(2026, 3, 1, 0.81), week(2026, 3, 2, 1.05)]);
  assert.equal(m.v, 1.05);
  assert.equal(m.week, 2);
  assert.equal(m.partial, true);
});

test('months are kept apart and sorted', () => {
  const ms = monthlyIph([week(2026, 8, 4, 0.64), week(2026, 7, 5, -1.96), week(2026, 8, 1, -0.18)]);
  assert.deepEqual(ms.map(m => [m.year, m.month, m.v]), [[2026, 7, -1.96], [2026, 8, 0.64]]);
  assert.equal(ms[1].n, 2);
});

// Two months: the weekly mean (-0.82) overweights July's early weeks; each month should count once.
const twoMonths = [
  ...[-1.22, -1.56, -1.75, -1.86, -1.96].map((v, i) => week(2026, 7, i + 1, v)),
  ...[-0.18, 0.14, 0.41, 0.64].map((v, i) => week(2026, 8, i + 1, v))
];

test('meanMonthly averages month-end values, not weeks', () => {
  assert.equal(meanMonthly(twoMonths), -0.66);
  assert.equal(meanMonthly([]), null);
});

test('weekPercentile compares only with the same week of earlier months', () => {
  // M1 values are small, M4 values large: against all weeks this M1 (0.55) would look low (25%).
  const s = [];
  for (let m = 1; m <= 10; m++) s.push(week(2025, m, 1, m / 10), week(2025, m, 4, 5));
  s.push(week(2026, 1, 1, 0.55));
  assert.equal(weekPercentile(s, s.length - 1), 50);
});

test('weekPercentile pools M4 and M5 and needs enough peers', () => {
  const s = [1, 2, 3, 4, 5, 6, 7, 8].map((v, k) => week(2025, k + 1, k % 2 ? 5 : 4, v));
  s.push(week(2025, 9, 5, 8.5));
  assert.equal(weekPercentile(s, 8), 100);
  assert.equal(weekPercentile(s, 7), null); // only 7 earlier month-end weeks
});

if (failed) { console.log(`\n${failed} test gagal`); process.exit(1); }
console.log('\nSemua test lulus');
