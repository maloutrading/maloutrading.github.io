const hd = document.getElementById('hd'), prog = document.getElementById('prog'),
      body = document.body, docEl = document.documentElement;
let ticking = false;
function apply(){
  const y = scrollY, home = body.classList.contains('home');
  hd.classList.toggle('solid', y > 40 || !home);
  body.classList.toggle('atbottom', innerHeight + y >= docEl.scrollHeight - 60);
  const denom = docEl.scrollHeight - innerHeight;
  const frac = denom > 4 ? Math.min(1, y / denom) : 0;
  prog.style.width = frac * 100 + '%';               // progress bar = header's bottom edge
  updateRib(); updateSolVids(); updateTopVid();
  ticking = false;
}
function updateTopVid(){
  const tv = document.querySelector('main .tab.show .topvid video'); if(!tv) return;
  const r = tv.parentElement.getBoundingClientRect(); if(!r.height) return;
  let pgs = -r.top / r.height; pgs = pgs<-1?-1:pgs>1?1:pgs;
  tv.style.objectPosition = 'center calc(50% + ' + (pgs*7).toFixed(2) + '%)';
}
function updateSolVids(){
  document.querySelectorAll('.sol-vid').forEach(el => {
    const r = el.getBoundingClientRect(); if(!r.height) return;
    const c = r.top + r.height/2;
    let o = c / (innerHeight*0.33); o = o<0?0:o>1?1:o;    el.style.opacity = (0.08 + 0.92*o).toFixed(3);
  });
}
function updateRib(){
  const sec = document.querySelector('main .tab.show'); if(!sec) return;
  const t = sec.querySelector('.rib-title'); if(!t) return;
  const vh = innerHeight, r = t.getBoundingClientRect(), c = r.top + r.height/2;
  let a = (vh - c) / (vh*0.35); a = a<0?0:a>1?1:a;  let f = (vh*0.14 - c) / (vh*0.14); f = f<0?0:f>1?1:f;  t.style.setProperty('--asm', a.toFixed(3));
  t.style.opacity = (1 - 0.5*f).toFixed(3);
}
addEventListener('scroll', () => {
  if (!ticking){ requestAnimationFrame(apply); ticking = true; }
}, {passive:true});
addEventListener('resize', apply, {passive:true});

const io = new IntersectionObserver(
  es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')),
  {threshold:.1});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.querySelectorAll('.stage video,.topvid video').forEach(v => {
  if (v.closest('#trade')) v.playbackRate = .5;
  const ready = () => v.classList.add('ready');
  v.readyState >= 2 ? ready() : v.addEventListener('loadeddata', ready, {once:true});
});

const TITLES = {home:'malou trading', team:'team - malou trading', trade:'trade - malou trading', news:'news - malou trading', stuff:'stuff - malou trading'};
function show(id, push){
  if (!document.getElementById(id)) id = 'home';
  document.querySelectorAll('main .tab').forEach(s => s.classList.remove('show'));
  const el = document.getElementById(id); el.classList.add('show');
  el.querySelectorAll('iframe[data-src]').forEach(f => { f.src = f.dataset.src; f.removeAttribute('data-src'); });
  document.querySelectorAll('#tabs button').forEach(b => {
    const on = b.dataset.t === id;
    b.classList.toggle('active', on);
    on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  body.classList.toggle('home', id === 'home');
  el.querySelectorAll('video').forEach(v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); });
  document.title = TITLES[id] || (id + ' - malou trading');
  if (push !== false){ try { history.pushState({id}, '', '#' + id); } catch(e){} }
  scrollTo(0, 0);
  apply();
  el.querySelectorAll('.reveal').forEach(x => io.observe(x));
}
addEventListener('popstate', () => show((location.hash || '#home').slice(1), false));

document.addEventListener('click', e => {
  const el = e.target.closest('[data-nav]');
  if (!el) return;
  e.preventDefault();
  show(el.dataset.nav);
});

document.querySelectorAll('.port-img').forEach(img => {
  const reveal = () => { const p = img.closest('.portrait'); if (p) p.classList.remove('noimg'); };
  const fail = () => img.remove();
  if (img.complete) { img.naturalWidth ? reveal() : fail(); }
  else { img.addEventListener('load', reveal, {once:true}); img.addEventListener('error', fail, {once:true}); }
});

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce) document.querySelectorAll('.rib-title').forEach(t => {
  if(t.dataset.rl) return;
  const txt = t.textContent, n = txt.length, mid = (n-1)/2; t.textContent = '';
  for(let i=0;i<n;i++){
    const s = document.createElement('span'); s.className = 'rl';
    s.textContent = txt[i] === ' ' ? ' ' : txt[i];
    s.style.setProperty('--dx', ((i-mid)*1.25).toFixed(2)+'rem');
    s.style.setProperty('--dy', ((((i*37)%5)-2)*0.8).toFixed(2)+'rem');
    s.style.setProperty('--rot', ((((i*53)%17)-8)*1.4).toFixed(1)+'deg');
    t.appendChild(s);
  }
  t.dataset.rl = '1';
});
const fetchT = (u, ms) => Promise.race([fetch(u), new Promise((_, r) => setTimeout(r, ms || 8000))]);
(function(){
  if(reduce || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const ring = document.querySelector('.cur.ring'), dot = document.querySelector('.cur.dot');
  if(!ring || !dot) return;
  ring.style.margin = '0';
  let rx = innerWidth/2, ry = innerHeight/2, tx = rx, ty = ry, on = 0, hotEl = null;
  let rw = 24, rh = 24, rr = 12;
  const hot = 'a,button,input,textarea,[data-nav],label[for]';
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY; dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    if(!on){ on = 1; ring.style.opacity = dot.style.opacity = '1'; }
  }, {passive:true});
  addEventListener('pointerdown', () => ring.classList.add('down'));
  addEventListener('pointerup', () => ring.classList.remove('down'));
  addEventListener('pointerover', e => {
    hotEl = e.target.closest ? e.target.closest(hot) : null;
    ring.classList.toggle('hot', !!hotEl);
  }, {passive:true});
  (function loop(){
    let cx = tx, cy = ty, w = 24, h = 24, r = 12;
    if(hotEl && hotEl.isConnected){
      const b = hotEl.getBoundingClientRect();
      if(b.width && b.width < 300 && b.height < 120){
        cx = b.left + b.width/2; cy = b.top + b.height/2;
        w = b.width + 14; h = b.height + 10;
        r = Math.min(h/2, (parseFloat(getComputedStyle(hotEl).borderRadius) || h/2) + 6);
      }
    } else hotEl = null;
    if(ring.classList.contains('down')){ w *= .82; h *= .82; }
    rx += (cx-rx)*.18; ry += (cy-ry)*.18; rw += (w-rw)*.22; rh += (h-rh)*.22; rr += (r-rr)*.25;
    ring.style.transform = 'translate(' + (rx-rw/2).toFixed(1) + 'px,' + (ry-rh/2).toFixed(1) + 'px)';
    ring.style.width = rw.toFixed(1) + 'px'; ring.style.height = rh.toFixed(1) + 'px';
    ring.style.borderRadius = rr.toFixed(1) + 'px';
    requestAnimationFrame(loop);
  })();
})();

const SWIPE = ['home','team','news','trade','stuff'];
function swipeTo(dir){
  const cur = document.querySelector('main .tab.show'); if(!cur) return;
  const i = SWIPE.indexOf(cur.id); if(i < 0) return;
  const j = Math.max(0, Math.min(SWIPE.length-1, i + dir));
  if(j !== i) show(SWIPE[j]);
}
let ax = 0, axT = 0, axLock = 0;
addEventListener('wheel', e => {
  if(Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  const now = performance.now();
  if(now - axT > 260) ax = 0;
  axT = now; ax += e.deltaX;
  if(now < axLock) return;
  if(Math.abs(ax) >= 140){ swipeTo(ax > 0 ? 1 : -1); ax = 0; axLock = now + 650; }
}, {passive:true});
let tsx = 0, tsy = 0;
addEventListener('touchstart', e => { const t = e.changedTouches[0]; tsx = t.clientX; tsy = t.clientY; }, {passive:true});
addEventListener('touchend', e => {
  const t = e.changedTouches[0], dx = t.clientX - tsx, dy = t.clientY - tsy;
  if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) swipeTo(dx < 0 ? 1 : -1);
}, {passive:true});

