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

const TITLES = {home:'malou trading', team:'team - malou trading', trade:'trade - malou trading', news:'news - malou trading', world:'world - malou trading'};
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

const SWIPE = ['home','team','news','trade','world'];
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

function gridSvg(W, H, pad, hN, vN){
  const line = (x1, y1, x2, y2) => '<line x1="' + x1 + '" x2="' + x2 + '" y1="' + y1 + '" y2="' + y2 +
    '" stroke="var(--chart-grid)" vector-effect="non-scaling-stroke"/>';
  const hor = Array.from({length: hN || 3}, (_, i) => (i + 1) / ((hN || 3) + 1))
    .map(f => line(pad, (pad + f * (H - 2 * pad)).toFixed(1), W - pad, (pad + f * (H - 2 * pad)).toFixed(1))).join('');
  const ver = Array.from({length: vN || 4}, (_, i) => (i + 1) / ((vN || 4) + 1))
    .map(f => line((pad + f * (W - 2 * pad)).toFixed(1), pad, (pad + f * (W - 2 * pad)).toFixed(1), H - pad)).join('');
  return hor + ver;
}
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
    gridSvg(W, H, pad) + zero + bars + '<path d="' + curve + '" fill="none" stroke="' + cv('--silber') +
    '" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>' +
    '<i class="rw-t" style="top:0">' + Math.round(yMax) + '</i><i class="rw-t" style="bottom:0">0</i></div>' +
    xRow([lo, (lo + hi) / 2, hi].map(v => (v > 0 ? '+' : '') + v.toFixed(1) + unit)) +
    '<p class="hb-foot">bars = observed ' + lab + ' &middot; curve = normal fit &middot; fatter tails than the curve = tail risk</p></div>';
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

function dayStats(d){
  const rows = periodReturns((d.series || {}).equity, t => Math.floor(t / 864e5)).slice(1);
  const vals = rows.map(r => r[1]);
  const win = Math.max(8, Math.min(120, Math.floor(vals.length / 3)));
  const yrs = rows.length > 1 ? (rows[rows.length - 1][0] - rows[0][0]) / 365.25 : 0;
  return {vals, win, ppy: yrs > 0 ? vals.length / yrs : 252,
    labels: rows.slice(win - 1).map(r => new Date(r[0] * 864e5).toISOString().slice(0, 10))};
}
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
  const fmt = (tip && tip.fmt) || (v => v.toFixed(2) + ((tip && tip.u) || ''));
  const lastIdx = s => { let i = s.vals.length - 1; while (i >= 0 && s.vals[i] == null) i--; return i; };
  const bands = ((tip && tip.bands) || []).map(b =>
    '<rect x="' + pad + '" y="' + Y(b.to).toFixed(1) + '" width="' + (W - 2 * pad) +
    '" height="' + (Y(b.from) - Y(b.to)).toFixed(1) + '" fill="' + b.col + '" fill-opacity=".06"/>').join('');
  const grid = gridSvg(W, H, pad);
  const ref = typeof refY === 'number'
    ? '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(refY).toFixed(1) + '" y2="' + Y(refY).toFixed(1) +
      '" stroke="var(--line)" stroke-dasharray="2 3"/>' : '';
  const baseY = Y(Math.max(y0, Math.min(y1, 0))).toFixed(1);
  const shapes = seriesList.map(s => {
    const d = linePath(s.vals, X, Y);
    if (!d) return '';
    const i1 = lastIdx(s), i0 = s.vals.findIndex(v => v != null);
    const area = s.fill && s.vals.slice(i0, i1 + 1).every(v => v != null)
      ? '<path d="' + d + ' L' + X(i1).toFixed(1) + ' ' + baseY + ' L' + X(i0).toFixed(1) + ' ' + baseY + ' Z" fill="' + s.col + '" fill-opacity=".14"/>' : '';
    if (s.noLine) return area;
    const dot = s.dash ? '' : '<path d="M' + X(i1).toFixed(1) + ' ' + Y(s.vals[i1]).toFixed(1) +
      ' l.01 0" stroke="' + s.col + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 0" vector-effect="non-scaling-stroke"/>';
    return area + '<path d="' + d + '" fill="none" stroke="' + s.col +
      '" stroke-width="' + (s.dash ? 1.2 : s.w || 2) + '" vector-effect="non-scaling-stroke" stroke-linejoin="round"' +
      (s.dash ? ' stroke-dasharray="3 3"' : '') + '/>' + dot;
  }).join('');
  const lastLabs = seriesList.map(s => {
    const i1 = lastIdx(s);
    if (s.dash || s.noLine || i1 < 0) return '';
    const top = Math.max(7, Math.min(93, (1 - (s.vals[i1] - y0) / ((y1 - y0) || 1)) * 100));
    return '<i class="rw-t rw-last" style="top:' + top.toFixed(1) + '%;color:' + s.col + '">' + fmt(s.vals[i1]) + '</i>';
  }).join('');
  const data = tip ? ' data-tip="' + escapeHtml(JSON.stringify({u: tip.u || '', x: tip.x || null,
    s: seriesList.filter(s => !s.noLine).map((s, i) => ({n: (tip.names || [])[i] || '', c: s.col,
      v: s.vals.map(v => v == null ? null : +v.toFixed(2))}))})) + '"' : '';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg"' + data + '>' +
    bands + grid + ref + shapes + '</svg>' + lastLabs;
}
const xRow = labs => '<div class="rw-x">' + labs.map(l => '<i>' + l + '</i>').join('') + '</div>';
function dateTicks(labels){
  if (!labels || labels.length < 2) return ['', '', ''];
  const f = labels[0].slice(0, 4) !== labels[labels.length - 1].slice(0, 4) ? l => l.slice(0, 7) : l => l.slice(5);
  return [f(labels[0]), f(labels[Math.floor(labels.length / 2)]), f(labels[labels.length - 1])];
}
function numsRow(items){
  return '<div class="rw-nums">' + items.map(i =>
    '<span><b class="' + (i[2] || '') + '">' + i[0] + '</b>' + i[1] + '</span>').join('') + '</div>';
}

