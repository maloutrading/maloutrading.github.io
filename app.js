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

function lineSvg(pts, color, zeroLine){
  if (pts.length < 2) return svgEmpty('not enough history yet');
  const W = 300, H = 140, pad = 5;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (x0 === x1){ x0 -= 1; x1 += 1; } if (y0 === y1){ y0 -= 1; y1 += 1; }
  const X = x => pad + (x - x0) / (x1 - x0) * (W - 2 * pad);
  const Y = y => H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const zero = (zeroLine && y0 < 0 && y1 > 0)
    ? '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="2 3"/>' : '';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg">' + zero +
    '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>';
}

function rHistSvg(trades){
  const rs = (trades || []).map(t => t.r).filter(v => typeof v === 'number' && isFinite(v));
  if (rs.length < 3) return svgEmpty('not enough closed trades yet');
  const mn = Math.min(...rs, -1), mx = Math.max(...rs, 1), n = 8, w = (mx - mn) / n || 1;
  const bins = new Array(n).fill(0);
  rs.forEach(v => { let i = Math.floor((v - mn) / w); if (i >= n) i = n - 1; if (i < 0) i = 0; bins[i]++; });
  const W = 300, H = 140, pad = 5, axis = 14, maxC = Math.max(...bins, 1), bw = (W - 2 * pad) / n;
  let bars = '';
  for (let i = 0; i < n; i++){
    const h = (bins[i] / maxC) * (H - 2 * pad - axis), x = pad + i * bw, y = H - pad - axis - h;
    const mid = mn + w * (i + 0.5), col = mid >= 0 ? 'var(--gruen)' : 'var(--holz)';
    bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" fill="' + col + '" rx="1.5"/>';
  }
  const zeroX = pad + ((0 - mn) / (mx - mn || 1)) * (W - 2 * pad);
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="an-svg">' + bars +
    '<line x1="' + zeroX.toFixed(1) + '" x2="' + zeroX.toFixed(1) + '" y1="' + pad + '" y2="' + (H - pad - axis) + '" stroke="var(--line)" stroke-dasharray="2 3"/></svg>';
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
  const W = Math.max(5, Math.min(10, Math.floor(list.length / 2)));
  const pts = [];
  for (let i = W - 1; i < list.length; i++){
    const win = list.slice(i - W + 1, i + 1).filter(t => t.r > 0).length;
    pts.push([i, win / W * 100]);
  }
  return lineSvg(pts, cv('--gruen'), false);
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

function gauge(label, val, max, unit){
  const v = (typeof val === 'number' && isFinite(val)) ? val : 0;
  const m = (typeof max === 'number' && isFinite(max) && max > 0) ? max : 1;
  const pct = Math.max(0, Math.min(100, v / m * 100));
  return '<div class="g-item"><div class="g-top"><span>' + label + '</span><span>' + v + (unit || '') + ' / ' + m + (unit || '') + '</span></div>' +
    '<div class="g-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>';
}
function callout(label, t){
  if (!t || typeof t.r !== 'number') return '';
  return '<div class="callout"><span class="callout-label">' + label + '</span><b>' + escapeHtml(t.symbol) + '</b>' +
    '<span class="callout-r ' + (t.r >= 0 ? 'up' : 'dn') + '">' + (t.r >= 0 ? '+' : '') + t.r.toFixed(2) + 'R</span>' +
    '<span class="callout-date">' + escapeHtml(String(t.ts || '').slice(0, 10)) + '</span></div>';
}

function renderAnalytics(containerId, d){
  const el = document.getElementById(containerId); if (!el) return;
  const s = d.stats || {};
  const guardHtml = '<div class="an-row an-guard">' +
    gauge('day risk used', s.day_risk_used_pct, s.day_risk_max_pct, '%') +
    gauge('entries today', s.entries_today, s.entries_max, '') +
    gauge('open positions', s.positions, s.max_positions, '') + '</div>';
  const calloutHtml = (s.best_trade || s.worst_trade)
    ? '<div class="an-row an-callouts">' + callout('best trade', s.best_trade) + callout('worst trade', s.worst_trade) + '</div>' : '';
  const grid = '<div class="an-grid">' +
    '<div class="an-card"><h5 class="an-h">R-multiple distribution</h5>' + rHistSvg(d.trades_detail) + '</div>' +
    '<div class="an-card"><h5 class="an-h">daily returns</h5>' + heatGrid((d.series || {}).equity) + '</div>' +
    '<div class="an-card"><h5 class="an-h">rolling win rate</h5>' + rollingWinSvg(d.trades_detail) + '</div>' +
    '<div class="an-card"><h5 class="an-h">long / short exposure</h5>' + exposureSvg(d.exposure) + '</div>' + '</div>';
  el.innerHTML = guardHtml + calloutHtml + grid;
}

function mount(P){
  const svg = document.getElementById(P.svg); if (!svg) return;
  const note = P.note ? document.getElementById(P.note) : null;
  fetchT(P.url + '?' + Date.now(), 8000)
    .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(d => {
      const s = d.stats || {}, G = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      G(P.k + 'Ret', fmtPct(s.total_return_pct));
      G(P.k + 'Win', fmtPlain(s.win_rate_pct, '%'));
      G(P.k + 'Tr', fmtPlain(s.trades, ''));
      G(P.k + 'DD', fmtPct(s.max_drawdown_pct));
      G(P.k + 'AW', typeof s.avg_win_r === 'number' ? fmtPlain(s.avg_win_r, 'R') : fmtPct(s.avg_win_pct));
      G(P.k + 'PO', fmtPlain(s.payoff, 'x'));
      const sel = document.getElementById(P.sel), title = document.getElementById(P.title);
      function draw(key){
        const pts = sanitizeSeries((d.series || {})[key] || []);
        if (title && sel) title.textContent = sel.options[sel.selectedIndex].text.split(' ')[0];
        if (pts.length < 2){ svg.innerHTML = ''; return; }
        const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
        let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        if (y0 === y1){ y0 -= 1; y1 += 1; }
        const W = 600, Hh = 300, pad = 6;
        const X = x => pad + (x - x0) / (x1 - x0) * (W - 2 * pad);
        const Y = y => Hh - pad - (y - y0) / (y1 - y0) * (Hh - 2 * pad);
        const dp = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
        const area = dp + ' L' + X(x1).toFixed(1) + ' ' + Hh + ' L' + X(x0).toFixed(1) + ' ' + Hh + ' Z';
        const up = ys[ys.length - 1] >= ys[0], col = key === 'drawdown' ? cv('--holz') : (up ? cv('--gruen') : cv('--holz'));
        const zero = (key !== 'equity' && y0 < 0 && y1 > 0)
          ? '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 4"/>' : '';
        svg.innerHTML = '<defs><linearGradient id="pg-' + P.k + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".22"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
          zero + '<path d="' + area + '" fill="url(#pg-' + P.k + ')"/><path d="' + dp + '" fill="none" stroke="' + col + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>';
      }
      if (sel) sel.addEventListener('change', () => draw(sel.value));
      draw('return');
      renderAnalytics(P.an, d);
    })
    .catch(() => {
      const an = document.getElementById(P.an);
      if (an) an.innerHTML = svgEmpty('live data unavailable — check back shortly');
      if (note) note.textContent = 'data unavailable';
    });
}
mount({svg:'perfSvg', sel:'perfSel', title:'perfTitle', note:'perfNote', k:'st', an:'stAn', url:'alpaca.json'});
mount({svg:'kperfSvg', sel:'kperfSel', title:'kperfTitle', note:null, k:'kst', an:'kstAn', url:'kalshi.json'});
mount({svg:'hperfSvg', sel:'hperfSel', title:'hperfTitle', note:'hperfNote', k:'hst', an:'hAn', url:'hyperliquid.json'});

function renderCompare(){
  const svg = document.getElementById('compareSvg'), legend = document.getElementById('compareLegend');
  if (!svg) return;
  const specs = [
    {url:'alpaca.json', label:'alpaca', color:cv('--gruen')},
    {url:'hyperliquid.json', label:'hyperliquid', color:cv('--silber')},
    {url:'kalshi.json', label:'kalshi', color:cv('--blau')},
  ];
  Promise.all(specs.map(sp => fetchT(sp.url + '?' + Date.now(), 8000).then(r => r.ok ? r.json() : null).catch(() => null)))
    .then(results => {
      const series = specs.map((sp, i) => ({...sp, pts: sanitizeSeries(((results[i] || {}).series || {}).return || [])}));
      const valid = series.filter(sp => sp.pts.length >= 2);
      if (!valid.length){ svg.innerHTML = ''; if (legend) legend.textContent = 'data unavailable'; return; }
      const allY = valid.flatMap(sp => sp.pts.map(p => p[1])), allX = valid.flatMap(sp => sp.pts.map(p => p[0]));
      let y0 = Math.min(...allY, 0), y1 = Math.max(...allY, 0), x0 = Math.min(...allX), x1 = Math.max(...allX);
      if (y0 === y1){ y0 -= 1; y1 += 1; } if (x0 === x1){ x0 -= 1; x1 += 1; }
      const W = 600, H = 190, pad = 6;
      const X = x => pad + (x - x0) / (x1 - x0) * (W - 2 * pad);
      const Y = y => H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad);
      const zero = (y0 < 0 && y1 > 0) ? '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 4"/>' : '';
      const paths = valid.map(sp => '<path d="' + sp.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') +
        '" fill="none" stroke="' + sp.color + '" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>').join('');
      svg.innerHTML = zero + paths;
      if (legend) legend.innerHTML = valid.map(sp => '<span class="compare-item"><i style="background:' + sp.color + '"></i>' + sp.label + '</span>').join('');
    });
}
renderCompare();

document.querySelectorAll('.sol-radio').forEach(r => {
  r.addEventListener('change', () => {
    document.querySelectorAll('.sol-vid video').forEach(v => {
      v.getBoundingClientRect().height > 0 ? v.play().catch(() => {}) : v.pause();
    });
  });
});