show((location.hash || '#home').slice(1), false);
apply();

/* ═══════════════ trading markets — live data, charts, analytics ═══════════════
   one rendering path shared by all three algo bots (JS-template-function, mirrors
   the "bot = tuning + adapter" unification on the python side). */

function sanitizeSeries(pts){
  if(!Array.isArray(pts)) return [];
  return pts.filter(p => Array.isArray(p) && p.length >= 2
    && typeof p[0] === 'number' && isFinite(p[0])
    && typeof p[1] === 'number' && isFinite(p[1]) && p[1] > -100 && p[1] < 1000);
}
function sanitizeEquity(pts){
  if(!Array.isArray(pts)) return [];
  return pts.filter(p => Array.isArray(p) && p.length >= 2
    && typeof p[0] === 'number' && isFinite(p[0])
    && typeof p[1] === 'number' && isFinite(p[1]) && p[1] >= 0);
}
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtPct(v){ return (typeof v === 'number' && isFinite(v)) ? (v > 0 ? '+' : '') + v + '%' : '–'; }
function fmtPlain(v, suf){ return (typeof v === 'number' && isFinite(v)) ? v + (suf || '') : '–'; }
const cvMemo = {};
function cv(name){
  if (!(name in cvMemo)) cvMemo[name] = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name;
  return cvMemo[name];
}
function svgEmpty(msg){ return '<p class="an-empty">' + msg + '</p>'; }

function periodReturns(eqSeries, keyFn){
  const pts = sanitizeEquity(eqSeries || []).filter(p => p[1] > 0);
  const out = [];
  let key = null, open = null, close = null;
  pts.forEach(p => {
    const k = keyFn(p[0]);
    if (k !== key){
      if (open != null) out.push([key, (close / open - 1) * 100]);
      key = k; open = close != null ? close : p[1];
    }
    close = p[1];
  });
  if (open != null) out.push([key, (close / open - 1) * 100]);
  return out;
}
const monthKey = t => { const d = new Date(t); return d.getUTCFullYear() * 100 + d.getUTCMonth() + 1; };
const eqReturns = (d, keyFn) => periodReturns((d.series || {}).equity, keyFn).slice(1).map(p => p[1]);
const monthlyFromEquity = eq => periodReturns(eq, monthKey).map(p => [Math.floor(p[0] / 100), p[0] % 100, p[1]]);

