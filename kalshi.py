# kalshi.py — publishes kalshi.json (live stats + equity curve) for the website's kalshi panel.
# Mirrors perf.py (the alpaca stats feed) but with Kalshi RSA auth. No real money required:
# it reads whatever the account shows (balance, positions, settlements) and self-accumulates an
# equity curve over time, since Kalshi has no portfolio-history endpoint.
import os
import json
import time
import base64
from pathlib import Path
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

for spot in (Path(__file__).resolve().parent / "keys.env", Path.home() / "Desktop/maloutrading/keys.env"):
    if spot.exists():
        for line in spot.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        break


def env(*names):
    return next((os.environ[n] for n in names if os.environ.get(n)), "")


KEY_ID = env("KALSHI_API_KEY_ID", "KALSHIAPIKEYID")
PEM = env("KALSHI_PRIVATE_KEY", "KALSHIPRIVATEKEY")
BASE = "https://api.elections.kalshi.com"
PREFIX = "/trade-api/v2"
OUT = Path(__file__).resolve().parent / "kalshi.json"

_priv = serialization.load_pem_private_key(PEM.encode(), password=None) if PEM else None


def _hdr(method, full):
    ts = str(int(time.time() * 1000))
    sig = _priv.sign((ts + method + full).encode(),
                     padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.DIGEST_LENGTH),
                     hashes.SHA256())
    return {"KALSHI-ACCESS-KEY": KEY_ID, "KALSHI-ACCESS-SIGNATURE": base64.b64encode(sig).decode(), "KALSHI-ACCESS-TIMESTAMP": ts}


def get(path, **params):
    full = PREFIX + path
    try:
        return requests.get(BASE + full, headers=_hdr("GET", full), params=params, timeout=30).json()
    except Exception:
        return {}


def paged(path, key, **params):
    out, cur = [], None
    while True:
        p = dict(params)
        if cur:
            p["cursor"] = cur
        j = get(path, **p)
        out += j.get(key, []) if isinstance(j, dict) else []
        cur = j.get("cursor") if isinstance(j, dict) else None
        if not cur or len(out) >= 3000:
            return out


bal = get("/portfolio/balance")
balance = (bal.get("balance", 0) or 0) / 100.0 if isinstance(bal, dict) else 0.0
positions = [p for p in paged("/portfolio/positions", "market_positions", limit=200) if p.get("position")]

pos_val = 0.0
for p in positions:
    cnt = p["position"]
    side = "yes" if cnt > 0 else "no"
    m = get(f"/markets/{p['ticker']}")
    m = m.get("market", m) if isinstance(m, dict) else {}
    pos_val += abs(cnt) * (m.get(side + "_bid") or 0) / 100.0
value = round(balance + pos_val, 2)

# realized trades from settlements
rets = []
for s in paged("/portfolio/settlements", "settlements", limit=200):
    cost = (s.get("yes_total_cost", 0) or 0) + (s.get("no_total_cost", 0) or 0)
    rev = s.get("revenue", 0) or 0
    if cost > 0:
        rets.append((rev - cost) / cost * 100)
wins = [r for r in rets if r > 0]
losses = [r for r in rets if r <= 0]
n = len(rets)
avg_w = sum(wins) / len(wins) if wins else 0
avg_l = sum(losses) / len(losses) if losses else 0

# self-accumulating equity curve (Kalshi has no portfolio-history endpoint)
prev = json.loads(OUT.read_text()) if OUT.exists() else {}
eq = prev.get("series", {}).get("equity", [])
now = int(time.time() * 1000)
if not eq or now - eq[-1][0] > 6 * 3600 * 1000:      # append at most ~every 6h
    eq.append([now, value])
eq = eq[-365:]
base = eq[0][1] if (eq and eq[0][1]) else (value or 1.0)
ret_s = [[t, round((v / base - 1) * 100, 2) if base else 0] for t, v in eq]
peak, dd_s = 0.0, []
for t, v in eq:
    peak = max(peak, v)
    dd_s.append([t, round((v / peak - 1) * 100, 2) if peak else 0])

data = {
    "updated": now,
    "equity": value,
    "series": {"equity": [[t, round(v, 2)] for t, v in eq], "return": ret_s, "drawdown": dd_s},
    "stats": {
        "total_return_pct": round((value / base - 1) * 100, 1) if base else 0,
        "max_drawdown_pct": round(min([d[1] for d in dd_s] or [0]), 1),
        "trades": n,
        "win_rate_pct": round(len(wins) / n * 100, 1) if n else 0,
        "avg_win_pct": round(avg_w, 2),
        "avg_loss_pct": round(avg_l, 2),
        "payoff": round(avg_w / abs(avg_l), 2) if avg_l else 0,
        "best_pct": round(max(rets), 2) if rets else 0,
        "worst_pct": round(min(rets), 2) if rets else 0,
        "positions": len(positions),
        "invested_pct": round(pos_val / value * 100, 1) if value else 0,
    },
}
OUT.write_text(json.dumps(data, separators=(",", ":")))
print("wrote kalshi.json:", json.dumps(data["stats"]), "| series pts:", len(eq))
