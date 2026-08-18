import csv, io, json, time, urllib.request
from datetime import datetime, timezone
from pathlib import Path

UA = {'User-Agent': 'Mozilla/5.0'}
DAYS = 730

def get(url, body=None, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    if body is not None:
        req.data = json.dumps(body).encode()
        req.add_header('Content-Type', 'application/json')
    return urllib.request.urlopen(req, timeout=timeout).read()

def downsample(pts, cap=600):
    step = max(1, len(pts) // cap)
    keep = list(range(0, len(pts), step))
    if keep[-1] != len(pts) - 1:
        keep.append(len(pts) - 1)
    return [pts[i] for i in keep]

def trim(pts, dec):
    cut = (time.time() - DAYS * 86400) * 1000
    pts = [[t, round(v, dec)] for t, v in pts if t >= cut]
    return downsample(pts)

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
    return [[int(r[0]) * 1000, float(r[4])] for r in rows]

def hyperliquid(coin):
    end = int(time.time() * 1000)
    rows = json.loads(get('https://api.hyperliquid.xyz/info', {'type': 'candleSnapshot',
        'req': {'coin': coin, 'interval': '1d', 'startTime': end - DAYS * 86400000, 'endTime': end}}))
    return [[int(c['t']), float(c['c'])] for c in rows]

def invert(pts):
    return [[t, 1 / v] for t, v in pts if v]

MARKETS = [
    ('gold', 'gold', 'paxg/usd', ' usd', 2, 'Kraken public API &middot; gold-backed token, tracks spot',
     lambda: kraken('PAXGUSD')),
    ('us10y', 'us 10y yield', 'dgs10', ' %', 2, 'FRED &middot; US Treasury constant maturity',
     lambda: fred('DGS10')),
    ('usdeur', 'usd/eur', 'euro per dollar', ' eur', 4, 'FRED &middot; ECB reference rate, inverted',
     lambda: invert(fred('DEXUSEU'))),
    ('spx', 's&p 500', 'spx index', '', 2, 'FRED &middot; S&amp;P Dow Jones Indices',
     lambda: fred('SP500')),
    ('hype', 'hype', 'hype/usd', ' usd', 3, 'Hyperliquid API &middot; daily candles',
     lambda: hyperliquid('HYPE')),
    ('zec', 'zcash', 'zec/usd', ' usd', 2, 'Kraken public API &middot; daily candles',
     lambda: kraken('XZECZUSD')),
]

out = {'updated': int(time.time() * 1000), 'series': []}
for key, name, sym, unit, dec, src, fn in MARKETS:
    try:
        pts = trim(fn(), dec)
        if len(pts) < 2:
            raise RuntimeError('too few points')
        out['series'].append({'key': key, 'name': name, 'sym': sym, 'unit': unit, 'src': src, 'pts': pts})
    except Exception as ex:
        print(key, 'failed:', ex)

Path(__file__).with_name('markets.json').write_text(json.dumps(out) + '\n')
print('markets.json:', {s['key']: len(s['pts']) for s in out['series']})