function distSvg(vals, unit, lab){
  vals = (vals || []).filter(v => typeof v === 'number' && isFinite(v));
  const n = vals.length;
  if (n < 12) return svgEmpty('not enough history yet');
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) * (v - mean), 0) / (n - 1)) || 1e-9;
  const lo = Math.min(Math.min(...vals), mean - 3 * sd), hi = Math.max(Math.max(...vals), mean + 3 * sd);
  const nb = Math.max(11, Math.min(25, Math.round(Math.sqrt(n) * 2)));
  const bw = (hi - lo) / nb || 1;
  const bins = new Array(nb).fill(0);
  vals.forEach(v => bins[Math.min(nb - 1, Math.floor((v - lo) / bw))]++);
  const pdf = x => Math.exp(-0.5 * Math.pow((x - mean) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
  const fit = bins.map((_, i) => n * bw * pdf(lo + (i + 0.5) * bw));
  const yMax = Math.max(...bins, ...fit, 1);
  const W = 300, H = 120, pad = 5;
  const X = x => pad + (x - lo) / (hi - lo) * (W - 2 * pad);
  const Y = c => H - pad - c / yMax * (H - 2 * pad);
  const barW = (W - 2 * pad) / nb;
  const bars = bins.map((c, i) =>
    '<rect x="' + (pad + i * barW + 0.5).toFixed(1) + '" y="' + Y(c).toFixed(1) +
    '" width="' + (barW - 1).toFixed(1) + '" height="' + Math.max(0, H - pad - Y(c)).toFixed(1) +
    '" fill="' + (lo + (i + 0.5) * bw >= 0 ? cv('--gruen') : cv('--holz')) + '" fill-opacity=".55"/>').join('');
  const curve = Array.from({length: 61}, (_, i) => {
    const x = lo + (hi - lo) * i / 60;
    return (i ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(n * bw * pdf(x)).toFixed(1);
  }).join(' ');
  const zero = (lo < 0 && hi > 0)
    ? '<line x1="' + X(0).toFixed(1) + '" x2="' + X(0).toFixed(1) + '" y1="' + pad + '" y2="' + (H - pad) + '" stroke="var(--line)" stroke-dasharray="2 3"/>' : '';
  const tipAttr = ' data-tip="' + escapeHtml(JSON.stringify({u: '', x: bins.map((_, i) => {
      const c = lo + (i + 0.5) * bw; return 'around ' + (c >= 0 ? '+' : '') + c.toFixed(2) + unit;
    }),
    s: [{n: 'observed', c: cv('--gruen'), v: bins}, {n: 'normal fit', c: cv('--silber'), v: fit.map(v => +v.toFixed(1))}]})) + '"';
  const wins = vals.filter(v => v > 0).length;
  return '<div class="rw">' + numsRow([
    [n, lab], [(mean >= 0 ? '+' : '') + mean.toFixed(2) + unit, 'mean', mean >= 0 ? 'up' : 'dn'],
    ['±' + sd.toFixed(2) + unit, 'σ'], [Math.round(wins / n * 100) + '%', 'positive']]) +
    '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg"' + tipAttr + '>' +
    zero + bars + '<path d="' + curve + '" fill="none" stroke="' + cv('--silber') +
    '" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>' +
    '<i class="rw-t" style="top:0">' + Math.round(yMax) + '</i><i class="rw-t" style="bottom:0">0</i></div>' +
    '<p class="hb-foot">bars = observed ' + lab + ' &middot; curve = normal fit &middot; heavier tails than the curve = fat-tail risk</p></div>';
}

function chartTips(scope){
  scope.querySelectorAll('svg[data-tip]').forEach(svg => {
    let td; try { td = JSON.parse(svg.dataset.tip); } catch(e){ return; }
    const nPts = Math.max(...td.s.map(s => s.v.length));
    if (nPts < 2) return;
    const vb = (svg.getAttribute('viewBox') || '0 0 300 120').split(' ');
    const W = +vb[2], H = +vb[3], pad = 5;
    const cross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    cross.setAttribute('y1', pad); cross.setAttribute('y2', H - pad);
    cross.setAttribute('stroke', cv('--silber')); cross.setAttribute('stroke-opacity', '.55');
    cross.setAttribute('stroke-dasharray', '2 3'); cross.setAttribute('vector-effect', 'non-scaling-stroke');
    cross.setAttribute('visibility', 'hidden');
    svg.appendChild(cross);
    const box = svg.parentElement;
    let tip = box.querySelector('.perf-tip');
    if (!tip){ tip = document.createElement('div'); tip.className = 'perf-tip'; box.appendChild(tip); }
    svg.addEventListener('pointermove', e => {
      const r = svg.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const i = Math.round(Math.min(1, Math.max(0, (frac * W - pad) / (W - 2 * pad))) * (nPts - 1));
      const x = pad + i / (nPts - 1) * (W - 2 * pad);
      cross.setAttribute('x1', x.toFixed(1)); cross.setAttribute('x2', x.toFixed(1));
      cross.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + escapeHtml(td.x ? String(td.x[i] || '') : '#' + (i + 1)) + '</b>' +
        td.s.map(s => s.v[i] == null ? '' :
          '<span><i style="background:' + escapeHtml(s.c) + '"></i>' + escapeHtml(s.n) + ' ' +
          s.v[i] + escapeHtml(td.u || '') + '</span>').join('');
      tip.style.left = Math.min(r.width - 60, Math.max(60, frac * r.width)) + 'px';
      tip.style.display = 'block';
    });
    svg.addEventListener('pointerleave', () => { tip.style.display = 'none'; cross.setAttribute('visibility', 'hidden'); });
  });
}

function heatGrid(eqSeries){
  const pts = sanitizeEquity(eqSeries || []);
  if (pts.length < 4) return svgEmpty('not enough days yet');
  const days = pts.slice(-43);
  let cells = '';
  for (let i = 1; i < days.length; i++){
    const prev = days[i - 1][1], cur = days[i][1];
    const chg = prev ? (cur / prev - 1) * 100 : 0;
    const mag = Math.max(0, Math.min(1, Math.abs(chg) / 3));
    const tone = chg >= 0 ? 'var(--gruen)' : 'var(--holz)';
    const col = 'color-mix(in srgb,' + tone + ' ' + (24 + mag * 68).toFixed(0) + '%, var(--card))';
    let dLabel = '';
    try { dLabel = new Date(days[i][0]).toISOString().slice(0, 10); } catch(e){}
    cells += '<i class="heat-cell" style="background:' + col + '" title="' + dLabel + ': ' + (chg >= 0 ? '+' : '') + chg.toFixed(1) + '%"></i>';
  }
  return '<div class="heat-grid">' + cells + '</div>';
}

function monthGrid(rows){
  const r = (rows || []).filter(x => Array.isArray(x) && x.length === 3 && isFinite(x[2]));
  if (r.length < 2) return svgEmpty('not enough history yet');
  const years = [...new Set(r.map(x => x[0]))].sort();
  const val = new Map(r.map(x => [x[0] + '-' + x[1], x[2]]));
  const mx = Math.max(...r.map(x => Math.abs(x[2])), 1);
  const names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const cell = v => {
    if (typeof v !== 'number') return '<i class="mg-cell mg-void"></i>';
    const tone = v >= 0 ? cv('--gruen') : cv('--holz');
    return '<i class="mg-cell" style="background:color-mix(in srgb,' + tone + ' ' +
      (18 + Math.min(1, Math.abs(v) / mx) * 70).toFixed(0) + '%,var(--card))" title="' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%">' +
      (v >= 0 ? '+' : '') + v.toFixed(0) + '</i>';
  };
  const head = '<i class="mg-lab"></i>' + names.map(n => '<i class="mg-lab">' + n + '</i>').join('') + '<i class="mg-lab mg-tot">year</i>';
  const body = years.map(y => {
    const ms = names.map((_, i) => val.get(y + '-' + (i + 1)));
    const tot = (ms.filter(v => typeof v === 'number').reduce((a, v) => a * (1 + v / 100), 1) - 1) * 100;
    return '<i class="mg-lab">' + y + '</i>' + ms.map(cell).join('') +
      '<i class="mg-tot ' + (tot >= 0 ? 'up' : 'dn') + '">' + (tot >= 0 ? '+' : '') + tot.toFixed(0) + '</i>';
  }).join('');
  return '<div class="mg">' + head + body + '</div>';
}

function trailWin(n){ return Math.max(5, Math.min(50, Math.floor(n / 2), Math.max(10, Math.round(n / 20)))); }
function closedTrades(trades){ return (trades || []).filter(t => typeof t.r === 'number' && isFinite(t.r)); }
function trailSeries(list, win, fn){
  const out = [];
  for (let i = win - 1; i < list.length; i++) out.push(fn(list.slice(i - win + 1, i + 1)));
  return out;
}
const meanOf = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

function linePath(vals, X, Y){
  let d = '', pen = false;
  vals.forEach((v, i) => {
    if (v == null){ pen = false; return; }
    d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' ';
    pen = true;
  });
  return d.trim();
}
function trailPlot(seriesList, y0, y1, refY, tip){
  const W = 300, H = 120, pad = 5, n = Math.max(...seriesList.map(s => s.vals.length));
  const X = i => pad + (n > 1 ? i / (n - 1) : 0) * (W - 2 * pad);
  const Y = v => H - pad - (v - y0) / ((y1 - y0) || 1) * (H - 2 * pad);
  const ref = typeof refY === 'number'
    ? '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(refY).toFixed(1) + '" y2="' + Y(refY).toFixed(1) +
      '" stroke="var(--line)" stroke-dasharray="2 3"/>' : '';
  const data = tip ? ' data-tip="' + escapeHtml(JSON.stringify({u: tip.u || '', x: tip.x || null,
    s: seriesList.map((s, i) => ({n: (tip.names || [])[i] || '', c: s.col,
      v: s.vals.map(v => v == null ? null : +v.toFixed(2))}))})) + '"' : '';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg"' + data + '>' + ref +
    seriesList.map(s => '<path d="' + linePath(s.vals, X, Y) + '" fill="none" stroke="' + s.col +
      '" stroke-width="' + (s.w || 1.8) + '" vector-effect="non-scaling-stroke" stroke-linejoin="round"' +
      (s.dash ? ' stroke-dasharray="3 3"' : '') + '/>').join('') + '</svg>';
}
function numsRow(items){
  return '<div class="rw-nums">' + items.map(i =>
    '<span><b class="' + (i[2] || '') + '">' + i[0] + '</b>' + i[1] + '</span>').join('') + '</div>';
}

function avgWinLossSvg(trades){
  const list = closedTrades(trades), win = trailWin(list.length);
  if (list.length < win + 2) return svgEmpty('not enough closed trades yet');
  const ws = trailSeries(list, win, s => meanOf(s.filter(t => t.r > 0).map(t => t.r)));
  const ls = trailSeries(list, win, s => meanOf(s.filter(t => t.r <= 0).map(t => t.r)));
  const all = [...ws, ...ls].filter(v => v != null);
  const y1 = Math.max(...all, 1), y0 = Math.min(...all, -1);
  const last = a => [...a].reverse().find(v => v != null);
  return '<div class="rw">' + numsRow([
    ['+' + (last(ws) || 0).toFixed(1) + '%', 'avg win', 'up'],
    [(last(ls) || 0).toFixed(1) + '%', 'avg loss', 'dn'],
    [win, 'trade window']]) +
    '<div class="rw-plot">' + trailPlot([{vals: ws, col: cv('--gruen')}, {vals: ls, col: cv('--holz')}], y0, y1, 0, {u: '%', names: ['avg win', 'avg loss']}) +
    '<i class="rw-t" style="top:0">+' + y1.toFixed(0) + '%</i><i class="rw-t" style="bottom:0">' + y0.toFixed(0) + '%</i></div></div>';
}

function payoffSvg(trades){
  const list = closedTrades(trades), win = trailWin(list.length);
  if (list.length < win + 2) return svgEmpty('not enough closed trades yet');
  const ratio = trailSeries(list, win, s => {
    const w = meanOf(s.filter(t => t.r > 0).map(t => t.r)), l = meanOf(s.filter(t => t.r <= 0).map(t => t.r));
    return w != null && l != null && l !== 0 ? w / Math.abs(l) : null;
  });
  const need = trailSeries(list, win, s => {
    const w = s.filter(t => t.r > 0).length / s.length;
    return w > 0 && w < 1 ? (1 - w) / w : null;
  });
  const all = [...ratio, ...need].filter(v => v != null);
  if (!all.length) return svgEmpty('not enough closed trades yet');
  const y1 = Math.min(Math.max(...all), 12), y0 = 0;
  const last = a => [...a].reverse().find(v => v != null);
  const beat = ratio.filter((v, i) => v != null && need[i] != null && v > need[i]).length;
  const both = ratio.filter((v, i) => v != null && need[i] != null).length;
  return '<div class="rw">' + numsRow([
    [(last(ratio) || 0).toFixed(2) + 'x', 'payoff now', (last(ratio) > last(need) ? 'up' : 'dn')],
    [(last(need) || 0).toFixed(2) + 'x', 'break-even'],
    [Math.round(beat / (both || 1) * 100) + '%', 'of windows above']]) +
    '<div class="rw-plot">' + trailPlot([{vals: need, col: cv('--silber'), w: 1.2, dash: true},
      {vals: ratio, col: cv('--gruen')}], y0, y1, null, {u: 'x', names: ['break-even', 'payoff']}) +
    '<i class="rw-t" style="top:0">' + y1.toFixed(0) + 'x</i><i class="rw-t" style="bottom:0">0x</i></div>' +
    '<p class="hb-foot">solid = achieved payoff &middot; dashed = payoff the window’s hit rate needed to break even</p></div>';
}

function edgeByHoldSvg(trades){
  const t = closedTrades(trades).filter(x => typeof x.hold === 'number' && isFinite(x.hold));
  if (t.length < 10) return svgEmpty('not enough closed trades yet');
  const buckets = [['0d', 0, 0], ['1–2d', 1, 2], ['3–7d', 3, 7], ['8–30d', 8, 30], ['30d+', 31, 1e9]];
  const rows = buckets.map(([lab, lo, hi]) => {
    const g = t.filter(x => x.hold >= lo && x.hold <= hi);
    return {lab, n: g.length, win: g.length ? g.filter(x => x.r > 0).length / g.length * 100 : 0, avg: meanOf(g.map(x => x.r))};
  }).filter(r => r.n);
  if (rows.length < 2) return svgEmpty('not enough closed trades yet');
  const mxN = Math.max(...rows.map(r => r.n));
  const med = v => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const mw = med(t.filter(x => x.r > 0).map(x => x.hold)), ml = med(t.filter(x => x.r <= 0).map(x => x.hold));
  const runs = (mw != null && ml > 0) ? ' &middot; winners held ' + (mw / ml).toFixed(1) + '&times; longer (' + mw + 'd vs ' + ml + 'd median)' : '';
  return '<div class="eb">' + rows.map(r =>
    '<div class="eb-row"><span class="eb-lab">' + r.lab + '</span>' +
    '<span class="hb-track"><b class="hb-fill ' + (r.avg >= 0 ? 'up' : 'dn') + '" style="width:' +
    Math.max(4, r.n / mxN * 100).toFixed(1) + '%"></b></span>' +
    '<span class="eb-win">' + Math.round(r.win) + '%</span>' +
    '<span class="eb-avg ' + (r.avg >= 0 ? 'up' : 'dn') + '">' + (r.avg >= 0 ? '+' : '') + r.avg.toFixed(1) + '%</span>' +
    '<span class="hb-n">' + r.n + '</span></div>').join('') +
    '<p class="hb-foot">bar = trades &middot; then hit rate and average result' + runs + '</p></div>';
}

function concentrationSvg(trades){
  const rs = closedTrades(trades).map(t => t.r).filter(v => v > 0).sort((a, b) => b - a);
  if (rs.length < 10) return svgEmpty('not enough closed trades yet');
  const total = rs.reduce((a, b) => a + b, 0);
  const cum = [];
  rs.reduce((a, v, i) => { cum[i] = (a + v) / total * 100; return a + v; }, 0);
  const W = 300, H = 120, pad = 5;
  const X = i => pad + (rs.length > 1 ? i / (rs.length - 1) : 0) * (W - 2 * pad);
  const Y = v => H - pad - v / 100 * (H - 2 * pad);
  const at = frac => cum[Math.min(cum.length - 1, Math.max(0, Math.round(frac * rs.length) - 1))];
  const diag = 'M' + X(0) + ' ' + Y(100 / rs.length) + ' L' + X(rs.length - 1) + ' ' + Y(100);
  return '<div class="rw">' + numsRow([
    [Math.round(at(0.05)) + '%', 'from top 5%'],
    [Math.round(at(0.10)) + '%', 'from top 10%'],
    [rs.length, 'winners']]) +
    '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg" data-tip="' +
    escapeHtml(JSON.stringify({u: '%', x: cum.map((_, i) => 'top ' + (i + 1)),
      s: [{n: 'share of gains', c: cv('--gruen'), v: cum.map(v => +v.toFixed(1))}]})) + '">' +
    '<path d="' + diag + '" fill="none" stroke="var(--line)" stroke-dasharray="2 3"/>' +
    '<path d="' + linePath(cum, X, Y) + '" fill="none" stroke="' + cv('--gruen') +
    '" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>' +
    '<i class="rw-t" style="top:0">100%</i><i class="rw-t" style="bottom:0">0%</i></div>' +
    '<p class="hb-foot">share of all gains, winners ranked best first &middot; dashed = if every winner paid equally</p></div>';
}

function tradeEquitySvg(trades){
  const list = closedTrades(trades);
  if (list.length < 10) return svgEmpty('not enough closed trades yet');
  let sum = 0;
  const cum = list.map(t => (sum += t.r));
  const y1 = Math.max(...cum, 0), y0 = Math.min(...cum, 0);
  return '<div class="rw">' + numsRow([
    [(sum >= 0 ? '+' : '') + Math.round(sum) + '%', 'sum of trades', sum >= 0 ? 'up' : 'dn'],
    [(meanOf(list.map(t => t.r)) || 0).toFixed(2) + '%', 'per trade'],
    [list.length, 'trades']]) +
    '<div class="rw-plot">' + trailPlot([{vals: cum, col: cv('--gruen')}], y0, y1, 0,
      {u: '%', names: ['cumulative'], x: list.map(t => String(t.ts || '').slice(0, 10))}) +
    '<i class="rw-t" style="top:0">+' + y1.toFixed(0) + '%</i><i class="rw-t" style="bottom:0">' + y0.toFixed(0) + '%</i></div>' +
    '<p class="hb-foot">unweighted sum of every closed trade &mdash; strategy shape, not portfolio return</p></div>';
}

function mixSvg(trades){
  const t = closedTrades(trades).filter(x => x.kind);
  if (t.length < 10) return svgEmpty('not enough closed trades yet');
  const names = {stock: 'stocks', etf: 'etf / etn', cert: 'certs', other: 'other'};
  const rows = ['stock', 'etf', 'cert', 'other'].map(k => {
    const g = t.filter(x => x.kind === k);
    return {lab: names[k], n: g.length, win: g.length ? g.filter(x => x.r > 0).length / g.length * 100 : 0, avg: meanOf(g.map(x => x.r))};
  }).filter(r => r.n);
  if (rows.length < 2) return svgEmpty('not enough closed trades yet');
  const mxN = Math.max(...rows.map(r => r.n));
  return '<div class="eb">' + rows.map(r =>
    '<div class="eb-row"><span class="eb-lab">' + r.lab + '</span>' +
    '<span class="hb-track"><b class="hb-fill ' + (r.avg >= 0 ? 'up' : 'dn') + '" style="width:' +
    Math.max(4, r.n / mxN * 100).toFixed(1) + '%"></b></span>' +
    '<span class="eb-win">' + Math.round(r.win) + '%</span>' +
    '<span class="eb-avg ' + (r.avg >= 0 ? 'up' : 'dn') + '">' + (r.avg >= 0 ? '+' : '') + r.avg.toFixed(1) + '%</span>' +
    '<span class="hb-n">' + r.n + '</span></div>').join('') +
    '<p class="hb-foot">bar = number of trades &middot; then hit rate and average result</p></div>';
}

function tradeRecord(s){
  s = s || {};
  const num = (v, suf, signed) => typeof v === 'number' && isFinite(v)
    ? {txt: (signed && v > 0 ? '+' : '') + v + (suf || ''), cls: signed ? (v > 0 ? 'up' : v < 0 ? 'dn' : '') : ''} : null;
  const streak = (typeof s.streak_win === 'number' && typeof s.streak_loss === 'number')
    ? {txt: s.streak_win + ' / ' + s.streak_loss, cls: ''} : null;
  const cells = [
    ['total return', num(s.total_return_pct, '%', true)], ['max drawdown', num(s.max_drawdown_pct, '%', true)],
    ['trades', num(s.trades)], ['win rate', num(s.win_rate_pct, '%')], ['payoff', num(s.payoff, 'x')],
    ['expectancy', num(s.expectancy_r, 'R', true)],
    ['avg win', num(s.avg_win_pct, '%', true)], ['avg loss', num(s.avg_loss_pct, '%', true)],
    ['stop exits', num(s.stop_share_pct, '%')], ['volatility', num(s.volatility_pct, '%')],
    ['sharpe', num(s.sharpe)], ['sortino', num(s.sortino)], ['streak w / l', streak],
  ].filter(c => c[1]);
  if (!cells.length) return svgEmpty('no figures yet');
  return '<div class="tstats">' + cells.map(c =>
    '<div><b class="' + c[1].cls + '">' + c[1].txt + '</b><span>' + c[0] + '</span></div>').join('') + '</div>';
}

function rollingWinSvg(trades){
  const list = closedTrades(trades);
  if (list.length < 6) return svgEmpty('not enough closed trades yet');
  const win = trailWin(list.length);
  const vals = trailSeries(list, win, s => s.filter(t => t.r > 0).length / win * 100);
  const now = vals[vals.length - 1], avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return '<div class="rw">' + numsRow([
    [Math.round(now) + '%', 'now', now >= 50 ? 'up' : 'dn'],
    [Math.round(avg) + '%', 'average'],
    [Math.round(Math.min(...vals)) + '&ndash;' + Math.round(Math.max(...vals)) + '%', 'range'],
    [win, 'trade window']]) +
    '<div class="rw-plot">' + trailPlot([{vals: vals, col: cv('--gruen'), w: 2}], 0, 100, 50, {u: '%', names: ['hit rate']}) +
    '<i class="rw-t" style="top:0">100%</i><i class="rw-t" style="top:50%">50%</i><i class="rw-t" style="bottom:0">0%</i></div></div>';
}

function exposureSvg(exp){
  if (!Array.isArray(exp) || exp.length < 2) return svgEmpty('not enough history yet');
  const longs = exp.map(e => e[1] || 0), shorts = exp.map(e => -(e[2] || 0));
  const mx = Math.max(1, ...longs.map(Math.abs), ...shorts.map(Math.abs));
  const W = 300, H = 140, pad = 5, mid = H / 2;
  const X = i => pad + i / (exp.length - 1) * (W - 2 * pad);
  const Y = v => mid - (v / mx) * (mid - pad);
  const path = arr => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  const dates = exp.map(e => { try { return new Date(e[0]).toISOString().slice(0, 10); } catch(err){ return ''; } });
  return '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg" data-tip="' +
    escapeHtml(JSON.stringify({u: '%', x: dates,
      s: [{n: 'long', c: cv('--gruen'), v: longs.map(v => +v.toFixed(1))},
        {n: 'short', c: cv('--holz'), v: shorts.map(v => +v.toFixed(1))}]})) + '">' +
    '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + mid + '" y2="' + mid + '" stroke="var(--line)" stroke-dasharray="2 3"/>' +
    '<path d="' + path(longs) + '" fill="none" stroke="var(--gruen)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
    '<path d="' + path(shorts) + '" fill="none" stroke="var(--holz)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg></div>';
}

function fmtAge(ms){
  if (!ms) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return Math.max(0, Math.round(s)) + 's ago';
  if (s < 5400) return Math.round(s / 60) + 'm ago';
  if (s < 172800) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}

function countUp(el){
  const fin = el.textContent, m = fin.match(/-?\d+(?:\.(\d+))?/);
  if (!m) return;
  const num = parseFloat(m[0]), dec = m[1] ? m[1].length : 0;
  const pre = fin.slice(0, m.index), suf = fin.slice(m.index + m[0].length);
  const t0 = performance.now();
  (function step(t){
    const p = Math.min(1, Math.max(0, (t - t0) / 1100)), e = 1 - Math.pow(1 - p, 3);
    el.textContent = pre + (num * e).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
const cntIO = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cntIO.unobserve(e.target); countUp(e.target);
}), {threshold: .6}) : null;
const drawIO = !reduce && 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; drawIO.unobserve(e.target);
  e.target.querySelectorAll('path[fill="none"]:not([stroke-dasharray])').forEach((p, i) => {
    const L = p.getTotalLength(); if (!L) return;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    p.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1) ' + (i * .18) + 's';
    requestAnimationFrame(() => { p.style.strokeDashoffset = '0'; });
  });
}), {threshold: .35}) : null;

