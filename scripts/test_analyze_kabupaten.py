"""Tests for analyze_kabupaten.py. Run: python3 scripts/test_analyze_kabupaten.py"""
import contextlib
import io
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze_kabupaten as ak  # noqa: E402


def week(year, month, w, iph):
    return {'year': year, 'month': month, 'week': w, 'iph': iph}


class MonthEndMean(unittest.TestCase):
    # Weekly IPH is month-to-date vs the previous month's average (BPS), so each month counts once
    # with its last available week. The weekly mean of these records would be -0.82.
    def test_each_month_counts_once(self):
        recs = [week(2026, 7, i + 1, v) for i, v in enumerate([-1.22, -1.56, -1.75, -1.86, -1.96])]
        recs += [week(2026, 8, i + 1, v) for i, v in enumerate([-0.18, 0.14, 0.41, 0.64])]
        self.assertEqual(ak.month_end_mean(recs), -0.66)

    def test_empty(self):
        self.assertIsNone(ak.month_end_mean([]))

    def test_analyze_regency_uses_month_end_mean(self):
        rec = lambda iph: {'kode_kab': '7301', 'nama_kab': 'Kepulauan Selayar', 'iph': iph, 'status': 'Naik' if iph > 0 else 'Turun'}
        periods = [{'period_key': f'2026-{m:02d}-W{w}', 'label': f'{m} {w}', 'year': 2026, 'month': m, 'week': w,
                    'avg_iph': 0, 'records': [rec(v)]}
                   for m, vals in ((7, [-1.22, -1.56, -1.75, -1.86, -1.96]), (8, [-0.18, 0.14, 0.41, 0.64]))
                   for w, v in enumerate(vals, 1)]
        data = {'regencies_time_series': {'7301': {'name': 'Kepulauan Selayar'}}, 'periods': periods}
        with contextlib.redirect_stdout(io.StringIO()):
            res = ak.analyze_regency(data, '7301', '2026')
        self.assertEqual(res['avg_iph'], -0.66)

if __name__ == '__main__':
    unittest.main()
