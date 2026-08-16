import math, time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

# manual fallback for wikifolio.py: wikifolio.com's official CSV export (trades + daily prices),
# downloaded by hand into the repo root and gitignored (real trade/cash history — never committed).
# use when the API scrape is stale/broken; produces the identical websiteData/wikifolio.json shape.
root = Path(__file__).resolve().parent.parent
tradesCsv, priceCsv = root / 'wikiTrades.csv', root / 'wikiPrice.csv'

def readRows(path):
    lines = path.read_bytes().decode('utf-32-le').splitlines()
    hi = next(i for i, l in enumerate(lines) if l.startswith('Datum') or l.startswith('Begin date'))
    return lines[hi + 1:]

def num(s):
    s = s.strip()
    return float(s.replace('.', '').replace(',', '.')) if s else None

def parseDt(s):
    return datetime.strptime(s.strip(), '%d.%m.%Y %H:%M:%S').replace(tzinfo=timezone.utc)

# ── price series ──
pxRows = [l.split(';') for l in readRows(priceCsv) if l.strip()]
pts = [(parseDt(f[0]), num(f[3])) for f in pxRows if num(f[3]) is not None]
pts.sort(key=lambda p: p[0])
ts = [int(d.timestamp() * 1000) for d, _ in pts]
px = [v for _, v in pts]
if len(pts) < 30:
    raise SystemExit('price history too short: %d points' % len(pts))

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

def monthlyReturns(rows):
    last = {}
    for d, v in rows:
        last[d.strftime('%Y-%m')] = v
    keys = sorted(last)
    return [[int(k[:4]), int(k[5:7]), round((last[k] / last[keys[i - 1]] - 1) * 100, 2)]
            for i, k in enumerate(keys) if i]

# ── trades: round trips per ISIN, reconstructed from buy/sell fills ──
buyTypes = {'Wertpapier-Transaktion (Kauf)'}
sellTypes = {'Wertpapier-Transaktion (Verkauf)', 'Verkauf vor Verfall', 'Knock Out', 'Delisting'}
stopTypes = {'Verkauf vor Verfall', 'Knock Out', 'Delisting'}

merged = {}
for l in readRows(tradesCsv):
    f = l.split(';')
    if len(f) < 9:
        continue
    dtStr, typ, isin = f[0], f[1], f[2]
    if typ not in buyTypes and typ not in sellTypes:
        continue
    if not isin:
        continue
    key = (dtStr, isin, typ)
    m = merged.setdefault(key, {'dQty': None, 'qtyAfter': None, 'price': None})
    dQty, qtyAfter, price = num(f[3]), num(f[4]), num(f[5])
    if dQty is not None:
        m['dQty'] = dQty
    if qtyAfter is not None:
        m['qtyAfter'] = qtyAfter
    if price is not None:
        m['price'] = price

events = sorted(
    [(parseDt(dtStr), isin, typ, m) for (dtStr, isin, typ), m in merged.items()],
    key=lambda e: e[0])

byIsin = defaultdict(list)
for e in events:
    byIsin[e[1]].append(e)

trades = []
for isin, evs in byIsin.items():
    qty, avgEntry, openDt, sells = 0.0, None, None, []
    for dt, _, typ, m in evs:
        dQty = m['dQty'] or 0.0
        if typ in buyTypes:
            if qty <= 0:
                openDt, avgEntry, qty = dt, m['price'], 0.0
            elif m['price'] is not None and avgEntry is not None:
                avgEntry = (avgEntry * qty + m['price'] * dQty) / (qty + dQty)
            qty += dQty
        else:
            qtySold = -dQty if m['dQty'] is not None else qty - (m['qtyAfter'] or 0.0)
            if avgEntry and m['price'] is not None and qtySold > 0:
                r = (m['price'] / avgEntry - 1) * 100
                sells.append((dt, qtySold, r, typ in stopTypes))
            qty = m['qtyAfter'] if m['qtyAfter'] is not None else qty + dQty
            if qty <= 1e-6 and sells:
                wsum = sum(w for _, w, _, _ in sells)
                r = sum(r * w for _, w, r, _ in sells) / wsum if wsum else sum(r for _, _, r, _ in sells) / len(sells)
                closed = sells[-1][0]
                trades.append({
                    'ts': closed.date().isoformat(), 'symbol': isin, 'side': 'long',
                    'r': round(r, 2), 'hold': (closed - openDt).days if openDt else None,
                    'stop': any(s for _, _, _, s in sells),
                })
                qty, avgEntry, openDt, sells = 0.0, None, None, []
trades.sort(key=lambda t: t['ts'])

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

step = max(1, len(pts) // 600)
keep = list(range(0, len(pts), step))
if keep[-1] != len(pts) - 1:
    keep.append(len(pts) - 1)

out = {
    'updated': int(time.time() * 1000),
    'series': {
        'equity': [[ts[i], eq[i]] for i in keep],
        'return': [[ts[i], ret[i]] for i in keep],
        'drawdown': [[ts[i], dd[i]] for i in keep],
    },
    'monthly': monthlyReturns([(d, v) for d, v in pts]),
    'trades_detail': trades,
    'stats': {
        'total_return_pct': round(ret[-1], 1),
        'one_year_pct': round(oneYear, 1),
        'annualized_pct': round(annualized, 1),
        'max_drawdown_pct': round(min(dd), 1),
        'volatility_pct': round(vol, 1),
        **tradeMetrics(trades),
    },
}
Path(__file__).with_name('wikifolio.json').write_text(__import__('json').dumps(out) + '\n')
print('wikifolio.json:', out['stats'])
