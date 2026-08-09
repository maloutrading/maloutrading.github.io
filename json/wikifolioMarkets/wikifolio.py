import json, math, re, time, urllib.request
from datetime import datetime
from pathlib import Path

guid = 'bcafbb90-2cf1-47a4-b1f0-5ae6895820f1'
pageUrl = 'https://www.wikifolio.com/de/de/w/wf000arrcc'

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=30).read().decode()

hist = json.loads(get(f'https://www.wikifolio.com/api/chart/{guid}/wikifolioclosepricehistory'))
pts = [(int(datetime.fromisoformat(t).timestamp() * 1000), v)
       for t, v in zip(hist['timestamps'], hist['values']) if isinstance(v, (int, float))]
if len(pts) < 30:
    raise SystemExit('history too short: %d points' % len(pts))

ts = [p[0] for p in pts]
px = [p[1] for p in pts]
eq = [round(v / px[0] * 100, 2) for v in px]
ret = [round(e - 100, 2) for e in eq]
dd, peak = [], eq[0]
for e in eq:
    peak = max(peak, e)
    dd.append(round((e / peak - 1) * 100, 2))

yearMs = 365.25 * 86400 * 1000
iYr = next(i for i, t in enumerate(ts) if t >= ts[-1] - yearMs)
oneYear = (px[-1] / px[iYr] - 1) * 100
annualized = (math.pow(px[-1] / px[0], yearMs / (ts[-1] - ts[0])) - 1) * 100
logRets = [math.log(b / a) for a, b in zip(px, px[1:]) if a > 0 and b > 0]
mean = sum(logRets) / len(logRets)
perYear = len(logRets) * yearMs / (ts[-1] - ts[0])
vol = math.sqrt(sum((r - mean) ** 2 for r in logRets) / (len(logRets) - 1)) * math.sqrt(perYear) * 100

invested = round(float(re.search(r'"label":"Investiertes Kapital","value":([0-9.]+)', get(pageUrl)).group(1)) / 1000)

step = max(1, len(pts) // 600)
keep = [i for i in range(0, len(pts), step)]
if keep[-1] != len(pts) - 1:
    keep.append(len(pts) - 1)

out = {
    'updated': int(time.time() * 1000),
    'series': {
        'equity': [[ts[i], eq[i]] for i in keep],
        'return': [[ts[i], ret[i]] for i in keep],
        'drawdown': [[ts[i], dd[i]] for i in keep],
    },
    'stats': {
        'total_return_pct': round(ret[-1], 1),
        'one_year_pct': round(oneYear, 1),
        'annualized_pct': round(annualized, 1),
        'max_drawdown_pct': round(min(dd), 1),
        'volatility_pct': round(vol, 1),
        'invested_keur': invested,
    },
}
Path(__file__).with_name('wikifolio.json').write_text(json.dumps(out) + '\n')
print('wikifolio.json:', out['stats'])

spx = json.loads(get('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=10y&interval=1d'))['chart']['result'][0]
spxSeries = [[t * 1000, round(c, 2)] for t, c in zip(spx['timestamp'], spx['indicators']['quote'][0]['close'])
             if isinstance(c, (int, float))]
if len(spxSeries) < 1000:
    raise SystemExit('spx history too short: %d points' % len(spxSeries))
(Path(__file__).parents[1] / 'spx.json').write_text(json.dumps({'updated': int(time.time() * 1000), 'series': spxSeries}) + '\n')
print('spx.json:', len(spxSeries), 'points')
