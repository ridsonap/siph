#!/usr/bin/env python3
"""
SIPH Sulsel Data Pipeline
Extracts IPH records from PDFs and PNGs across 2023-2026 into a clean JSON dataset
and prepares an optimized GeoJSON of South Sulawesi regencies.
"""

import os
import re
import json
import zlib
import glob
import subprocess
import urllib.request
from concurrent.futures import ProcessPoolExecutor

KAB_MAP = {
    '7301': 'Kab. Kepulauan Selayar',
    '7302': 'Kab. Bulukumba',
    '7303': 'Kab. Bantaeng',
    '7304': 'Kab. Jeneponto',
    '7305': 'Kab. Takalar',
    '7306': 'Kab. Gowa',
    '7307': 'Kab. Sinjai',
    '7308': 'Kab. Maros',
    '7309': 'Kab. Pangkajene Kepulauan',
    '7310': 'Kab. Barru',
    '7311': 'Kab. Bone',
    '7312': 'Kab. Soppeng',
    '7313': 'Kab. Wajo',
    '7314': 'Kab. Sidenreng Rappang',
    '7315': 'Kab. Pinrang',
    '7316': 'Kab. Enrekang',
    '7317': 'Kab. Luwu',
    '7318': 'Kab. Tana Toraja',
    '7322': 'Kab. Luwu Utara',
    '7325': 'Kab. Luwu Timur',
    '7326': 'Kab. Toraja Utara',
    '7371': 'Kota Makassar',
    '7372': 'Kota Parepare',
    '7373': 'Kota Palopo'
}

KAB_PATTERNS = [
    ('7322', r'luwu\s*utara'),
    ('7325', r'luwu\s*timur'),
    ('7317', r'\bluwu\b'),
    ('7326', r'toraja\s*utara'),
    ('7318', r'tana\s*toraja'),
    ('7301', r'selayar'),
    ('7302', r'bulukumba'),
    ('7303', r'bantaeng'),
    ('7304', r'jeneponto'),
    ('7305', r'takalar'),
    ('7306', r'\bgowa\b'),
    ('7307', r'sinjai'),
    ('7308', r'maros'),
    ('7309', r'pangkajene|pangkep'),
    ('7310', r'barru'),
    ('7311', r'\bbone\b'),
    ('7312', r'soppeng'),
    ('7313', r'\bwajo\b'),
    ('7314', r'sidenreng|sidrap'),
    ('7315', r'pinrang'),
    ('7316', r'enrekang'),
    ('7371', r'makassar'),
    ('7372', r'parepare'),
    ('7373', r'palopo')
]

MONTH_MAP = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12
}

MONTH_NAMES = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

def parse_filename(filepath):
    fn = os.path.basename(filepath).lower()
    m_found = None
    for name, num in MONTH_MAP.items():
        if name in fn:
            m_found = num
            break
    w_match = re.search(r'm([1-5])', fn)
    w_num = int(w_match.group(1)) if w_match else 1
    y_match = re.search(r'(202[3-6])', fn)
    y_num = int(y_match.group(1)) if y_match else 2026
    period_key = f"{y_num}-{m_found:02d}-W{w_num}" if m_found else f"{y_num}-01-W{w_num}"
    label = f"{MONTH_NAMES[m_found]} {y_num} (Minggu {w_num})" if m_found else f"M{w_num} {y_num}"
    return {
        'period_key': period_key,
        'year': y_num,
        'month': m_found or 1,
        'week': w_num,
        'label': label,
        'filepath': filepath
    }

COMMODITY_CLEANUP = {
    'cabairawit': 'Cabai Rawit',
    'cabai rawit': 'Cabai Rawit',
    'cabal rawit': 'Cabai Rawit',
    'cabalrawit': 'Cabai Rawit',
    'cabal merah': 'Cabai Merah',
    'cabalmerah': 'Cabai Merah',
    'cabaimerah': 'Cabai Merah',
    'cabai merah': 'Cabai Merah',
    'bawangmerah': 'Bawang Merah',
    'bawang merah': 'Bawang Merah',
    'bawangputih': 'Bawang Putih',
    'bawang putih': 'Bawang Putih',
    'dagingayamras': 'Daging Ayam Ras',
    'daging ayam ras': 'Daging Ayam Ras',
    'dagingsapi': 'Daging Sapi',
    'daging sapi': 'Daging Sapi',
    'telurayamras': 'Telur Ayam Ras',
    'telur ayam ras': 'Telur Ayam Ras',
    'minyakgoreng': 'Minyak Goreng',
    'minyak goreng': 'Minyak Goreng',
    'udangbasah': 'Udang Basah',
    'udang basah': 'Udang Basah',
    'beras': 'Beras',
    'gulapasir': 'Gula Pasir',
    'gula pasir': 'Gula Pasir',
    'jeruk': 'Jeruk'
}

