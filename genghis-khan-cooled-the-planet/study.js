// study.js — the presenters and the study.
// People: cut-out puppets traced from the character sheets (engine/trace_characters.py → build/chars/*.svg).
// Room:   the location sheet's Historical Study (engine/prep_assets.py → build/room_*.jpg).
(function () {
  const { clamp, lerp, mulberry32 } = U;
  const W = 1080, H = 1920;

  // units = sheet pixels inside each piece. pivot = neck pivot; neck = head/body split; seat = where she sits (d_sit)
  const PZ = {
    d_front:   { w: 216, h: 351, res: 8, neck: 116, pivot: [92, 120], eyes: [[73.8, 62.5], [111.3, 62.5]], eye: [8.0, 3.6], mouth: [92.5, 91.3], mw: 9.5, skin: '#bb704c', lip: '#8a3e2c' },
    d_explain: { w: 164, h: 170, res: 8, neck: 58, pivot: [56, 61], eyes: [[45.4, 31.4], [66.6, 31.4]], eye: [5.6, 2.6], mouth: [57.1, 46.2], mw: 7.0, skin: '#a66746', lip: '#8a3e2c' },
    d_sit:     { w: 175, h: 222, res: 8, pivot: [84, 200], eyes: [[72.5, 40.6], [94.4, 40.6]], eye: [6.0, 2.6], mouth: [84.2, 58.6], mw: 5.6, skin: '#b06d4a', lip: '#8a3e2c' },
    f_34_full: { w: 97, h: 330, res: 8, neck: 66, pivot: [40, 69], eyes: [[28.8, 38.1], [46.5, 38.1]], eye: [3.6, 1.9], mouth: [40.5, 54.5], mw: 5.0, skin: '#ab7856' },
  };
  const CANV = {};
  async function loadPuppets() {
    await Promise.all(Object.entries(PZ).map(([k, P]) => new Promise((ok, no) => { const im = new Image();
      im.onload = () => { const c = document.createElement('canvas'); c.width = P.w * P.res; c.height = P.h * P.res; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); CANV[k] = c; ok(); };
      im.onerror = () => no(new Error('missing puppet ' + k)); im.src = '../build/chars/' + k + '.svg'; })));
  }
  const blinks = {}; for (const [n, sd] of [['father', 3], ['daughter', 8]]) { const r = mulberry32(sd), a = []; let t = .8 + r() * 2; while (t < 90) { a.push(t); t += 2.2 + r() * 2.6; } blinks[n] = a; }
  const blinkAt = (n, t) => { for (const b of blinks[n]) if (t >= b && t < b + .16) return Math.sin(Math.PI * (t - b) / .16); return 0; };

  // face overlays (inside the head transform): blinks, the talking mouth, optional glasses
  function face(ctx, P, X, Y, k, st, who) {
    const bl = blinkAt(who, st.t);
    if (bl > .05) for (const [ex, ey] of P.eyes) { ctx.save(); ctx.fillStyle = P.skin; ctx.beginPath();
      ctx.ellipse(X(ex), Y(ey) - P.eye[1] * k * (1 - bl) * .9, P.eye[0] * 1.25 * k, P.eye[1] * 1.6 * k * bl + 1, 0, 0, Math.PI * 2); ctx.fill();
      if (bl > .6) { ctx.strokeStyle = '#24140c'; ctx.lineWidth = Math.max(1.6, .5 * k); ctx.lineCap = 'round'; ctx.beginPath();
        ctx.moveTo(X(ex - P.eye[0]), Y(ey + .3)); ctx.quadraticCurveTo(X(ex), Y(ey + P.eye[1] * .6), X(ex + P.eye[0]), Y(ey + .3)); ctx.stroke(); } ctx.restore(); }
    if (st.glasses) { ctx.save(); ctx.strokeStyle = st.glasses; ctx.lineWidth = .9 * k; ctx.lineJoin = 'round'; const gw = P.eye[0] * 1.45, gh = P.eye[1] * 2.4;
      for (const [ex, ey] of P.eyes) { ctx.beginPath(); ctx.roundRect(X(ex - gw), Y(ey - gh * .55), 2 * gw * k, 2 * gh * .5 * k + gh * .1 * k, gh * .35 * k); ctx.stroke(); }
      const [a, b] = P.eyes; ctx.beginPath(); ctx.moveTo(X(a[0] + gw), Y(a[1] - gh * .15)); ctx.quadraticCurveTo(X((a[0] + b[0]) / 2), Y(a[1] - gh * .4), X(b[0] - gw), Y(b[1] - gh * .15)); ctx.stroke(); ctx.restore(); }
    const mo = st.mouth || 0;
    if (mo > .06) { const [mx, my] = P.mouth, w = P.mw * (.85 - .12 * mo), h = P.mw * (.14 + .55 * mo); ctx.save();
      ctx.fillStyle = '#4a150f'; ctx.strokeStyle = P.lip || '#5a2a1c'; ctx.lineWidth = Math.max(1.4, .4 * k);
      ctx.beginPath(); ctx.moveTo(X(mx - w), Y(my)); ctx.quadraticCurveTo(X(mx), Y(my - h * .25), X(mx + w), Y(my)); ctx.quadraticCurveTo(X(mx), Y(my + h * 1.2), X(mx - w), Y(my)); ctx.fill(); ctx.stroke();
      ctx.clip(); ctx.fillStyle = '#f3ece4'; ctx.fillRect(X(mx - w), Y(my - h * .3), 2 * w * k, h * .4 * k);
      if (mo > .35) { ctx.fillStyle = '#b5483f'; ctx.beginPath(); ctx.ellipse(X(mx), Y(my + h), w * .55 * k, h * .35 * k, 0, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
  }
  // draw a puppet with its pivot at (ax, ay); k = screen px per sheet px
  function puppet(ctx, key, ax, ay, k, st, who, alpha = 1) {
    const P = PZ[key], C = CANV[key]; if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const x0 = ax - P.pivot[0] * k, y0 = ay - P.pivot[1] * k, X = u => x0 + u * k, Y = v => y0 + v * k;
    const br = 1 + .008 * Math.sin(st.t * 1.8 + (who === 'father' ? 1 : 0));
    if (P.neck === undefined) {   // one rigid piece (seated pose): sway + breathe about the seat
      ctx.translate(ax, ay); ctx.rotate(st.tilt * .6 || 0); ctx.scale(1, br); ctx.translate(-ax, -ay);
      ctx.drawImage(C, x0, y0, P.w * k, P.h * k); face(ctx, P, X, Y, k, st, who); ctx.restore(); return;
    }
    const hipY = Y(P.h);
    ctx.translate(ax, hipY); ctx.rotate(st.lean || 0); ctx.scale(1, br); ctx.translate(-ax, -hipY);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 80, Y(P.neck), P.w * k + 160, (P.h - P.neck) * k + 4); ctx.clip(); ctx.drawImage(C, x0, y0, P.w * k, P.h * k); ctx.restore();
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(clamp(st.tilt || 0, -.06, .06)); ctx.scale(1, 1 - clamp(st.nod || 0, 0, 1) * .02); ctx.translate(-ax, -ay);
    ctx.beginPath(); ctx.rect(x0 - 80, y0 - 80, P.w * k + 160, (P.neck + 2.5) * k + 80); ctx.clip();
    ctx.drawImage(C, x0, y0, P.w * k, P.h * k); face(ctx, P, X, Y, k, st, who); ctx.restore();
    ctx.restore();
  }
  function shadow(ctx, x, y, rx, ry, a = .35) { const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(30,18,10,${a})`); g.addColorStop(1, 'rgba(30,18,10,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function cam(ctx, z, cx, cy) { ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy); }

  // WIDE: the whole study. She sits cross-legged on the sofa, he stands by it.
  function wide(ctx, t, IMG, d, f, c = { z: 1, cx: 540, cy: 960 }) {
    ctx.save(); cam(ctx, c.z, c.cx, c.cy);
    ctx.drawImage(IMG.ROOM, 0, 0, W, H);
    shadow(ctx, 360, 1338, 150, 18, .25); puppet(ctx, 'd_sit', 360, 1338, 1.78, d, 'daughter');
    shadow(ctx, 870, 1735, 120, 20, .45); puppet(ctx, 'f_34_full', 870, 1735 - (330 - 69) * 2.4, 2.4, f, 'father');
    ctx.restore();
  }
  // SINGLE: medium shot, soft room behind, blurred table edge in front
  function single(ctx, t, IMG, who, pose, st, c = {}) {
    const z = c.z || 1, bg = who === 'father' ? IMG.ROOM_F : IMG.ROOM_D, par = (c.par || 0);
    ctx.save(); cam(ctx, 1 + (z - 1) * .4, 540 + par, 960); ctx.drawImage(bg, -40, -40, W + 80, H + 80); ctx.restore();
    ctx.save(); const g = ctx.createRadialGradient(540, 760, 80, 540, 760, 700); g.addColorStop(0, 'rgba(255,220,170,.18)'); g.addColorStop(1, 'rgba(255,220,170,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); cam(ctx, z, 540, c.cy || 900);
    for (const [key, k, ax, ay, a] of pose) puppet(ctx, key, ax, ay, k, st, who, a);
    ctx.restore();
    // foreground: the carved table edge, out of focus
    // the room's own coffee table + rug (from the wide plate), close and out of focus
    const top = c.band || 1400; ctx.save(); ctx.filter = 'blur(10px)';
    ctx.drawImage(IMG.ROOM, 300, 1385, 480, 470, -90, top - 40, W + 180, (W + 180) * 470 / 480); ctx.restore();
    ctx.save(); const sh = ctx.createLinearGradient(0, top - 60, 0, top + 40); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(20,10,5,.25)'); ctx.fillStyle = sh; ctx.fillRect(0, top - 60, W, 100); ctx.restore();
  }
  window.STUDY = { loadPuppets, puppet, wide, single, PZ };
})();
