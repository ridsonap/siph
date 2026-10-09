#!/usr/bin/env python3
"""
CLI Tool: Analisis IPH Mandiri Per Kabupaten/Kota di Sulawesi Selatan
Menghasilkan ringkasan analitik, rekapitulasi komoditas pemicu,
serta rekomendasi kebijakan 4K untuk bahan paparan Pemda / TPID.
"""

import sys
import json
import argparse
from collections import defaultdict

def load_data(filepath='data/iph_sulsel.json'):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_regency(data, target_query, target_year=None):
    target_query = target_query.lower().strip()
    
    # 1. Match regency in regencies_time_series
    matched_code = None
    matched_name = None
    for code, info in data.get('regencies_time_series', {}).items():
        name_clean = info['name'].lower()
        if target_query in code or target_query in name_clean:
            matched_code = code
            matched_name = info['name']
            break
            
    if not matched_code:
        print(f"Error: Kabupaten/Kota dengan kata kunci '{target_query}' tidak ditemukan.")
        sys.exit(1)

    # 2. Extract weekly records from periods
    weekly_records = []
    for p in data.get('periods', []):
        pk = p['period_key']
        if target_year and not pk.startswith(str(target_year)):
            continue
            
        sulsel_avg = p.get('avg_iph')
        recs = p.get('records', [])
        # determine rank in period
        recs_sorted = sorted([r for r in recs if r.get('iph') is not None], key=lambda x: x.get('iph', 0), reverse=True)
        
        target_rec = None
        target_rank = None
        for idx, r in enumerate(recs_sorted):
            if r.get('kode_kab') == matched_code or matched_name.lower() in r.get('nama_kab', '').lower():
                target_rec = r
                target_rank = idx + 1
                break
                
        if target_rec:
            weekly_records.append({
                'period_key': pk,
                'label': p.get('label'),
                'sulsel_avg': sulsel_avg,
                'iph': target_rec.get('iph'),
                'status': target_rec.get('status'),
                'rank': target_rank,
                'total_daerah': len(recs_sorted),
                'komoditas': target_rec.get('komoditas', []),
                'fluktuasi_tertinggi': target_rec.get('fluktuasi_tertinggi'),
                'cv': target_rec.get('cv')
            })

    if not weekly_records:
        print(f"Tidak ada data untuk {matched_name} pada tahun {target_year or 'semua'}.")
        return None

    # 3. Calculate Aggregations
    iph_vals = [r['iph'] for r in weekly_records if r['iph'] is not None]
    avg_iph = sum(iph_vals) / len(iph_vals) if iph_vals else 0
    max_rec = max(weekly_records, key=lambda x: x['iph'] if x['iph'] is not None else -999)
    min_rec = min(weekly_records, key=lambda x: x['iph'] if x['iph'] is not None else 999)

    naik_cnt = sum(1 for r in weekly_records if r['status'] == 'Naik')
    turun_cnt = sum(1 for r in weekly_records if r['status'] == 'Turun')
    stabil_cnt = sum(1 for r in weekly_records if r['status'] == 'Stabil')

    # Threat & Commodity breakdown
    threat_counts = defaultdict(int)
    pos_commodities = defaultdict(list)
    neg_commodities = defaultdict(list)

    for r in weekly_records:
        t = r.get('fluktuasi_tertinggi')
        if t and t != '-':
            threat_counts[t] += 1
        for c in r.get('komoditas', []):
            c_name = c['nama']
            c_kont = c['kontribusi']
            if c_kont > 0:
                pos_commodities[c_name].append(c_kont)
            elif c_kont < 0:
                neg_commodities[c_name].append(c_kont)

    top_threats = sorted(threat_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    top_inflation_drivers = []
    for c_name, vals in pos_commodities.items():
        top_inflation_drivers.append({
            'nama': c_name,
            'frekuensi': len(vals),
            'avg_andil': sum(vals) / len(vals),
            'max_andil': max(vals)
        })
    top_inflation_drivers.sort(key=lambda x: x['frekuensi'], reverse=True)

    top_deflation_drivers = []
    for c_name, vals in neg_commodities.items():
        top_deflation_drivers.append({
            'nama': c_name,
            'frekuensi': len(vals),
            'avg_andil': sum(vals) / len(vals),
            'min_andil': min(vals)
        })
    top_deflation_drivers.sort(key=lambda x: x['frekuensi'], reverse=True)

    summary = {
        'kode': matched_code,
        'nama': matched_name,
        'tahun': target_year or 'Semua Periode',
        'total_minggu': len(weekly_records),
        'avg_iph': round(avg_iph, 2),
        'status_distribusi': {'naik': naik_cnt, 'turun': turun_cnt, 'stabil': stabil_cnt},
        'max_peak': {'period': max_rec['period_key'], 'label': max_rec['label'], 'iph': max_rec['iph'], 'komoditas': max_rec['komoditas']},
        'min_trough': {'period': min_rec['period_key'], 'label': min_rec['label'], 'iph': min_rec['iph'], 'komoditas': min_rec['komoditas']},
        'top_threats': top_threats,
        'top_inflation_drivers': top_inflation_drivers[:5],
        'top_deflation_drivers': top_deflation_drivers[:5],
        'latest_record': weekly_records[-1] if weekly_records else None,
        'weekly_history': weekly_records
    }
    return summary

def print_text_summary(res):
    print("=" * 65)
    print(f"LAPORAN ANALISIS IPH MANDIRI: {res['nama'].upper()}")
    print(f"Periode Evaluasi: {res['tahun']} ({res['total_minggu']} Rilis Mingguan)")
    print("=" * 65)
    
    lat = res['latest_record']
    if lat:
        print(f"\n[1] KONDISI TERKINI ({lat['label']}):")
        print(f"    - Nilai IPH: {lat['iph']:+.2f}% ({lat['status']})")
        print(f"    - Peringkat di Sulsel: #{lat['rank']} dari {lat['total_daerah']} daerah")
        print(f"    - Rata-rata Sulsel saat ini: {lat['sulsel_avg']:+.2f}%")
        print(f"    - Fluktuasi Tertinggi: {lat['fluktuasi_tertinggi']}")
        if lat['komoditas']:
            comms_str = ", ".join([f"{c['nama']} ({c['kontribusi']:+.2f})" for c in lat['komoditas']])
            print(f"    - Andil Komoditas: {comms_str}")

    print(f"\n[2] INDIKATOR AGREGAT:")
    print(f"    - Rata-rata IPH: {res['avg_iph']:+.2f}%")
    print(f"    - Tren Status: Naik {res['status_distribusi']['naik']}x, Turun {res['status_distribusi']['turun']}x, Stabil {res['status_distribusi']['stabil']}x")
    print(f"    - Puncak Inflasi Tertinggi: {res['max_peak']['label']} ({res['max_peak']['iph']:+.2f}%)")
    print(f"    - Titik Deflasi Terendah  : {res['min_trough']['label']} ({res['min_trough']['iph']:+.2f}%)")

    print(f"\n[3] KOMODITAS PALING SERING BERGEJOLAK (Top Threat Frequency):")
    for name, cnt in res['top_threats']:
        print(f"    • {name:20}: {cnt} kali tercatat sebagai fluktuasi tertinggi")

    print(f"\n[4] KOMODITAS UTAMA PEMICU INFLASI (Positive Drivers):")
    for c in res['top_inflation_drivers']:
        print(f"    • {c['nama']:20}: muncul {c['frekuensi']}x | Rata-rata andil {c['avg_andil']:+.2f}% | Max andil {c['max_andil']:+.2f}%")

    print(f"\n[5] KOMODITAS UTAMA PENYUMBANG DEFLASI (Negative Drivers):")
    for c in res['top_deflation_drivers']:
        print(f"    • {c['nama']:20}: muncul {c['frekuensi']}x | Rata-rata andil {c['avg_andil']:+.2f}% | Min andil {c['min_andil']:+.2f}%")

    print("\n[6] REKOMENDASI KEBIJAKAN PENGENDALIAN INFLASI DAERAH (4K TPID):")
    is_island = 'selayar' in res['nama'].lower() or 'pangkep' in res['nama'].lower()
    if is_island:
        print("    1. Keterjangkauan Harga: Subsidi selisih harga komoditas pokok jelang HBKN.")
        print("    2. Ketersediaan Pasokan: Penguatan buffer stock dan optimalisasi cold storage pulau.")
        print("    3. Kelancaran Distribusi: Jaminan prioritas logistik angkutan laut penyeberangan Bira-Pamatata.")
        print("    4. Komunikasi Efektif  : Edukasi belanja bijak dan transparansi harga pasar rakyat.")
    else:
        print("    1. Keterjangkauan Harga: Operasi Pasar Murah (OPM) dan Gerakan Pangan Murah (GPM) berkala.")
        print("    2. Ketersediaan Pasokan: Fasilitasi Kerjasama Antar Daerah (KAD) dengan sentra produksi Sulsel.")
        print("    3. Kelancaran Distribusi: Pemantauan jalur distribusi darat dan penertiban hambatan rantai pasok.")
        print("    4. Komunikasi Efektif  : Publikasi rutin panel harga harian dan imbauan belanja bijak.")
    print("=" * 65)

def main():
    parser = argparse.ArgumentParser(description="Analisis IPH Mandiri Kabupaten/Kota Sulawesi Selatan")
    parser.add_argument("query", nargs="?", default="7301", help="Kode atau nama kabupaten/kota (misal: 7301, selayar, bone, makassar)")
    parser.add_argument("--tahun", "-y", type=str, default="2026", help="Tahun rilis (2023, 2024, 2025, 2026, atau all)")
    parser.add_argument("--json", action="store_true", help="Output format JSON")
    args = parser.parse_args()

    year_filter = None if args.tahun.lower() == 'all' else args.tahun
    data = load_data()
    res = analyze_regency(data, args.query, year_filter)
    
    if not res:
        return

    if args.json:
        # omit weekly history for clean json output
        clean_res = {k: v for k, v in res.items() if k != 'weekly_history'}
        print(json.dumps(clean_res, indent=2, ensure_ascii=False))
    else:
        print_text_summary(res)

if __name__ == '__main__':
    main()