function drawdownSvg(eq){
  const pts = sanitizeEquity(eq || []).filter(p => p[1] > 0);
  if (pts.length < 8) return svgEmpty('not enough history yet');
  let peak = 0;
  const dd = pts.map(p => { peak = Math.max(peak, p[1]); return Math.min(0, (p[1] / peak - 1) * 100); });
  const dates = pts.map(p => new Date(p[0]).toISOString().slice(0, 10));
  const deep = Math.min(...dd), now = dd[dd.length - 1];
  const y0 = Math.min(deep, -1);
  const W = 300, H = 120, pad = 5;
  const X = i => pad + i / (dd.length - 1) * (W - 2 * pad);
  const Y = v => pad + v / y0 * (H - 2 * pad);
  const line = linePath(dd, X, Y);
  const area = line + ' L' + X(dd.length - 1).toFixed(1) + ' ' + pad + ' L' + X(0).toFixed(1) + ' ' + pad + ' Z';
  let longest = 0, start = null;
  pts.forEach((p, i) => {
    if (dd[i] >= -1e-9){ start = null; return; }
    if (start == null) start = p[0];
    longest = Math.max(longest, p[0] - start);
  });
  const under = dd.filter(v => v < -1e-9).length / dd.length * 100;
  return '<div class="rw">' + numsRow([
    [now.toFixed(1) + '%', 'now', now >= -0.5 ? 'up' : 'dn'],
    [deep.toFixed(1) + '%', 'deepest', 'dn'],
    [Math.round(longest / 864e5) + 'd', 'longest stretch'],
    [Math.round(under) + '%', 'time under water']]) +
    '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg" data-tip="' +
    escapeHtml(JSON.stringify({u: '%', x: dates,
      s: [{n: 'drawdown', c: cv('--holz'), v: dd.map(v => +v.toFixed(1))}]})) + '">' +
    gridSvg(W, H, pad) +
    '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + pad + '" y2="' + pad + '" stroke="var(--line)" stroke-dasharray="2 3"/>' +
    '<path d="' + area + '" fill="' + cv('--holz') + '" fill-opacity=".18"/>' +
    '<path d="' + line + '" fill="none" stroke="' + cv('--holz') + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
    '<path d="M' + X(dd.length - 1).toFixed(1) + ' ' + Y(now).toFixed(1) + ' l.01 0" stroke="' + cv('--holz') +
    '" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 0" vector-effect="non-scaling-stroke"/></svg>' +
    '<i class="rw-t" style="top:0">0%</i><i class="rw-t" style="top:50%">' + (y0 / 2).toFixed(0) + '%</i>' +
    '<i class="rw-t" style="bottom:0">' + y0.toFixed(0) + '%</i>' +
    '<i class="rw-t rw-last" style="top:' + Math.max(7, Math.min(93, now / y0 * 100)).toFixed(1) + '%;color:' + cv('--holz') + '">' + now.toFixed(1) + '%</i></div>' +
    xRow(dateTicks(dates)) +
    '<p class="hb-foot">distance below the last peak &middot; 0 = new high</p></div>';
}

function hitRatioSvg(S){
  if (S.vals.length < S.win + 4) return svgEmpty('not enough days yet');
  const hit = trailSeries(S.vals, S.win, s => s.filter(v => v > 0).length / s.length * 100);
  const now = hit[hit.length - 1], avg = meanOf(hit);
  return '<div class="rw">' + numsRow([
    [Math.round(now) + '%', 'now', now >= 50 ? 'up' : 'dn'],
    [Math.round(avg) + '%', 'average'],
    [Math.round(Math.min(...hit)) + '&ndash;' + Math.round(Math.max(...hit)) + '%', 'range'],
    [S.win + 'd', 'window']]) +
    '<div class="rw-plot">' + trailPlot([{vals: hit, col: cv('--gruen')}], 0, 100, 50,
      {u: '%', names: ['hit ratio'], x: S.labels, fmt: v => Math.round(v) + '%',
       bands: [{from: 50, to: 100, col: cv('--gruen')}, {from: 0, to: 50, col: cv('--holz')}]}) +
    '<i class="rw-t" style="top:0">100%</i><i class="rw-t" style="top:50%">50%</i><i class="rw-t" style="bottom:0">0%</i></div>' +
    xRow(dateTicks(S.labels)) +
    '<p class="hb-foot">share of up days, rolling &middot; dashed = coin flip</p></div>';
}

