/* Monthly summary of weekly IPH values. Shared by the dashboard (window.IPHMonthly) and Node tests.
 *
 * BPS defines the IPH of week m as the average price from Monday of week 1 through Friday of week m,
 * compared with the average price of the whole previous month. Weekly values are therefore cumulative
 * within a month, so the month is summarised by its last available week. Averaging the weeks would
 * overweight the early, partial weeks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IPHMonthly = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';

  // Every month spans at least four BPS weeks; M5 is not always released, so only a month
  // that stops before M4 is known to be incomplete.
  const MIN_WEEKS = 4;

  /** Collapse weekly entries {year, month, week, v} into one value per (year, month), sorted by date.
   *  Returns {year, month, v, week, n, partial}: v is the IPH of the last available week. */
  function monthlyIph(entries) {
    const agg = new Map();
    entries.forEach(e => {
      const k = `${e.year}-${e.month}`;
      const a = agg.get(k) || { year: e.year, month: e.month, week: 0, v: null, n: 0 };
      a.n++;
      if (e.week > a.week) { a.week = e.week; a.v = e.v; }
      agg.set(k, a);
    });
    return [...agg.values()]
      .map(a => ({ ...a, partial: a.week < MIN_WEEKS }))
      .sort((a, b) => a.year - b.year || a.month - b.month);
  }

  /** Mean of the month-end values, so each month counts once whatever its number of weekly releases. */
  function meanMonthly(entries) {
    const ms = monthlyIph(entries);
    return ms.length ? Math.round(ms.reduce((s, m) => s + m.v, 0) / ms.length * 100) / 100 : null;
  }

  // Week m accumulates m weeks of prices, so only the same week of other months is comparable.
  // M4 and M5 both cover (almost) the whole month and are pooled.
  const weekClass = w => Math.min(w, MIN_WEEKS);

  /** Percentile (0–100) of series[i].v among earlier entries of the same week class,
   *  or null with fewer than minPeers of them. series: [{week, v}] in date order. */
  function weekPercentile(series, i, minPeers = 8) {
    const cur = series[i], k = weekClass(cur.week);
    const peers = series.slice(0, i).filter(e => weekClass(e.week) === k).map(e => e.v);
    if (peers.length < minPeers) return null;
    const below = peers.filter(v => v < cur.v).length;
    const eq = peers.filter(v => v === cur.v).length;
    return (below + eq / 2) / peers.length * 100;
  }

  return { monthlyIph, meanMonthly, weekPercentile, weekClass };
});