def normalize_comm_name(raw):
    if not raw: return '-'
    clean_str = re.sub(r'^[^\w]+|[^\w]+$', '', raw).strip()
    s = re.sub(r'[^a-zA-Z\s]', '', clean_str).strip().lower()
    # Replace cabal with cabai
    s = s.replace('cabal', 'cabai')
    if s in COMMODITY_CLEANUP:
        return COMMODITY_CLEANUP[s]
    # check keys
    for k, v in COMMODITY_CLEANUP.items():
        if k in s:
            return v
    return clean_str.title()

def clean_number(s):
    if not s:
        return None
    val = s.replace('“', '-').replace('”', '-').replace('—', '-').replace('–', '-').replace('=', '-').replace(',', '.').replace(' ', '').strip()
    try:
        return round(float(val), 4)
    except Exception:
        return None

def parse_pdf_file(filepath):
    meta = parse_filename(filepath)
    with open(filepath, 'rb') as f:
        content = f.read()

    records = []
    for m in re.finditer(rb'/Length\s+(\d+).*?stream\r?\n', content, re.DOTALL):
        length = int(m.group(1))
        start = m.end()
        data = content[start:start+length]
        try:
            decompressed = zlib.decompress(data).decode('latin1', errors='ignore')
        except Exception:
            continue

        if 'BT' in decompressed and 'ET' in decompressed:
            bts = re.findall(r'BT\s*(.*?)\s*ET', decompressed, re.DOTALL)
            tokens = []
            for bt in bts:
                parts = re.findall(r'\(((?:\\.|[^\)])*)\)', bt)
                merged = ''.join(parts).replace(r'\(', '(').replace(r'\)', ')').strip()
                if merged:
                    tokens.append(merged)

            if len(tokens) > 20:
                idx = 0
                while idx < len(tokens):
                    tok = tokens[idx]
                    if re.match(r'^73\d{2}$', tok):
                        code = tok
                        # Tokens format: [code, 'Sulawesi Selatan', 'Kab. ...', IPH, Comms, Fluk, CV, Status]
                        j = idx + 1
                        while j < len(tokens) and not re.match(r'^73\d{2}$', tokens[j]):
                            j += 1
                        chunk = tokens[idx+1:j]

                        # Extract fields
                        iph_val = None
                        comms = []
                        fluk_name = None
                        cv_val = None
                        status = 'Stabil'

                        for item in chunk:
                            # check IPH float
                            if iph_val is None and re.match(r'^[+-]?\d+[\.,]\d+$', item):
                                iph_val = clean_number(item)
                            # check commodities list
                            elif '(' in item and ')' in item:
                                matched_c = re.findall(r'([A-Za-z\s/]+)\(([+-]?[\d\.,]+)\)', item)
                                for cname, ccont in matched_c:
                                    cval = clean_number(ccont)
                                    if cval is not None:
                                        comms.append({'nama': cname.strip().title(), 'kontribusi': cval})
                            # check CV
                            elif cv_val is None and re.match(r'^\d+[\.,]\d+$', item) and iph_val is not None:
                                cv_val = clean_number(item)
                            # check status
                            elif item.lower() in ['naik', 'turun', 'stabil']:
                                status = item.title()
                            # check fluctuation commodity name
                            elif any(w in item.upper() for w in ['CABAI', 'BERAS', 'BAWANG', 'DAGING', 'TELUR', 'MINYAK', 'GULA', 'IKAN', 'UDANG']):
                                fluk_name = normalize_comm_name(item)

                        if iph_val is not None:
                            if status == 'Stabil':
                                status = 'Naik' if iph_val > 0 else ('Turun' if iph_val < 0 else 'Stabil')
                            records.append({
                                'kode_kab': code,
                                'nama_kab': KAB_MAP.get(code, f'Kab. {code}'),
                                'iph': iph_val,
                                'status': status,
                                'komoditas': comms,
                                'fluktuasi_tertinggi': fluk_name or (comms[0]['nama'] if comms else '-'),
                                'cv': cv_val
                            })
                        idx = j
                    else:
                        idx += 1
                if records:
                    break
    return meta, records