function winLossSvg(eq){
  const rows = periodReturns(eq, t => Math.floor(t / 864e5)).slice(1);
  if (rows.length < 12) return svgEmpty('not enough days yet');
  const byMonth = new Map();
  rows.forEach(r => {
    const d = new Date(r[0] * 864e5), k = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(r[1]);
  });
  const mo = [...byMonth.entries()].map(([k, v]) => ({k, g: meanOf(v.filter(x => x > 0)), l: meanOf(v.filter(x => x <= 0))}));
  const y1 = Math.max(...mo.map(x => x.g || 0), 0.1), y0 = Math.min(...mo.map(x => x.l || 0), -0.1);
  const W = 300, H = 120, pad = 5, n = mo.length;
  const slot = (W - 2 * pad) / n, bw = Math.max(1, slot - Math.max(1, Math.min(3, slot * 0.3)));
  const Y = v => H - pad - (v - y0) / (y1 - y0) * (H - 2 * pad);
  const z = Y(0);
  const bars = mo.map((x, i) => {
    const cx = (pad + i * slot + (slot - bw) / 2).toFixed(1);
    return (x.g != null ? '<rect x="' + cx + '" y="' + Y(x.g).toFixed(1) + '" width="' + bw.toFixed(1) +
      '" height="' + (z - Y(x.g)).toFixed(1) + '" fill="' + cv('--gruen') + '" fill-opacity=".75"/>' : '') +
      (x.l != null ? '<rect x="' + cx + '" y="' + z.toFixed(1) + '" width="' + bw.toFixed(1) +
      '" height="' + (Y(x.l) - z).toFixed(1) + '" fill="' + cv('--holz') + '" fill-opacity=".75"/>' : '');
  }).join('');
  const grid = gridSvg(W, H, pad);
  const allDays = rows.map(r => r[1]);
  const aG = meanOf(allDays.filter(v => v > 0)), aL = meanOf(allDays.filter(v => v <= 0));
  const ratio = aL ? -aG / aL : null;
  const lastM = mo[mo.length - 1];
  return '<div class="rw">' + numsRow([
    ['+' + (lastM.g || 0).toFixed(2) + '%', 'avg gain now', 'up'],
    [(lastM.l || 0).toFixed(2) + '%', 'avg loss now', 'dn'],
    [ratio != null ? ratio.toFixed(2) + 'x' : '–', 'gain ÷ loss all time', ratio >= 1 ? 'up' : 'dn'],
    [n, 'months']]) +
    '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg" data-tip="' +
    escapeHtml(JSON.stringify({u: '%', x: mo.map(x => x.k),
      s: [{n: 'avg gain', c: cv('--gruen'), v: mo.map(x => x.g == null ? null : +x.g.toFixed(2))},
        {n: 'avg loss', c: cv('--holz'), v: mo.map(x => x.l == null ? null : +x.l.toFixed(2))}]})) + '">' +
    grid + bars +
    '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + z.toFixed(1) + '" y2="' + z.toFixed(1) + '" stroke="var(--line)" stroke-dasharray="2 3"/></svg>' +
    '<i class="rw-t" style="top:0">+' + y1.toFixed(1) + '%</i><i class="rw-t" style="top:50%">' + ((y0 + y1) / 2).toFixed(1) + '%</i>' +
    '<i class="rw-t" style="bottom:0">' + y0.toFixed(1) + '%</i></div>' +
    xRow([mo[0].k, mo[Math.floor(n / 2)].k, lastM.k]) +
    '<p class="hb-foot">per month: average up day vs average down day</p></div>';
}

function payoffSvg(S){
  if (S.vals.length < S.win + 4) return svgEmpty('not enough days yet');
  const ratio = trailSeries(S.vals, S.win, s => {
    const g = meanOf(s.filter(v => v > 0)), l = meanOf(s.filter(v => v <= 0));
    return g != null && l ? -g / l : null;
  });
  const need = trailSeries(S.vals, S.win, s => {
    const h = s.filter(v => v > 0).length / s.length;
    return h > 0 && h < 1 ? (1 - h) / h : null;
  });
  const all = [...ratio, ...need].filter(v => v != null);
  if (!all.length) return svgEmpty('not enough days yet');
  const y1 = Math.min(Math.max(...all), 6), y0 = 0;
  const last = a => [...a].reverse().find(v => v != null);
  const beat = ratio.filter((v, i) => v != null && need[i] != null && v > need[i]).length;
  const both = ratio.filter((v, i) => v != null && need[i] != null).length;
  return '<div class="rw">' + numsRow([
    [(last(ratio) || 0).toFixed(2) + 'x', 'payoff now', last(ratio) > last(need) ? 'up' : 'dn'],
    [(last(need) || 0).toFixed(2) + 'x', 'break-even'],
    [Math.round(beat / (both || 1) * 100) + '%', 'time above'],
    [S.win + 'd', 'window']]) +
    '<div class="rw-plot">' + trailPlot([{vals: need, col: cv('--silber'), dash: true},
      {vals: ratio, col: cv('--gruen'), fill: true}], y0, y1, null,
      {u: 'x', names: ['break-even', 'payoff'], x: S.labels, fmt: v => v.toFixed(2) + 'x'}) +
    '<i class="rw-t" style="top:0">' + y1.toFixed(0) + 'x</i><i class="rw-t" style="top:50%">' + (y1 / 2).toFixed(1) + 'x</i>' +
    '<i class="rw-t" style="bottom:0">0x</i></div>' +
    xRow(dateTicks(S.labels)) +
    '<p class="hb-foot">solid = avg gain &divide; avg loss &middot; dashed = break-even for this hit ratio</p></div>';
}

