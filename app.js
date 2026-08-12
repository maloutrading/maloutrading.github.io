const hd = document.getElementById('hd'), prog = document.getElementById('prog'),
      body = document.body, docEl = document.documentElement;
let lastY = 0, ticking = false;
function apply(){
  const y = scrollY, home = body.classList.contains('home');
  hd.classList.toggle('solid', y > 40 || !home);
  hd.classList.remove('away');                       // header stays pinned on scroll
  body.classList.toggle('atbottom', innerHeight + y >= docEl.scrollHeight - 60);
  const denom = docEl.scrollHeight - innerHeight;
  const frac = denom > 4 ? Math.min(1, y / denom) : 0;
  prog.style.width = frac * 100 + '%';               // progress bar = header's bottom edge
  updateRib(); updateSolVids(); updateTopVid();
  lastY = y; ticking = false;
}
// section title (trade/news/team): letters assemble as it scrolls into the reading zone, fade slightly leaving the top
// section-video: sanftes parallax ueber object-position (kein transform -> kein kenburns-konflikt)
function updateTopVid(){
  const tv = document.querySelector('main .tab.show .topvid video'); if(!tv) return;
  const r = tv.parentElement.getBoundingClientRect(); if(!r.height) return;
  let pgs = -r.top / r.height; pgs = pgs<-1?-1:pgs>1?1:pgs;
  tv.style.objectPosition = 'center calc(50% + ' + (pgs*7).toFixed(2) + '%)';
}
// solutions-videos: wie ein tab im tab — beim Hochscrollen sanft ausfaden
function updateSolVids(){
  document.querySelectorAll('.sol-vid').forEach(el => {
    const r = el.getBoundingClientRect(); if(!r.height) return;
    const c = r.top + r.height/2;
    let o = c / (innerHeight*0.33); o = o<0?0:o>1?1:o;   // Mitte oberhalb 33% vh -> ausgefadet
    el.style.opacity = (0.08 + 0.92*o).toFixed(3);
  });
}
function updateRib(){
  const sec = document.querySelector('main .tab.show'); if(!sec) return;
  const t = sec.querySelector('.rib-title'); if(!t) return;
  const vh = innerHeight, r = t.getBoundingClientRect(), c = r.top + r.height/2;
  let a = (vh - c) / (vh*0.35); a = a<0?0:a>1?1:a;   // scattered below → assembled at 65% vh
  let f = (vh*0.14 - c) / (vh*0.14); f = f<0?0:f>1?1:f; // fade only near the top edge
  t.style.setProperty('--asm', a.toFixed(3));
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
  const ready = () => v.classList.add('ready');
  v.readyState >= 2 ? ready() : v.addEventListener('loadeddata', ready, {once:true});
});

const TITLES = {home:'malou trading', team:'team - malou trading', trade:'trade - malou trading', news:'news - malou trading'};
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
  if (id === 'team') initWx();
  document.title = TITLES[id] || (id + ' - malou trading');
  if (push !== false){ try { history.pushState({id}, '', '#' + id); } catch(e){} }
  scrollTo(0, 0);
  apply();
  el.querySelectorAll('.reveal').forEach(x => io.observe(x));
}
addEventListener('popstate', () => show((location.hash || '#home').slice(1), false));

// delegated nav (buttons/links carry data-nav="<tab id>" instead of inline onclick — CSP script-src 'self' friendly)
document.addEventListener('click', e => {
  const el = e.target.closest('[data-nav]');
  if (!el) return;
  e.preventDefault();
  show(el.dataset.nav);
});

// portrait fallback: show initials until the photo actually loads, drop broken images cleanly
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
let wxDone = 0;
function wxWord(c){ if(c==null)return'-'; if(c===0)return'clear'; if(c<3)return'fair'; if(c<45)return'cloudy'; if(c<50)return'overcast'; if(c<57)return'fog'; if(c<68)return'rain'; if(c<78)return'snow'; if(c<83)return'showers'; return'storm'; }
function initWx(){
  if(wxDone) return; wxDone = 1;
  const el = document.getElementById('wx'); if(!el) return;
  fetchT('https://api.open-meteo.com/v1/forecast?latitude=53.55&longitude=9.99&current=temperature_2m,weather_code&timezone=Europe%2FBerlin')
    .then(r => r.json()).then(d => {
      const c = d.current || {}, t = Math.round(c.temperature_2m);
      if(isNaN(t)) throw 0;
      el.textContent = 'Hamburg - ' + t + 'C - ' + wxWord(c.weather_code); el.hidden = false;
    }).catch(() => { wxDone = 0; });
}