function bookView(d){
  const b = Array.isArray(d.book) ? d.book : [];
  if (!b.length) return svgEmpty('flat — no open positions');
  const s = d.stats || {};
  const edge = (typeof s.expectancy_r === 'number')
    ? '<span class="book-edge">edge ' + (s.expectancy_r >= 0 ? '+' : '') + s.expectancy_r.toFixed(2) + 'R/trade</span>' : '';
  const rows = b.map(p => {
    const up = (p.pnl || 0) >= 0;
    return '<div class="book-row"><span class="book-side ' + (p.side === 'long' ? 'long' : 'short') + '">' +
      (p.side === 'long' ? 'L' : 'S') + '</span><span class="book-sym">' + escapeHtml(p.sym) + '</span>' +
      '<span class="book-pnl ' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '') + (p.pnl || 0).toFixed(1) + '%</span></div>';
  }).join('');
  return '<div class="book-head"><span class="book-edge">' + b.length + ' open</span>' + edge + '</div>' +
    '<div class="book-rows">' + rows + '</div>';
}

function tradesView(d, unit){
  const t = Array.isArray(d.trades_detail) ? d.trades_detail.slice(-10).reverse() : [];
  if (!t.length) return svgEmpty('no closed trades yet');
  return '<div class="trade-rows">' + t.map(x => {
    const up = (x.r || 0) >= 0;
    return '<div class="trade-row"><span class="trade-date">' + escapeHtml(String(x.ts || '').slice(5, 10)) + '</span>' +
      '<span class="trade-side ' + (x.side === 'long' ? 'long' : 'short') + '">' + (x.side === 'long' ? 'L' : 'S') + '</span>' +
      '<span class="trade-sym">' + escapeHtml(x.symbol || '') + '</span>' +
      (typeof x.hold === 'number' ? '<span class="trade-hold">' + x.hold + 'd</span>' : '') +
      '<span class="trade-r ' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '') + (x.r || 0).toFixed(2) + unit + '</span></div>';
  }).join('') + '</div>';
}

