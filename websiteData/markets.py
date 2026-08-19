import csv, io, json, subprocess, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = {'User-Agent': 'Mozilla/5.0'}
DAYS = 730

def curl(url, body, timeout):
    cmd = ['curl', '-sSL', '--max-time', str(timeout), url]
    if body is not None:
        cmd += ['-H', 'Content-Type: application/json', '-d', json.dumps(body)]
    return subprocess.run(cmd, capture_output=True, check=True, timeout=timeout + 10).stdout

def get(url, body=None, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    if body is not None:
        req.data = json.dumps(body).encode()
        req.add_header('Content-Type', 'application/json')
    try:
        return urllib.request.urlopen(req, timeout=timeout).read()
    except Exception:
        return curl(url, body, timeout)

def downsample(pts, cap=600):
    step = max(1, len(pts) // cap)
    keep = list(range(0, len(pts), step))
    if keep[-1] != len(pts) - 1:
        keep.append(len(pts) - 1)
    return [pts[i] for i in keep]

def trim(pts, dec):
    cut = (time.time() - DAYS * 86400) * 1000
    pts = [[p[0] // 86400000] + [round(v, dec) for v in p[1:]] for p in pts if p[0] >= cut]
    return downsample(pts)

def synthOhlc(pts):
    out, prev = [], None
    for t, v in pts:
        o = prev if prev is not None else v
        out.append([t, o, max(o, v), min(o, v), v])
        prev = v
    return out

def fred(series):
    text = get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + series).decode('utf-8', 'replace')
    pts = []
    for row in csv.reader(io.StringIO(text)):
        try:
            d = datetime.strptime(row[0], '%Y-%m-%d').replace(tzinfo=timezone.utc)
            pts.append([int(d.timestamp() * 1000), float(row[1])])
        except (ValueError, IndexError):
            continue
    return pts

def kraken(pair):
    d = json.loads(get('https://api.kraken.com/0/public/OHLC?interval=1440&pair=' + pair))
    if d.get('error'):
        raise RuntimeError(', '.join(d['error']))
    rows = d['result'][[k for k in d['result'] if k != 'last'][0]]
    return [[int(r[0]) * 1000, float(r[1]), float(r[2]), float(r[3]), float(r[4])] for r in rows]

def hyperliquid(coin):
    end = int(time.time() * 1000)
    rows = json.loads(get('https://api.hyperliquid.xyz/info', {'type': 'candleSnapshot',
        'req': {'coin': coin, 'interval': '1d', 'startTime': end - DAYS * 86400000, 'endTime': end}}))
    return [[int(c['t']), float(c['o']), float(c['h']), float(c['l']), float(c['c'])] for c in rows]

def invert(pts):
    return [[t, 1 / v] for t, v in pts if v]

MARKETS = [
    ('gold', 'gold', 'god\'s money', ' usd', 2, False, 'Kraken public API · gold-backed token, tracks spot',
     lambda: kraken('PAXGUSD')),
    ('zec', 'zcash', 'private money', ' usd', 2, False, 'Kraken public API · daily candles',
     lambda: kraken('XZECZUSD')),
    ('hype', 'hype', 'new marketplace', ' usd', 3, False, 'Hyperliquid API · daily candles',
     lambda: hyperliquid('HYPE')),
    ('us10y', 'us 10y yield', 'time value of money', ' %', 2, True, 'FRED · US Treasury constant maturity',
     lambda: synthOhlc(fred('DGS10'))),
    ('usdeur', 'usd/eur', 'fiat fight', ' eur', 4, False, 'FRED · ECB reference rate, inverted',
     lambda: synthOhlc(invert(fred('DEXUSEU')))),
    ('spx', 's&p 500', 'corporate america', '', 2, False, 'FRED · S&P Dow Jones Indices',
     lambda: synthOhlc(fred('SP500'))),
]

out = {'updated': int(time.time() * 1000), 'series': []}
for key, name, tag, unit, dec, bp, src, fn in MARKETS:
    try:
        pts = trim(fn(), dec)
        if len(pts) < 2:
            raise RuntimeError('too few points')
        out['series'].append({'key': key, 'name': name, 'tag': tag, 'unit': unit, 'bp': bp, 'src': src, 'pts': pts})
    except Exception as ex:
        print(key, 'failed:', ex)

Path(__file__).with_name('markets.json').write_text(json.dumps(out, separators=(',', ':')) + '\n')
print('markets.json:', {s['key']: len(s['pts']) for s in out['series']})