function sharpeSvg(S){
  if (S.vals.length < S.win + 4) return svgEmpty('not enough days yet');
  const sr = trailSeries(S.vals, S.win, s => {
    const m = meanOf(s), sd = Math.sqrt(s.reduce((a, v) => a + (v - m) * (v - m), 0) / (s.length - 1));
    return sd > 0 ? m / sd * Math.sqrt(S.ppy) : null;
  });
  const so = trailSeries(S.vals, S.win, s => {
    const m = meanOf(s);
    const d = Math.sqrt(s.reduce((a, v) => a + Math.min(0, v) * Math.min(0, v), 0) / s.length);
    return d > 0 ? m / d * Math.sqrt(S.ppy) : null;
  });
  const all = sr.filter(v => v != null);
  if (!all.length) return svgEmpty('not enough days yet');
  const both = all.concat(so.filter(v => v != null));
  const y1 = Math.max(...both, 1.5), y0 = Math.min(...both, -0.5);
  const now = [...sr].reverse().find(v => v != null);
  const soNow = [...so].reverse().find(v => v != null);
  const share = all.filter(v => v > 1).length / all.length * 100;
  return '<div class="rw">' + numsRow([
    [now.toFixed(2), 'now', now >= 1 ? 'up' : now < 0 ? 'dn' : ''],
    [soNow != null ? soNow.toFixed(2) : '&ndash;', 'sortino'],
    [Math.round(share) + '%', 'time above 1'],
    [S.win + 'd', 'window']]) +
    '<div class="rw-plot">' + trailPlot([
      {vals: sr.map(v => v == null ? null : Math.max(0, v)), col: cv('--gruen'), fill: true, noLine: true},
      {vals: sr.map(v => v == null ? null : Math.min(0, v)), col: cv('--holz'), fill: true, noLine: true},
      {vals: so, col: cv('--silber'), dash: true},
      {vals: sr, col: cv('--gruen')}], y0, y1, 0,
      {u: '', names: ['sortino', 'sharpe'], x: S.labels, fmt: v => v.toFixed(2)}) +
    '<i class="rw-t" style="top:0">' + y1.toFixed(1) + '</i><i class="rw-t" style="top:50%">' + ((y0 + y1) / 2).toFixed(1) + '</i>' +
    '<i class="rw-t" style="bottom:0">' + y0.toFixed(1) + '</i></div>' +
    xRow(dateTicks(S.labels)) +
    '<p class="hb-foot">return per unit of risk &middot; dashed = sortino, downside only &middot; above 1 = strong</p></div>';
}

function calmarSvg(S){
  if (S.vals.length < S.win + 4) return svgEmpty('not enough days yet');
  const CAP = 8;
  const cm = trailSeries(S.vals, S.win, s => {
    let e = 1, pk = 1, dd = 0;
    s.forEach(v => { e *= 1 + v / 100; pk = Math.max(pk, e); dd = Math.max(dd, 1 - e / pk); });
    const ann = Math.pow(e, S.ppy / s.length) - 1;
    return dd > 1e-4 ? Math.max(-CAP, Math.min(CAP, ann / dd)) : (ann > 0 ? CAP : null);
  });
  const all = cm.filter(v => v != null);
  if (!all.length) return svgEmpty('not enough days yet');
  const y1 = Math.max(...all, 2), y0 = Math.min(...all, -0.5);
  const now = [...cm].reverse().find(v => v != null), avg = meanOf(all);
  const share = all.filter(v => v > 1).length / all.length * 100;
  const fmt = v => (Math.abs(v) >= CAP ? (v > 0 ? '&ge;' : '&le;') : '') + v.toFixed(2);
  return '<div class="rw">' + numsRow([
    [fmt(now), 'now', now >= 1 ? 'up' : now < 0 ? 'dn' : ''],
    [avg.toFixed(2), 'average'],
    [Math.round(share) + '%', 'time above 1'],
    [S.win + 'd', 'window']]) +
    '<div class="rw-plot">' + trailPlot([
      {vals: cm.map(v => v == null ? null : Math.max(0, v)), col: cv('--gruen'), fill: true, noLine: true},
      {vals: cm.map(v => v == null ? null : Math.min(0, v)), col: cv('--holz'), fill: true, noLine: true},
      {vals: cm, col: cv('--gruen')}], y0, y1, 1,
      {u: '', names: ['calmar'], x: S.labels, fmt: v => v.toFixed(2)}) +
    '<i class="rw-t" style="top:0">' + y1.toFixed(1) + '</i><i class="rw-t" style="top:50%">' + ((y0 + y1) / 2).toFixed(1) + '</i>' +
    '<i class="rw-t" style="bottom:0">' + y0.toFixed(1) + '</i></div>' +
    xRow(dateTicks(S.labels)) +
    '<p class="hb-foot">return &divide; worst drawdown &middot; dashed = 1, gain pays for pain &middot; capped at &plusmn;' + CAP + '</p></div>';
}