/* jede zeile eine dropdown-ansicht des mega-charts; leere ansichten fliegen selbst aus der liste */
const MEGA_VIEWS = [
  ['monthly returns', (d) => monthGrid(d.monthly || monthlyFromEquity((d.series || {}).equity))],
  ['daily returns', (d) => heatGrid((d.series || {}).equity)],
  ['daily return distribution', (d) => distSvg(eqReturns(d, t => Math.floor(t / 864e5)), '%', 'days')],
  ['weekly return distribution', (d) => distSvg(eqReturns(d, t => Math.floor(t / 6048e5)), '%', 'weeks')],
  ['monthly return distribution', (d) => distSvg(eqReturns(d, monthKey), '%', 'months')],
  ['result distribution', (d, u) => distSvg(closedTrades(d.trades_detail).map(t => t.r), u, 'trades')],
  ['trade curve', (d) => tradeEquitySvg(d.trades_detail)],
  ['trailing hit rate', (d) => rollingWinSvg(d.trades_detail)],
  ['trailing avg win / loss', (d) => avgWinLossSvg(d.trades_detail)],
  ['trailing payoff vs break-even', (d) => payoffSvg(d.trades_detail)],
  ['edge by holding period', (d) => edgeByHoldSvg(d.trades_detail)],
  ['gain concentration', (d) => concentrationSvg(d.trades_detail)],
  ['instrument mix', (d) => mixSvg(d.trades_detail)],
  ['long / short exposure', (d) => exposureSvg(d.exposure)],
  ['open positions', (d) => bookView(d)],
  ['recent trades', (d, u) => tradesView(d, u)],
  ['all figures', (d) => tradeRecord(d.stats)],
];