(function(){
  if(reduce || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const ring = document.querySelector('.cur.ring'), dot = document.querySelector('.cur.dot');
  if(!ring || !dot) return;
  let rx = innerWidth/2, ry = innerHeight/2, tx = rx, ty = ry, on = 0;
  const hot = 'a,button,input,textarea,[data-nav]';
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY; dot.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    if(!on){ on = 1; ring.style.opacity = dot.style.opacity = '1'; }
  }, {passive:true});
  addEventListener('pointerdown', () => ring.classList.add('down'));
  addEventListener('pointerup', () => ring.classList.remove('down'));
  addEventListener('pointerover', e => { if(e.target.closest && e.target.closest(hot)) ring.classList.add('hot'); }, {passive:true});
  addEventListener('pointerout', e => { if(e.target.closest && e.target.closest(hot)) ring.classList.remove('hot'); }, {passive:true});
  (function loop(){ rx += (tx-rx)*.18; ry += (ty-ry)*.18; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; requestAnimationFrame(loop); })();
})();

// swipe between ribbons (native browser back/forward arrows disabled via overscroll-behavior-x)
const SWIPE = ['home','team','news','trade'];
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
  // plausibility filter for return/drawdown series (both are percentages, bounded)
  if(!Array.isArray(pts)) return [];
  return pts.filter(p => Array.isArray(p) && p.length >= 2
    && typeof p[0] === 'number' && isFinite(p[0])
    && typeof p[1] === 'number' && isFinite(p[1]) && p[1] > -100 && p[1] < 1000);
}
function sanitizeEquity(pts){
  // equity is a dollar value, not a percentage — only rule out negative/non-finite noise
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
function cv(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name; }
function svgEmpty(msg){ return '<p class="an-empty">' + msg + '</p>'; }

function rHistSvg(trades){
  const rs = (trades || []).map(t => t.r).filter(v => typeof v === 'number' && isFinite(v));
  if (rs.length < 3) return svgEmpty('not enough closed trades yet');
  const lo = Math.min(...rs), hi = Math.max(...rs);
  const mn = Math.min(lo, -1), mx = Math.max(hi, 1), n = 8, w = (mx - mn) / n || 1;
  const bins = new Array(n).fill(0);
  rs.forEach(v => { let i = Math.floor((v - mn) / w); if (i >= n) i = n - 1; if (i < 0) i = 0; bins[i]++; });
  const maxC = Math.max(...bins, 1);
  const avg = rs.reduce((a, b) => a + b, 0) / rs.length;
  const wins = rs.filter(v => v > 0).length;
  const bars = bins.map((c, i) => {
    const a = mn + w * i, b = a + w;
    return '<i class="rh-col ' + (a + w / 2 >= 0 ? 'up' : 'dn') + '" title="' + a.toFixed(2) + 'R to ' + b.toFixed(2) + 'R · ' + c + ' trades">' +
      '<b>' + (c || '') + '</b><u style="height:' + (c / maxC * 100).toFixed(1) + '%"></u></i>';
  }).join('');
  const zeroPct = ((0 - mn) / (mx - mn || 1)) * 100;
  return '<div class="rh"><div class="rh-bars"><em class="rh-zero" style="left:' + zeroPct.toFixed(1) + '%"></em>' + bars + '</div>' +
    '<div class="rh-axis"><span>' + mn.toFixed(1) + 'R</span><span class="rh-zero-tag" style="left:' + zeroPct.toFixed(1) + '%">0</span><span>+' + mx.toFixed(1) + 'R</span></div>' +
    '<div class="rh-foot"><span><b>' + rs.length + '</b> trades</span><span><b class="' + (avg >= 0 ? 'up' : 'dn') + '">' + (avg >= 0 ? '+' : '') + avg.toFixed(2) + 'R</b> avg</span>' +
    '<span><b class="up">+' + hi.toFixed(2) + 'R</b> best</span><span><b class="dn">' + lo.toFixed(2) + 'R</b> worst</span>' +
    '<span><b>' + wins + '</b> / ' + (rs.length - wins) + ' win&nbsp;·&nbsp;loss</span></div></div>';
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

function rollingWinSvg(trades){
  const list = (trades || []).filter(t => typeof t.r === 'number' && isFinite(t.r));
  if (list.length < 6) return svgEmpty('not enough closed trades yet');
  const win = Math.max(5, Math.min(10, Math.floor(list.length / 2)));
  const vals = [];
  for (let i = win - 1; i < list.length; i++) vals.push(list.slice(i - win + 1, i + 1).filter(t => t.r > 0).length / win * 100);
  const now = vals[vals.length - 1], avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const W = 300, H = 120, pad = 5;
  const X = i => pad + (vals.length > 1 ? i / (vals.length - 1) : 0) * (W - 2 * pad);
  const Y = v => H - pad - v / 100 * (H - 2 * pad);
  const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  return '<div class="rw"><div class="rw-nums"><span><b class="' + (now >= 50 ? 'up' : 'dn') + '">' + Math.round(now) + '%</b>now</span>' +
    '<span><b>' + Math.round(avg) + '%</b>average</span><span><b>' + Math.round(Math.min(...vals)) + '&ndash;' + Math.round(Math.max(...vals)) + '%</b>range</span>' +
    '<span><b>' + win + '</b>trade window</span></div>' +
    '<div class="rw-plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg">' +
    '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(50).toFixed(1) + '" y2="' + Y(50).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="2 3"/>' +
    '<path d="' + d + '" fill="none" stroke="' + cv('--gruen') + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>' +
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
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg">' +
    '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + mid + '" y2="' + mid + '" stroke="var(--line)" stroke-dasharray="2 3"/>' +
    '<path d="' + path(longs) + '" fill="none" stroke="var(--gruen)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
    '<path d="' + path(shorts) + '" fill="none" stroke="var(--holz)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>';
}

function callout(label, t){
  if (!t || typeof t.r !== 'number') return '';
  return '<div class="callout"><span class="callout-label">' + label + '</span><b>' + escapeHtml(t.symbol) + '</b>' +
    '<span class="callout-r ' + (t.r >= 0 ? 'up' : 'dn') + '">' + (t.r >= 0 ? '+' : '') + t.r.toFixed(2) + 'R</span>' +
    '<span class="callout-date">' + escapeHtml(String(t.ts || '').slice(0, 10)) + '</span></div>';
}

function fmtAge(ms){
  if (!ms) return '';
  const s = (Date.now() - ms) / 1000;
  if (s < 90) return Math.max(0, Math.round(s)) + 's ago';
  if (s < 5400) return Math.round(s / 60) + 'm ago';
  if (s < 172800) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}

// live open-book: what each bot holds right now (mirrors the telegram Book) + realized edge
function bookHtml(d){
  const b = Array.isArray(d.book) ? d.book : [];
  const s = d.stats || {};
  const edge = (typeof s.expectancy_r === 'number')
    ? '<span class="book-edge">edge ' + (s.expectancy_r >= 0 ? '+' : '') + s.expectancy_r.toFixed(2) + 'R/trade</span>' : '';
  const head = '<div class="book-head"><h5 class="an-h">open now' + (b.length ? ' (' + b.length + ')' : '') + '</h5>' + edge + '</div>';
  if (!b.length) return '<div class="an-card book-card">' + head + '<p class="book-empty">flat &mdash; no open positions</p></div>';
  const rows = b.map(p => {
    const up = (p.pnl || 0) >= 0;
    return '<div class="book-row"><span class="book-side ' + (p.side === 'long' ? 'long' : 'short') + '">' +
      (p.side === 'long' ? 'L' : 'S') + '</span><span class="book-sym">' + escapeHtml(p.sym) + '</span>' +
      '<span class="book-pnl ' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '') + (p.pnl || 0).toFixed(1) + '%</span></div>';
  }).join('');
  return '<div class="an-card book-card">' + head + '<div class="book-rows">' + rows + '</div></div>';
}

// recent closed trades = the track record (date · ticker · side · R). R-multiple only, no $ (kept private).
function tradesHtml(d){
  const t = Array.isArray(d.trades_detail) ? d.trades_detail.slice(-7).reverse() : [];
  if (!t.length) return '';
  const rows = t.map(x => {
    const up = (x.r || 0) >= 0;
    return '<div class="trade-row"><span class="trade-date">' + escapeHtml(String(x.ts || '').slice(5, 10)) + '</span>' +
      '<span class="trade-side ' + (x.side === 'long' ? 'long' : 'short') + '">' + (x.side === 'long' ? 'L' : 'S') + '</span>' +
      '<span class="trade-sym">' + escapeHtml(x.symbol || '') + '</span>' +
      '<span class="trade-r ' + (up ? 'up' : 'dn') + '">' + (up ? '+' : '') + (x.r || 0).toFixed(2) + 'R</span></div>';
  }).join('');
  return '<div class="an-card trades-card"><h5 class="an-h">recent trades</h5><div class="trade-rows">' + rows + '</div></div>';
}

function renderAnalytics(containerId, d){
  const el = document.getElementById(containerId); if (!el) return;
  const s = d.stats || {};
  const calloutHtml = (s.best_trade || s.worst_trade)
    ? '<div class="an-row an-callouts">' + callout('best trade', s.best_trade) + callout('worst trade', s.worst_trade) + '</div>' : '';
  const grid = '<div class="an-grid">' +
    '<div class="an-card"><h5 class="an-h">R-multiple distribution</h5>' + rHistSvg(d.trades_detail) + '</div>' +
    '<div class="an-card"><h5 class="an-h">daily returns</h5>' + heatGrid((d.series || {}).equity) + '</div>' +
    '<div class="an-card"><h5 class="an-h">rolling win rate</h5>' + rollingWinSvg(d.trades_detail) + '</div>' +
    '<div class="an-card"><h5 class="an-h">long / short exposure</h5>' + exposureSvg(d.exposure) + '</div>' + '</div>';
  const trades = tradesHtml(d);
  const lead = trades ? '<div class="an-row book-trades">' + bookHtml(d) + trades + '</div>' : bookHtml(d);
  el.innerHTML = lead + calloutHtml + grid;
}

const spxP = fetchT('json/spx.json?' + Date.now(), 8000)
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
    baseLine + '<path d="' + area + '" fill="url(#pg-' + P.k + ')"/>' + spxLine +
    '<path d="' + dp + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
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
}

