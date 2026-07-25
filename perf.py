import os
import json
from collections import deque
from pathlib import Path
import requests

for spot in (Path(__file__).resolve().parent / "keys.env",
             Path.home() / "Desktop/maloutrading/keys.env"):
    if spot.exists():
        for line in spot.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        break

def env(*names):
    return next((os.environ[n] for n in names if os.environ.get(n)), "")

H = {"APCA-API-KEY-ID": env("ALPACAAPIKEY", "ALPACA_API_KEY"), "APCA-API-SECRET-KEY": env("ALPACAAPISECRET", "ALPACA_API_SECRET")}
base = "https://api.alpaca.markets"

def get(path, **params):
    return requests.get(base + path, headers=H, params=params, timeout=30).json()

ph = get("/v2/account/portfolio/history", period="1A", timeframe="1D", extended_hours="false")
ts, eq = ph.get("timestamp", []), ph.get("equity", [])
pts = [(t, e) for t, e in zip(ts, eq) if e]
base = pts[0][1] if pts else 1.0

equityS, returnS, ddS, peak = [], [], [], 0.0
for t, e in pts:
    peak = max(peak, e)
    equityS.append([t * 1000, round(e, 2)])
    returnS.append([t * 1000, round((e / base - 1) * 100, 2)])
    ddS.append([t * 1000, round((e / peak - 1) * 100, 2)])

acct = get("/v2/account")
equityNow = float(acct.get("equity", 0) or 0)
positions = get("/v2/positions")
positions = positions if isinstance(positions, list) else []
invested = sum(abs(float(p["market_value"])) for p in positions)

fills, page = [], None
while True:
    p = {"activity_types": "FILL", "direction": "asc", "page_size": 100}
    if page:
        p["page_token"] = page
    r = get("/v2/account/activities/FILL", **p)
    if not isinstance(r, list) or not r:
        break
    fills += r
    if len(r) < 100:
        break
    page = r[-1].get("id")

lots, trades = {}, []
for f in fills:
    sym, side, qty, price = f["symbol"], f["side"], float(f["qty"]), float(f["price"])
    dq = lots.setdefault(sym, deque())
    if side == "buy":
        dq.append([qty, price])
    else:
        rem, cost, closed = qty, 0.0, 0.0
        while rem > 1e-9 and dq:
            lot = dq[0]
            take = min(rem, lot[0])
            cost += take * lot[1]
            closed += take
            lot[0] -= take
            rem -= take
            if lot[0] <= 1e-9:
                dq.popleft()
        if closed > 0:
            trades.append((price / (cost / closed) - 1) * 100)

wins = [t for t in trades if t > 0]
losses = [t for t in trades if t <= 0]
n = len(trades)
avgW = sum(wins) / len(wins) if wins else 0
avgL = sum(losses) / len(losses) if losses else 0

data = {
    "updated": ph.get("timestamp", [None])[-1],
    "equity": round(equityNow, 2),
    "series": {"equity": equityS, "return": returnS, "drawdown": ddS},
    "stats": {
        "total_return_pct": round((equityNow / base - 1) * 100, 1) if base else 0,
        "max_drawdown_pct": round(min([d[1] for d in ddS] or [0]), 1),
        "trades": n,
        "win_rate_pct": round(len(wins) / n * 100, 1) if n else 0,
        "avg_win_pct": round(avgW, 2),
        "avg_loss_pct": round(avgL, 2),
        "payoff": round(avgW / abs(avgL), 2) if avgL else 0,
        "best_pct": round(max(trades), 2) if trades else 0,
        "worst_pct": round(min(trades), 2) if trades else 0,
        "positions": len(positions),
        "invested_pct": round(invested / equityNow * 100, 1) if equityNow else 0,
    },
}
Path(__file__).resolve().parent.joinpath("perf.json").write_text(json.dumps(data, separators=(",", ":")))
print("wrote perf.json:", json.dumps(data["stats"], indent=2), "| series pts:", len(equityS))