function renderMega(containerId, d, unit){
  const el = document.getElementById(containerId); if (!el) return;
  unit = unit || 'R';
  const views = MEGA_VIEWS.map(([lab, fn]) => [lab, fn(d, unit)])
    .filter(v => v[1] && v[1].indexOf('an-empty') < 0);
  if (!views.length){ el.innerHTML = svgEmpty('live data unavailable — check back shortly'); return; }
  el.innerHTML = '<div class="mega-head"><h5 class="an-h">analytics</h5>' +
    '<select class="temp-sel" aria-label="chart">' + views.map((v, i) =>
      '<option value="' + i + '">' + v[0] + '</option>').join('') + '</select></div>' +
    '<div class="mega-body"></div>';
  const body = el.querySelector('.mega-body'), sel = el.querySelector('select');
  const draw = () => {
    body.innerHTML = views[+sel.value][1];
    chartTips(body);
    if (drawIO) body.querySelectorAll('svg.an-svg').forEach(sv => drawIO.observe(sv));
  };
  sel.addEventListener('change', draw);
  draw();
}

const bust = Math.floor(Date.now() / 9e5);
const spxP = fetchT('websiteData/spx.json?' + bust, 8000)
  .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
  .then(d => ((d || {}).series || []).filter(p => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]) && p[1] > 0))
  .catch(() => []);

function drawCompare(P, svg, eq, spxRaw){
  if (eq.length < 2){ svg.innerHTML = ''; return; }
  const t0 = eq[0][0], t1 = eq[eq.length - 1][0];
  eq = eq.map(p => [p[0], p[1] / eq[0][1] * 100]);
  let spx = (spxRaw || []).filter(p => p[0] >= t0 && p[0] <= t1);
  spx = spx.length > 1 ? spx.map(p => [p[0], p[1] / spx[0][1] * 100]) : [];
  const ys = eq.map(p => p[1]).concat(spx.map(p => p[1]));
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1){ y0 -= 1; y1 += 1; }
  const W = 600, Hh = 300, pad = 6;
  const X = x => pad + (x - t0) / (t1 - t0) * (W - 2 * pad);
  const Y = y => Hh - pad - (y - y0) / (y1 - y0) * (Hh - 2 * pad);
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const dp = path(eq);
  const area = dp + ' L' + X(t1).toFixed(1) + ' ' + Hh + ' L' + X(t0).toFixed(1) + ' ' + Hh + ' Z';
  const up = eq[eq.length - 1][1] >= 100, col = up ? cv('--gruen') : cv('--ab');
  const baseLine = '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(100).toFixed(1) + '" y2="' + Y(100).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 4"/>';
  const spxLine = spx.length ? '<path d="' + path(spx) + '" fill="none" stroke="' + cv('--silber') + '" stroke-width="1.3" stroke-opacity=".8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' : '';
  svg.innerHTML = '<defs><linearGradient id="pg-' + P.k + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".22"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
    baseLine + '<path class="eq-area" d="' + area + '" fill="url(#pg-' + P.k + ')"/>' + spxLine +
    '<path class="eq-line" d="' + dp + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
    '<line class="tip-x" x1="0" x2="0" y1="' + pad + '" y2="' + (Hh - pad) + '" stroke="' + cv('--silber') + '" stroke-opacity=".55" stroke-dasharray="2 3" visibility="hidden"/>';
  const box = svg.closest('.perf');
  const swatch = box && box.querySelector('.lg-a');
  if (swatch) swatch.style.background = col;
  let tip = box && box.querySelector('.perf-tip');
  if (box && !tip){ tip = document.createElement('div'); tip.className = 'perf-tip'; box.appendChild(tip); }
  const cross = svg.querySelector('.tip-x');
  const nearest = (pts, t) => pts.reduce((a, p) => Math.abs(p[0] - t) < Math.abs(a[0] - t) ? p : a);
  const pctTxt = v => (v >= 100 ? '+' : '') + (v - 100).toFixed(1) + '%';
  svg.addEventListener('pointermove', e => {
    if (!tip) return;
    const r = svg.getBoundingClientRect();
    const t = t0 + Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (t1 - t0);
    const ep = nearest(eq, t), sp = spx.length ? nearest(spx, t) : null;
    cross.setAttribute('x1', X(ep[0]).toFixed(1)); cross.setAttribute('x2', X(ep[0]).toFixed(1));
    cross.setAttribute('visibility', 'visible');
    const alpha = sp ? ep[1] - sp[1] : null;
    tip.innerHTML = '<b>' + new Date(ep[0]).toISOString().slice(0, 10) + '</b>' +
      '<span><i style="background:' + col + '"></i>strategy ' + pctTxt(ep[1]) + '</span>' +
      (sp ? '<span><i style="background:' + cv('--silber') + '"></i>s&amp;p 500 ' + pctTxt(sp[1]) + '</span>' +
        '<span class="tip-alpha"><i></i>alpha ' + (alpha >= 0 ? '+' : '') + alpha.toFixed(1) + ' pp</span>' : '');
    const fx = X(ep[0]) / W * r.width;
    tip.style.left = Math.min(r.width - 70, Math.max(70, fx)) + 'px';
    tip.style.display = 'block';
  });
  svg.addEventListener('pointerleave', () => {
    if (tip) tip.style.display = 'none';
    cross.setAttribute('visibility', 'hidden');
  });
  const line = svg.querySelector('.eq-line'), areaEl = svg.querySelector('.eq-area');
  if (!reduce && line && 'IntersectionObserver' in window){
    const L = line.getTotalLength();
    line.style.strokeDasharray = L; line.style.strokeDashoffset = L;
    areaEl.style.opacity = '0';
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return; o.disconnect();
      line.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)';
      areaEl.style.transition = 'opacity .9s ease .8s';
      requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; areaEl.style.opacity = '1'; });
    }), {threshold: .35}).observe(svg);
  }
}