function edgeMapSvg(eq){
  const rows = periodReturns(eq, t => Math.floor(t / 864e5)).slice(1);
  if (rows.length < 40) return svgEmpty('not enough days yet');
  const byMonth = new Map();
  rows.forEach(r => {
    const d = new Date(r[0] * 864e5), k = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(r[1]);
  });
  const mo = [...byMonth.entries()].filter(([, v]) => v.length >= 6).map(([k, v]) => {
    const g = meanOf(v.filter(x => x > 0)), l = meanOf(v.filter(x => x <= 0));
    return {k, pay: g != null && l ? -g / l : null,
      hit: v.filter(x => x > 0).length / v.length * 100,
      ret: (v.reduce((a, x) => a * (1 + x / 100), 1) - 1) * 100};
  }).filter(m => m.pay != null);
  if (mo.length < 3) return svgEmpty('not enough months yet');
  const pMax = Math.min(Math.max(...mo.map(m => m.pay), 2) * 1.15, 4);
  const W = 300, H = 120, pad = 5;
  const X = p => pad + Math.min(p, pMax) / pMax * (W - 2 * pad);
  const Y = h => H - pad - h / 100 * (H - 2 * pad);
  const curve = Array.from({length: 61}, (_, i) => {
    const p = 0.08 + (pMax - 0.08) * i / 60;
    return (i ? 'L' : 'M') + X(p).toFixed(1) + ' ' + Y(100 / (1 + p)).toFixed(1);
  }).join(' ');
  const dot = (m, w, col, op) =>
    '<path d="M' + X(m.pay).toFixed(1) + ' ' + Y(m.hit).toFixed(1) + ' l.01 0" stroke="' + col +
    '" stroke-width="' + w + '" stroke-linecap="round" stroke-dasharray="9 0" vector-effect="non-scaling-stroke" stroke-opacity="' + op +
    '"><title>' + m.k + ' &middot; hit ' + Math.round(m.hit) + '% &middot; payoff ' + m.pay.toFixed(2) + 'x &middot; ' +
    (m.ret >= 0 ? '+' : '') + m.ret.toFixed(1) + '%</title></path>';
  const last = mo[mo.length - 1];
  const dots = mo.map(m => dot(m, 6, m.ret >= 0 ? cv('--gruen') : cv('--holz'), '.8')).join('');
  const up = mo.filter(m => m.ret >= 0).length;
  return '<div class="rw">' + numsRow([
    [Math.round(last.hit) + '%', 'hit now'],
    [last.pay.toFixed(2) + 'x', 'payoff now', last.hit / 100 > 1 / (1 + last.pay) ? 'up' : 'dn'],
    [Math.round(up / mo.length * 100) + '%', 'months up', up / mo.length >= 0.5 ? 'up' : 'dn'],
    [mo.length, 'months']]) +
    '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg">' +
    gridSvg(W, H, pad) +
    '<path d="' + curve + '" fill="none" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>' +
    dots + dot(last, 12, cv('--gold'), '.45') + dot(last, 6, last.ret >= 0 ? cv('--gruen') : cv('--holz'), '1') + '</svg>' +
    '<i class="rw-t" style="top:0">100%</i><i class="rw-t" style="top:50%">50%</i><i class="rw-t" style="bottom:0">0%</i></div>' +
    xRow(['0x', (pMax / 2).toFixed(1) + 'x', pMax.toFixed(1) + 'x']) +
    '<p class="hb-foot">each dot = one month &middot; dashed = break-even &middot; above it the mix earns &middot; gold halo = latest</p></div>';
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
  const r = e.target.getBoundingClientRect();
  const vb = (e.target.getAttribute('viewBox') || '0 0 300 120').split(' ');
  const k = Math.max(1, r.width / +vb[2] + r.height / +vb[3]);
  e.target.querySelectorAll('path[fill="none"]:not([stroke-dasharray])').forEach((p, i) => {
    const L = p.getTotalLength() * k; if (!L) return;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    p.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1) ' + (i * .18) + 's';
    p.addEventListener('transitionend', () => { p.style.cssText = ''; }, {once: true});
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

const MEGA_VIEWS = [
  ['monthly returns', (d) => monthGrid(d.monthly || monthlyFromEquity((d.series || {}).equity))],
  ['daily returns', (d) => distSvg(eqReturns(d, t => Math.floor(t / 864e5)), '%', 'days')],
  ['drawdown', (d) => drawdownSvg((d.series || {}).equity)],
  ['hit ratio', (d) => hitRatioSvg(dayStats(d))],
  ['gain vs loss', (d) => winLossSvg((d.series || {}).equity)],
  ['payoff', (d) => payoffSvg(dayStats(d))],
  ['sharpe', (d) => sharpeSvg(dayStats(d))],
  ['calmar', (d) => calmarSvg(dayStats(d))],
  ['edge map', (d) => edgeMapSvg((d.series || {}).equity)],
  ['open positions', (d) => bookView(d)],
  ['recent trades', (d, u) => tradesView(d, u)],
];

function renderMega(containerId, d, unit, hide){
  const el = document.getElementById(containerId); if (!el) return;
  unit = unit || 'R';
  const views = MEGA_VIEWS.filter(([lab]) => !hide || hide.indexOf(lab) < 0)
    .map(([lab, fn]) => [lab, fn(d, unit)])
    .filter(v => v[1] && v[1].indexOf('an-empty') < 0);
  if (!views.length){ el.innerHTML = svgEmpty('live data unavailable — check back shortly'); return; }
  el.innerHTML = '<div class="mega-head"><h5 class="an-h">analytics</h5>' +
    '<select class="temp-sel mega-sel" aria-label="statistic">' + views.map((v, i) =>
      '<option value="' + i + '">' + v[0] + '</option>').join('') + '</select></div>' +
    '<div class="mega-body"></div>';
  const body = el.querySelector('.mega-body'), sel = el.querySelector('.mega-sel');
  const draw = i => {
    body.innerHTML = views[i][1];
    const nums = body.querySelector('.rw-nums'), foot = body.querySelector('.hb-foot');
    if (nums && foot) foot.appendChild(nums);
    chartTips(body);
    if (drawIO) body.querySelectorAll('svg.an-svg').forEach(sv => drawIO.observe(sv));
  };
  sel.addEventListener('change', () => draw(+sel.value));
  draw(0);
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
  const spxLine = spx.length ? '<path d="' + path(spx) + '" fill="none" stroke="' + cv('--silber') + '" stroke-width="1.2" stroke-opacity=".8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' : '';
  svg.innerHTML = '<defs><linearGradient id="pg-' + P.k + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".22"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
    gridSvg(W, Hh, pad) + baseLine + '<path class="eq-area" d="' + area + '" fill="url(#pg-' + P.k + ')"/>' + spxLine +
    '<path class="eq-line" d="' + dp + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
    '<line class="tip-x" x1="0" x2="0" y1="' + pad + '" y2="' + (Hh - pad) + '" stroke="' + cv('--silber') + '" stroke-opacity=".55" stroke-dasharray="2 3" visibility="hidden"/>';
  const box = svg.closest('.perf');
  const swatch = box && box.querySelector('.lg-a');
  if (swatch) swatch.style.background = col;
  let ylab = box && box.querySelector('.perf-ylab');
  if (box && !ylab){ ylab = document.createElement('div'); ylab.className = 'perf-ylab'; box.insertBefore(ylab, svg); }
  if (ylab){
    const pct = v => (v >= 100 ? '+' : '') + (v - 100).toFixed(0) + '%';
    ylab.innerHTML = '<i class="rw-t" style="top:0">' + pct(y1) + '</i>' +
      '<i class="rw-t" style="top:50%">' + pct((y0 + y1) / 2) + '</i>' +
      '<i class="rw-t" style="bottom:0">' + pct(y0) + '</i>';
  }
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
      renderMega(P.an, d, P.unit, P.hideMega);
    })
    .catch(() => {
      const an = document.getElementById(P.an);
      if (an) an.innerHTML = svgEmpty('live data unavailable — check back shortly');
      if (note) note.textContent = 'data unavailable';
    });
}
mount({svg:'perfSvg', note:'perfNote', k:'st', an:'stAn', url:'websiteData/alpaca.json', unit:'%',
  hideMega:['open positions','recent trades']});