function mount(P){
  const svg = document.getElementById(P.svg); if (!svg) return;
  const note = P.note ? document.getElementById(P.note) : null;
  fetchT(P.url + '?' + Date.now(), 8000)
    .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(d => {
      const s = d.stats || {}, G = (id, v) => { const e = document.getElementById(id); if (!e) return;
        e.textContent = v;
        e.classList.toggle('up', /^\+/.test(v));
        e.classList.toggle('dn', /^-/.test(v)); };
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
      renderAnalytics(P.an, d);
    })
    .catch(() => {
      const an = document.getElementById(P.an);
      if (an) an.innerHTML = svgEmpty('live data unavailable — check back shortly');
      if (note) note.textContent = 'data unavailable';
    });
}
mount({svg:'perfSvg', note:'perfNote', k:'st', an:'stAn', url:'json/alpacaMarkets/alpaca.json'});
mount({svg:'hperfSvg', note:'hperfNote', k:'hst', an:'hAn', url:'json/hyperliquidMarkets/hyperliquid.json'});
mount({svg:'wperfSvg', note:'wperfNote', k:'wst', url:'json/wikifolioMarkets/wikifolio.json', freshMs:30*3600*1000,
  rows:[['Ret','total_return_pct','pct'],['Yr','one_year_pct','pct'],['Pa','annualized_pct','pct'],['DD','max_drawdown_pct','pct'],['Vol','volatility_pct','plain','%'],['Cap','invested_keur','plain','k€']]});

document.querySelectorAll('.sol-radio').forEach(r => {
  r.addEventListener('change', () => {
    document.querySelectorAll('.sol-vid video').forEach(v => {
      v.getBoundingClientRect().height > 0 ? v.play().catch(() => {}) : v.pause();
    });
  });
});