def parse_png_file(filepath):
    meta = parse_filename(filepath)
    def run_ocr(psm=6):
        cmd = ['/opt/homebrew/bin/tesseract', filepath, 'stdout']
        if psm: cmd += ['--psm', str(psm)]
        try:
            return subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8', errors='ignore')
        except Exception:
            return ''

    txt = run_ocr(6)
    lines = [l.strip() for l in txt.split('\n') if l.strip()]
    if sum(1 for l in lines if '73' in l) < 14:
        txt = run_ocr(None)
        lines = [l.strip() for l in txt.split('\n') if l.strip()]

    records = []
    seen_kabs = set()

    for line in lines:
        matched_code = None
        for code, pat in KAB_PATTERNS:
            if re.search(pat, line, re.I):
                matched_code = code
                break
        if not matched_code:
            m_code = re.search(r'\b(73\d{2})\b', line)
            if m_code and m_code.group(1) in KAB_MAP:
                matched_code = m_code.group(1)
        if not matched_code or matched_code in seen_kabs:
            continue

        # Commodities
        comms = re.findall(r'([A-Za-z\s/]{3,})\s*[\(\{\[]\s*([“\"—–=-]?\s*[\d,\.]+)\s*[\)\}\]]', line)
        parsed_comms = []
        for cname, cval in comms:
            cname_norm = normalize_comm_name(cname)
            if any(w in cname_norm.lower() for w in ['kab', 'sulawesi', 'selatan', 'kode', 'provinsi']):
                continue
            clean_c = clean_number(cval)
            if clean_c is not None:
                parsed_comms.append({'nama': cname_norm, 'kontribusi': clean_c})

        # IPH value
        m_comm = re.search(r'[A-Za-z\s/]{3,}\s*[\(\{\[]\s*[“\"—–=-]?\s*[\d,\.]+\s*[\)\}\]]', line)
        pre = line[:m_comm.start()] if m_comm else line
        pre = re.sub(r'\b73\d{2}\b', '', pre)
        m_val = re.search(r'([“\"—–=-]?\s*\d+[\.,]\d+)', pre)
        iph_val = None
        if m_val:
            iph_val = clean_number(m_val.group(1))
        elif ' 011 ' in pre or pre.strip().endswith('011'):
            iph_val = 0.11

        # Suffix
        last_paren = line.rfind(')')
        suffix = line[last_paren+1:] if last_paren != -1 else ''
        m_cv = re.search(r'(\d+[\.,]\d{2,})', suffix)
        cv_val = clean_number(m_cv.group(1)) if m_cv else None
        fluk = None
        if m_cv:
            raw_fluk = suffix[:m_cv.start()].strip(' _-–—|[]\t\n')
            if raw_fluk:
                fluk = normalize_comm_name(raw_fluk.split(';')[-1].split(',')[-1])
        if not fluk and parsed_comms:
            fluk = parsed_comms[0]['nama']

        status = 'Naik' if (iph_val is not None and iph_val > 0) else ('Turun' if (iph_val is not None and iph_val < 0) else 'Stabil')

        if iph_val is not None:
            seen_kabs.add(matched_code)
            records.append({
                'kode_kab': matched_code,
                'nama_kab': KAB_MAP[matched_code],
                'iph': iph_val,
                'status': status,
                'komoditas': parsed_comms,
                'fluktuasi_tertinggi': fluk or '-',
                'cv': cv_val
            })

    return meta, records

def process_file(filepath):
    if filepath.endswith('.pdf'):
        return parse_pdf_file(filepath)
    else:
        return parse_png_file(filepath)