mount({svg:'wperfSvg', note:'wperfNote', k:'wst', an:'wAn', url:'websiteData/wikifolio.json', freshMs:30*3600*1000, unit:'%',
  hideMega:['edge map'],
  rows:[['Ret','total_return_pct','pct'],['Yr','one_year_pct','pct'],['Pa','annualized_pct','pct'],['DD','max_drawdown_pct','pct'],['Vol','volatility_pct','plain','%'],['Cap','invested_keur','plain','k€']]});

document.querySelectorAll('.sol-radio').forEach(r => {
  r.addEventListener('change', () => {
    document.querySelectorAll('.sol-vid video').forEach(v => {
      v.getBoundingClientRect().height > 0 ? v.play().catch(() => {}) : v.pause();
    });
  });
});

const contactForm = document.getElementById('contactForm');
if (contactForm) contactForm.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(contactForm);
  location.href = 'mailto:maloutrading@web.de?subject=' + encodeURIComponent('Message from ' + f.get('name')) +
    '&body=' + encodeURIComponent(f.get('msg') + '\n\n— ' + f.get('name') + ' · ' + f.get('email'));
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
function tempMedian(vals){
  const s = vals.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}
const axisDate = (t, spanMs) => new Date(t).toLocaleDateString('en-US',
  spanMs > 3 * 365 * 864e5 ? { year: 'numeric' } : { month: 'short', year: 'numeric' });
function tempAxis(el, t0, t1, ticks){
  if (!el) return;
  const n = ticks || 5;
  el.innerHTML = Array.from({ length: n }, (_, i) => i / (n - 1)).map(f => '<span style="left:' + (f * 100) + '%">' +
    axisDate(t0 + (t1 - t0) * f, t1 - t0) + '</span>').join('');
}
function tempPlot(svgId, axisId, series, unit, ticks){
  const svg = tempEl(svgId);
  if (!svg) return;
  const wrap = svg.parentElement;
  const ylabs = wrap.classList.contains('temp-plot') ? wrap.querySelectorAll('.temp-ylab') : [];
  const live = series.filter(s => Array.isArray(s.pts) && s.pts.length > 1);
  if (!live.length){ svg.innerHTML = ''; svg._tip = null; ylabs.forEach(el => el.innerHTML = '');
    tempAxis(tempEl(axisId), Date.now(), Date.now(), ticks); return; }
  const W = 600, H = 220, pad = 10;
  const t0 = Math.min(...live.map(s => s.pts[0][0])), t1 = Math.max(...live.map(s => s.pts[s.pts.length - 1][0]));
  const X = t => pad + (t1 > t0 ? (t - t0) / (t1 - t0) : 0) * (W - 2 * pad);
  const grid = gridSvg(W, H, pad);
  const gkey = s => s.group || 's' + live.indexOf(s);
  const doms = new Map();
  live.forEach(s => {
    if (!doms.has(gkey(s))) doms.set(gkey(s), { vals: [], color: s.color });
    doms.get(gkey(s)).vals.push(...s.pts.map(p => p[1]));
  });
  doms.forEach(d => {
    const lo = Math.min(...d.vals), hi = Math.max(...d.vals), room = (hi - lo) * .07 || 1;
    d.lo = lo >= 0 ? Math.max(0, lo - room) : lo - room; d.hi = hi + room;
  });
  const body = live.map(s => {
    const d = doms.get(gkey(s));
    const Y = v => H - pad - (v - d.lo) / (d.hi - d.lo) * (H - 2 * pad);
    return '<path d="' + s.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') +
      '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 2) + '" stroke-opacity="' + (s.opacity || 1) +
      '" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>';
  }).join('');
  svg.innerHTML = grid + body;
  tempAxis(tempEl(axisId), t0, t1, ticks);
  const dlist = [...doms.values()];
  const fine = v => Math.abs(v) < 10 ? 2 : 1;
  const fmtY = v => Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(fine(v));
  [0, 1].forEach(k => { const el = ylabs[k]; if (!el) return;
    const d = dlist[k];
    el.innerHTML = d ? [0, .25, .5, .75, 1].map(f => '<span style="top:' + ((pad + f * (H - 2 * pad)) / H * 100).toFixed(1) + '%' +
      (dlist.length > 1 ? ';color:' + d.color : '') + '">' + fmtY(d.hi - f * (d.hi - d.lo)) + '</span>').join('') : '';
  });
  const cross = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  cross.setAttribute('y1', pad); cross.setAttribute('y2', H - pad);
  cross.setAttribute('stroke', cv('--silber')); cross.setAttribute('stroke-opacity', '.55');
  cross.setAttribute('stroke-dasharray', '2 3'); cross.setAttribute('vector-effect', 'non-scaling-stroke');
  cross.setAttribute('visibility', 'hidden');
  svg.appendChild(cross);
  svg._cross = cross;
  const N = Math.min(100, Math.max(...live.map(s => s.pts.length)));
  const gridT = Array.from({ length: N }, (_, i) => t0 + (t1 - t0) * (N > 1 ? i / (N - 1) : 0));
  const tol = (t1 - t0) / Math.max(1, N) * 2;
  const samp = s => { let j = 0; return gridT.map(t => {
    while (j < s.pts.length - 1 && Math.abs(s.pts[j + 1][0] - t) <= Math.abs(s.pts[j][0] - t)) j++;
    return Math.abs(s.pts[j][0] - t) > tol ? null : +s.pts[j][1].toFixed(fine(s.pts[j][1])); }); };
  svg._tip = { u: unit || '',
    x: gridT.map(t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })),
    s: live.filter(s => s.name).map(s => ({ n: s.name, c: s.color, v: samp(s) })) };
  if (!svg._hover){
    svg._hover = true;
    let tip = wrap.querySelector('.perf-tip');
    if (!tip){ tip = document.createElement('div'); tip.className = 'perf-tip'; wrap.appendChild(tip); }
    svg.addEventListener('pointermove', e => {
      const td = svg._tip;
      if (!td || !td.s.length) return;
      const r = svg.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const n = td.x.length;
      const i = Math.round(Math.min(1, Math.max(0, (frac * W - pad) / (W - 2 * pad))) * (n - 1));
      const x = pad + (n > 1 ? i / (n - 1) : 0) * (W - 2 * pad);
      svg._cross.setAttribute('x1', x.toFixed(1)); svg._cross.setAttribute('x2', x.toFixed(1));
      svg._cross.setAttribute('visibility', 'visible');
      tip.innerHTML = '<b>' + escapeHtml(td.x[i] || '') + '</b>' + td.s.map(s => s.v[i] == null ? '' :
        '<span><i style="background:' + escapeHtml(s.c) + '"></i>' + escapeHtml(s.n) + ' ' + s.v[i] + escapeHtml(td.u) + '</span>').join('');
      tip.style.left = Math.min(r.width - 60, Math.max(60, frac * r.width)) + 'px';
      tip.style.display = 'block';
    });
    svg.addEventListener('pointerleave', () => { tip.style.display = 'none'; if (svg._cross) svg._cross.setAttribute('visibility', 'hidden'); });
  }
}
function tempLegend(id, items){
  const el = tempEl(id);
  if (el) el.innerHTML = items.map(i => '<span class="temp-leg"><i style="background:' + i.color + ';opacity:' + (i.opacity || 1) + '"></i>' +
    escapeHtml(i.name) + (i.value ? '<b>' + i.value + '</b>' : '') + '</span>').join('');
}

