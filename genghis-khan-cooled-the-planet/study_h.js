// study_h.js — the presenters for the 16:9 film, rigged from the rig-ready sheets (build/h/, engine/prep_h.py).
// Bodies are the sheets' seated model poses (Real-ESRGAN x4). The face is rigged in the drawing's own style
// (face_h.json, engine/prep_face.py): the lower lip drops along the drawn lip line over a painted mouth interior,
// driven by a smoothed jaw track from Rhubarb's phonetic cues; the irises are repainted so each shot sets where they
// look (at each other / the lens), with saccades and lid blinks. All coordinates are x4 crop pixels of each body.
(function () {
  const { clamp, lerp, mulberry32, easeInOut } = U;
  const H_ = {};
  const RIG = {
    dad_34:    { who: 'father',   seat: [470, 1190] },
    dad_front: { who: 'father',   seat: [420, 1190] },
    dau_34:    { who: 'daughter', seat: [470, 1395] },
    dau_front: { who: 'daughter', seat: [470, 1395] },
  };
  let CUES = [], FACE = {}, GEO = {};
  const load1 = (k, f) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { H_[k] = i; ok(); }; i.onerror = () => no(new Error('missing ' + f)); i.src = '../build/h/' + f; });
  async function load() {
    const names = ['dad_34', 'dad_front', 'dau_34', 'dau_front', 'room_two', 'room_wide', 'room_bg_dau', 'room_bg_dad', 'room_art', 'table'];
    const jobs = names.map(n => load1(n, n + (n.startsWith('room') ? '.jpg' : '.png')));
    for (const k of Object.keys(RIG)) jobs.push(load1(k + '_lower', k + '_lower.png'));
    await Promise.all(jobs);
    CUES = (await (await fetch('../build/lipsync.json')).json()).mouthCues;
    FACE = await (await fetch('../build/h/face.json')).json();
    GEO = await (await fetch('../face_h.json')).json();
    buildMouthTracks();
  }

  // ── lip-sync: Rhubarb shapes → a smoothed jaw opening + mouth width, per speaker (no shape-snapping) ──
  const OPEN = { X: 0, A: 0, B: .22, C: .55, D: 1, E: .66, F: .38, G: .16, H: .5 };
  const WIDE = { X: 1, A: 1, B: 1, C: 1, D: 1, E: .62, F: .48, G: 1, H: .9 };
  const TR = 120, TRACK = {};
  function cueAt(t) { let lo = 0, hi = CUES.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUES[m].start <= t) lo = m; else hi = m - 1; } return CUES[lo]; }
  function buildMouthTracks() {
    const n = Math.ceil(80 * TR);
    for (const who of ['father', 'daughter']) {
      const o = new Float32Array(n), w = new Float32Array(n); let so = 0, sw = 1;
      for (let i = 0; i < n; i++) {
        const t = i / TR, p = SCORE.vo.find(v => t >= v.start - .03 && t <= v.end + .05);
        let to = 0, tw = 1;
        if (p && p.speaker === who) { const c = cueAt(t + .02); to = OPEN[c.value] ?? 0; tw = WIDE[c.value] ?? 1; }
        const rate = to > so ? 1 / .045 : (to === 0 ? 1 / .04 : 1 / .075);      // open fast, close a touch faster on M/B/P
        so += (to - so) * Math.min(1, rate / TR); sw += (tw - sw) * Math.min(1, (1 / .06) / TR);
        o[i] = so; w[i] = sw;
      }
      TRACK[who] = { o, w };
    }
  }
  function mouthAt(who, t) { const tr = TRACK[who]; if (!tr) return { open: 0, wide: 1 }; const i = Math.max(0, Math.min(tr.o.length - 1, Math.round(t * TR))); return { open: tr.o[i], wide: tr.w[i] }; }
  const viseme = (who, t) => mouthAt(who, t).open;

  // ── eyes: deterministic blinks + small saccades around the shot's gaze target ──
  const blinks = {}, darts = {};
  for (const [n, sd] of [['father', 3], ['daughter', 8]]) {
    const r = mulberry32(sd), a = []; let t = .7 + r() * 1.5;
    while (t < 90) { a.push(t); if (r() < .18) a.push(t + .32); t += 2.4 + r() * 3.2; } blinks[n] = a;
    const d = []; t = 0; while (t < 90) { d.push([t, (r() - .5) * .22, (r() - .5) * .25]); t += .7 + r() * 1.9; } darts[n] = d;
  }
  function lidAt(who, t) { let c = 0; for (const b of blinks[who]) { const d = t - b; if (d < 0) break; if (d < .2) c = Math.max(c, d < .06 ? d / .06 : d < .09 ? 1 : 1 - (d - .09) / .11); } return easeInOut(clamp(c)); }
  function dartAt(who, t) { const d = darts[who]; let i = 0; while (i + 1 < d.length && d[i + 1][0] <= t) i++;
    const k = clamp((t - d[i][0]) / .05), p = d[Math.max(0, i - 1)]; return [lerp(p[1], d[i][1], k), lerp(p[2], d[i][2], k)]; }

  const q = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
  const rgb = (c, m = 1) => `rgb(${c.map(v => Math.round(v * m)).join(',')})`;
  function eye(ctx, e, who, gaze, lid, lidCol) {
    const girl = who === 'daughter', a = e.a, b = e.b;
    const almond = () => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(e.up[0], e.up[1], b[0], b[1]); ctx.quadraticCurveTo(e.lo[0], e.lo[1], a[0], a[1]); ctx.closePath(); };
    ctx.save(); almond(); ctx.clip();
    // sclera with the lid's soft shadow
    const top = q(a, e.up, b, .5)[1], bot = q(a, e.lo, b, .5)[1];
    ctx.fillStyle = girl ? '#f4ebe4' : '#dcc0ab'; ctx.fillRect(a[0] - 4, top - 4, b[0] - a[0] + 8, bot - top + 8);
    const sh = ctx.createLinearGradient(0, top, 0, bot); sh.addColorStop(0, girl ? 'rgba(70,35,30,.55)' : 'rgba(90,50,35,.8)'); sh.addColorStop(girl ? .55 : .75, 'rgba(70,35,30,0)');
    ctx.fillStyle = sh; ctx.fillRect(a[0] - 4, top - 4, b[0] - a[0] + 8, bot - top + 8);
    // iris + pupil + catch-lights, placed by gaze
    const span = Math.abs(b[0] - a[0]) / 2, mid = [(a[0] + b[0]) / 2, (top + bot) / 2 + (girl ? 1 : 0)], r = e.r;
    const ix = mid[0] + clamp(gaze[0], -1, 1) * Math.max(0, span - r * (girl ? .55 : .9)), iy = mid[1] + gaze[1] * (bot - top) * .18;
    const g = ctx.createRadialGradient(ix, iy, 0, ix, iy, r);
    if (girl) { g.addColorStop(0, '#0b0605'); g.addColorStop(.42, '#1a0f0c'); g.addColorStop(.8, '#3b2419'); g.addColorStop(1, '#120a08'); }
    else { g.addColorStop(0, '#0f0a08'); g.addColorStop(.6, '#2b1d16'); g.addColorStop(1, '#1a110d'); }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.ellipse(ix + r * .28, iy - r * .38, r * (girl ? .22 : .26), r * (girl ? .3 : .26), .3, 0, 7); ctx.fill();
    if (girl) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(ix - r * .38, iy + r * .32, r * .11, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = girl ? '#140b09' : 'rgba(45,25,18,.85)';
    if (lid > .01) {
      // the lid slides down over the eye *and* the drawn upper lash; its edge becomes the lash line
      const lc = lerp(e.up[1], e.lo[1] + (girl ? 2 : 0), lid), lw = girl ? 7 : 4;
      ctx.beginPath(); ctx.moveTo(a[0] - lw, a[1] - 1); ctx.quadraticCurveTo(e.up[0], e.up[1] - lw * 2.2, b[0] + lw, b[1] - 1);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2, lc, a[0] - lw, a[1] - 1); ctx.closePath();
      const lg = ctx.createLinearGradient(0, e.up[1] - lw * 2, 0, lc); lg.addColorStop(0, rgb(lidCol, 1)); lg.addColorStop(1, rgb(lidCol, girl ? .9 : .93));
      ctx.fillStyle = lg; ctx.filter = `blur(${girl ? 1.4 : 1}px)`; ctx.fill(); ctx.filter = 'none';
      ctx.lineWidth = girl ? 2.6 + lid * 1.4 : 1.5 + lid * .6;
      ctx.beginPath(); ctx.moveTo(a[0] - (girl ? 2 : 0), a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, lc, b[0] + (girl ? 3 : 0), b[1] - (girl ? 1 : 0)); ctx.stroke();
    } else { ctx.lineWidth = girl ? 3.2 : 1.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(e.up[0], e.up[1], b[0], b[1]); ctx.stroke(); }
    ctx.restore();
  }
  function mouth(ctx, key, who, m) {
    const G = GEO[key], Fc = FACE[key], L = G.line, x0 = L[0][0], x1 = L[L.length - 1][0], open = m.open * G.open;
    if (open < .4) return;
    const ly = x => { for (let i = 1; i < L.length; i++) if (x <= L[i][0]) { const u = (x - L[i - 1][0]) / (L[i][0] - L[i - 1][0]); return lerp(L[i - 1][1], L[i][1], u); } return L[L.length - 1][1]; };
    const w = m.wide, prof = x => { const u = (x - x0) / (x1 - x0), s = Math.sin(Math.PI * clamp(u)); return Math.pow(clamp((s - (1 - w) * .9) / (1 - (1 - w) * .9)), .75); };
    const N = 28, xs = []; for (let i = 0; i <= N; i++) xs.push(lerp(x0, x1, i / N));
    // mouth interior, teeth, tongue
    ctx.save(); ctx.beginPath(); xs.forEach((x, i) => i ? ctx.lineTo(x, ly(x) - .5) : ctx.moveTo(x, ly(x) - .5));
    for (let i = N; i >= 0; i--) ctx.lineTo(xs[i], ly(xs[i]) + open * prof(xs[i]) + 1.5); ctx.closePath();
    ctx.fillStyle = who === 'daughter' ? '#3a1216' : '#2a120f'; ctx.fill(); ctx.clip();
    const mx = (x0 + x1) / 2, my = ly(mx);
    ctx.fillStyle = who === 'daughter' ? '#f3ece6' : '#e6dcd2'; ctx.beginPath(); ctx.ellipse(mx, my - 1, (x1 - x0) * .36 * w, Math.min(open * .38, 5.5) + 1, 0, 0, 7); ctx.fill();
    if (open > 6) { ctx.fillStyle = 'rgba(176,74,84,.85)'; ctx.beginPath(); ctx.ellipse(mx, my + open * prof(mx) + 2, (x1 - x0) * .22 * w, open * .38, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    // the lower lip + chin piece drops with the jaw, column by column
    const img = H_[key + '_lower'], ox = Fc.lower.x, oy = Fc.lower.y, cw = img.width / N;
    for (let i = 0; i < N; i++) { const sx = i * cw, x = ox + sx + cw / 2, d = open * prof(Math.min(Math.max(x, x0), x1));
      ctx.drawImage(img, sx, 0, cw + .6, img.height, ox + sx, oy + d, cw + .6, img.height); }
  }

  // draw one rigged body: (x, y) = where its seat point lands; k = screen px per x4 px
  // st: { t, energy, lean, gaze:[gx,gy], mouth?:{open,wide} }
  function body(ctx, key, x, y, k, st, alpha = 1) {
    const R = RIG[key], img = H_[key]; if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const t = st.t, ph = R.who === 'father' ? 1.3 : 0, e = st.energy || 0;
    // breathing + a slow, speech-led sway (no jitter), pivoting on the seat
    ctx.translate(x, y); ctx.rotate((st.lean || 0) + .004 * Math.sin(t * .7 + ph) + .005 * e * Math.sin(t * 1.9 + ph)); ctx.scale(1, 1 + .005 * Math.sin(t * 1.5 + ph));
    ctx.translate(-R.seat[0] * k, -R.seat[1] * k); ctx.scale(k, k);
    ctx.drawImage(img, 0, 0);
    const G = GEO[key], Fc = FACE[key], gz = st.gaze || [0, 0], dt = dartAt(R.who, t), lid = lidAt(R.who, t);
    G.eyes.forEach((ey, i) => eye(ctx, ey, R.who, [gz[0] + dt[0], gz[1] + dt[1]], lid, Fc.lids[i]));
    mouth(ctx, key, R.who, st.mouth || mouthAt(R.who, t));
    ctx.restore();
  }
  function shadow(ctx, x, y, rx, ry, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(60,40,25,${a})`); g.addColorStop(1, 'rgba(60,40,25,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, 7); ctx.fill(); ctx.restore(); }
  const W = 1920, H = 1080;
  function cam(ctx, z, cx, cy) { ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy); }

  // TWO-SHOT on the S2-H plate: she sits on the left seat (3/4, toward him), he on the right (3/4, toward her)
  const TWO = { dau: [610, 872, .40], dad: [1325, 866, .49] };
  function two(ctx, t, d, f, c = { z: 1, cx: 960, cy: 540 }) {
    ctx.save(); cam(ctx, c.z, c.cx, c.cy); ctx.drawImage(H_.room_two, 0, 0, W, H);
    shadow(ctx, TWO.dau[0], TWO.dau[1] + 8, 270, 34, .22); shadow(ctx, TWO.dad[0], TWO.dad[1] + 8, 250, 32, .22);
    body(ctx, 'dau_34', ...TWO.dau, d); body(ctx, 'dad_34', ...TWO.dad, f);
    ctx.restore();
  }
  // CLOSE-UPS on the S7-H / S8-H plates (soft background), with the out-of-focus table edge in front
  function single(ctx, t, who, poses, st, c = {}) {
    const bg = who === 'father' ? H_.room_bg_dad : H_.room_bg_dau, z = c.z || 1, par = c.par || 0;
    ctx.save(); cam(ctx, 1 + (z - 1) * .4, 960 + par, 540); ctx.filter = 'blur(3px)'; ctx.drawImage(bg, -30, -20, W + 60, H + 40); ctx.restore();
    ctx.save(); const fx = c.fx || 960, fy = c.fy || 540; ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);   // zoom in place
    for (const [key, x, y, k, a] of poses) body(ctx, key, x, y, k, st, a);
    ctx.restore();
    if (c.fg !== false) { ctx.save(); ctx.filter = 'blur(14px)'; const tw = 1500, th = tw * H_.table.height / H_.table.width;
      ctx.drawImage(H_.table, (who === 'father' ? -380 : 800), H - th * .42, tw, th); ctx.restore(); }
  }
  window.STUDY_H = { load, body, two, single, H: H_, RIG, viseme, mouthAt };
})();