function mount(P){
  const svg = document.getElementById(P.svg); if (!svg) return;
  const note = P.note ? document.getElementById(P.note) : null;
  fetchT(P.url + '?' + bust, 8000)
    .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(d => {
      d.trades_detail = (d.trades_detail || []).map(t =>
        t.r == null && t.pnlPct != null ? Object.assign({}, t, {r: t.pnlPct}) : t);
      const s = d.stats || {}, G = (id, v) => { const e = document.getElementById(id); if (!e) return;
        e.textContent = v;
        e.classList.toggle('up', /^\+/.test(v));
        e.classList.toggle('dn', /^-/.test(v));
        if (cntIO) cntIO.observe(e); };
      if (note && d.updated){
        const fresh = (Date.now() - d.updated) < (P.freshMs || 2 * 3600 * 1000);
        const base = (note.dataset.base || note.textContent).replace(/\s*·\s*updated.*$/, '');
        note.dataset.base = base;
        note.innerHTML = escapeHtml(base) + ' · <span class="fresh-' + (fresh ? 'ok' : 'stale') + '">updated ' + fmtAge(d.updated) + ' ●</span>';
      }
      if (P.rows){
        P.rows.forEach(rw => G(P.k + rw[0], rw[2] === 'pct' ? fmtPct(s[rw[1]]) : fmtPlain(s[rw[1]], rw[3] || '')));
      } else {
        G(P.k + 'Ret', fmtPct(s.total_return_pct));
        G(P.k + 'Win', fmtPlain(s.win_rate_pct, '%'));
        G(P.k + 'Tr', fmtPlain(s.trades, ''));
        G(P.k + 'DD', fmtPct(s.max_drawdown_pct));
        G(P.k + 'AW', typeof s.avg_win_r === 'number' ? fmtPlain(s.avg_win_r, 'R') : fmtPct(s.avg_win_pct));
        G(P.k + 'PO', fmtPlain(s.payoff, 'x'));
      }
      spxP.then(spx => drawCompare(P, svg, sanitizeSeries((d.series || {}).equity || []), spx));
      renderMega(P.an, d, P.unit);
    })
    .catch(() => {
      const an = document.getElementById(P.an);
      if (an) an.innerHTML = svgEmpty('live data unavailable — check back shortly');
      if (note) note.textContent = 'data unavailable';
    });
}
mount({svg:'perfSvg', note:'perfNote', k:'st', an:'stAn', url:'websiteData/alpaca.json'});
mount({svg:'wperfSvg', note:'wperfNote', k:'wst', an:'wAn', url:'websiteData/wikifolio.json', freshMs:30*3600*1000, unit:'%',
  rows:[['Ret','total_return_pct','pct'],['Yr','one_year_pct','pct'],['Pa','annualized_pct','pct'],['DD','max_drawdown_pct','pct'],['Vol','volatility_pct','plain','%'],['Cap','invested_keur','plain','k€']]});

document.querySelectorAll('.sol-radio').forEach(r => {
  r.addEventListener('change', () => {
    document.querySelectorAll('.sol-vid video').forEach(v => {
      v.getBoundingClientRect().height > 0 ? v.play().catch(() => {}) : v.pause();
    });
  });
});

document.addEventListener('click', e => {
  const btn = e.target.closest('.sp-load'); if (!btn) return;
  const row = btn.closest('.spotify-track'), id = row && row.dataset.track;
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) return;
  const f = document.createElement('iframe');
  f.src = 'https://open.spotify.com/embed/track/' + id;
  f.allow = 'encrypted-media';
  f.loading = 'lazy';
  f.title = 'Spotify player';
  row.classList.add('loaded');
  row.replaceChildren(f);
});

/* ═══════════════ stuff · temperature — global risk read, lean subset ═══════════════ */

function sparkPath(vals){
  const w = 100, h = 32, pad = 1;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const X = i => pad + i / (vals.length - 1) * (w - 2 * pad);
  const Y = v => h - pad - (hi > lo ? (v - lo) / (hi - lo) : .5) * (h - 2 * pad);
  return vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
}
function sparkSvg(vals){
  if (!Array.isArray(vals) || vals.length < 2) return '';
  return '<svg class="temp-spark" viewBox="0 0 100 32" preserveAspectRatio="none"><path d="' + sparkPath(vals) +
    '" fill="none" stroke="' + cv('--flieder') + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
}
const tempEl = id => document.getElementById(id);
const tempVal = id => (tempEl(id) || {}).value || '';
const tempData = {};

function tempCut(pts, days){
  if (!Array.isArray(pts) || !pts.length || !days) return pts || [];
  const from = pts[pts.length - 1][0] - days * 864e5;
  return pts.filter(p => p[0] >= from);
}
function tempSmooth(pts, n){
  return pts.map((p, i) => {
    const win = pts.slice(Math.max(0, i - n + 1), i + 1);
    return [p[0], win.reduce((s, q) => s + q[1], 0) / win.length];
  });
}
function tempPctRank(pts){
  const sorted = pts.map(p => p[1]).slice().sort((a, b) => a - b);
  return pts.map(p => {
    let lo = 0, hi = sorted.length;
    while (lo < hi){ const m = (lo + hi) >> 1; if (sorted[m] < p[1]) lo = m + 1; else hi = m; }
    return [p[0], lo / Math.max(1, sorted.length - 1) * 100];
  });
}
function tempOrdinal(n){
  const t = n % 100, d = n % 10;
  return n + (t > 10 && t < 20 ? 'th' : d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th');
}
function tempMedian(vals){
  const s = vals.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}
function tempAxis(el, t0, t1){
  if (!el) return;
  el.innerHTML = [0, .25, .5, .75, 1].map(f => '<span style="left:' + (f * 100) + '%">' +
    new Date(t0 + (t1 - t0) * f).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) + '</span>').join('');
}
function tempPlot(svgId, axisId, series){
  const svg = tempEl(svgId);
  if (!svg) return;
  const live = series.filter(s => Array.isArray(s.pts) && s.pts.length > 1);
  if (!live.length){ svg.innerHTML = ''; tempAxis(tempEl(axisId), Date.now(), Date.now()); return; }
  const W = 600, H = 220, pad = 10;
  const t0 = Math.min(...live.map(s => s.pts[0][0])), t1 = Math.max(...live.map(s => s.pts[s.pts.length - 1][0]));
  const X = t => pad + (t1 > t0 ? (t - t0) / (t1 - t0) : 0) * (W - 2 * pad);
  const grid = [0, .25, .5, .75, 1].map(f => { const y = (pad + f * (H - 2 * pad)).toFixed(1);
    return '<line x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="' + cv('--line') + '" stroke-opacity=".3" vector-effect="non-scaling-stroke"/>'; }).join('');
  const body = live.map(s => {
    const peers = s.group ? live.filter(x => x.group === s.group) : [s];
    const vals = peers.flatMap(x => x.pts.map(p => p[1]));
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const room = (hi - lo) * .07 || 1;
    lo -= room; hi += room;
    const Y = v => H - pad - (v - lo) / (hi - lo) * (H - 2 * pad);
    return '<path d="' + s.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') +
      '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 2) + '" stroke-opacity="' + (s.opacity || 1) +
      '" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>';
  }).join('');
  svg.innerHTML = grid + body;
  tempAxis(tempEl(axisId), t0, t1);
}
function tempLegend(id, items){
  const el = tempEl(id);
  if (el) el.innerHTML = items.map(i => '<span class="temp-leg"><i style="background:' + i.color + ';opacity:' + (i.opacity || 1) + '"></i>' +
    escapeHtml(i.name) + (i.value ? '<b>' + i.value + '</b>' : '') + '</span>').join('');
}

function renderRisk(){
  const years = +tempVal('tempRiskRange') || 3, pct = tempVal('tempRiskScale') === 'pct';
  const gpr = tempCut(tempData.gpr, years * 365), epu = tempCut(tempData.epu, years * 365);
  const col = (pts, c) => pts.map(p => [p[0], p[c]]);
  const last = pts => pts.length ? pts[pts.length - 1][1] : null;
  let series = [
    { name: 'geopolitical risk', pts: col(gpr, 1), color: cv('--flieder'), width: 2.2, group: 'gpr' },
    { name: 'policy uncertainty', pts: col(epu, 1), color: cv('--gold'), width: 2.2, group: 'epu' }
  ].filter(s => s.pts.length > 1);
  tempLegend('tempRiskLegend', series.map(s => ({ name: s.name, color: s.color, opacity: s.opacity,
    value: pct ? tempOrdinal(Math.round(tempPctRank(s.pts)[s.pts.length - 1][1])) : Math.round(last(s.pts)) })));
  if (pct) series = series.map(s => Object.assign({}, s, { pts: tempPctRank(s.pts), group: 'pct' }));
  tempPlot('tempRiskSvg', 'tempRiskAxis', series);
}

