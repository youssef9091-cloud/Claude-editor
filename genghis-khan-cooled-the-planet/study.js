// study.js — the two presenters (from the character sheet, assets/ref_character_sheet.png)
// and the study set (modelled on assets/ref_study_room.png). Flat illustration, dark outlines.
(function () {
  const { clamp, lerp, mulberry32 } = U;
  const INK = '#33241b';

  // ── drawing primitives ──
  function limb(ctx, pts, w, color, ink = INK, ow = 3.2) {
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const [lw, c] of [[w + ow * 2, ink], [w, color]]) { ctx.lineWidth = lw; ctx.strokeStyle = c; ctx.beginPath();
      pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  }
  function blob(ctx, fill, build, lw = 3.2, ink = INK) { ctx.beginPath(); build(); ctx.fillStyle = fill; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.stroke(); } }
  function ell(ctx, x, y, rx, ry, rot = 0) { ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, Math.PI * 2); }

  // ── the presenters: cut-out puppets traced from the character sheet (engine/trace_characters.py) ──
  // units are sheet pixels inside each piece; pivot = neck pivot; neck = head/body split line; cut = where the table hides the body
  const PZ = {
    d_front:    { w: 116, h: 200, res: 8, neck: 73, pivot: [56, 76], eyes: [[44.4, 43.1], [67.5, 43.0]], eye: [3.9, 2.2], mouth: [55.6, 61.3], mw: 6.0, skin: '#c27e50', lip: '#9a4a36' },
    d_critical: { w: 69, h: 69, res: 16, pivot: [34.5, 69], eyes: [[25.3, 33.3], [41.2, 33.3]], eye: [3.3, 2.0], mouth: [32.8, 46.4], mw: 4.6, skin: '#bd7851', lip: '#9a4a36' },
    f_front:    { w: 104, h: 197, res: 8, neck: 64, pivot: [57, 68], eyes: [[50.3, 35.3], [63.3, 35.3]], eye: [3.2, 1.8], mouth: [57.1, 50.9], mw: 4.6, skin: '#ad724c', glasses: true },
    f_34:       { w: 105, h: 197, res: 8, neck: 66, pivot: [44, 70], eyes: [[33.6, 37.3], [51.3, 37.3]], eye: [3.2, 1.8], mouth: [42.2, 52.8], mw: 4.6, skin: '#ab7856' },
  };
  const CANV = {};
  async function loadPuppets() {
    await Promise.all(Object.entries(PZ).map(([k, P]) => new Promise((ok, no) => { const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = P.w * P.res; c.height = P.h * P.res; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); CANV[k] = c; ok(); };
      im.onerror = () => no(new Error('missing puppet ' + k)); im.src = '../build/chars/' + k + '.svg'; })));
  }
  const blinks = {}; for (const [n, sd] of [['father', 3], ['daughter', 8]]) { const r = mulberry32(sd), a = []; let t = .8 + r() * 2; while (t < 90) { a.push(t); t += 2.2 + r() * 2.6; } blinks[n] = a; }
  const blinkAt = (n, t) => { for (const b of blinks[n]) if (t >= b && t < b + .16) return Math.sin(Math.PI * (t - b) / .16); return 0; };

  // face overlays in piece units (drawn inside the head transform)
  function face(ctx, P, X, Y, k, st, who) {
    const bl = blinkAt(who, st.t);
    if (bl > .05) for (const [ex, ey] of P.eyes) { ctx.save(); ctx.fillStyle = P.skin; ctx.beginPath();
      ctx.ellipse(X(ex), Y(ey) - P.eye[1] * k * (1 - bl) * .9, P.eye[0] * 1.3 * k, P.eye[1] * 1.7 * k * bl + 1, 0, 0, Math.PI * 2); ctx.fill();
      if (bl > .6) { ctx.strokeStyle = '#2a1810'; ctx.lineWidth = Math.max(1.5, .55 * k); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(ex - P.eye[0] * 1.05), Y(ey + .2)); ctx.quadraticCurveTo(X(ex), Y(ey + 1.3), X(ex + P.eye[0] * 1.05), Y(ey + .2)); ctx.stroke(); } ctx.restore(); }
    if (P.glasses || st.glasses) { ctx.save(); ctx.strokeStyle = st.glasses || '#3a2a20'; ctx.lineWidth = (st.glasses ? 1.0 : .8) * k; ctx.lineJoin = 'round';
      for (const [ex, ey] of P.eyes) { ctx.beginPath(); ctx.roundRect(X(ex - 4.5), Y(ey - 2.9), 9 * k, 5.8 * k, 1.6 * k); ctx.stroke(); }
      const [a, b] = P.eyes; ctx.beginPath(); ctx.moveTo(X(a[0] + 4.5), Y(a[1] - 1)); ctx.quadraticCurveTo(X((a[0] + b[0]) / 2), Y(a[1] - 2), X(b[0] - 4.5), Y(b[1] - 1)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(a[0] - 4.5), Y(a[1] - 1.5)); ctx.lineTo(X(a[0] - 8.5), Y(a[1] - .8)); ctx.moveTo(X(b[0] + 4.5), Y(b[1] - 1.5)); ctx.lineTo(X(b[0] + 8.5), Y(b[1] - .8)); ctx.stroke(); ctx.restore(); }
    const mo = st.mouth || 0;
    if (mo > .06) { const [mx, my] = P.mouth, w = P.mw * (.82 - .12 * mo), h = .7 + 3.4 * mo; ctx.save();
      ctx.fillStyle = '#4e1712'; ctx.strokeStyle = P.lip || '#5a2a1c'; ctx.lineWidth = Math.max(1.2, .45 * k);
      ctx.beginPath(); ctx.moveTo(X(mx - w), Y(my)); ctx.quadraticCurveTo(X(mx), Y(my - .5), X(mx + w), Y(my)); ctx.quadraticCurveTo(X(mx), Y(my + h * 1.15), X(mx - w), Y(my)); ctx.fill(); ctx.stroke();
      ctx.clip(); ctx.fillStyle = '#f3ece4'; ctx.fillRect(X(mx - w), Y(my - .6), 2 * w * k, (.55 + .5 * mo) * k);
      if (mo > .35) { ctx.fillStyle = '#b5483f'; ctx.beginPath(); ctx.ellipse(X(mx), Y(my + h * .95), w * .55 * k, h * .3 * k, 0, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  }
  // draw one puppet so its neck pivot lands at (ax, ay); k = px per sheet unit
  function puppet(ctx, key, ax, ay, k, st, who, alpha = 1) {
    const P = PZ[key], C = CANV[key]; if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const x0 = ax - P.pivot[0] * k, y0 = ay - P.pivot[1] * k, X = u => x0 + u * k, Y = v => y0 + v * k;
    if (P.neck === undefined) {   // a bust: one piece, gentle tilt about the chin
      ctx.translate(X(P.mouth[0]), Y(P.h)); ctx.rotate(st.tilt || 0); ctx.translate(-X(P.mouth[0]), -Y(P.h));
      ctx.drawImage(C, x0, y0, P.w * k, P.h * k); face(ctx, P, X, Y, k, st, who); ctx.restore(); return;
    }
    // breathing + lean, about the hips
    const hipY = Y(P.h), br = 1 + .007 * Math.sin(st.t * 1.8 + (who === 'father' ? 1 : 0));
    ctx.translate(ax, hipY); ctx.rotate(st.lean || 0); ctx.scale(1, br); ctx.translate(-ax, -hipY);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 60, Y(P.neck), P.w * k + 120, (P.h - P.neck) * k + 4); ctx.clip(); ctx.drawImage(C, x0, y0, P.w * k, P.h * k); ctx.restore();
    // head: tilt about the neck pivot, plus a tiny squash for nods
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(clamp(st.tilt || 0, -.05, .05)); ctx.scale(1, 1 - clamp(st.nod || 0, 0, 1) * .018); ctx.translate(-ax, -ay);
    ctx.beginPath(); ctx.rect(x0 - 60, y0 - 60, P.w * k + 120, (P.neck + 2.2) * k + 60); ctx.clip();
    ctx.drawImage(C, x0, y0, P.w * k, P.h * k); face(ctx, P, X, Y, k, st, who); ctx.restore();
    ctx.restore();
  }
  // seated positions (room coords): neck pivots on the sofa; the foreground table hides everything below the hips
  const KD = 3.1, KF = 3.2, NECK_D = { x: 330, y: 1150 - (186 - 76) * KD }, NECK_F = { x: 760, y: 1150 - (186 - 68) * KF };
  function daughter(ctx, st) {
    puppet(ctx, 'd_front', NECK_D.x, NECK_D.y, KD, st, 'daughter');
  }
  function father(ctx, st) {   // arms crossed while listening, relaxed while talking (cross-fade between the sheet's poses)
    const talk = clamp(st.talk || 0), k = KF;
    if (talk < 1) puppet(ctx, 'f_front', NECK_F.x, NECK_F.y, k, st, 'father', 1);
    if (talk > 0) puppet(ctx, 'f_34', NECK_F.x, NECK_F.y, k, st, 'father', talk);
  }

  // ── the room (modelled on the reference photo) ──
  function wall(ctx) {
    ctx.fillStyle = '#a9afbc'; ctx.fillRect(-500, -500, 2080, 1730);
    for (const [x0, w] of [[300, 480]]) { ctx.strokeStyle = '#c7ccd6'; ctx.lineWidth = 6; ctx.strokeRect(x0, 200, w, 640); ctx.strokeStyle = '#8f95a3'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 5, 205, w - 10, 630); }
    ctx.strokeStyle = '#c7ccd6'; ctx.lineWidth = 5; ctx.strokeRect(300, 880, 480, 250);
    ctx.fillStyle = '#c3c8d2'; ctx.fillRect(-500, 70, 2080, 22); ctx.fillStyle = '#8f95a3'; ctx.fillRect(-500, 92, 2080, 4);
    ctx.fillStyle = '#c3c8d2'; ctx.fillRect(-500, 1170, 2080, 14);
    ctx.fillStyle = '#242428'; ctx.fillRect(-500, 1184, 2080, 40);
  }
  function windowBay(ctx, x0, t) {   // tall window: sheers, olive-gold swag drapes, rope-twist frame
    const w = 300, top = 120, bot = 1184;
    ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.moveTo(x0, bot); ctx.lineTo(x0, top + 150); ctx.quadraticCurveTo(x0 + w / 2, top - 60, x0 + w, top + 150); ctx.lineTo(x0 + w, bot); ctx.fill();
    const glow = ctx.createLinearGradient(x0, 0, x0 + w, 0); glow.addColorStop(0, 'rgba(255,245,225,.0)'); glow.addColorStop(.5, 'rgba(255,250,235,.8)'); glow.addColorStop(1, 'rgba(255,245,225,0)');
    ctx.fillStyle = glow; ctx.fillRect(x0, top, w, bot - top);
    ctx.strokeStyle = 'rgba(190,195,205,.6)'; ctx.lineWidth = 3; for (let k = 1; k < 10; k++) { const xx = x0 + k * w / 10 + Math.sin(t * .7 + k) * 2; ctx.beginPath(); ctx.moveTo(xx, top + 140); ctx.lineTo(xx, bot); ctx.stroke(); }
    // rope-twist frame
    ctx.strokeStyle = '#e4e6ea'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x0 - 14, bot); ctx.lineTo(x0 - 14, top + 150); ctx.quadraticCurveTo(x0 + w / 2, top - 85, x0 + w + 14, top + 150); ctx.lineTo(x0 + w + 14, bot); ctx.stroke();
    ctx.strokeStyle = '#b9bdc6'; ctx.lineWidth = 2; for (let y = top + 160; y < bot; y += 16) for (const xx of [x0 - 14, x0 + w + 14]) { ctx.beginPath(); ctx.moveTo(xx - 10, y); ctx.lineTo(xx + 10, y + 10); ctx.stroke(); }
    // drapes (tails) and swags
    const drape = (xa, xb) => { for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#8a7f4c' : '#a2965f'; const a = lerp(xa, xb, k / 6), b = lerp(xa, xb, (k + 1) / 6);
      ctx.beginPath(); ctx.moveTo(a, top + 60); ctx.lineTo(b, top + 60); ctx.lineTo(b + (xb > xa ? 6 : -6), bot - 40); ctx.lineTo(a, bot - 40); ctx.fill(); }
      ctx.fillStyle = '#6f6438'; ctx.fillRect(Math.min(xa, xb), bot - 50, Math.abs(xb - xa), 12); };
    drape(x0 - 30, x0 + 70); drape(x0 + w + 30, x0 + w - 70);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = ['#7d7244', '#968a57', '#a99d66'][k]; ctx.beginPath(); ctx.moveTo(x0 - 40, top + 40 + k * 18);
      ctx.quadraticCurveTo(x0 + w / 2, top + 210 - k * 30, x0 + w + 40, top + 40 + k * 18); ctx.lineTo(x0 + w + 40, top + 10); ctx.lineTo(x0 - 40, top + 10); ctx.fill(); }
    ctx.strokeStyle = 'rgba(60,50,25,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 40, top + 76); ctx.quadraticCurveTo(x0 + w / 2, top + 150, x0 + w + 40, top + 76); ctx.stroke();
  }
  function painting(ctx) {   // gilded frame, rider on a white horse
    ctx.save(); ctx.translate(540, 170); ctx.scale(.78, .78); ctx.translate(-540, -250);
    const x = 360, y = 250, w = 360, h = 470;
    ctx.fillStyle = '#9b7631'; ctx.fillRect(x - 30, y - 30, w + 60, h + 60); ctx.strokeStyle = '#e2c46c'; ctx.lineWidth = 6; ctx.strokeRect(x - 20, y - 20, w + 40, h + 40);
    ctx.strokeStyle = '#6e5220'; ctx.lineWidth = 3; ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#5d6a6e'); g.addColorStop(.35, '#a99a7c'); g.addColorStop(.6, '#4f4a33'); g.addColorStop(1, '#2a241a'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(40,50,30,.8)'; ctx.beginPath(); ctx.moveTo(x, y + 250); ctx.quadraticCurveTo(x + 80, y + 170, x + 150, y + 230); ctx.lineTo(x, y + 330); ctx.fill();
    ctx.save(); ctx.translate(x + 200, y + 320); const wh = '#efeee8', sh = '#c9c6bd';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const leg = (x0, y0, kx, ky, fx, fy) => { ctx.strokeStyle = sh; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = '#3b3530'; ctx.beginPath(); ctx.ellipse(fx, fy + 4, 9, 6, 0, 0, 7); ctx.fill(); };
    leg(55, 20, 62, 70, 58, 118); leg(-55, 20, -62, 72, -55, 118);
    ctx.strokeStyle = '#3b3530'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(88, -12); ctx.quadraticCurveTo(122, 15, 110, 85); ctx.stroke();      // tail
    ctx.fillStyle = wh; ctx.beginPath(); ctx.ellipse(5, 0, 92, 44, -.04, 0, 7); ctx.fill();                                                          // body
    ctx.beginPath(); ctx.moveTo(-50, -30); ctx.quadraticCurveTo(-78, -95, -112, -112); ctx.lineTo(-135, -92);                                      // neck
    ctx.quadraticCurveTo(-100, -70, -88, 10); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(-130, -98); ctx.rotate(.9); ctx.beginPath(); ctx.ellipse(0, 18, 15, 34, 0, 0, 7); ctx.fill(); ctx.restore();          // head
    ctx.fillStyle = '#3b3530'; ctx.beginPath(); ctx.moveTo(-60, -40); ctx.quadraticCurveTo(-84, -100, -114, -116); ctx.lineTo(-104, -100); ctx.quadraticCurveTo(-80, -82, -52, -26); ctx.fill(); // mane
    ctx.strokeStyle = wh; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(-60, 20); ctx.lineTo(-74, 66); ctx.lineTo(-70, 120); ctx.moveTo(48, 22); ctx.lineTo(40, 70); ctx.lineTo(46, 120); ctx.stroke();
    ctx.fillStyle = '#3b3530'; for (const hx of [-70, 46]) { ctx.beginPath(); ctx.ellipse(hx, 124, 10, 6, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#d07a86'; ctx.beginPath(); ctx.moveTo(-25, -38); ctx.quadraticCurveTo(15, -50, 45, -36); ctx.lineTo(55, 38); ctx.quadraticCurveTo(10, 50, -30, 32); ctx.fill();   // skirt
    ctx.fillStyle = '#7f9ac6'; ctx.beginPath(); ctx.roundRect(-2, -108, 38, 74, 12); ctx.fill();
    ctx.fillStyle = '#e8c9a8'; ctx.beginPath(); ctx.arc(17, -124, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#3b2c22'; ctx.beginPath(); ctx.ellipse(17, -138, 22, 7, 0, 0, 7); ctx.fill();
    ctx.restore(); ctx.fillStyle = 'rgba(255,235,190,.08)'; ctx.fillRect(x, y, w, h); ctx.restore();
  }
  function chandelier(ctx, t) {
    const cx = 540; ctx.strokeStyle = '#b39a55'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, -500); ctx.lineTo(cx, 30); ctx.stroke();
    const r = mulberry32(17);
    for (let k = 0; k < 4; k++) { const rad = 200 - k * 42, yy = 40 + k * 42, n = 16 - k * 3;
      ctx.strokeStyle = '#c9b06a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, yy, rad, 18, 0, 0, Math.PI); ctx.stroke();
      for (let i = 0; i <= n; i++) { const a = Math.PI * i / n, px = cx + Math.cos(a) * rad, py = yy + Math.sin(a) * 18, len = 30 + r() * 30;
        ctx.strokeStyle = 'rgba(220,225,235,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + len); ctx.stroke();
        const tw = .7 + .3 * Math.sin(t * 3 + i * 1.7 + k); ctx.fillStyle = `rgba(245,248,255,${.85 * tw})`; ctx.beginPath(); ctx.ellipse(px, py + len + 8, 5, 10, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(120,130,150,.6)'; ctx.lineWidth = 1; ctx.stroke(); } }
    const gl = ctx.createRadialGradient(cx, 120, 10, cx, 120, 320); gl.addColorStop(0, 'rgba(255,240,205,.45)'); gl.addColorStop(1, 'rgba(255,240,205,0)'); ctx.fillStyle = gl; ctx.fillRect(cx - 340, -200, 680, 640);
  }
  function sofaBack(ctx) {
    const wood = '#4d2f1d', up = '#bdb6a7';
    blob(ctx, wood, () => { ctx.moveTo(30, 1150); ctx.lineTo(30, 930); ctx.bezierCurveTo(60, 840, 300, 840, 420, 860); ctx.bezierCurveTo(470, 800, 510, 780, 540, 770);
      ctx.bezierCurveTo(570, 780, 610, 800, 660, 860); ctx.bezierCurveTo(780, 840, 1020, 840, 1050, 930); ctx.lineTo(1050, 1150); ctx.closePath(); }, 3.5, '#24150c');
    blob(ctx, up, () => { ctx.moveTo(56, 1150); ctx.lineTo(56, 945); ctx.bezierCurveTo(85, 870, 300, 870, 425, 888); ctx.bezierCurveTo(470, 835, 510, 818, 540, 810);
      ctx.bezierCurveTo(570, 818, 610, 835, 655, 888); ctx.bezierCurveTo(780, 870, 995, 870, 1024, 945); ctx.lineTo(1024, 1150); ctx.closePath(); }, 0);
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(120,110,95,.35)'; ctx.lineWidth = 2.5; const r = mulberry32(4);
    for (let i = 0; i < 60; i++) { const x = 60 + r() * 960, y = 830 + r() * 320; ctx.beginPath(); ctx.ellipse(x, y, 14, 8, r() * 3, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 12, y - 8, 4, 0, 7); ctx.stroke(); } ctx.restore();
    ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.ellipse(540, 782, 34, 22, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#6e4f1c'; ctx.lineWidth = 3; ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(540 + s * 30, 785); ctx.quadraticCurveTo(540 + s * 80, 760, 540 + s * 110, 800); ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 6; ctx.stroke(); }
    // throw pillows: damask and stripes
    const pillow = (x, y, w, h, rot, striped) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      blob(ctx, striped ? '#d4ccbb' : '#c7bfae', () => ctx.roundRect(-w / 2, -h / 2, w, h, 24), 3, '#5a4a3a');
      ctx.save(); ctx.clip(); if (striped) { ctx.fillStyle = '#2f2a26'; for (let k = -w / 2; k < w / 2; k += 22) ctx.fillRect(k, -h / 2, 11, h); }
      else { ctx.strokeStyle = 'rgba(90,80,70,.45)'; ctx.lineWidth = 3; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(-w / 4 + (k % 3) * w / 4, -h / 4 + Math.floor(k / 3) * h / 2, 18, 11, .6, 0, 7); ctx.stroke(); } } ctx.restore(); ctx.restore(); };
    pillow(150, 1030, 170, 150, -.12, false); pillow(450, 1010, 120, 150, .05, true); pillow(630, 1010, 120, 150, -.05, true); pillow(930, 1030, 170, 150, .12, false); pillow(540, 1060, 150, 110, 0, false);
    // seat cushions
    for (const [a, b] of [[64, 545], [535, 1016]]) blob(ctx, '#c4bdae', () => ctx.roundRect(a, 1110, b - a, 80, 18), 3, '#6a5a48');
  }
  function sofaFront(ctx) {   // arms, skirt with fringe, legs — drawn in front of the cushions, behind the legs of the people
    for (const [x, s] of [[0, 1], [1080, -1]]) { blob(ctx, '#4d2f1d', () => { ctx.moveTo(x, 1240); ctx.lineTo(x, 990); ctx.quadraticCurveTo(x + s * 10, 930, x + s * 70, 940); ctx.quadraticCurveTo(x + s * 125, 950, x + s * 115, 1010); ctx.lineTo(x + s * 112, 1240); ctx.closePath(); }, 3.5, '#24150c');
      blob(ctx, '#bdb6a7', () => ctx.roundRect(Math.min(x + s * 20, x + s * 95), 975, 75, 250, 20), 2, '#6a5a48');
      ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.arc(x + s * 70, 975, 18, 0, 7); ctx.fill(); }
    blob(ctx, '#bfb8a9', () => ctx.rect(40, 1190, 1000, 100), 3, '#6a5a48');
    ctx.strokeStyle = '#efe7d6'; ctx.lineWidth = 3; for (let x = 46; x < 1036; x += 9) { ctx.beginPath(); ctx.moveTo(x, 1290); ctx.lineTo(x + 1, 1330); ctx.stroke(); }
    ctx.fillStyle = '#d9cfba'; ctx.fillRect(40, 1285, 1000, 8);
    ctx.fillStyle = '#2d1b10'; for (const x of [60, 1000]) { ctx.beginPath(); ctx.moveTo(x, 1330); ctx.lineTo(x + 22, 1330); ctx.lineTo(x + 16, 1375); ctx.lineTo(x + 6, 1375); ctx.fill(); }
  }
  function floor(ctx) {
    const g = ctx.createLinearGradient(0, 1224, 0, 1920); g.addColorStop(0, '#46474c'); g.addColorStop(1, '#2c2d31'); ctx.fillStyle = g; ctx.fillRect(-500, 1224, 2080, 1200);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; for (let y = 1250; y < 2400; y += 48) { ctx.beginPath(); ctx.moveTo(-500, y); ctx.lineTo(1580, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(-500, 1300, 2080, 30);
    // rug
    ctx.fillStyle = '#8c1f25'; ctx.beginPath(); ctx.moveTo(110, 1400); ctx.lineTo(970, 1400); ctx.lineTo(1120, 1900); ctx.lineTo(-40, 1900); ctx.fill();
    ctx.strokeStyle = '#d7c79f'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(135, 1418); ctx.lineTo(945, 1418); ctx.lineTo(1085, 1880); ctx.lineTo(-5, 1880); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#5c1418'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#c9b07a'; ctx.beginPath(); ctx.ellipse(540, 1640, 280, 120, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#7a1a20'; ctx.beginPath(); ctx.ellipse(540, 1640, 220, 88, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d7c79f'; ctx.beginPath(); ctx.ellipse(540, 1640, 70, 30, 0, 0, 7); ctx.fill();
  }
  // big carved table in the foreground: hides the presenters below the hips, so they read as seated on the sofa
  function foreTable(ctx, t) {   // (top edge at y 1050)
    blob(ctx, '#3e2416', () => { ctx.moveTo(-60, 1050); ctx.lineTo(1140, 1050); ctx.lineTo(1180, 1105); ctx.lineTo(-100, 1105); ctx.closePath(); }, 3.5, '#1a0e07');
    ctx.fillStyle = 'rgba(255,220,170,.12)'; ctx.fillRect(-60, 1052, 1200, 8);
    blob(ctx, '#2f1b10', () => ctx.rect(-100, 1105, 1280, 250), 3.5, '#1a0e07');
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-100, 1230, 1280, 125);
    ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 3; for (let x = 40; x < 1080; x += 250) { ctx.beginPath(); ctx.roundRect(x, 1125, 200, 80, 14); ctx.stroke(); }
    blob(ctx, '#c9a24e', () => ell(ctx, 540, 1165, 46, 22), 2.5, '#6e4f1c');
    for (const x of [30, 1010]) blob(ctx, '#3e2416', () => { ctx.moveTo(x, 1355); ctx.quadraticCurveTo(x - 24, 1400, x + 6, 1470); ctx.lineTo(x + 34, 1470); ctx.quadraticCurveTo(x + 14, 1400, x + 40, 1355); ctx.closePath(); }, 3, '#1a0e07');
    // things on the table: books, a small globe, tea
    blob(ctx, '#7a2e2a', () => ctx.rect(70, 1012, 150, 22), 2.5); blob(ctx, '#2b4a6b', () => ctx.rect(84, 992, 130, 20), 2.5); blob(ctx, '#e8dfcf', () => ctx.rect(90, 1034, 140, 16), 2.5);
    blob(ctx, '#b08b3a', () => ctx.rect(527, 1020, 26, 30), 2.5); blob(ctx, '#b08b3a', () => ell(ctx, 540, 1050, 46, 8), 2.5);
    ctx.save(); ctx.beginPath(); ctx.arc(540, 970, 52, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#2f6c9a'; ctx.fillRect(480, 910, 120, 120);
    ctx.fillStyle = '#c9b56a'; const sp = (t * 8) % 104; for (const dx of [-104, 0, 104]) { ctx.beginPath(); ctx.ellipse(500 + sp + dx, 950, 22, 30, .3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(545 + sp + dx, 985, 16, 20, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(540, 970, 52, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#b08b3a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(540, 970, 62, -2.2, 1.2); ctx.stroke();
    for (const [x, c] of [[860, '#f1ece2'], [930, '#f1ece2']]) { blob(ctx, c, () => { ctx.moveTo(x - 24, 1010); ctx.lineTo(x + 24, 1010); ctx.lineTo(x + 18, 1045); ctx.lineTo(x - 18, 1045); ctx.closePath(); }, 2.5);
      blob(ctx, '#d9cdb8', () => ell(ctx, x, 1048, 38, 7), 2.5); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; const ph = t * 1.3 + x;
      ctx.beginPath(); ctx.moveTo(x, 1000); ctx.bezierCurveTo(x + 10 * Math.sin(ph), 980, x - 10 * Math.sin(ph + 1), 960, x + 4 * Math.sin(ph + 2), 940); ctx.stroke(); }
  }
  function lamp(ctx) {
    blob(ctx, '#3e2416', () => ctx.rect(1000, 1080, 140, 20), 3); blob(ctx, '#3e2416', () => ctx.rect(1060, 1100, 22, 110), 3);
    blob(ctx, '#b08b3a', () => { ctx.ellipse(1070, 1040, 26, 40, 0, 0, 7); }, 3); blob(ctx, '#b08b3a', () => ctx.rect(1066, 930, 8, 80), 2);
    blob(ctx, '#ead9b1', () => { ctx.moveTo(1010, 930); ctx.lineTo(1130, 930); ctx.lineTo(1105, 850); ctx.lineTo(1035, 850); ctx.closePath(); }, 3);
    ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 2; for (let x = 1012; x < 1130; x += 7) { ctx.beginPath(); ctx.moveTo(x, 932); ctx.lineTo(x, 948); ctx.stroke(); }
    const g = ctx.createRadialGradient(1070, 900, 10, 1070, 900, 520); g.addColorStop(0, 'rgba(255,200,130,.35)'); g.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(500, 400, 1100, 1100); ctx.restore();
  }
  function room(ctx, t, dState, fState, opt = {}) {
    wall(ctx); windowBay(ctx, -230, t); windowBay(ctx, 1010, t); painting(ctx); floor(ctx); sofaBack(ctx); sofaFront(ctx);
    // warm evening grade on the set; the people get only a touch of it so their colours stay true to the sheet
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,120,.35)'; ctx.fillRect(-500, -500, 2080, 2920); ctx.restore();
    if (!opt.noPeople) { daughter(ctx, dState); father(ctx, fState); }
    lamp(ctx); foreTable(ctx, t); chandelier(ctx, t);
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,200,140,.12)'; ctx.fillRect(-500, -500, 2080, 2920); ctx.restore();
  }
  const headPos = (who) => who === 'daughter' ? { x: NECK_D.x, y: NECK_D.y - 30 * KD } : { x: NECK_F.x, y: NECK_F.y - 30 * KF };
  window.STUDY = { room, headPos, puppet, loadPuppets };
})();
