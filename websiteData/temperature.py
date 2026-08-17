import csv, io, json, time, urllib.parse, urllib.request
from datetime import datetime, timedelta
from pathlib import Path

UA = {'User-Agent': 'Mozilla/5.0'}

def get(url, params=None, timeout=45):
    if params:
        url = url + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()

def downsample(pts, cap=600):
    step = max(1, len(pts) // cap)
    keep = list(range(0, len(pts), step))
    if keep[-1] != len(pts) - 1:
        keep.append(len(pts) - 1)
    return [pts[i] for i in keep]

def fetchGpr():
    import xlrd
    book = xlrd.open_workbook(file_contents=get('https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xls'))
    sheet = book.sheet_by_index(0)
    cols = {sheet.cell_value(0, c): c for c in range(sheet.ncols)}
    dateC, gprC, maC = cols['date'], cols['GPRD'], cols['GPRD_MA30']
    cutoff = time.time() - 5 * 365.25 * 86400
    pts = []
    for r in range(1, sheet.nrows):
        d = xlrd.xldate.xldate_as_datetime(sheet.cell_value(r, dateC), book.datemode)
        ts = d.timestamp()
        if ts < cutoff:
            continue
        gprd, ma = sheet.cell_value(r, gprC), sheet.cell_value(r, maC)
        if isinstance(gprd, float) and isinstance(ma, float):
            pts.append([int(ts * 1000), round(gprd, 1), round(ma, 1)])
    return downsample(pts)

def fetchEpu():
    text = get('https://www.policyuncertainty.com/media/All_Daily_Policy_Data.csv').decode('utf-8', 'replace')
    rows = []
    for row in csv.DictReader(io.StringIO(text)):
        try:
            v = float(row['daily_policy_index'])
            d = datetime(int(row['year']), int(row['month']), int(row['day']))
        except (KeyError, ValueError):
            continue
        rows.append([d, v])
    rows.sort(key=lambda x: x[0])
    cutoff = datetime.now() - timedelta(days=5 * 365)
    rows = [r for r in rows if r[0] >= cutoff - timedelta(days=30)]
    pts = []
    for i in range(len(rows)):
        window = [v for d, v in rows[max(0, i - 29):i + 1]]
        if rows[i][0] >= cutoff:
            pts.append([int(rows[i][0].timestamp() * 1000), round(sum(window) / len(window), 1)])
    return downsample(pts)

CHOKEPOINTS = [
    ('chokepoint6', 'hormuz'), ('chokepoint4', 'bab el-mandeb'), ('chokepoint1', 'suez'),
    ('chokepoint5', 'malacca'), ('chokepoint11', 'taiwan strait'), ('chokepoint2', 'panama'),
]

def esriMs(v):
    return int(v) if isinstance(v, (int, float)) else int(datetime.strptime(v[:10], '%Y-%m-%d').timestamp() * 1000)

def fetchChokepoints():
    url = ('https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/'
           'Daily_Chokepoints_Data/FeatureServer/0/query')
    out = []
    for pid, name in CHOKEPOINTS:
        try:
            feats = json.loads(get(url, {'where': "portid='%s'" % pid, 'outFields': 'date,n_total',
                                         'orderByFields': 'date DESC', 'resultRecordCount': 420,
                                         'f': 'json'})).get('features', [])
            pts = sorted([[esriMs(f['attributes']['date']), round(float(f['attributes']['n_total']), 1)]
                          for f in feats if f['attributes'].get('n_total') is not None])
            if len(pts) > 30:
                out.append({'key': pid, 'name': name, 'series': pts})
        except Exception:
            continue
    return out

def livelier(best, cand):
    if best is None:
        return cand
    rank = lambda m: (0.02 < m['p'] < 0.98, m['vol'])
    return cand if rank(cand) > rank(best) else best

def fetchPolymarket():
    events = json.loads(get('https://gamma-api.polymarket.com/events',
        {'tag_slug': 'geopolitics', 'closed': 'false', 'limit': 60, 'order': 'volume24hr', 'ascending': 'false'}))
    now = datetime.now().timestamp()
    out = []
    for ev in events:
        best = None
        for m in ev.get('markets') or []:
            if m.get('closed') or m.get('active') is False:
                continue
            end = m.get('endDate')
            try:
                endTs = datetime.fromisoformat(end.replace('Z', '+00:00')).timestamp() if end else None
            except ValueError:
                endTs = None
            if not endTs or endTs <= now:
                continue
            prices = m.get('outcomePrices')
            if isinstance(prices, str):
                try:
                    prices = json.loads(prices)
                except ValueError:
                    continue
            if not prices:
                continue
            best = livelier(best, {'question': m.get('question', ''), 'p': float(prices[0]),
                                    'vol': float(m.get('volume24hr') or 0), 'end': end,
                                    'chg': float(m.get('oneDayPriceChange') or 0)})
        if best:
            out.append({'title': ev.get('title', ''), **best})
        if len(out) >= 8:
            break
    return out

KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2'

def kalshiLastTrade(ticker):
    trades = json.loads(get(KALSHI_API + '/markets/trades', {'ticker': ticker, 'limit': 100}, timeout=20)).get('trades') or []
    if not trades or trades[0].get('yes_price_dollars') is None:
        return None
    t = trades[0]
    return {'p': float(t['yes_price_dollars']), 'traded': t.get('created_time'),
            'vol': sum(float(x.get('count_fp') or 0) for x in trades)}

def fetchKalshi():
    events = [e for e in json.loads(get(KALSHI_API + '/events',
        {'limit': 200, 'status': 'open', 'with_nested_markets': 'true'}, timeout=30)).get('events', [])
        if e.get('category') in ('World', 'Politics')]
    now = datetime.now().timestamp()
    out, scanned = [], 0
    for ev in events:
        if scanned >= 24:
            break
        best = None
        for m in (ev.get('markets') or [])[:3]:
            if scanned >= 24:
                break
            close = m.get('close_time')
            try:
                closeTs = datetime.fromisoformat(close.replace('Z', '+00:00')).timestamp() if close else None
            except ValueError:
                closeTs = None
            if not closeTs or closeTs <= now:
                continue
            scanned += 1
            try:
                tr = kalshiLastTrade(m['ticker'])
            except Exception:
                continue
            if not tr or not tr['traded']:
                continue
            best = livelier(best, {'question': m.get('title') or ev.get('title', ''), 'p': tr['p'],
                                    'vol': tr['vol'], 'end': close, 'traded': tr['traded']})
        if best:
            out.append({'title': ev.get('title', ''), **best})
    out.sort(key=lambda m: -m['vol'])
    return out[:8]

out = {'updated': int(time.time() * 1000)}
for key, fn in (('gpr', fetchGpr), ('epu', fetchEpu), ('chokepoints', fetchChokepoints),
                ('polymarket', fetchPolymarket), ('kalshi', fetchKalshi)):
    try:
        out[key] = fn()
    except Exception as ex:
        print(key, 'failed:', ex)

Path(__file__).with_name('temperature.json').write_text(json.dumps(out) + '\n')
print('temperature.json:', {k: (len(v) if isinstance(v, list) else 'ok') for k, v in out.items() if k != 'updated'})
