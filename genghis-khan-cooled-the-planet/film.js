// film.js — «جنكيز خان برّد الكوكب». Draws one frame at time t. All times come from SCORE (timing.json).
(function () {
  const S = SCORE, mk = S.mk, A = S.anchors, W = S.W, H = S.H, SAFE = S.SAFE;
  const { prog, clamp, lerp, easeOut, easeIn, easeInOut, backOut, mulberry32, arNum } = U;
  const IMG = {};
  let ENV = [], LANDF, BORDERS, GRAIN, LANDTEX, layer;

  // ───────────────────────────── loading ─────────────────────────────
  const FILES = { G01: 'G01_cutout.png', G02: 'G02_mongolian_steppe.jpg', G03: 'G03_ploughed_field.jpg',
    G09: 'G09_forest_before.jpg', G10: 'G10_forest_after.jpg', G05: 'G05_antarctic_ice_aerial.jpg', G06: 'G06_ice_core_sunlight.jpg',
    G07: 'G07_volcano_eruption.jpg', G08: 'G08_endcard.png' };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  async function load() {
    await Promise.all(Object.entries(FILES).map(([k, f]) => new Promise((ok, no) => {
      const i = new Image(); i.onload = () => { IMG[k] = i; ok(); }; i.onerror = () => no(new Error('missing ' + f)); i.src = '../build/' + f; })));
    ENV = await (await fetch('../build/vo_env.json')).json();
    const land = await (await fetch('../node_modules/world-atlas/land-50m.json')).json();
    LANDF = topojson.feature(land, land.objects.land);
    const ct = await (await fetch('../node_modules/world-atlas/countries-50m.json')).json();
    BORDERS = topojson.mesh(ct, ct.objects.countries, (a, b) => a !== b);
    // paper grain
    GRAIN = mkCanvas(512, 512); { const g = GRAIN.getContext('2d'), d = g.createImageData(512, 512), r = mulberry32(11);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - .5) * 90; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); }
    // satellite-ish land texture
    LANDTEX = mkCanvas(1024, 1024); { const g = LANDTEX.getContext('2d'), r = mulberry32(5);
      g.fillStyle = '#6b744a'; g.fillRect(0, 0, 1024, 1024);
      const cols = ['#5c6a3b', '#7d7a4e', '#8f7f55', '#4f6236', '#a08d60', '#68703f'];
      for (let i = 0; i < 1400; i++) { const x = r() * 1024, y = r() * 1024, s = 6 + r() * 60;
        g.globalAlpha = .08 + r() * .14; g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.beginPath(); g.ellipse(x, y, s, s * (.4 + r() * .6), r() * 3, 0, 7); g.fill(); } g.globalAlpha = 1; }
    buildBlooms(); buildPins();
  }

  // ───────────────────────────── helpers ─────────────────────────────
  function shadowed(ctx, size) { ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = size * .28; ctx.shadowOffsetY = size * .06; }
  function label(ctx, text, x, y, o = {}) {
    const size = o.size || 64; ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1);
    ctx.font = `700 ${size}px ${o.font || 'Hand'}`; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (o.clamp !== false) { const hw = ctx.measureText(text).width / 2 + 6; x = clamp(x, SAFE.x + hw, SAFE.x + SAFE.w - hw); }
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale) ctx.scale(o.scale, o.scale);
    shadowed(ctx, size); ctx.fillStyle = o.color || '#fff'; ctx.fillText(text, 0, 0); ctx.restore(); return x;
  }
  // a label that pops in at t0 (and optionally out at t1)
  function pop(ctx, t, t0, text, x, y, o = {}) {
    const p = prog(t, t0, t0 + .35); if (p <= 0) return;
    const out = o.t1 ? 1 - prog(t, o.t1, o.t1 + .25) : 1; if (out <= 0) return;
    label(ctx, text, x, y, { ...o, scale: lerp(.55, 1, backOut(p)), alpha: (o.alpha ?? 1) * clamp(p * 3) * out });
  }
  // thin hand-drawn arrow, drawn on progressively
  function arrow(ctx, x1, y1, x2, y2, p, o = {}) {
    if (p <= 0) return; const bend = o.bend ?? .22, mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
    const pt = u => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
    ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1); ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = o.w || 4; ctx.lineCap = ctx.lineJoin = 'round'; shadowed(ctx, 30);
    ctx.beginPath(); const n = Math.max(1, Math.floor(40 * clamp(p)));
    for (let i = 0; i <= n; i++) { const [x, y] = pt(i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    if (p >= 1) { const [ax, ay] = pt(.9), a = Math.atan2(y2 - ay, x2 - ax); ctx.beginPath();
      ctx.moveTo(x2 - 22 * Math.cos(a - .5), y2 - 22 * Math.sin(a - .5)); ctx.lineTo(x2, y2); ctx.lineTo(x2 - 22 * Math.cos(a + .5), y2 - 22 * Math.sin(a + .5)); ctx.stroke(); }
    ctx.restore();
  }
  // image covering the frame; zoom about focal point (fx, fy) in image fractions
  function cover(ctx, img, z = 1, fx = .5, fy = .5) {
    const s = Math.max(W / img.width, H / img.height) * z, w = img.width * s, h = img.height * s;
    const x = clamp(W / 2 - fx * w, W - w, 0), y = clamp(H / 2 - fy * h, H - h, 0);
    ctx.drawImage(img, x, y, w, h); return { x, y, s };
  }
  const zoomAbout = (ctx, z, cx = W / 2, cy = H / 2) => { ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy); };
  const vo = t => S.vo.find(p => t >= p.start - .04 && t <= p.end + .04);
  const mouthFor = (who, t) => { const p = vo(t); if (!p || p.speaker !== who) return 0; return clamp((ENV[Math.round(t * S.FPS)] || 0) * 1.4); };
  function glowDot(ctx, x, y, r, color, a = 1) {
    ctx.save(); ctx.globalAlpha *= a; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
    g.addColorStop(0, color); g.addColorStop(.3, color.replace(/[\d.]+\)$/, '.45)')); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * .55, 0, 7); ctx.fill(); ctx.restore();
  }

  // ───────────────────────────── the study (study.js) ─────────────────────────────
  // draws the study with camera {z, cx, cy}; states for both people
  function study(ctx, t, cam, dState, fState) {
    ctx.save(); const z = cam.z, vw = W / z, vh = H / z;
    const cx = z >= 1 ? clamp(cam.cx, vw / 2, W - vw / 2) : cam.cx, cy = z >= 1 ? clamp(cam.cy, vh / 2, H - vh / 2) : cam.cy;
    ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
    for (const st of [dState, fState]) if (st.nod === undefined) st.nod = st.mouth;
    STUDY.room(ctx, t, dState, fState); ctx.restore();
  }
  const HD = STUDY.headPos('daughter'), HF = STUDY.headPos('father');

  // ───────────────────────────── scenes ─────────────────────────────
  function studyOpen(ctx, t) {
    const p = easeInOut(prog(t, 0, 6.62)), z = lerp(1.3, 1.6, p);
    const dLook = t < .3 ? .2 : 1, d = { t, expr: 'eager', look: dLook, lookY: t < .3 ? .9 : 0, mouth: mouthFor('daughter', t), gesture: easeOut(prog(t, 1.5, 1.9)) * (1 - prog(t, 5.6, 6.0)) };
    const f = { t, expr: t > mk.hook - .3 ? 'curious' : 'knowledgeable', look: -1, mouth: mouthFor('father', t) };
    study(ctx, t, { z, cx: lerp(550, HD.x + 120, p), cy: lerp(1040, HD.y + 280, p) }, d, f);
  }
  function hookLabel(ctx, t) {   // overlay that carries across the dissolve into the map
    if (t < mk.hook || t > 7.2) return; const a = 1 - prog(t, 6.75, 7.15);
    pop(ctx, t, mk.hook, 'جنكيز خان؟', 800, 400, { size: 92, alpha: a, rot: -.05 });
    arrow(ctx, 760, 470, 660, 590, prog(t, mk.hook + .1, mk.hook + .35), { alpha: a });
  }
  const EMPIRE = [[128, 38], [131, 43], [135, 48], [131, 55], [118, 57], [104, 57], [90, 57], [76, 57], [62, 59], [52, 60], [42, 58], [33, 55], [26, 52], [21, 49], [17, 47],
    [21, 45], [27, 44], [30, 42], [33, 40], [36, 37], [39, 34], [42, 32], [45, 30], [49, 29], [53, 27], [57, 26], [62, 25], [67, 25], [70, 28], [72, 32], [75, 34], [80, 30], [88, 28],
    [97, 27], [100, 22], [106, 21], [111, 20], [117, 23], [121, 28], [122, 31], [121, 37], [124, 40], [126, 38]];
  const MONG = [103, 47];
  function ring(ctx, proj, pts) { ctx.beginPath(); pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length];
    for (let k = 0; k < 6; k++) { const xy = proj([lerp(p[0], q[0], k / 6), lerp(p[1], q[1], k / 6)]); (i || k) ? ctx.lineTo(xy[0], xy[1]) : ctx.moveTo(xy[0], xy[1]); } }); ctx.closePath(); }
  function inPoly(pt, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; }
  function earth(ctx, proj, globe) {
    const path = d3.geoPath(proj, ctx);
    ctx.fillStyle = '#081a2c'; ctx.fillRect(0, 0, W, H);
    if (globe) { const [cx, cy] = proj.translate(), r = proj.scale();
      const at = ctx.createRadialGradient(cx, cy, r * .95, cx, cy, r * 1.12); at.addColorStop(0, 'rgba(120,180,255,.35)'); at.addColorStop(1, 'rgba(120,180,255,0)');
      ctx.fillStyle = at; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, 7); ctx.fill(); }
    ctx.save(); ctx.beginPath(); path({ type: 'Sphere' }); const oc = ctx.createLinearGradient(0, 0, 0, H); oc.addColorStop(0, '#123a5f'); oc.addColorStop(1, '#0b2742'); ctx.fillStyle = oc; ctx.fill(); ctx.clip();
    ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); path(LANDF); ctx.fillStyle = ctx.createPattern(LANDTEX, 'repeat'); ctx.fill();
    ctx.strokeStyle = 'rgba(230,220,190,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.beginPath(); path(BORDERS); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
    if (globe) { const [cx, cy] = proj.translate(), r = proj.scale(); const sh = ctx.createRadialGradient(cx - r * .4, cy - r * .4, r * .2, cx, cy, r * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,.06)'); sh.addColorStop(1, 'rgba(0,0,20,.45)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H); }
    ctx.restore(); return path;
  }
  // land ∩ empire clip
  function clipEmpire(ctx, proj, path) { ctx.beginPath(); path(LANDF); ctx.clip(); ring(ctx, proj, EMPIRE); ctx.clip(); }
  const TIDE_SEEDS = (() => { const r = mulberry32(21), a = []; while (a.length < 40) { const p = [16 + r() * 120, 20 + r() * 42]; if (inPoly(p, EMPIRE)) a.push(p); } return a; })();

  function mapMongolia(ctx, t) {
    const a = easeInOut(prog(t, 6.32, 8.9)), zin = easeInOut(prog(t, 6.9, 9.4)), zout = easeInOut(prog(t, 10.55, 11.61));
    let rot = [lerp(-15, -103, a), lerp(-10, -47, a)], sc = lerp(430, 1350, zin), tr = [lerp(540, 640, zin), lerp(900, 720, zin)];
    rot = [lerp(rot[0], -74, zout), lerp(rot[1], -42, zout)]; sc = lerp(sc, 690, zout); tr = [lerp(tr[0], 540, zout), lerp(tr[1], 860, zout)];
    const proj = d3.geoOrthographic().rotate(rot).scale(sc).translate(tr).clipAngle(90), path = earth(ctx, proj, sc < 1000);
    // red tide
    if (t >= mk.tide) { const p = easeOut(prog(t, mk.tide, end6)), R = 4 + 82 * p; ctx.save(); clipEmpire(ctx, proj, path);
      ctx.fillStyle = 'rgba(200,30,30,.58)'; ctx.beginPath(); path(d3.geoCircle().center(MONG).radius(R).precision(1)()); ctx.fill();
      for (const s of TIDE_SEEDS) { const d = d3.geoDistance(s, MONG) * 180 / Math.PI; if (d < R + 6) { ctx.beginPath(); path(d3.geoCircle().center(s).radius(clamp((R + 6 - d) / 2, 0, 9))()); ctx.fill(); } }
      ctx.restore(); }
    // Mongolia marker
    const m = proj(MONG), ma = prog(t, 8.6, 9.0) * (1 - prog(t, 13.4, 13.9));
    if (ma > 0) { glowDot(ctx, m[0], m[1], 12 + 3 * Math.sin(t * 6), 'rgba(255,90,60,1)', ma);
      ctx.save(); ctx.globalAlpha = ma; ctx.strokeStyle = 'rgba(255,140,110,.8)'; ctx.lineWidth = 3; const pr = (t * 1.2) % 1; ctx.beginPath(); ctx.arc(m[0], m[1], 20 + pr * 60, 0, 7); ctx.globalAlpha = ma * (1 - pr); ctx.stroke(); ctx.restore(); }
    pop(ctx, t, A.mongolia, 'منغوليا', m[0] + 40, m[1] - 120, { size: 76, t1: 10.5 });
    pop(ctx, t, A.year1206, '١٢٠٦', 860, 330, { size: 96, t1: 10.5, color: '#ffd9a0' });
    // portrait bust slides in from the left (fully on before «جنكيز خان.» ends)
    const pin = easeOut(prog(t, mk.portrait, mk.portrait + .55)), pout = easeIn(prog(t, 10.45, 10.95));
    if (pin > 0 && pout < 1) { const ih = 820, iw = ih * IMG.G01.width / IMG.G01.height, x = lerp(-iw - 40, 10, pin) - pout * (iw + 60);
      ctx.save(); ctx.translate(x + iw / 2, 1470 - ih / 2); ctx.rotate(-.025); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetX = 12;
      ctx.drawImage(IMG.G01, -iw / 2, -ih / 2, iw, ih); ctx.restore(); }
    // counter
    if (t >= mk.tide) { const p = easeOut(prog(t, mk.tide, end6)), a = clamp(prog(t, mk.tide, mk.tide + .3)) * (1 - prog(t, 13.7, 14.1));
      label(ctx, arNum(22 * p) + '٪', 820, 360, { size: 130, font: 'Cap', alpha: a, color: '#ff8a7a' }); label(ctx, 'من اليابسة', 820, 470, { size: 58, alpha: a }); }
  }
  const end6 = S.vo.find(p => p.i === 6).end;

  function gridScene(ctx, t) {
    ctx.save(); const z = lerp(1.04, 1.12, prog(t, 13.85, 19.95)); zoomAbout(ctx, z, 540, 1500);
    cover(ctx, IMG.G02, 1, lerp(.48, .62, prog(t, 13.85, 19.95)), .5); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, 1300); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 1300);
    const r = mulberry32(40), pick = new Set(); while (pick.size < 10) pick.add(Math.floor(r() * 100));
    const x0 = 165, y0 = 360, dx = 83, dy = 82;
    for (let i = 0; i < 100; i++) { const cx = x0 + (i % 10) * dx, cy = y0 + Math.floor(i / 10) * dy, fa = prog(t, 14.1 + (i % 10 + Math.floor(i / 10)) * .035, 14.4 + (i % 10 + Math.floor(i / 10)) * .035);
      if (fa <= 0) continue; let col = '#f4f1ea', yy = cy, a = fa;
      if (pick.has(i)) { const rd = prog(t, mk.forty, mk.forty + .2), dr = prog(t, mk.forty + .35, mk.forty + 1.25);
        if (rd > 0) col = rd < 1 ? '#f08070' : '#e0352b'; yy = cy + 700 * easeIn(dr); a *= 1 - dr;
        if (t > A.tenpct && dr >= 1) { ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = `rgba(224,53,43,${.9 * prog(t, A.tenpct, A.tenpct + .3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 7); ctx.stroke(); ctx.restore(); } }
      if (a <= 0) continue; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, yy - 16, 11, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.roundRect(cx - 15, yy - 2, 30, 34, [12, 12, 4, 4]); ctx.fill(); ctx.restore(); }
    pop(ctx, t, mk.forty + .1, '٤٠ مليون', 540, 1250, { size: 150, color: '#ff6b5e', font: 'Hand' });
    pop(ctx, t, A.tenpct, '١٠٪ من سكان الأرض', 540, 1395, { size: 68 });
  }

  function fieldScene(ctx, t) {
    ctx.save(); zoomAbout(ctx, lerp(1.0, 1.08, prog(t, 19.65, mk.before)), 540, 1100); cover(ctx, IMG.G03, 1, .5, .5); ctx.restore();
    pop(ctx, t, mk.farms, 'المزارع فضيت', 540, 1000, { size: 96 });
    arrow(ctx, 500, 1060, 430, 1260, prog(t, mk.farms + .15, mk.farms + .45));
  }
  // forests: before (sparse hillside) on «يقطع شجر», after (green valley) on «رجعت»
  function forestBefore(ctx, t) {
    const p = prog(t, mk.before - .3, mk.forest); ctx.save(); zoomAbout(ctx, lerp(1.06, 1.14, p)); cover(ctx, IMG.G09, 1, lerp(.42, .55, p), .5); ctx.restore();
    pop(ctx, t, mk.before + .05, 'قبل', 540, 360, { size: 104 });
  }
  function forestAfter(ctx, t) {
    const p = prog(t, mk.forest - .3, mk.blooms + .3); ctx.save(); zoomAbout(ctx, lerp(1.04, 1.12, p)); cover(ctx, IMG.G10, 1, lerp(.5, .4, p), .5); ctx.restore();
    pop(ctx, t, mk.forest + .05, 'بعد', 540, 360, { size: 104 });
    pop(ctx, t, mk.forest + .2, 'الغابات رجعت', 540, 520, { size: 92 });
  }

  // blooms + CO₂ bubbles (map 2)
  let BLOOMS = []; function buildBlooms() { const r = mulberry32(31); while (BLOOMS.length < 64) { const p = [18 + r() * 116, 22 + r() * 38];
    if (inPoly(p, EMPIRE) && d3.geoContains(LANDF, p)) BLOOMS.push({ p, t0: mk.blooms + .1 + r() * 2.9, r: 12 + r() * 20, k: r() }); } }
  function mapBlooms(ctx, t) {
    const p = prog(t, 24.94, 32.24), proj = d3.geoOrthographic().rotate([-76, -43]).scale(lerp(760, 820, p)).translate([540, 900]).clipAngle(90), path = earth(ctx, proj, false);
    ctx.save(); clipEmpire(ctx, proj, path); ctx.fillStyle = 'rgba(150,25,25,.28)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.setLineDash([10, 8]); ring(ctx, proj, EMPIRE); ctx.strokeStyle = 'rgba(255,120,110,.45)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    ctx.save(); clipEmpire(ctx, proj, path);
    for (const b of BLOOMS) { const g = backOut(prog(t, b.t0, b.t0 + .6)); if (g <= 0) continue; const [x, y] = proj(b.p), rr = b.r * g;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, rr * 1.6); gr.addColorStop(0, 'rgba(120,220,110,.95)'); gr.addColorStop(.6, 'rgba(60,160,70,.85)'); gr.addColorStop(1, 'rgba(40,130,60,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rr * 1.6, 0, 7); ctx.fill(); }
    ctx.restore();
    // CO₂ bubbles fall into the green
    if (t >= mk.carbon) { const r = mulberry32(77);
      for (let i = 0; i < 40; i++) { const b = BLOOMS[Math.floor(r() * BLOOMS.length)], [tx, ty] = proj(b.p), t0 = mk.carbon + i * .055 + r() * .1, du = 1.1 + r() * .7, sx = tx + (r() - .5) * 160, sy = 240 + r() * 220;
        const q = prog(t, t0, t0 + du); if (q <= 0 || q >= 1) continue;
        const x = lerp(sx, tx, easeInOut(q)), y = lerp(sy, ty, easeIn(q)), a = q < .85 ? 1 : 1 - (q - .85) / .15, rad = 15 * (q < .85 ? 1 : a);
        ctx.save(); ctx.globalAlpha = .9 * a; ctx.strokeStyle = 'rgba(230,240,255,.9)'; ctx.fillStyle = 'rgba(180,200,220,.25)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.stroke();
        ctx.font = '700 13px Cap'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('CO₂', x, y + 1); ctx.restore(); } }
    // counter: area, then flips to carbon
    const a = prog(t, mk.blooms, mk.blooms + .3), area = arNum(142000 * easeOut(prog(t, mk.blooms, 28.34))) + ' كم²';
    const flip = prog(t, mk.carbon, mk.carbon + .3);
    ctx.save(); ctx.translate(540, 380); ctx.scale(1, Math.abs(Math.cos(flip * Math.PI)) || .001);
    if (flip < .5) label(ctx, area, 0, 0, { size: 110, font: 'Cap', alpha: a, color: '#9df29a', clamp: false });
    else label(ctx, '٧٠٠ مليون طن', 0, 0, { size: 110, font: 'Cap', color: '#e6f0ff', clamp: false });
    ctx.restore();
    if (flip >= .5) pop(ctx, t, mk.carbon + .2, 'كربون اتشفط من الجو', 540, 500, { size: 56 });
    // «غابة جديدة» label to a bloom cluster
    const tb = BLOOMS.reduce((m, b) => (d3.geoDistance(b.p, [90, 45]) < d3.geoDistance(m.p, [90, 45]) ? b : m)), [bx, by] = proj(tb.p);
    pop(ctx, t, A.ghaba, 'غابة جديدة', 360, 1380, { size: 84, t1: mk.carbon - .1 });
    if (t < mk.carbon) arrow(ctx, 380, 1320, bx - 10, by + 25, prog(t, A.ghaba + .15, A.ghaba + .45));
  }

  function studyDaughter(ctx, t) {
    const z = lerp(2.0, 2.15, prog(t, 31.94, 34.5));
    const d = { t, expr: 'critical', look: .9, glasses: true, mouth: mouthFor('daughter', t), tilt: -.08, gesture: easeOut(prog(t, 32.5, 32.85)) };
    const f = { t, expr: 'knowledgeable', look: -1, mouth: 0 };
    study(ctx, t, { z, cx: HD.x + 60, cy: HD.y + 160 }, d, f);
    const p = backOut(prog(t, mk.whatmeans + .15, mk.whatmeans + .5)); if (p > 0) { ctx.save(); ctx.translate(800, 470); ctx.scale(p, p);
      ctx.fillStyle = '#fbf7ef'; shadowed(ctx, 40); ctx.beginPath(); ctx.ellipse(0, 0, 210, 120, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-110, 70); ctx.lineTo(-210, 210); ctx.lineTo(-30, 100); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.font = '700 84px Hand'; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#222'; ctx.fillText('يعني إيه؟', 0, 8); ctx.restore(); }
  }

  function pump(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#d9472b'; ctx.beginPath(); ctx.roundRect(-55, -120, 110, 230, 14); ctx.fill();
    ctx.fillStyle = '#f6efe4'; ctx.beginPath(); ctx.roundRect(-38, -95, 76, 58, 8); ctx.fill(); ctx.fillStyle = '#333'; ctx.fillRect(-28, -84, 56, 14); ctx.fillRect(-28, -62, 40, 10);
    ctx.fillStyle = '#a73420'; ctx.fillRect(-62, 100, 124, 22); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(55, -40); ctx.quadraticCurveTo(100, -20, 85, 50); ctx.stroke(); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(74, 40, 22, 36); ctx.restore();
  }
  function petrolScene(ctx, t) {
    ctx.fillStyle = '#14161b'; ctx.fillRect(0, 0, W, H); const v = ctx.createRadialGradient(540, 900, 100, 540, 900, 1100); v.addColorStop(0, 'rgba(60,70,90,.35)'); v.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // the world, puffing (until the pumps take over)
    const ga = prog(t, 34.3, 34.7) * (1 - prog(t, mk.pumps, mk.pumps + .35));
    if (ga > 0) { ctx.save(); ctx.globalAlpha = ga; const proj = d3.geoOrthographic().rotate([-20 - t * 12, -20]).scale(190).translate([540, 900]).clipAngle(90); earth(ctx, proj, true); ctx.restore();
      ctx.save(); ctx.globalAlpha = ga; const r = mulberry32(3); for (let i = 0; i < 14; i++) { const t0 = 34.4 + r() * 2, q = ((t - t0) / 1.6 % 1 + 1) % 1, a0 = r() * 6.28;
        ctx.fillStyle = `rgba(150,150,150,${.45 * (1 - q)})`; ctx.beginPath(); ctx.arc(540 + Math.cos(a0) * 170 + Math.cos(a0) * q * 80, 900 + Math.sin(a0) * 170 - q * 140, 18 + q * 40, 0, 7); ctx.fill(); } ctx.restore();
      pop(ctx, t, A.world, 'العالم كله', 540, 1190, { size: 84, alpha: ga }); }
    // pumps fill the frame
    for (let i = 0; i < 10; i++) { const p = backOut(prog(t, mk.pumps + i * .035, mk.pumps + .3 + i * .035)); if (p <= 0) continue;
      pump(ctx, 160 + (i % 5) * 190, 860 + Math.floor(i / 5) * 300, .95 * p); }
    // calendar flip «٣٦٥ يوم»
    const ca = prog(t, mk.pumps + .05, mk.pumps + .3); if (ca > 0) { ctx.save(); ctx.globalAlpha = ca; ctx.translate(540, 470);
      ctx.fillStyle = '#f6efe4'; ctx.beginPath(); ctx.roundRect(-150, -120, 300, 250, 16); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.roundRect(-150, -120, 300, 62, [16, 16, 0, 0]); ctx.fill();
      ctx.fillStyle = '#333'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s * 70 - 8, -140, 16, 44, 8); ctx.fill(); }
      const fp = prog(t, mk.year, mk.year + .3);
      ctx.font = '700 104px Cap'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#222'; ctx.direction = 'rtl'; ctx.fillText(fp > .5 ? '٣٦٥' : '١', 0, 25);
      ctx.font = '700 40px Cap'; ctx.fillStyle = '#fff'; ctx.fillText('يوم', 0, -88);
      if (fp > 0 && fp < 1) { ctx.save(); ctx.scale(1, Math.cos(fp * Math.PI)); ctx.fillStyle = fp < .5 ? '#f6efe4' : '#e8dfcf'; ctx.fillRect(-150, -58 * Math.sign(Math.cos(fp * Math.PI)), 300, 188 * Math.sign(Math.cos(fp * Math.PI))); ctx.restore(); }
      ctx.restore(); }
    pop(ctx, t, mk.year + .5, 'سنة بنزين كاملة', 540, 1370, { size: 84 });
    // the canopy sweeps up and swallows the pumps
    const sw = easeOut(prog(t, mk.swallow, mk.swallow + .55)); if (sw > 0) { const top = lerp(H + 80, 640, sw), r = mulberry32(9);
      for (let layer = 0; layer < 3; layer++) { ctx.fillStyle = ['#1f5e2c', '#2f7a36', '#4a9a44'][layer];
        ctx.beginPath(); ctx.moveTo(-20, H + 20); for (let x = -40; x <= W + 60; x += 70) { const yy = top + layer * 70 + r() * 40; ctx.arc(x, yy, 70 + r() * 30, Math.PI, 0); } ctx.lineTo(W + 20, H + 20); ctx.closePath(); ctx.fill(); } }
  }

  // pins (map 3)
  let PINS = []; function buildPins() { PINS = [
    { at: mk.pin1, ll: [12, 49], txt: 'الطاعون ١٣٥٠', dx: -40, dy: -110 }, { at: mk.pin2, ll: [113, 31], txt: 'أسرة مينج ١٦٥٠', dx: -40, dy: 110 },
    { at: mk.pin3, ll: [-88, 17], txt: 'غزو أمريكا ١٥٠٠', dx: 60, dy: -110 }, { at: mk.pin4, ll: [103, 47], txt: 'المغول ١٢٠٠', dx: -60, dy: -120, mongol: true }]; }
  function mapPins(ctx, t) {
    const pull = easeOut(prog(t, 39.15, 40.7)), proj = d3.geoNaturalEarth1().rotate([-8, 0]).scale(lerp(380, 280, pull)).translate([540, lerp(980, 960, pull)]);
    earth(ctx, proj, false);
    pop(ctx, t, A.arba3, '٤ كوارث', 540, 470, { size: 110 });
    const only = prog(t, mk.only, mk.only + .4);
    for (const p of PINS) { const q = backOut(prog(t, p.at, p.at + .35)); if (q <= 0) continue; const [x, y] = proj(p.ll), dim = p.mongol ? 0 : only;
      const pulse = p.mongol ? 1 + .6 * only * (.5 + .5 * Math.sin((t - mk.only) * 7)) : 1;
      const col = dim > 0 ? `rgba(${lerp(255, 140, dim)},${lerp(80, 140, dim)},${lerp(60, 140, dim)},1)` : 'rgba(255,80,60,1)';
      ctx.save(); ctx.globalAlpha = q < 1 ? clamp(q) : 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40 * q); ctx.stroke(); ctx.restore();
      glowDot(ctx, x, y - 40 * q, 13 * pulse * clamp(q, 0, 1.2), p.mongol && only > 0 ? 'rgba(120,230,110,1)' : col, 1 - .5 * dim);
      label(ctx, p.txt, x + p.dx, y + p.dy, { size: 64, alpha: clamp(q) * (1 - .55 * dim) }); }
    // trees sprout around the Mongol pin
    if (only > 0) { const [mx, my] = proj(MONG), r = mulberry32(64);
      for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = 40 + r() * 70, x = mx + Math.cos(a) * d, y = my + Math.sin(a) * d * .7, g = backOut(prog(t, mk.only + .1 + i * .06, mk.only + .45 + i * .06)); if (g <= 0) continue;
        ctx.save(); ctx.translate(x, y); ctx.scale(g, g); ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke();
        ctx.fillStyle = i % 2 ? '#4caf50' : '#6fcf5a'; ctx.beginPath(); ctx.arc(0, -24, 12, 0, 7); ctx.fill(); ctx.restore(); } }
  }

  function iceScene(ctx, t) {
    const p = prog(t, 47.29, 50.65); ctx.save(); zoomAbout(ctx, lerp(1.04, 1.14, p)); cover(ctx, IMG.G05, 1, lerp(.6, .42, p), .5); ctx.restore();
    pop(ctx, t, mk.ice + .3, 'القطب الجنوبي', 540, 420, { size: 92 });
  }
  const CORE_BUB = (() => { const r = mulberry32(55), a = []; for (let i = 0; i < 7; i++) a.push([380 + r() * 320, 620 + r() * 620]); return a; })();
  function coreLine(ctx, t, t0, t1, spikeAt) {   // CO₂ line across the frame; flat, or spiking
    const p = prog(t, t0, t1); if (p <= 0) return; const r = mulberry32(12), pts = [];
    for (let x = 90; x <= 990; x += 10) { let y = 1080 + (r() - .5) * 6; if (spikeAt) { const d = (x - spikeAt) / 60; y -= 560 * Math.exp(-d * d) * (x > spikeAt - 40 ? 1 : .9); } pts.push([x, y]); }
    const n = Math.floor(pts.length * p); ctx.save(); ctx.lineCap = ctx.lineJoin = 'round';
    for (const [w, c] of [[16, spikeAt ? 'rgba(255,120,60,.25)' : 'rgba(150,220,255,.25)'], [5, spikeAt ? '#ffd2a0' : '#e8f7ff']]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.slice(0, Math.max(2, n)).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
    ctx.font = '700 40px Cap'; ctx.fillStyle = '#fff'; shadowed(ctx, 40); ctx.textAlign = 'left'; ctx.fillText('CO₂', 92, 1030); ctx.restore();
  }
  function coreScene(ctx, t) {
    const p = prog(t, 50.40, 57.06); ctx.save(); zoomAbout(ctx, lerp(1.0, 1.12, easeInOut(p)), 540, 900);
    cover(ctx, IMG.G06, 1, .45, .5);
    const ba = prog(t, mk.bubbles, mk.bubbles + .4);
    if (ba > 0) for (const [i, [x, y]] of CORE_BUB.entries()) glowDot(ctx, x, y, 9 + 3 * Math.sin(t * 5 + i), 'rgba(255,240,180,1)', ba);
    ctx.restore();
    coreLine(ctx, t, mk.core + .25, A.qutb + .6, 0);
    pop(ctx, t, mk.bubbles + .1, 'هوا من ٨٠٠ سنة', 540, 420, { size: 84 });
    const [bx, by] = CORE_BUB[0]; arrow(ctx, 520, 480, bx + 20, by - 30, prog(t, mk.bubbles + .25, mk.bubbles + .55));
  }
  function volcanoScene(ctx, t) {
    const k = Math.exp(-(t - mk.volcano) * 4), sx = Math.sin(t * 71) * 14 * k, sy = Math.cos(t * 53) * 12 * k;
    ctx.save(); ctx.translate(sx, sy); zoomAbout(ctx, lerp(1.06, 1.1, prog(t, 57.06, 58.2))); cover(ctx, IMG.G07, 1, .55, .5); ctx.restore();
    coreLine(ctx, t, mk.volcano, mk.volcano + .3, 640);
    pop(ctx, t, mk.volcano + .12, 'البراكين', 330, 450, { size: 100, color: '#ffd2a0' });
    arrow(ctx, 420, 480, 610, 530, prog(t, mk.volcano + .25, mk.volcano + .5));
  }
  function studyClose(ctx, t) {
    const ec = easeInOut(prog(t, mk.endcard, mk.endcard + .6)), z = lerp(1.32, 1.05, ec);
    const chuckling = t >= A.chuckle && t < mk.tocamera, toCam = easeInOut(prog(t, mk.tocamera - .15, mk.tocamera + .25));
    const d = { t, expr: 'eager', look: 1, mouth: mouthFor('daughter', t), lean: .1 * easeOut(prog(t, 57.8, 58.6)), gesture: easeOut(prog(t, 58.4, 58.8)) * (1 - prog(t, 60.9, 61.3)) };
    const f = { t, expr: chuckling ? 'chuckle' : t >= mk.tocamera ? 'wry' : 'curious', look: lerp(-1, 0, toCam), mouth: chuckling ? .25 + .2 * Math.abs(Math.sin(t * 18)) : mouthFor('father', t),
      gesture: easeOut(prog(t, mk.endcard - .1, mk.endcard + .3)), pointDir: 0, tilt: chuckling ? .05 * Math.sin(t * 20) : 0 };
    study(ctx, t, { z, cx: 550, cy: lerp(1050, 980, ec) }, d, f);
    if (ec > 0) { ctx.fillStyle = `rgba(0,0,0,${.4 * ec})`; ctx.fillRect(0, 0, W, H); }
  }

  // end card: G08 banner, centred inside SAFE, slides in from the right
  const BTN = { like: [772, 373, 227, 84], sub: [1031, 375, 285, 80] };   // in cropped-banner pixels
  function endCard(ctx, t) {
    if (t < mk.endcard) return; const p = backOut(prog(t, mk.endcard, mk.endcard + .62)), ox = (1 - p) * W * 1.05;
    const img = IMG.G08, bw = SAFE.w, bh = bw * img.height / img.width, bx = SAFE.x + ox, by = 960 - bh / 2 - 40;
    ctx.save(); ctx.translate(ox, 0); ctx.fillStyle = '#120f08'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .55; ctx.filter = 'blur(28px)'; ctx.drawImage(img, -700, 200, W + 1400, (W + 1400) * img.height / img.width); ctx.filter = 'none'; ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(540, 920, 200, 540, 920, 1100); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.8)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore();
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
    ctx.save(); let size = 60; ctx.font = `700 ${size}px Cap`; const w = ctx.measureText(s.text).width; if (w > SAFE.w - 20) size *= (SAFE.w - 20) / w;
    ctx.globalAlpha = a; ctx.font = `700 ${size}px Cap`; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 3; ctx.fillStyle = '#fff'; ctx.fillText(s.text, 540, 1505 + (1 - a) * 6);
    ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.fillText(s.text, 540, 1505 + (1 - a) * 6); ctx.restore();
  }
  function paper(ctx, t) {   // STYLE 'paper': grain, warm tint, vignette
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = .12; const f = Math.floor(t * S.FPS), r = mulberry32(f + 1);
    ctx.translate(-r() * 512, -r() * 512); ctx.fillStyle = ctx.createPattern(GRAIN, 'repeat'); ctx.fillRect(0, 0, W + 1024, H + 1024); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,225,180,.35)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const v = ctx.createRadialGradient(540, 960, 600, 540, 960, 1250); v.addColorStop(0, 'rgba(20,10,0,0)'); v.addColorStop(1, 'rgba(20,10,0,.45)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  // ───────────────────────────── timeline ─────────────────────────────
  // a/b: scene in/out. overlap = dissolve. The only hard cut is core → volcano.
  const SCENES = [
    { name: 'study-open', a: 0, b: 6.62, kind: 'study', chars: true, draw: studyOpen },
    { name: 'map-mongolia', a: 6.32, b: 14.15, kind: 'map', draw: mapMongolia },
    { name: 'grid-steppe', a: 13.85, b: 19.95, kind: 'photo', photo: 'G02', draw: gridScene },
    { name: 'field', a: 19.65, b: mk.before, kind: 'photo', photo: 'G03', draw: fieldScene },
    { name: 'forest-before', a: mk.before - .3, b: mk.forest, kind: 'photo', photo: 'G09', draw: forestBefore },
    { name: 'forest-after', a: mk.forest - .3, b: mk.blooms + .3, kind: 'photo', photo: 'G10', draw: forestAfter },
    { name: 'map-blooms', a: mk.blooms, b: mk.whatmeans, kind: 'map', draw: mapBlooms },
    { name: 'study-daughter', a: mk.whatmeans - .3, b: 34.5, kind: 'study', chars: true, draw: studyDaughter },
    { name: 'stat-petrol', a: 34.2, b: 39.45, kind: 'stat', draw: petrolScene },
    { name: 'map-pins', a: 39.15, b: mk.ice, kind: 'map', draw: mapPins },
    { name: 'ice', a: mk.ice - .3, b: mk.core, kind: 'photo', photo: 'G05', draw: iceScene },
    { name: 'core', a: mk.core - .25, b: mk.volcano, kind: 'photo', photo: 'G06', draw: coreScene },
    { name: 'volcano', a: mk.volcano, b: mk.back + .5, kind: 'photo', photo: 'G07', hardIn: true, draw: volcanoScene },
    { name: 'study-close', a: mk.back, b: S.DURATION + 1, kind: 'study', chars: true, draw: studyClose },
  ];

  function draw(ctx, t) {
    const base = ctx.getTransform();
    if (!layer || layer.width !== ctx.canvas.width) { layer = mkCanvas(ctx.canvas.width, ctx.canvas.height); }
    const act = SCENES.filter(s => t >= s.a && t < s.b);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    act[0].draw(ctx, t);
    if (act[1]) { const lc = layer.getContext('2d'); lc.setTransform(base); lc.clearRect(0, 0, W, H); act[1].draw(lc, t);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = easeInOut(prog(t, act[1].a, act[0].b)); ctx.drawImage(layer, 0, 0); ctx.restore(); }
    hookLabel(ctx, t); endCard(ctx, t); paper(ctx, t); captions(ctx, t);
  }

  window.FILM = { load, draw, SCENES };
})();