def fetch_and_optimize_geojson(output_path):
    url = 'https://raw.githubusercontent.com/TheMaggieSimpson/IndonesiaGeoJSON/main/kota-kabupaten.json'
    print(f"Downloading GeoJSON from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as resp:
        d = json.loads(resp.read().decode())

    def round_coords(geom, precision=4):
        def _round(coords):
            if not coords: return []
            if isinstance(coords[0], (int, float)):
                return [round(coords[0], precision), round(coords[1], precision)]
            return [_round(c) for c in coords]
        return {'type': geom['type'], 'coordinates': _round(geom['coordinates'])}

    def simplify_ring(ring, tol=0.003):
        if len(ring) <= 4: return ring
        res = [ring[0]]
        for p in ring[1:-1]:
            if abs(p[0] - res[-1][0]) > tol or abs(p[1] - res[-1][1]) > tol:
                res.append(p)
        res.append(ring[-1])
        return res if len(res) >= 4 else ring

    def simplify_geom(geom):
        if geom['type'] == 'Polygon':
            return {'type': 'Polygon', 'coordinates': [simplify_ring(r) for r in geom['coordinates']]}
        elif geom['type'] == 'MultiPolygon':
            return {'type': 'MultiPolygon', 'coordinates': [[simplify_ring(r) for r in poly] for poly in geom['coordinates']]}
        return geom

    features = []
    for f in d.get('features', []):
        props = f.get('properties', {})
        if 'sulawesi selatan' in str(props).lower():
            code = str(props.get('CC_2', ''))
            name = props.get('NAME_2', '')
            type_kab = props.get('TYPE_2', 'Kabupaten')
            full_name = f"Kota {name}" if 'kota' in type_kab.lower() else f"Kab. {name}"
            # Standardize names to match KAB_MAP
            std_name = KAB_MAP.get(code, full_name)
            features.append({
                'type': 'Feature',
                'id': code,
                'properties': {
                    'id': code,
                    'code': code,
                    'name': std_name,
                    'kab_name': name
                },
                'geometry': simplify_geom(round_coords(f['geometry'], 4))
            })

    geojson = {'type': 'FeatureCollection', 'features': features}
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as out:
        json.dump(geojson, out, separators=(',', ':'))
    print(f"Saved optimized GeoJSON ({len(features)} features) -> {output_path} ({os.path.getsize(output_path)//1024} KB)")

def main():
    base_dir = 'Perkembangan IPH Sulsel'
    all_files = sorted(glob.glob(f'{base_dir}/**/*.*', recursive=True))
    all_files = [f for f in all_files if not os.path.basename(f).startswith('.') and f.endswith(('.png', '.pdf'))]
    print(f"Discovered {len(all_files)} files to process.")

    # Process files
    results = []
    with ProcessPoolExecutor(max_workers=8) as executor:
        for meta, records in executor.map(process_file, all_files):
            if records:
                results.append((meta, records))
                print(f"✓ [{meta['period_key']}] {os.path.basename(meta['filepath'])}: {len(records)} kab")

    # Sort results chronologically by period_key
    results.sort(key=lambda item: item[0]['period_key'])

    periods = []
    regencies_time_series = {code: {'name': name, 'series': []} for code, name in KAB_MAP.items()}
    commodity_stats = {}

    for meta, records in results:
        # calculate period stats
        iph_values = [r['iph'] for r in records if r['iph'] is not None]
        avg_iph = round(sum(iph_values) / len(iph_values), 2) if iph_values else 0
        naik_cnt = sum(1 for r in records if r['status'] == 'Naik')
        turun_cnt = sum(1 for r in records if r['status'] == 'Turun')
        stabil_cnt = sum(1 for r in records if r['status'] == 'Stabil')

        sorted_by_iph = sorted(records, key=lambda r: r['iph'] if r['iph'] is not None else 0)
        top_loser = sorted_by_iph[0] if sorted_by_iph else None
        top_gainer = sorted_by_iph[-1] if sorted_by_iph else None

        # Period commodity frequency
        freq = {}
        for r in records:
            if r['fluktuasi_tertinggi'] and r['fluktuasi_tertinggi'] != '-':
                fn = r['fluktuasi_tertinggi']
                freq[fn] = freq.get(fn, 0) + 1
                commodity_stats[fn] = commodity_stats.get(fn, 0) + 1

        top_threat = max(freq.items(), key=lambda x: x[1])[0] if freq else '-'

        period_entry = {
            'period_key': meta['period_key'],
            'year': meta['year'],
            'month': meta['month'],
            'week': meta['week'],
            'label': meta['label'],
            'avg_iph': avg_iph,
            'counts': {'naik': naik_cnt, 'turun': turun_cnt, 'stabil': stabil_cnt},
            'top_gainer': {'name': top_gainer['nama_kab'], 'iph': top_gainer['iph']} if top_gainer else None,
            'top_loser': {'name': top_loser['nama_kab'], 'iph': top_loser['iph']} if top_loser else None,
            'top_threat': top_threat,
            'records': records
        }
        periods.append(period_entry)

        # Append to regencies time series
        rec_map = {r['kode_kab']: r for r in records}
        for code, info in regencies_time_series.items():
            r = rec_map.get(code)
            info['series'].append({
                'period_key': meta['period_key'],
                'iph': r['iph'] if r else None,
                'status': r['status'] if r else None,
                'threat': r['fluktuasi_tertinggi'] if r else None
            })

    # Top overall commodities
    sorted_threats = sorted(commodity_stats.items(), key=lambda x: -x[1])[:10]

    output_dataset = {
        'meta': {
            'generated_at': '2026-10-09',
            'total_periods': len(periods),
            'years': sorted(list(set(p['year'] for p in periods))),
            'kab_count': len(KAB_MAP)
        },
        'periods': periods,
        'regencies_time_series': regencies_time_series,
        'top_overall_commodities': [{'name': name, 'count': cnt} for name, cnt in sorted_threats]
    }

    out_json = 'data/iph_sulsel.json'
    os.makedirs('data', exist_ok=True)
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(output_dataset, f, separators=(',', ':'))
    print(f"\n✓ Saved processed dataset -> {out_json} ({os.path.getsize(out_json)//1024} KB)")

    # Fetch and optimize GeoJSON
    fetch_and_optimize_geojson('data/sulsel_geo.json')

if __name__ == '__main__':
    main()