function renderRisk(){
  const years = +tempVal('tempRiskRange') || 3;
  const gpr = tempCut(tempData.gpr, years * 365), epu = tempCut(tempData.epu, years * 365);
  const col = (pts, c) => pts.map(p => [p[0], p[c]]);
  const last = pts => pts.length ? pts[pts.length - 1][1] : null;
  const series = [
    { name: 'geopolitical risk', pts: col(gpr, 1), color: cv('--flieder'), width: 2.2, group: 'gpr' },
    { name: 'policy uncertainty', pts: col(epu, 1), color: cv('--gold'), width: 2.2, group: 'epu' }
  ].filter(s => s.pts.length > 1);
  tempLegend('tempRiskLegend', series.map(s => ({ name: s.name, color: s.color,
    value: Math.round(last(s.pts)) })));
  tempPlot('tempRiskSvg', 'tempRiskAxis', series, ' index');
}

function renderGates(){
  const gates = tempData.chokepoints || [], sel = tempEl('tempGateSel');
  if (!gates.length){ tempLegend('tempGateLegend', []); tempPlot('tempGateSvg', 'tempGateAxis', []); return; }
  if (sel && !sel.options.length){
    sel.innerHTML = '<option value="all">all gates</option>' +
      gates.map(g => '<option value="' + g.key + '">' + escapeHtml(g.name) + '</option>').join('');
    sel.value = gates[0].key;
  }
  const pick = tempVal('tempGateSel') || 'all';
  const pal = [cv('--flieder'), cv('--gold'), cv('--silber'), cv('--gruen'), cv('--ab'), cv('--muted')];
  const shown = pick === 'all' ? gates : gates.filter(g => g.key === pick);
  const series = shown.map((g, i) => ({ name: g.name, color: pal[i % pal.length], width: 2,
    pts: tempSmooth(g.series, 7) }));
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
  tempPlot('tempGateSvg', 'tempGateAxis', plotted, pick === 'all' ? '% of normal' : ' ships/day');
}

const predStop = new Set(['will', 'when', 'what', 'which', 'before', 'after', 'above', 'below', 'under', 'over',
  'reach', 'price', 'market', 'than', 'this', 'that', 'with', 'from', 'into', 'during', 'between', 'there',
  'more', 'less', 'many', 'much', 'other', 'some', 'have', 'been', 'were', 'make', 'made', 'next', 'first',
  'high', 'higher', 'year', 'month', 'week', 'close', 'value', 'wins', 'january', 'february', 'march', 'april',
  'june', 'july', 'august', 'september', 'october', 'november', 'december', '2025', '2026', '2027']);