function renderGates(){
  const gates = tempData.chokepoints || [], sel = tempEl('tempGateSel');
  if (!gates.length){ tempLegend('tempGateLegend', []); tempPlot('tempGateSvg', 'tempGateAxis', []); return; }
  if (sel && !sel.options.length){
    sel.innerHTML = '<option value="all">all gates</option>' +
      gates.map(g => '<option value="' + g.key + '">' + escapeHtml(g.name) + '</option>').join('');
    sel.value = gates[0].key;
  }
  const days = +tempVal('tempGateRange') || 0, pick = tempVal('tempGateSel') || 'all';
  const pal = [cv('--flieder'), cv('--gold'), cv('--silber'), cv('--gruen'), cv('--ab'), cv('--muted')];
  const shown = pick === 'all' ? gates : gates.filter(g => g.key === pick);
  const series = shown.map((g, i) => ({ name: g.name, color: pal[i % pal.length], width: 2,
    pts: tempCut(tempSmooth(g.series, 7), days) }));
  tempLegend('tempGateLegend', series.map(s => ({ name: s.name, color: s.color,
    value: s.pts.length ? Math.round(s.pts[s.pts.length - 1][1]) : '' })));
  let plotted = series;
  if (pick === 'all'){
    plotted = series.map(s => {
      const med = tempMedian(s.pts.map(p => p[1]));
      return Object.assign({}, s, { group: 'rel', pts: med ? s.pts.map(p => [p[0], p[1] / med * 100]) : s.pts });
    });
    const span = (plotted.find(p => p.pts && p.pts.length) || {}).pts;
    if (span) plotted = plotted.concat([{ name: '', color: cv('--muted'), width: 1, opacity: .5, group: 'rel',
      pts: [[span[0][0], 100], [span[span.length - 1][0], 100]] }]);
  }
  tempPlot('tempGateSvg', 'tempGateAxis', plotted);
  const stat = tempEl('tempGateStat');
  if (!stat) return;
  if (pick === 'all'){ stat.innerHTML = 'every gate as a share of its own normal &mdash; the flat line is 100%, business as usual. pick a single gate for absolute counts.'; return; }
  const raw = shown[0].series, recent = raw.slice(-7).reduce((s, p) => s + p[1], 0) / Math.min(7, raw.length);
  const base = raw.slice(0, Math.max(1, raw.length - 90)).map(p => p[1]).sort((a, b) => a - b);
  const med = base[Math.floor(base.length / 2)] || 0;
  const dev = med ? (recent / med - 1) * 100 : 0;
  stat.innerHTML = '<b>' + recent.toFixed(0) + '</b> ships/day over the last week &middot; <span class="temp-delta ' +
    (dev >= 0 ? 'up' : 'dn') + '">' + (dev >= 0 ? '▲' : '▼') + ' ' + Math.abs(dev).toFixed(0) + '%</span> versus the ' +
    med.toFixed(0) + ' ships/day median of the period before.';
}

function renderMarkets(){
  const grid = tempEl('tempMktGrid');
  if (!grid) return;
  const win = +tempVal('tempMktWin') || 66;
  const cards = (tempData.markets || []).map(m => {
    const vals = (m.series || []).map(p => p[1]);
    if (vals.length < 2) return null;
    const last = vals[vals.length - 1], prev = vals[Math.max(0, vals.length - 1 - win)];
    return { m: m, last: last, chg: prev ? (last / prev - 1) * 100 : 0, vals: vals.slice(-win) };
  }).filter(Boolean);
  if (tempVal('tempMktSort') === 'mov') cards.sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg));
  grid.innerHTML = cards.map(c =>
    '<div class="temp-mkt"><div class="temp-mkt-name keepcase">' + escapeHtml(c.m.name) + '</div>' +
    '<div class="temp-mkt-val">' + c.last.toFixed(2) + '</div>' + sparkSvg(c.vals) +
    '<span class="temp-delta ' + (c.chg >= 0 ? 'up' : 'dn') + '">' + (c.chg >= 0 ? '▲' : '▼') + ' ' +
    Math.abs(c.chg).toFixed(1) + '%</span></div>').join('') || svgEmpty('no data');
}

function renderPredictions(){
  const box = tempEl('tempPred');
  if (!box) return;
  const src = tempVal('tempPredSrc') || 'all', sort = tempVal('tempPredSort') || 'vol';
  const tag = (list, venue) => (list || []).map(m => Object.assign({ venue: venue }, m));
  let rows = src === 'poly' ? tag(tempData.polymarket, 'Polymarket')
    : src === 'kalshi' ? tag(tempData.kalshi, 'Kalshi')
    : tag(tempData.polymarket, 'Polymarket').concat(tag(tempData.kalshi, 'Kalshi'));
  const key = sort === 'p' ? m => m.p || 0 : sort === 'chg' ? m => Math.abs(m.chg || 0) : m => m.vol || 0;
  rows = rows.sort((a, b) => key(b) - key(a)).slice(0, 12);
  if (!rows.length){ box.innerHTML = svgEmpty('no data'); return; }
  box.innerHTML = rows.map(m => {
    const pct = Math.round((m.p || 0) * 100), chg = (m.chg || 0) * 100;
    let meta = m.venue + ' · 24h-vol $' + Math.round(m.vol || 0).toLocaleString('en-US');
    const end = m.end && new Date(m.end);
    if (end && !isNaN(end)) meta += ' · ends ' + end.toISOString().slice(0, 10);
    if (Math.abs(chg) >= .5) meta += ' · <span class="temp-delta ' + (chg >= 0 ? 'up' : 'dn') + '">' +
      (chg >= 0 ? '▲' : '▼') + ' ' + Math.abs(chg).toFixed(0) + 'pp/24h</span>';
    return '<div class="temp-pred-row"><div style="flex:1 1 0"><div class="temp-pred-q">' +
      escapeHtml(m.question || m.title || '') + '</div><div class="temp-pred-meta">' + meta + '</div></div>' +
      '<div class="temp-pred-bar"><i style="width:' + Math.max(2, pct) + '%"></i></div>' +
      '<div class="temp-pred-p">' + pct + '%</div></div>';
  }).join('');
}

function renderTemperature(d){
  Object.assign(tempData, d);
  renderRisk(); renderGates(); renderMarkets(); renderPredictions();
  const upd = tempEl('tempUpdated');
  if (upd) upd.textContent = d.updated ? 'updated ' + fmtAge(d.updated) : '';
}
[['tempRiskRange', renderRisk], ['tempRiskScale', renderRisk], ['tempGateSel', renderGates], ['tempGateRange', renderGates],
 ['tempMktWin', renderMarkets], ['tempMktSort', renderMarkets], ['tempPredSrc', renderPredictions], ['tempPredSort', renderPredictions]]
  .forEach(([id, fn]) => { const el = tempEl(id); if (el) el.addEventListener('change', fn); });
fetchT('websiteData/temperature.json?' + bust, 10000)
  .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
  .then(renderTemperature)
  .catch(() => {
    const box = tempEl('tempRiskLegend');
    if (box) box.innerHTML = svgEmpty('live data unavailable — check back shortly');
  });

if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches)
  document.querySelectorAll('.book, .perf').forEach(el => {
    const deg = el.classList.contains('perf') ? 10 : 6;
    const persp = el.classList.contains('perf') ? 600 : 700;
    el.addEventListener('pointerenter', () => { el.style.transition = 'transform .18s ease-out'; });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(' + persp + 'px) rotateX(' + (-y * deg).toFixed(2) + 'deg) rotateY(' + (x * deg).toFixed(2) + 'deg)';
    });
    el.addEventListener('pointerleave', () => { el.style.transition = 'transform .55s var(--ease)'; el.style.transform = ''; });
  });

if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches)
  document.querySelectorAll('nav.tabs button, .sol-btn, .lang-toggle label').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.transform = 'translate(' + ((e.clientX - r.left - r.width/2)*.24).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height/2)*.34).toFixed(1) + 'px)';
    }, {passive:true});
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

