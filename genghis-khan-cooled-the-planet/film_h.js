// film_h.js — «جنكيز خان برّد الكوكب», 16:9 YouTube cut (1920x1080). Same score, same timing as the vertical film.
(function () {
  const S = SCORE, mk = S.mk, A = S.anchors, W = S.W, H = S.H, SAFE = S.SAFE;
  const { prog, clamp, lerp, easeOut, easeIn, easeInOut, backOut, mulberry32, arNum } = U;
  const IMG = {};
  let ENV = [], LANDF, BORDERS, GRAIN, LANDTEX, layer;

  // ───────────── loading ─────────────
  const FILES = { G01: 'G01_cutout.png', G02: 'G02_mongolian_steppe.jpg', G03: 'G03_ploughed_field.jpg',
    G09: 'G09_forest_before.jpg', G10: 'G10_forest_after.jpg', G06: 'G06_ice_core_sunlight.jpg',
    G07: 'G07_volcano_eruption.jpg', G08: 'G08_endcard.png', G11: 'G11_ice_drilling.jpg', G12: 'G12_lava_haze.jpg' };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  async function load() {
    await Promise.all(Object.entries(FILES).map(([k, f]) => new Promise((ok, no) => {
      const i = new Image(); i.onload = () => { IMG[k] = i; ok(); }; i.onerror = () => no(new Error('missing ' + f)); i.src = '../build/' + f; })));
    ENV = await (await fetch('../build/vo_env.json')).json();
    const land = await (await fetch('../node_modules/world-atlas/land-50m.json')).json(); LANDF = topojson.feature(land, land.objects.land);
    const ct = await (await fetch('../node_modules/world-atlas/countries-50m.json')).json(); BORDERS = topojson.mesh(ct, ct.objects.countries, (a, b) => a !== b);
    GRAIN = mkCanvas(512, 512); { const g = GRAIN.getContext('2d'), d = g.createImageData(512, 512), r = mulberry32(11);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - .5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
    LANDTEX = mkCanvas(1024, 1024); { const g = LANDTEX.getContext('2d'), r = mulberry32(5); g.fillStyle = '#6b744a'; g.fillRect(0, 0, 1024, 1024);
      const cols = ['#5c6a3b', '#7d7a4e', '#8f7f55', '#4f6236', '#a08d60', '#68703f'];
      for (let i = 0; i < 1400; i++) { const x = r() * 1024, y = r() * 1024, s = 6 + r() * 60; g.globalAlpha = .08 + r() * .14; g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.beginPath(); g.ellipse(x, y, s, s * (.4 + r() * .6), r() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; }
    await STUDY_H.load(); buildBlooms(); buildPins();
  }

  // ───────────── helpers ─────────────
  function shadowed(ctx, size) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = size * .28; ctx.shadowOffsetY = size * .06; }
  function label(ctx, text, x, y, o = {}) {
    const size = o.size || 56; ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1);
    ctx.font = `700 ${size}px ${o.font || 'Hand'}`; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.clamp !== false) { const hw = ctx.measureText(text).width / 2 + 6; x = clamp(x, SAFE.x + hw, SAFE.x + SAFE.w - hw); }
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale) ctx.scale(o.scale, o.scale);
    shadowed(ctx, size); ctx.fillStyle = o.color || '#fff'; ctx.fillText(text, 0, 0); ctx.restore(); return x;
  }
  function pop(ctx, t, t0, text, x, y, o = {}) {
    const p = prog(t, t0, t0 + .35); if (p <= 0) return; const out = o.t1 ? 1 - prog(t, o.t1, o.t1 + .25) : 1; if (out <= 0) return;
    label(ctx, text, x, y, { ...o, scale: lerp(.55, 1, backOut(p)), alpha: (o.alpha ?? 1) * clamp(p * 3) * out });
  }
  function arrow(ctx, x1, y1, x2, y2, p, o = {}) {
    if (p <= 0) return; const bend = o.bend ?? .22, mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
    const pt = u => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
    ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = o.w || 4; ctx.lineCap = ctx.lineJoin = 'round'; shadowed(ctx, 30);
    ctx.beginPath(); const n = Math.max(1, Math.floor(40 * clamp(p))); for (let i = 0; i <= n; i++) { const [x, y] = pt(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    if (p >= 1) { const [ax, ay] = pt(.9), a = Math.atan2(y2 - ay, x2 - ax); ctx.beginPath();
      ctx.moveTo(x2 - 22 * Math.cos(a - .5), y2 - 22 * Math.sin(a - .5)); ctx.lineTo(x2, y2); ctx.lineTo(x2 - 22 * Math.cos(a + .5), y2 - 22 * Math.sin(a + .5)); ctx.stroke(); }
    ctx.restore();
  }
  function cover(ctx, img, z = 1, fx = .5, fy = .5) {
    const s = Math.max(W / img.width, H / img.height) * z, w = img.width * s, h = img.height * s;
    const x = clamp(W / 2 - fx * w, W - w, 0), y = clamp(H / 2 - fy * h, H - h, 0); ctx.drawImage(img, x, y, w, h); return { x, y, s };
  }
  const zoomAbout = (ctx, z, cx = W / 2, cy = H / 2) => { ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); };
  const vo = t => S.vo.find(p => t >= p.start - .04 && t <= p.end + .04);
  const mouthFor = (who, t) => { const p = vo(t); if (!p || p.speaker !== who) return 0; return clamp((ENV[Math.round(t * S.FPS)] || 0) * 1.4); };
  function glowDot(ctx, x, y, r, color, a = 1) {
    ctx.save(); ctx.globalAlpha *= a; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, color); g.addColorStop(.3, color.replace(/[\d.]+\)$/, '.45)')); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 7); ctx.fill(); ctx.restore();
  }

  // ───────────── the presenters (study_h.js) ─────────────
  const energy = (who, t) => { let s = 0; for (let i = 0; i < 8; i++) s += mouthFor(who, t - i / S.FPS); return s / 8; };
  const alive = (who, t, base = {}) => ({ t, energy: energy(who, t), lean: base.lean || 0, forceMouth: base.forceMouth });
  // her close-up: 3/4 toward him, left third; his close-up: right third
  const DAU_SINGLE = ['dau_34', 622, 1550, 1.05, 1], DAD_SINGLE_34 = ['dad_34', 1482, 1334, 1.05], DAD_SINGLE_FRONT = ['dad_front', 1317, 1334, 1.05];
  function studyTwoOpen(ctx, t) {
    STUDY_H.two(ctx, t, alive('daughter', t, { lean: .01 }), alive('father', t), { z: lerp(1.0, 1.07, easeInOut(prog(t, 0, 1.6))), cx: 940, cy: 560 });
  }
  function studyDaughterOpen(ctx, t) {
    STUDY_H.single(ctx, t, 'daughter', [DAU_SINGLE], alive('daughter', t), { z: lerp(1, 1.05, prog(t, 1.25, 6.62)), par: lerp(-14, 14, prog(t, 1.25, 6.62)), fx: 700, fy: 420 });
  }
  function hookLabel(ctx, t) {
    if (t < mk.hook || t > 7.2) return; const a = 1 - prog(t, 6.75, 7.15);
    pop(ctx, t, mk.hook, 'جنكيز خان؟', 1260, 250, { size: 92, alpha: a, rot: -.04 });
    arrow(ctx, 1110, 300, 880, 330, prog(t, mk.hook + .1, mk.hook + .35), { alpha: a });
  }
  function studyDaughter(ctx, t) {   // «يعني إيه؟» — tighter, front, to him and to us
    STUDY_H.single(ctx, t, 'daughter', [['dau_front', 773, 1926, 1.35, 1]], alive('daughter', t), { z: lerp(1, 1.04, prog(t, 31.94, 34.5)), fx: 780, fy: 420 });
    const p = backOut(prog(t, mk.whatmeans + .15, mk.whatmeans + .5)); if (p > 0) { ctx.save(); ctx.translate(1380, 250); ctx.scale(p, p);
      ctx.fillStyle = '#fbf7ef'; shadowed(ctx, 40); ctx.beginPath(); ctx.ellipse(0, 0, 220, 120, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-150, 60); ctx.lineTo(-300, 150); ctx.lineTo(-60, 100); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.font = '700 88px Hand'; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#222'; ctx.fillText('يعني إيه؟', 0, 8); ctx.restore(); }
  }
  function studyTwoClose(ctx, t) {
    STUDY_H.two(ctx, t, alive('daughter', t, { lean: .012 }), alive('father', t), { z: lerp(1.0, 1.05, prog(t, mk.back, 59.0)), cx: 940, cy: 560 });
  }
  function studyDaughterAsk(ctx, t) {
    STUDY_H.single(ctx, t, 'daughter', [DAU_SINGLE], alive('daughter', t), { z: lerp(1, 1.04, prog(t, 58.7, 61.25)), par: lerp(12, -12, prog(t, 58.7, 61.25)), fx: 700, fy: 420 });
  }
  function studyFather(ctx, t) {   // he chuckles toward her, then turns to the lens on «بس دي حكاية»
    const ec = easeInOut(prog(t, mk.endcard, mk.endcard + .6)), chuck = t >= A.chuckle && t < mk.tocamera, turn = easeInOut(prog(t, mk.tocamera - .12, mk.tocamera + .08));
    const f = alive('father', t); if (chuck) { f.forceMouth = Math.sin(t * 22) > 0 ? 'e' : 'i'; f.energy = .8; }
    STUDY_H.single(ctx, t, 'father', [[...DAD_SINGLE_34, 1 - turn], [...DAD_SINGLE_FRONT, turn]], f,
      { z: lerp(1, 1.05, prog(t, 60.95, mk.endcard)) * lerp(1, .95, ec), par: lerp(-12, 12, prog(t, 60.95, 64)), fx: 1240, fy: 440 });
    if (ec > 0) { ctx.fillStyle = `rgba(0,0,0,${.4 * ec})`; ctx.fillRect(0, 0, W, H); }
  }

  // ───────────── maps ─────────────
  const EMPIRE = [[128, 38], [131, 43], [135, 48], [131, 55], [118, 57], [104, 57], [90, 57], [76, 57], [62, 59], [52, 60], [42, 58], [33, 55], [26, 52], [21, 49], [17, 47],
    [21, 45], [27, 44], [30, 42], [33, 40], [36, 37], [39, 34], [42, 32], [45, 30], [49, 29], [53, 27], [57, 26], [62, 25], [67, 25], [70, 28], [72, 32], [75, 34], [80, 30], [88, 28],
    [97, 27], [100, 22], [106, 21], [111, 20], [117, 23], [121, 28], [122, 31], [121, 37], [124, 40], [126, 38]];
  const MONG = [103, 47];
  function ring(ctx, proj, pts) { ctx.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length];
    for (let k = 0; k < 6; k++) { const xy = proj([lerp(p[0], q[0], k / 6), lerp(p[1], q[1], k / 6)]); (i || k) ? ctx.lineTo(xy[0], xy[1]) : ctx.moveTo(xy[0], xy[1]); } }); ctx.closePath(); }
  function inPoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
  function earth(ctx, proj, globe) {
    const path = d3.geoPath(proj, ctx); ctx.fillStyle = '#081a2c'; ctx.fillRect(0, 0, W, H);
    if (globe) { const [cx, cy] = proj.translate(), r = proj.scale(); const at = ctx.createRadialGradient(cx, cy, r * .95, cx, cy, r * 1.12);
      at.addColorStop(0, 'rgba(120,180,255,.35)'); at.addColorStop(1, 'rgba(120,180,255,0)'); ctx.fillStyle = at; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, 7); ctx.fill(); }
    ctx.save(); ctx.beginPath(); path({ type: 'Sphere' }); const oc = ctx.createLinearGradient(0, 0, 0, H); oc.addColorStop(0, '#123a5f'); oc.addColorStop(1, '#0b2742'); ctx.fillStyle = oc; ctx.fill(); ctx.clip();
    ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); path(LANDF); ctx.fillStyle = ctx.createPattern(LANDTEX, 'repeat'); ctx.fill(); ctx.strokeStyle = 'rgba(230,220,190,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); path(BORDERS); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    if (globe) { const [cx, cy] = proj.translate(), r = proj.scale(); const sh = ctx.createRadialGradient(cx - r * .4, cy - r * .4, r * .2, cx, cy, r * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,.06)'); sh.addColorStop(1, 'rgba(0,0,20,.45)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H); }
    ctx.restore(); return path;
  }
  function clipEmpire(ctx, proj, path) { ctx.beginPath(); path(LANDF); ctx.clip(); ring(ctx, proj, EMPIRE); ctx.clip(); }
  const TIDE_SEEDS = (() => { const r = mulberry32(21), a = []; while (a.length < 40) { const p = [16 + r() * 120, 20 + r() * 42]; if (inPoly(p, EMPIRE)) a.push(p); } return a; })();
  const end6 = S.vo.find(p => p.i === 6).end;
  function mapMongolia(ctx, t) {
    const a = easeInOut(prog(t, 6.32, 8.9)), zin = easeInOut(prog(t, 6.9, 9.4)), zout = easeInOut(prog(t, 10.55, 11.61));
    let rot = [lerp(-15, -103, a), lerp(-10, -47, a)], sc = lerp(440, 1400, zin), tr = [lerp(1120, 1180, zin), lerp(560, 520, zin)];
    rot = [lerp(rot[0], -74, zout), lerp(rot[1], -40, zout)]; sc = lerp(sc, 640, zout); tr = [lerp(tr[0], 1010, zout), lerp(tr[1], 600, zout)];
    const proj = d3.geoOrthographic().rotate(rot).scale(sc).translate(tr).clipAngle(90), path = earth(ctx, proj, sc < 1000);
    if (t >= mk.tide) { const p = easeOut(prog(t, mk.tide, end6)), R = 4 + 82 * p; ctx.save(); clipEmpire(ctx, proj, path);
      ctx.fillStyle = 'rgba(200,30,30,.58)'; ctx.beginPath(); path(d3.geoCircle().center(MONG).radius(R).precision(1)()); ctx.fill();
      for (const s of TIDE_SEEDS) { const d = d3.geoDistance(s, MONG) * 180 / Math.PI; if (d < R + 6) { ctx.beginPath(); path(d3.geoCircle().center(s).radius(clamp((R + 6 - d) / 2, 0, 9))()); ctx.fill(); } }
      ctx.restore(); }
    const m = proj(MONG), ma = prog(t, 8.6, 9.0) * (1 - prog(t, 13.4, 13.9));
    if (ma > 0) { glowDot(ctx, m[0], m[1], 12 + 3 * Math.sin(t * 6), 'rgba(255,90,60,1)', ma);
      ctx.save(); ctx.globalAlpha = ma; ctx.strokeStyle = 'rgba(255,140,110,.8)'; ctx.lineWidth = 3; const pr = (t * 1.2) % 1; ctx.beginPath(); ctx.arc(m[0], m[1], 20 + pr * 60, 0, 7); ctx.globalAlpha = ma * (1 - pr); ctx.stroke(); ctx.restore(); }
    pop(ctx, t, A.mongolia, 'منغوليا', m[0] + 60, m[1] - 110, { size: 72, t1: 10.5 });
    pop(ctx, t, A.year1206, '١٢٠٦', 1640, 170, { size: 96, t1: 10.5, color: '#ffd9a0' });
    // the portrait bust slides in from the left (fully on before «جنكيز خان.» ends)
    const pin = easeOut(prog(t, mk.portrait, mk.portrait + .55)), pout = easeIn(prog(t, 10.45, 10.95));
    if (pin > 0 && pout < 1) { const ih = 980, iw = ih * IMG.G01.width / IMG.G01.height, x = lerp(-iw - 40, 40, pin) - pout * (iw + 80);
      ctx.save(); ctx.translate(x + iw / 2, 1100 - ih / 2); ctx.rotate(-.02); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = 12;
      ctx.drawImage(IMG.G01, -iw / 2, -ih / 2, iw, ih); ctx.restore(); }
    if (t >= mk.tide) { const p = easeOut(prog(t, mk.tide, end6)), a = clamp(prog(t, mk.tide, mk.tide + .3)) * (1 - prog(t, 13.7, 14.1));
      label(ctx, arNum(22 * p) + '٪', 1640, 230, { size: 130, font: 'Cap', alpha: a, color: '#ff8a7a' }); label(ctx, 'من اليابسة', 1640, 340, { size: 58, alpha: a }); }
  }
  // ───────────── stat grid on the steppe ─────────────
  function gridScene(ctx, t) {
    ctx.save(); zoomAbout(ctx, lerp(1.03, 1.1, prog(t, 13.85, 19.95)), 960, 900); cover(ctx, IMG.G02, 1, lerp(.45, .58, prog(t, 13.85, 19.95)), .5); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    const r = mulberry32(40), pick = new Set(); while (pick.size < 10) pick.add(Math.floor(r() * 100));
    const x0 = 1010, y0 = 150, dx = 70, dy = 66;
    for (let i = 0; i < 100; i++) { const cx = x0 + (i % 10) * dx, cy = y0 + Math.floor(i / 10) * dy, fa = prog(t, 14.1 + (i % 10 + Math.floor(i / 10)) * .035, 14.4 + (i % 10 + Math.floor(i / 10)) * .035);
      if (fa <= 0) continue; let col = '#f4f1ea', yy = cy, a = fa;
      if (pick.has(i)) { const rd = prog(t, mk.forty, mk.forty + .2), dr = prog(t, mk.forty + .35, mk.forty + 1.25);
        if (rd > 0) col = rd < 1 ? '#f08070' : '#e0352b'; yy = cy + 600 * easeIn(dr); a *= 1 - dr;
        if (t > A.tenpct && dr >= 1) { ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = `rgba(224,53,43,${.9 * prog(t, A.tenpct, A.tenpct + .3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.stroke(); ctx.restore(); } }
      if (a <= 0) continue; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, yy - 14, 10, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx - 13, yy - 2, 26, 30, [10, 10, 4, 4]); ctx.fill(); ctx.restore(); }
    pop(ctx, t, mk.forty + .1, '٤٠ مليون', 560, 420, { size: 160, color: '#ff6b5e' });
    pop(ctx, t, A.tenpct, '١٠٪ من سكان الأرض', 560, 590, { size: 66 });
  }
  // ───────────── farms → forests ─────────────
  function fieldScene(ctx, t) {
    ctx.save(); zoomAbout(ctx, lerp(1.0, 1.08, prog(t, 19.65, mk.before)), 960, 700); cover(ctx, IMG.G03, 1, .5, .58); ctx.restore();
    pop(ctx, t, mk.farms, 'المزارع فضيت', 960, 420, { size: 100 }); arrow(ctx, 920, 480, 860, 700, prog(t, mk.farms + .15, mk.farms + .45));
  }
  function forestBefore(ctx, t) {
    const p = prog(t, mk.before - .3, mk.forest); ctx.save(); zoomAbout(ctx, lerp(1.04, 1.12, p)); cover(ctx, IMG.G09, 1, lerp(.45, .55, p), .5); ctx.restore();
    pop(ctx, t, mk.before + .05, 'قبل', 960, 150, { size: 104 });
  }
  function forestAfter(ctx, t) {
    const p = prog(t, mk.forest - .3, mk.blooms + .3); ctx.save(); zoomAbout(ctx, lerp(1.04, 1.12, p)); cover(ctx, IMG.G10, 1, lerp(.5, .45, p), .5); ctx.restore();
    pop(ctx, t, mk.forest + .05, 'بعد', 960, 140, { size: 104 }); pop(ctx, t, mk.forest + .2, 'الغابات رجعت', 960, 270, { size: 92 });
  }
  // ───────────── blooms + carbon ─────────────
  let BLOOMS = []; function buildBlooms() { const r = mulberry32(31); while (BLOOMS.length < 64) { const p = [18 + r() * 116, 22 + r() * 38];
    if (inPoly(p, EMPIRE) && d3.geoContains(LANDF, p)) BLOOMS.push({ p, t0: mk.blooms + .1 + r() * 2.9, r: 12 + r() * 20 }); } }
  function mapBlooms(ctx, t) {
    const p = prog(t, 24.94, 32.24), proj = d3.geoOrthographic().rotate([-76, -43]).scale(lerp(820, 880, p)).translate([960, 640]).clipAngle(90), path = earth(ctx, proj, false);
    ctx.save(); clipEmpire(ctx, proj, path); ctx.fillStyle = 'rgba(150,25,25,.28)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.setLineDash([10, 8]); ring(ctx, proj, EMPIRE); ctx.strokeStyle = 'rgba(255,120,110,.45)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    ctx.save(); clipEmpire(ctx, proj, path);
    for (const b of BLOOMS) { const g = backOut(prog(t, b.t0, b.t0 + .6)); if (g <= 0) continue; const [x, y] = proj(b.p), rr = b.r * g;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rr * 1.6); gr.addColorStop(0, 'rgba(120,220,110,.95)'); gr.addColorStop(.6, 'rgba(60,160,70,.85)'); gr.addColorStop(1, 'rgba(40,130,60,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr * 1.6, 0, 7); ctx.fill(); }
    ctx.restore();
    if (t >= mk.carbon) { const r = mulberry32(77);
      for (let i = 0; i < 44; i++) { const b = BLOOMS[Math.floor(r() * BLOOMS.length)], [tx, ty] = proj(b.p), t0 = mk.carbon + i * .05 + r() * .1, du = 1.1 + r() * .7, sx = tx + (r() - .5) * 200, sy = 40 + r() * 140;
        const q = prog(t, t0, t0 + du); if (q <= 0 || q >= 1) continue;
        const x = lerp(sx, tx, easeInOut(q)), y = lerp(sy, ty, easeIn(q)), a = q < .85 ? 1 : 1 - (q - .85) / .15, rad = 16 * (q < .85 ? 1 : a);
        ctx.save(); ctx.globalAlpha = .9 * a; ctx.strokeStyle = 'rgba(230,240,255,.9)'; ctx.fillStyle = 'rgba(180,200,220,.25)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.stroke();
        ctx.font = '700 14px Cap'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CO₂', x, y + 1); ctx.restore(); } }
    const a = prog(t, mk.blooms, mk.blooms + .3), area = arNum(142000 * easeOut(prog(t, mk.blooms, 28.34))) + ' كم²', flip = prog(t, mk.carbon, mk.carbon + .3);
    ctx.save(); ctx.translate(1580, 170); ctx.scale(1, Math.abs(Math.cos(flip * Math.PI)) || .001);
    if (flip < .5) label(ctx, area, 0, 0, { size: 100, font: 'Cap', alpha: a, color: '#9df29a', clamp: false });
    else label(ctx, '٧٠٠ مليون طن', 0, 0, { size: 100, font: 'Cap', color: '#e6f0ff', clamp: false });
    ctx.restore();
    if (flip >= .5) pop(ctx, t, mk.carbon + .2, 'كربون اتشفط من الجو', 1580, 280, { size: 54 });
    const tb = BLOOMS.reduce((m, b) => (d3.geoDistance(b.p, [60, 50]) < d3.geoDistance(m.p, [60, 50]) ? b : m)), [bx, by] = proj(tb.p);
    pop(ctx, t, A.ghaba, 'غابة جديدة', 330, 780, { size: 84, t1: mk.carbon - .1 });
    if (t < mk.carbon) arrow(ctx, 380, 720, bx - 10, by + 25, prog(t, A.ghaba + .15, A.ghaba + .45));
  }
  // ───────────── a year of petrol ─────────────
  function pump(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#d9472b'; ctx.beginPath(); ctx.roundRect(-55, -120, 110, 230, 14); ctx.fill();
    ctx.fillStyle = '#f6efe4'; ctx.beginPath(); ctx.roundRect(-38, -95, 76, 58, 8); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(-28, -84, 56, 14); ctx.fillRect(-28, -62, 40, 10);
    ctx.fillStyle = '#a73420'; ctx.fillRect(-62, 100, 124, 22); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(55, -40); ctx.quadraticCurveTo(100, -20, 85, 50); ctx.stroke(); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(74, 40, 22, 36); ctx.restore();
  }
  function darkCard(ctx) { ctx.fillStyle = '#14161b'; ctx.fillRect(0, 0, W, H); const v = ctx.createRadialGradient(960, 540, 100, 960, 540, 1100);
    v.addColorStop(0, 'rgba(60,70,90,.35)'); v.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
  function petrolScene(ctx, t) {
    darkCard(ctx);
    const ga = prog(t, 34.3, 34.7) * (1 - prog(t, mk.pumps, mk.pumps + .35));
    if (ga > 0) { ctx.save(); ctx.globalAlpha = ga; const proj = d3.geoOrthographic().rotate([-20 - t * 12, -20]).scale(210).translate([960, 520]).clipAngle(90); earth(ctx, proj, true); ctx.restore();
      ctx.save(); ctx.globalAlpha = ga; const r = mulberry32(3); for (let i = 0; i < 14; i++) { const t0 = 34.4 + r() * 2, q = ((t - t0) / 1.6 % 1 + 1) % 1, a0 = r() * 6.28;
        ctx.fillStyle = `rgba(150,150,150,${.45 * (1 - q)})`; ctx.beginPath(); ctx.arc(960 + Math.cos(a0) * 190 + Math.cos(a0) * q * 80, 520 + Math.sin(a0) * 190 - q * 140, 18 + q * 40, 0, 7); ctx.fill(); } ctx.restore();
      pop(ctx, t, A.world, 'العالم كله', 960, 830, { size: 84, alpha: ga }); }
    for (let i = 0; i < 8; i++) { const p = backOut(prog(t, mk.pumps + i * .035, mk.pumps + .3 + i * .035)); if (p <= 0) continue; pump(ctx, 260 + i * 200, 620, .95 * p); }
    const ca = prog(t, mk.pumps + .05, mk.pumps + .3); if (ca > 0) { ctx.save(); ctx.globalAlpha = ca; ctx.translate(960, 250);
      ctx.fillStyle = '#f6efe4'; ctx.beginPath(); ctx.roundRect(-150, -120, 300, 250, 16); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(-150, -120, 300, 62, [16, 16, 0, 0]); ctx.fill();
      ctx.fillStyle = '#333'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * 70 - 8, -140, 16, 44, 8); ctx.fill(); }
      const fp = prog(t, mk.year, mk.year + .3);
      ctx.font = '700 104px Cap'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#222'; ctx.direction = 'rtl'; ctx.fillText(fp > .5 ? '٣٦٥' : '١', 0, 25);
      ctx.font = '700 40px Cap'; ctx.fillStyle = '#fff'; ctx.fillText('يوم', 0, -88);
      if (fp > 0 && fp < 1) { ctx.save(); ctx.scale(1, Math.cos(fp * Math.PI)); ctx.fillStyle = fp < .5 ? '#f6efe4' : '#e8dfcf'; ctx.fillRect(-150, -58 * Math.sign(Math.cos(fp * Math.PI)), 300, 188 * Math.sign(Math.cos(fp * Math.PI))); ctx.restore(); }
      ctx.restore(); }
    pop(ctx, t, mk.year + .5, 'سنة بنزين كاملة', 960, 860, { size: 78 });
    const sw = easeOut(prog(t, mk.swallow, mk.swallow + .55)); if (sw > 0) { const top = lerp(H + 80, 430, sw), r = mulberry32(9);
      for (let layer = 0; layer < 3; layer++) { ctx.fillStyle = ['#1f5e2c', '#2f7a36', '#4a9a44'][layer];
        ctx.beginPath(); ctx.moveTo(-20, H + 20); for (let x = -40; x <= W + 60; x += 80) { const yy = top + layer * 60 + r() * 40; ctx.arc(x, yy, 80 + r() * 30, Math.PI, 0); } ctx.lineTo(W + 20, H + 20); ctx.closePath(); ctx.fill(); } }
  }
  // ───────────── four disasters ─────────────
  let PINS = []; function buildPins() { PINS = [
    { at: mk.pin1, ll: [12, 49], txt: 'الطاعون ١٣٥٠', dx: -20, dy: -95 }, { at: mk.pin2, ll: [113, 31], txt: 'أسرة مينج ١٦٥٠', dx: 30, dy: 95 },
    { at: mk.pin3, ll: [-88, 17], txt: 'غزو أمريكا ١٥٠٠', dx: 40, dy: -95 }, { at: mk.pin4, ll: [103, 47], txt: 'المغول ١٢٠٠', dx: -30, dy: -105, mongol: true }]; }
  function mapPins(ctx, t) {
    const pull = easeOut(prog(t, 39.15, 40.7)), proj = d3.geoNaturalEarth1().rotate([-8, 0]).scale(lerp(400, 318, pull)).translate([960, lerp(600, 590, pull)]);
    earth(ctx, proj, false);
    pop(ctx, t, A.arba3, '٤ كوارث', 250, 120, { size: 100 });
    const only = prog(t, mk.only, mk.only + .4);
    for (const p of PINS) { const q = backOut(prog(t, p.at, p.at + .35)); if (q <= 0) continue; const [x, y] = proj(p.ll), dim = p.mongol ? 0 : only;
      const pulse = p.mongol ? 1 + .6 * only * (.5 + .5 * Math.sin((t - mk.only) * 7)) : 1;
      const col = dim > 0 ? `rgba(${lerp(255, 140, dim)},${lerp(80, 140, dim)},${lerp(60, 140, dim)},1)` : 'rgba(255,80,60,1)';
      ctx.save(); ctx.globalAlpha = q < 1 ? clamp(q) : 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40 * q); ctx.stroke(); ctx.restore();
      glowDot(ctx, x, y - 40 * q, 13 * pulse * clamp(q, 0, 1.2), p.mongol && only > 0 ? 'rgba(120,230,110,1)' : col, 1 - .5 * dim);
      label(ctx, p.txt, x + p.dx, y + p.dy, { size: 56, alpha: clamp(q) * (1 - .55 * dim) }); }
    if (only > 0) { const [mx, my] = proj(MONG), r = mulberry32(64);
      for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = 40 + r() * 70, x = mx + Math.cos(a) * d, y = my + Math.sin(a) * d * .7, g = backOut(prog(t, mk.only + .1 + i * .06, mk.only + .45 + i * .06)); if (g <= 0) continue;
        ctx.save(); ctx.translate(x, y); ctx.scale(g, g); ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
        ctx.fillStyle = i % 2 ? '#4caf50' : '#6fcf5a'; ctx.beginPath(); ctx.arc(0, -24, 12, 0, 7); ctx.fill(); ctx.restore(); } }
  }
  // ───────────── the twist: CO₂ chart → Antarctica → ice core → temperature chart → volcano ─────────────
  const CH = { x0: 330, x1: 1590, y0: 250, y1: 740 }, yx = yr => lerp(CH.x0, CH.x1, (yr - 1000) / 600), fy = f => lerp(CH.y0, CH.y1, f);
  function axes(ctx, a, title) {
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CH.x0, CH.y0 - 30); ctx.lineTo(CH.x0, CH.y1); ctx.lineTo(CH.x1 + 25, CH.y1); ctx.stroke();
    ctx.font = '700 40px Cap'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const yr of [1000, 1200, 1400, 1600]) { const x = yx(yr); ctx.fillText(arNum(yr), x, CH.y1 + 14); ctx.beginPath(); ctx.moveTo(x, CH.y1); ctx.lineTo(x, CH.y1 + 10); ctx.stroke(); }
    ctx.restore(); label(ctx, title, 960, 120, { size: 74, alpha: a });
  }
  const WIG = (() => { const r = mulberry32(91); return Array.from({ length: 64 }, () => r() - .5); })();
  const wig = (yr, amp) => { const u = (yr - 1000) / 600 * 62, i = Math.floor(u), f = u - i; return amp * lerp(WIG[i], WIG[i + 1], f * f * (3 - 2 * f)); };
  const series = fn => { const pts = []; for (let i = 0; i <= 240; i++) { const yr = lerp(1000, 1600, i / 240); pts.push([yx(yr), fy(fn(yr))]); } return pts; };
  const CO2 = series(yr => .5 + wig(yr, .05));
  const TEMP = series(yr => .36 + wig(yr, .04) + .36 * Math.exp(-(((yr - 1262) / 26) ** 2)) + .23 * Math.exp(-(((yr - 1455) / 22) ** 2)));
  function strokeSeries(ctx, pts, p, color, glow) { const n = Math.max(2, Math.floor(pts.length * clamp(p))); if (p <= 0) return; ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
    for (const [w, c] of [[16, glow], [5, color]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.slice(0, n).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); } ctx.restore(); }
  function co2Chart(ctx, t) {
    darkCard(ctx); const a = prog(t, mk.twist - .3, mk.twist), ba = prog(t, 48.2, 48.6);
    if (ba > 0) { ctx.fillStyle = `rgba(200,40,40,${.22 * ba})`; ctx.fillRect(yx(1200), CH.y0 - 20, yx(1380) - yx(1200), CH.y1 - CH.y0 + 20);
      label(ctx, 'فترة المغول', (yx(1200) + yx(1380)) / 2, CH.y1 - 36, { size: 48, alpha: ba, color: '#ff9b8f' }); }
    axes(ctx, a, 'ثاني أكسيد الكربون في الهوا');
    strokeSeries(ctx, CO2, easeInOut(prog(t, mk.twist, mk.twist + 1.2)), '#e8f7ff', 'rgba(150,220,255,.28)');
    const mp = easeInOut(prog(t, mk.tiny - .15, mk.tiny + .4));
    if (mp > 0) { const R = 140, cx = lerp(1700, yx(1290), mp), cy = lerp(980, fy(.5), mp);
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip(); ctx.fillStyle = '#1e2229'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      ctx.fillStyle = 'rgba(200,40,40,.18)'; ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
      ctx.translate(cx, cy); ctx.scale(2.6, 2.6); ctx.translate(-cx, -cy); strokeSeries(ctx, CO2, 1, '#e8f7ff', 'rgba(150,220,255,.28)'); ctx.restore();
      ctx.save(); ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 12; shadowed(ctx, 40); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
      ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.strokeStyle = '#5a3a22'; ctx.beginPath(); ctx.moveTo(cx + R * .72, cy + R * .72); ctx.lineTo(cx + R * 1.5, cy + R * 1.5); ctx.stroke(); ctx.restore(); }
    pop(ctx, t, mk.tiny + .35, 'أثر صغير جدًا', 1460, 860, { size: 70 });
    pop(ctx, t, mk.tiny + .6, '٠٫١٨ جزء في المليون بس', 560, 860, { size: 44, font: 'Cap', color: '#cfe6ff' });
    const sp = prog(t, mk.notfound, mk.notfound + .25); if (sp > 0) { ctx.save(); ctx.translate(yx(1290), 330); ctx.rotate(-.14); const sc = lerp(1.9, 1, easeOut(sp)); ctx.scale(sc, sc); ctx.globalAlpha = clamp(sp * 2);
      ctx.strokeStyle = '#e0352b'; ctx.lineWidth = 8; ctx.strokeRect(-180, -56, 360, 112); ctx.font = '700 80px Cap'; ctx.fillStyle = '#e0352b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl'; ctx.fillText('مش باين!', 0, 6); ctx.restore(); }
  }
  function antarctica(ctx, t) {
    const p = prog(t, mk.qutb - .3, 52.6); ctx.save(); zoomAbout(ctx, lerp(1.04, 1.1, p), 960, 560); cover(ctx, IMG.G11, 1, .5, .45); ctx.restore();
    const sh = ctx.createLinearGradient(0, 0, 0, 330); sh.addColorStop(0, 'rgba(10,20,35,.55)'); sh.addColorStop(1, 'rgba(10,20,35,0)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, 330);   // readable labels on snow
    pop(ctx, t, mk.qutb + .02, 'القطب الجنوبي', 960, 110, { size: 96 }); pop(ctx, t, mk.qutb + .25, 'العلما بيحفروا في التلج', 960, 215, { size: 58 });
  }
  const CORE_BUB = (() => { const r = mulberry32(55), a = []; for (let i = 0; i < 9; i++) a.push([700 + r() * 380, 260 + r() * 620]); return a; })();
  function iceCore(ctx, t) {
    const p = prog(t, 52.3, 54.95); ctx.save(); zoomAbout(ctx, lerp(1.0, 1.08, easeInOut(p)), 900, 540); cover(ctx, IMG.G06, 1, .45, .5);
    const ba = prog(t, mk.bubbles, mk.bubbles + .4); if (ba > 0) for (const [i, [x, y]] of CORE_BUB.entries()) glowDot(ctx, x, y, 10 + 3 * Math.sin(t * 5 + i), 'rgba(255,240,180,1)', ba);
    ctx.restore();
    pop(ctx, t, 52.4, 'عينة تلج', 330, 260, { size: 92 }); arrow(ctx, 420, 320, 650, 420, prog(t, 52.55, 52.85));
    pop(ctx, t, mk.bubbles + .1, 'فقاعات = هوا قديم', 1500, 760, { size: 78 });
    const [bx, by] = CORE_BUB[0]; arrow(ctx, 1380, 700, bx + 20, by, prog(t, mk.bubbles + .3, mk.bubbles + .6));
  }
  function volcanoIcon(ctx, x, y, s, t) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (let i = 0; i < 3; i++) { const q = ((t * .8 + i / 3) % 1); ctx.fillStyle = `rgba(160,160,160,${.6 * (1 - q)})`; ctx.beginPath(); ctx.arc(Math.sin(i * 2 + t) * 8, -70 - q * 70, 16 + q * 18, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#7a4a32'; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-14, -60); ctx.lineTo(14, -60); ctx.lineTo(60, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.moveTo(-14, -60); ctx.lineTo(14, -60); ctx.lineTo(6, -40); ctx.lineTo(-6, -40); ctx.closePath(); ctx.fill(); ctx.restore(); }
  function tempChart(ctx, t) {
    darkCard(ctx);
    ctx.save(); ctx.globalAlpha = lerp(.28, .62, easeInOut(prog(t, A.volcLine - .1, A.volcLine + .5))); zoomAbout(ctx, lerp(1.0, 1.06, prog(t, mk.cooling - .18, mk.volcano)), 960, 800);
    cover(ctx, IMG.G12, 1, .5, .6); ctx.restore(); ctx.fillStyle = 'rgba(14,16,20,.35)'; ctx.fillRect(CH.x0 - 50, CH.y0 - 60, CH.x1 - CH.x0 + 120, CH.y1 - CH.y0 + 130);
    axes(ctx, prog(t, mk.cooling - .18, mk.cooling + .1), 'حرارة الأرض');
    label(ctx, 'أبرد', CH.x0 - 90, CH.y1 - 20, { size: 40, font: 'Cap', color: '#9fd0ff', alpha: prog(t, mk.cooling, mk.cooling + .3), clamp: false });
    label(ctx, 'أدفى', CH.x0 - 90, CH.y0 + 10, { size: 40, font: 'Cap', color: '#ffb36b', alpha: prog(t, mk.cooling, mk.cooling + .3), clamp: false });
    strokeSeries(ctx, TEMP, easeInOut(prog(t, mk.cooling, mk.cooling + 1.1)), '#ffb36b', 'rgba(255,150,80,.28)');
    const dx = yx(1262), dy = fy(.72);
    pop(ctx, t, mk.cooling + .9, 'التبريد الكبير', 560, 860, { size: 80, color: '#9fd0ff' }); arrow(ctx, 640, 820, dx - 10, dy + 30, prog(t, mk.cooling + 1.05, mk.cooling + 1.35));
    for (const [i, yr] of [1262, 1455].entries()) { const q = backOut(prog(t, A.volcLine + i * .18, A.volcLine + .35 + i * .18)); if (q > 0) volcanoIcon(ctx, yx(yr), 330, q, t); }
    pop(ctx, t, A.volcLine + .3, 'براكين', yx(1360), 240, { size: 64, color: '#ffb38a' });
  }
  function volcanoScene(ctx, t) {
    const k = Math.exp(-(t - mk.volcano) * 4), sx = Math.sin(t * 71) * 14 * k, sy = Math.cos(t * 53) * 12 * k;
    ctx.save(); ctx.translate(sx, sy); zoomAbout(ctx, lerp(1.06, 1.1, prog(t, mk.volcano, mk.back + .5))); cover(ctx, IMG.G07, 1, .55, .42); ctx.restore();
    pop(ctx, t, mk.volcano + .1, 'السبب الحقيقي: البراكين', 960, 120, { size: 82, color: '#ffd2a0' });
  }
  // ───────────── end card ─────────────
  const BTN = { like: [772, 373, 227, 84], sub: [1031, 375, 285, 80] };
  function endCard(ctx, t) {
    if (t < mk.endcard) return; const p = backOut(prog(t, mk.endcard, mk.endcard + .62)), ox = (1 - p) * W * 1.05;
    const img = IMG.G08, bw = 1500, bh = bw * img.height / img.width, bx = (W - bw) / 2 + ox, by = 470 - bh / 2;
    ctx.save(); ctx.translate(ox, 0); ctx.fillStyle = '#120f08'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .55; ctx.filter = 'blur(30px)'; ctx.drawImage(img, -300, -100, W + 600, (W + 600) * img.height / img.width); ctx.filter = 'none'; ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(960, 500, 300, 960, 500, 1200); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.8)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); shadowed(ctx, 60); ctx.drawImage(img, bx, by, bw, bh); ctx.restore();
    const k = bw / img.width;
    for (const [name, t0] of [['like', mk.buttons], ['sub', mk.buttons + .4]]) { const q = prog(t, t0, t0 + .4); if (q <= 0 || q >= 1) continue;
      const [x, y, w, h] = BTN[name], sc = 1 + .08 * Math.sin(Math.PI * q), cx = bx + (x + w / 2) * k, cy = by + (y + h / 2) * k;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.drawImage(img, x, y, w, h, -w * k / 2, -h * k / 2, w * k, h * k); ctx.restore(); }
  }
  function captions(ctx, t) {
    const subs = S.subtitles; let s = null;
    for (let i = 0; i < subs.length; i++) { const nx = subs[i + 1], e = nx && nx.start - subs[i].end < .3 ? nx.start : subs[i].end + .15; if (t >= subs[i].start && t < e) { s = subs[i]; break; } }
    if (!s) return; const a = prog(t, s.start, s.start + .08);
    ctx.save(); let size = 58; ctx.font = `700 ${size}px Cap`; const w = ctx.measureText(s.text).width; if (w > SAFE.w - 20) size *= (SAFE.w - 20) / w;
    ctx.globalAlpha = a; ctx.font = `700 ${size}px Cap`; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = 975 + (1 - a) * 6; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3; ctx.fillStyle = '#fff'; ctx.fillText(s.text, 960, y);
    ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.fillText(s.text, 960, y); ctx.restore();
  }
  function paper(ctx, t) {
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .1; const f = Math.floor(t * S.FPS), r = mulberry32(f + 1);
    ctx.translate(-r() * 512, -r() * 512); ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W + 1024, H + 1024); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,225,180,.25)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const v = ctx.createRadialGradient(960, 540, 700, 960, 540, 1300); v.addColorStop(0, 'rgba(20,10,0,0)'); v.addColorStop(1, 'rgba(20,10,0,.4)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // ───────────── timeline (identical cut points to the vertical film) ─────────────
  const SCENES = [
    { name: 'study-two', a: 0, b: 1.55, kind: 'study', chars: true, draw: studyTwoOpen },
    { name: 'study-daughter-asks', a: 1.25, b: 6.62, kind: 'study', chars: true, draw: studyDaughterOpen },
    { name: 'map-mongolia', a: 6.32, b: 14.15, kind: 'map', draw: mapMongolia },
    { name: 'grid-steppe', a: 13.85, b: 19.95, kind: 'photo', photo: 'G02', draw: gridScene },
    { name: 'field', a: 19.65, b: mk.before, kind: 'photo', photo: 'G03', draw: fieldScene },
    { name: 'forest-before', a: mk.before - .3, b: mk.forest, kind: 'photo', photo: 'G09', draw: forestBefore },
    { name: 'forest-after', a: mk.forest - .3, b: mk.blooms + .3, kind: 'photo', photo: 'G10', draw: forestAfter },
    { name: 'map-blooms', a: mk.blooms, b: mk.whatmeans, kind: 'map', draw: mapBlooms },
    { name: 'study-daughter', a: mk.whatmeans - .3, b: 34.5, kind: 'study', chars: true, draw: studyDaughter },
    { name: 'stat-petrol', a: 34.2, b: 39.45, kind: 'stat', draw: petrolScene },
    { name: 'map-pins', a: 39.15, b: mk.twist, kind: 'map', draw: mapPins },
    { name: 'chart-co2', a: mk.twist - .3, b: mk.qutb, kind: 'stat', draw: co2Chart },
    { name: 'antarctica', a: mk.qutb - .3, b: 52.6, kind: 'photo', photo: 'G11', draw: antarctica },
    { name: 'ice-core', a: 52.3, b: mk.cooling + .17, kind: 'photo', photo: 'G06', draw: iceCore },
    { name: 'chart-temp', a: mk.cooling - .18, b: mk.volcano, kind: 'stat', draw: tempChart },
    { name: 'volcano', a: mk.volcano, b: mk.back + .5, kind: 'photo', photo: 'G07', hardIn: true, draw: volcanoScene },
    { name: 'study-two-close', a: mk.back, b: 59.0, kind: 'study', chars: true, draw: studyTwoClose },
    { name: 'study-daughter-q', a: 58.7, b: 61.25, kind: 'study', chars: true, draw: studyDaughterAsk },
    { name: 'study-father', a: 60.95, b: S.DURATION + 1, kind: 'study', chars: true, draw: studyFather },
  ];
  function draw(ctx, t) {
    const base = ctx.getTransform();
    if (!layer || layer.width !== ctx.canvas.width) layer = mkCanvas(ctx.canvas.width, ctx.canvas.height);
    const act = SCENES.filter(s => t >= s.a && t < s.b);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); act[0].draw(ctx, t);
    if (act[1]) { const lc = layer.getContext('2d'); lc.setTransform(base); lc.clearRect(0, 0, W, H); act[1].draw(lc, t);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = easeInOut(prog(t, act[1].a, act[0].b)); ctx.drawImage(layer, 0, 0); ctx.restore(); }
    hookLabel(ctx, t); endCard(ctx, t); paper(ctx, t); captions(ctx, t);
  }
  window.FILM = { load, draw, SCENES };
})();