const predTopic = q => new Set((q || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter(w => w.length >= 4 && !predStop.has(w)));
function renderPredictions(){
  const box = tempEl('tempPred');
  if (!box) return;
  const tag = (list, venue) => (list || []).map(m => Object.assign({ venue: venue }, m));
  const all = tag(tempData.polymarket, 'Polymarket').concat(tag(tempData.kalshi, 'Kalshi'))
    .sort((a, b) => (b.vol || 0) - (a.vol || 0));
  const rows = [], topics = [];
  const overlap = (a, b) => [...a].some(w => [...b].some(v => v.startsWith(w) || w.startsWith(v)));
  for (const m of all){
    const t = predTopic(m.question || m.title);
    if (topics.some(s => overlap(t, s))) continue;
    rows.push(m); topics.push(t);
    if (rows.length === 7) break;
  }
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

const marketData = {};
const mkFmt = v => v.toLocaleString('en-US', { maximumFractionDigits: Math.abs(v) < 10 ? 4 : 2 });
function mkChg(s, from, to){
  if (s.bp){
    const bp = Math.round((to - from) * 100);
    return { txt: (bp >= 0 ? '+' : '') + bp + 'bp', up: bp >= 0 };
  }
  const pct = from ? (to / from - 1) * 100 : 0;
  return { txt: (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%', up: pct >= 0 };
}
function mkCandles(svgId, axisId, pts){
  const svg = tempEl(svgId);
  if (!svg) return;
  const ylab = svg.parentElement.querySelector('.temp-ylab');
  if (!pts || pts.length < 2){
    svg.innerHTML = ''; if (ylab) ylab.innerHTML = '';
    tempAxis(tempEl(axisId), Date.now(), Date.now(), 3); return;
  }
  const W = 600, H = 220, pad = 6;
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
  const X = t => pad + (t1 > t0 ? (t - t0) / (t1 - t0) : 0) * (W - 2 * pad);
  const lo = Math.min(...pts.map(p => p[3])), hi = Math.max(...pts.map(p => p[2]));
  const room = (hi - lo) * .08 || 1, domLo = lo >= 0 ? Math.max(0, lo - room) : lo - room, domHi = hi + room;
  const Y = v => H - pad - (v - domLo) / (domHi - domLo) * (H - 2 * pad);
  const stepX = (W - 2 * pad) / (pts.length - 1);
  const bw = Math.max(.6, Math.min(5, stepX * .62));
  const col = cv('--gold');
  let body = gridSvg(W, H, pad);
  pts.forEach(p => {
    const x = X(p[0]), o = p[1], h = p[2], l = p[3], c = p[4];
    body += '<line x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + Y(h).toFixed(1) + '" y2="' + Y(l).toFixed(1) +
      '" stroke="' + col + '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
    const yTop = Y(Math.max(o, c)), yBot = Y(Math.min(o, c));
    body += '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + yTop.toFixed(1) + '" width="' + bw.toFixed(1) +
      '" height="' + Math.max(.6, yBot - yTop).toFixed(1) + '" fill="none" stroke="' + col +
      '" stroke-width="1" vector-effect="non-scaling-stroke"/>';
  });
  svg.innerHTML = body;
  tempAxis(tempEl(axisId), t0, t1, 3);
  if (ylab){
    const fmt = v => Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(Math.abs(v) < 10 ? 2 : 1);
    ylab.innerHTML = [0, .5, 1].map(f => '<span style="top:' + ((pad + f * (H - 2 * pad)) / H * 100).toFixed(1) + '%">' +
      fmt(domHi - f * (domHi - domLo)) + '</span>').join('');
  }
}
function drawMarkets(){
  const ytdFrom = Date.UTC(new Date().getUTCFullYear(), 0, 1);
  (marketData.series || []).forEach(s => {
    const pts = s.pts;
    if (!pts || pts.length < 2) return;
    const last = pts[pts.length - 1][4];
    const range = mkChg(s, pts[0][4], last);
    const val = tempEl('mkVal-' + s.key), delta = tempEl('mkChg-' + s.key), ytd = tempEl('mkYtd-' + s.key);
    if (val) val.textContent = mkFmt(last) + s.unit;
    if (delta){
      delta.textContent = (range.up ? '▲ ' : '▼ ') + range.txt;
      delta.className = 'temp-delta ' + (range.up ? 'up' : 'dn');
    }
    if (ytd){
      const yearPts = pts.filter(p => p[0] >= ytdFrom);
      const ySeries = yearPts.length > 1 ? yearPts : pts.slice(-2);
      const y = mkChg(s, ySeries[0][4], ySeries[ySeries.length - 1][4]);
      ytd.innerHTML = '(YTD <span class="' + (y.up ? 'up' : 'dn') + '">' + y.txt + '</span>)';
    }
    mkCandles('mkSvg-' + s.key, 'mkAxis-' + s.key, pts);
  });
}
function renderMarkets(d){
  const box = tempEl('mkGrid');
  if (!box) return;
  (d.series || []).forEach(s => s.pts = (s.pts || []).map(p => [p[0] * 864e5, p[1], p[2], p[3], p[4]]));
  Object.assign(marketData, d);
  const live = (d.series || []).filter(s => Array.isArray(s.pts) && s.pts.length > 1);
  if (!live.length){ box.innerHTML = svgEmpty('live data unavailable — check back shortly'); return; }
  box.innerHTML = live.map(s => '<div class="mk-tile"><div class="mk-head"><span class="mk-name">' +
    escapeHtml(s.name) + '</span><span class="mk-tag">' + escapeHtml(s.tag) + '</span></div>' +
    '<div class="mk-val"><b id="mkVal-' + s.key + '">–</b><span id="mkChg-' + s.key + '"></span></div>' +
    '<div class="mk-ytd" id="mkYtd-' + s.key + '"></div>' +
    '<div class="temp-plot"><i class="temp-ylab temp-yl"></i>' +
    '<svg class="temp-svg mk-svg" id="mkSvg-' + s.key + '" viewBox="0 0 600 220" preserveAspectRatio="none"></svg></div>' +
    '<div class="temp-axis" id="mkAxis-' + s.key + '"></div>' +
    '<p class="temp-src mk-src">' + escapeHtml(s.src) + '</p></div>').join('');
  drawMarkets();
}
fetchT('websiteData/markets.json?' + bust, 10000)
  .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
  .then(renderMarkets)
  .catch(() => { const box = tempEl('mkGrid');
    if (box) box.innerHTML = svgEmpty('live data unavailable — check back shortly'); });

function renderTemperature(d){
  Object.assign(tempData, d);
  renderRisk(); renderGates(); renderPredictions();
  const upd = tempEl('tempUpdated');
  if (upd) upd.textContent = d.updated ? 'updated ' + fmtAge(d.updated) : '';
}
[['tempRiskRange', renderRisk], ['tempGateSel', renderGates]]
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

