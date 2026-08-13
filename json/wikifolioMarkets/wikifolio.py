import http.cookiejar, json, math, os, re, time, urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

guid = 'bcafbb90-2cf1-47a4-b1f0-5ae6895820f1'
pageUrl = 'https://www.wikifolio.com/de/de/w/wf000arrcc'

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=30).read().decode()

# the price curve is public; the per-trade history needs a logged-in session
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

# ~250 sequential pages per run: one flaky read must not lose the whole history
def authGet(url, tries=4):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': pageUrl})
            return opener.open(req, timeout=30).read()
        except Exception as err:
            if attempt == tries - 1:
                raise
            print('! retry %d/%d after %s' % (attempt + 1, tries - 1, type(err).__name__))
            time.sleep(2 ** attempt)

sellTypes = {'Sell', 'SellLimit', 'SellStopLimit', 'ExpirySell'}
buyTypes = {'Buy', 'BuyLimit', 'BuyStopLimit'}
stopTypes = {'SellStopLimit', 'ExpirySell'}
kinds = {620: 'stock', 630: 'etf', 640: 'cert'}

def fetchOrders(maxPages=600, pageSize=20):
    email, pw = os.environ.get('WIKIFOLIO_EMAIL'), os.environ.get('WIKIFOLIO_PASSWORD')
    if not email or not pw:
        print('! WIKIFOLIO_EMAIL/PASSWORD unset — trade history skipped, price stats only')
        return []
    opener.open(urllib.request.Request(pageUrl, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30).read()
    body = json.dumps({'email': email, 'password': pw, 'keepLoggedIn': True}).encode()
    opener.open(urllib.request.Request('https://www.wikifolio.com/api/login', data=body,
        headers={'User-Agent': 'Mozilla/5.0', 'Referer': pageUrl, 'Content-Type': 'application/json'}), timeout=30).read()
    orders = []
    for page in range(maxPages):
        batch = json.loads(authGet(f'https://www.wikifolio.com/api/wikifolio/{guid}/tradehistory'
                                   f'?page={page}&pageSize={pageSize}')).get('tradeHistory', {}).get('orders', [])
        orders += batch
        if len(batch) < pageSize:
            break
    return orders

# one round trip = one exit. partial fills collapse into a single trade, a buy in between opens the next position.
def roundTrips(orders):
    when = lambda o: datetime.fromisoformat(o['executionDate'])
    byIsin = defaultdict(list)
    for o in orders:
        if o.get('orderType') in sellTypes or o.get('orderType') in buyTypes:
            byIsin[o.get('isin')].append(o)
    trips = []
    for isin, lst in byIsin.items():
        lst.sort(key=when)
        entry, fills = None, []
        for o in lst:
            if o['orderType'] in buyTypes:
                if fills:
                    trips.append((isin, entry, fills))
                    entry, fills = None, []
                if entry is None:
                    entry = when(o)
            elif isinstance(o.get('performance'), (int, float)):
                fills.append(o)
        if fills:
            trips.append((isin, entry, fills))
    out = []
    for isin, entry, fills in trips:
        weights = [max(f.get('weightage') or 0, 0) for f in fills]
        pct = (sum(f['performance'] * w for f, w in zip(fills, weights)) / sum(weights) if sum(weights) > 0
               else sum(f['performance'] for f in fills) / len(fills)) * 100
        closed = when(fills[-1])
        out.append({
            'ts': closed.date().isoformat(),
            'symbol': isin,
            'side': 'long',
            'r': round(pct, 2),
            'hold': (closed - entry).days if entry else None,
            'stop': any(f['orderType'] in stopTypes for f in fills),
            'kind': kinds.get(fills[-1].get('securityType'), 'other'),
        })
    return sorted(out, key=lambda t: t['ts'])

def tradeMetrics(trades):
    rs = [t['r'] for t in trades]
    if not rs:
        return {}
    wins, losses = [t for t in trades if t['r'] > 0], [t for t in trades if t['r'] <= 0]
    avgWin = sum(t['r'] for t in wins) / len(wins) if wins else 0.0
    avgLoss = sum(t['r'] for t in losses) / len(losses) if losses else 0.0
    median = lambda v: sorted(v)[len(v) // 2] if v else None
    holds = lambda g: [t['hold'] for t in g if isinstance(t['hold'], int)]
    best, worst = max(trades, key=lambda t: t['r']), min(trades, key=lambda t: t['r'])
    streakWin = streakLoss = run = 0
    for t in trades:
        run = (run + 1 if run > 0 else 1) if t['r'] > 0 else (run - 1 if run < 0 else -1)
        streakWin, streakLoss = max(streakWin, run), min(streakLoss, run)
    return {
        'trades': len(rs),
        'win_rate_pct': round(len(wins) / len(rs) * 100, 1),
        'avg_win_pct': round(avgWin, 2),
        'avg_loss_pct': round(avgLoss, 2),
        'payoff': round(avgWin / abs(avgLoss), 2) if avgLoss else None,
        'hold_win_days': median(holds(wins)),
        'hold_loss_days': median(holds(losses)),
        'stop_share_pct': round(sum(1 for t in trades if t['stop']) / len(rs) * 100),
        'streak_win': streakWin,
        'streak_loss': -streakLoss,
        'best_trade': {k: best[k] for k in ('ts', 'symbol', 'r')},
        'worst_trade': {k: worst[k] for k in ('ts', 'symbol', 'r')},
    }

# month keys come straight off the ISO string — no timezone maths to shift a close into the wrong month
def monthlyReturns(rows):
    last = {}
    for t, v in rows:
        last[t[:7]] = v
    keys = sorted(last)
    return [[int(k[:4]), int(k[5:7]), round((last[k] / last[keys[i - 1]] - 1) * 100, 2)]
            for i, k in enumerate(keys) if i]

hist = json.loads(get(f'https://www.wikifolio.com/api/chart/{guid}/wikifolioclosepricehistory'))
rows = [(t, v) for t, v in zip(hist['timestamps'], hist['values']) if isinstance(v, (int, float))]
pts = [(int(datetime.fromisoformat(t).timestamp() * 1000), v) for t, v in rows]
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

page = get(pageUrl)
invested = round(float(re.search(r'"label":"Investiertes Kapital","value":([0-9.]+)', page).group(1)) / 1000)
# the first otherKeyRiskIndicators block is labelled "Max" — since inception, matching every other stat here
sinceInception = page[page.find('"otherKeyRiskIndicators"'):][:4000]
ratio = lambda label: (lambda m: round(float(m.group(1)), 2) if m else None)(
    re.search(r'"label":"%s","value":(-?[0-9.]+)' % label, sinceInception))

trades = roundTrips(fetchOrders())

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
    'monthly': monthlyReturns(rows),
    'trades_detail': trades,
    'stats': {
        'total_return_pct': round(ret[-1], 1),
        'one_year_pct': round(oneYear, 1),
        'annualized_pct': round(annualized, 1),
        'max_drawdown_pct': round(min(dd), 1),
        'volatility_pct': round(vol, 1),
        'invested_keur': invested,
        'sharpe': ratio('Sharpe Ratio'),
        'sortino': ratio('Sortino Ratio'),
        **tradeMetrics(trades),
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
