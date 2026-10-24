// cast.js — the flat cut-out cast (v2) for the 16:9 film, from the ChatGPT kits (assets/cast_v2, engine/prep_cast.py).
// Each pose is its assembled seated figure with the features erased, plus baked face-kit pieces (eyes, brows, mouths)
// that are swapped per frame: lip-sync from Rhubarb's cues onto the 10 drawn mouths, blinks (half → closed → half),
// eye-lines set per shot, brows up on questions. The head (and the hair with it) turns, tilts and nods about the neck
// with a strip warp that fades to nothing at the shoulders; the body breathes.
(function () {
  const { clamp, lerp, mulberry32, easeInOut } = U;
  const IMG = {}; let RIG = {}, CUES = [];
  // per pose: who, neck pivot and the band (x4 base px) where the head turn fades out, seat point
  const POSE = {
    girl34:   { who: 'daughter', neck: [880, 900], band: [840, 1060], seat: [900, 2750] },
    dad34:    { who: 'father',   neck: [1040, 940], band: [860, 1080], seat: [1500, 2350] },
    dadfront: { who: 'father',   neck: [880, 960], band: [860, 1020], seat: [880, 2300] },
  };
  const load1 = (k, f) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { IMG[k] = i; ok(); }; i.onerror = () => no(new Error('missing ' + f)); i.src = '../build/cast/rig/' + f; });
  async function load() {
    RIG = await (await fetch('../build/cast/rig/rig.json')).json();
    const jobs = ['room_wide', 'room_left', 'room_right'].map(n => load1(n, n + '.jpg'));
    for (const [p, m] of Object.entries(RIG)) {
      jobs.push(load1(p + '_base', p + '_base.png'));
      for (const kind of Object.values(m.parts)) for (const v of Object.values(kind)) jobs.push(load1(v.f, v.f));
      if (m.jaw) jobs.push(load1(m.jaw.f, m.jaw.f));
    }
    await Promise.all(jobs);
    CUES = (await (await fetch('../build/lipsync.json')).json()).mouthCues;
    for (const p of Object.keys(RIG)) {
      const b = IMG[p + '_base'], c = document.createElement('canvas'); c.width = b.width; c.height = POSE[p].band[1]; HEAD[p] = c;
      const m = document.createElement('canvas'); m.width = c.width; m.height = c.height; const g = m.getContext('2d'), gr = g.createLinearGradient(0, POSE[p].band[0], 0, POSE[p].band[1]);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, m.width, m.height); MASK[p] = m;
    }
  }
  const HEAD = {}, MASK = {};

  // ── mouths: Rhubarb (Preston Blair) → the kit's drawn mouths; every shape holds ≥ 2 frames ──
  const MAP = { X: 'rest', A: 'mbp', B: 'e', C: 'a', D: 'a', E: 'o', F: 'u', G: 'fv', H: 'l' };
  function cueAt(t) { let lo = 0, hi = CUES.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUES[m].start <= t) lo = m; else hi = m - 1; } return CUES[lo]; }
  function speaking(who, t) { const p = SCORE.vo.find(v => t >= v.start - .03 && t <= v.end + .05); return p && p.speaker === who ? p : null; }
  // one shape per frame, every shape held ≥ 3 frames (a 1-2 frame syllable merges into its neighbour: no flashes)
  let TRACK = null;
  function buildTrack() {
    const n = Math.ceil(90 * 30), raw = []; for (let f = 0; f < n; f++) raw.push(MAP[cueAt(f / 30 + .02).value] || 'rest');
    const runs = []; for (const v of raw) { const r = runs[runs.length - 1]; if (r && r.v === v) r.n++; else runs.push({ v, n: 1 }); }
    for (let pass = 0; pass < 3; pass++) for (let i = 0; i < runs.length; i++) if (runs[i].n < 3 && runs.length > 1) {
      const j = i === 0 ? 1 : (i === runs.length - 1 || runs[i - 1].n >= runs[i + 1].n ? i - 1 : i + 1);
      runs[j].n += runs[i].n; runs.splice(i, 1); i--;
    }
    TRACK = []; for (const r of runs) for (let k = 0; k < r.n; k++) TRACK.push(r.v);
  }
  const OPEN = { rest: 0, mbp: 0, smile: .06, a: 1, e: .45, o: .75, u: .45, fv: .18, l: .55, laugh: .9 };
  let JAWT = null;
  function jawOpen(who, t) {
    if (!JAWT) { if (!TRACK) buildTrack(); JAWT = {};
      for (const w of ['father', 'daughter']) { const a = []; let v = 0;
        for (let f = 0; f < TRACK.length; f++) { const tt = f / 30, on = speaking(w, tt); const tgt = on ? OPEN[TRACK[f]] ?? 0 : 0;
          v += (tgt - v) * (tgt > v ? .6 : .45); a.push(v); } JAWT[w] = a; } }
    const a = JAWT[who]; return a[Math.min(a.length - 1, Math.max(0, Math.round(t * 30)))];
  }
  function mouth(who, t) {
    if (!speaking(who, t)) return null;
    if (!TRACK) buildTrack();
    return TRACK[Math.min(TRACK.length - 1, Math.max(0, Math.round(t * 30)))];
  }
  // ── blinks + brief glances, deterministic per character ──
  const BL = {}, GL = {};
  for (const [n, sd] of [['father', 3], ['daughter', 8]]) {
    const r = mulberry32(sd), b = [], g = []; let t = .8 + r() * 1.2;
    while (t < 90) { b.push(t); if (r() < .2) b.push(t + .38); t += 2.3 + r() * 3; } BL[n] = b;
    t = 2 + r() * 2; while (t < 90) { g.push([t, t + .35 + r() * .4]); t += 4 + r() * 5; } GL[n] = g;
  }
  function lid(who, t) { for (const b of BL[who]) { const d = t - b; if (d < 0) break; if (d < .05) return 'half'; if (d < .12) return 'closed'; if (d < .18) return 'half'; } return null; }
  const glancing = (who, t) => GL[who].some(([a, b]) => t >= a && t < b);
  const isQuestion = p => p && /[؟?]/.test(p.text || '');

  // his own lower lip + beard drop along the drawn lip line over a mouth interior in the same flat style
  function jaw(c, J, open, img) {
    const d = open * J.max; if (d < 1) return;
    const L = J.line, x0 = L[0][0], x1 = L[L.length - 1][0], [cx, hw] = J.mouth, xa = cx - hw, xb = cx + hw;
    const ly = x => { for (let i = 1; i < L.length; i++) if (x <= L[i][0]) { const u = (x - L[i - 1][0]) / (L[i][0] - L[i - 1][0]); return lerp(L[i - 1][1], L[i][1], u); } return L[L.length - 1][1]; };
    // the opening: centred under the nose, a lens shape that is deepest in the middle and closes at both corners
    // side view: the opening is a wedge, deepest at the lips' front, closed at the corner
    const prof = J.profile ? x => Math.pow(clamp((xb - x) / (xb - xa)), .8) : x => Math.pow(Math.sin(Math.PI * clamp((x - xa) / (xb - xa))), 1.1);
    // the jaw drop: the same centre, fading out more softly towards the moustache tips (or the back of the jaw)
    const drop = J.profile ? x => Math.pow(clamp((xb + hw * .8 - x) / (xb + hw * .8 - xa)), .9) : x => Math.pow(Math.sin(Math.PI * clamp((x - (cx - hw * 1.6)) / (hw * 3.2))), 1.4);
    const N = 48, xs = []; for (let i = 0; i <= N; i++) xs.push(lerp(xa, xb, i / N));
    c.save(); c.beginPath(); xs.forEach((x, i) => i ? c.lineTo(x, ly(x) - 2) : c.moveTo(x, ly(x) - 2));
    for (let i = N; i >= 0; i--) c.lineTo(xs[i], ly(xs[i]) + d * prof(xs[i]) + 4); c.closePath();
    c.fillStyle = '#4a1a17'; c.fill(); c.clip();
    // upper teeth follow the lip line (not a flat bar)
    const th = Math.min(d * .26, 12); c.beginPath(); xs.forEach((x, i) => i ? c.lineTo(x, ly(x) - 4) : c.moveTo(x, ly(x) - 4));
    for (let i = N; i >= 0; i--) c.lineTo(xs[i], ly(xs[i]) + th * Math.sqrt(prof(xs[i]))); c.closePath(); c.fillStyle = '#ece4da'; c.fill();
    if (d > 16 && !J.profile) { c.fillStyle = '#b5525a'; c.beginPath(); c.ellipse(cx, ly(cx) + d * .95, hw * .55, d * .38, 0, 0, 7); c.fill(); }
    c.restore();
    const M = Math.ceil(img.width / 3), cw = img.width / M;   // his lower lip + beard drop in 3-px columns
    for (let i = 0; i < M; i++) { const sx = i * cw, x = J.x + sx + cw / 2; c.drawImage(img, sx, 0, cw + .8, img.height, J.x + sx, J.y + d * Math.max(drop(x), prof(x)), cw + .8, img.height); }
  }

  // draw one pose. (x, y): where the seat point lands; k: screen px per x4 px.
  // st: { t, gaze: 'l'|'c'|'r', energy, tilt (rad), mouth (override), brow (override), listen }
  function draw(ctx, pose, x, y, k, st) {
    const P = POSE[pose], R = RIG[pose], who = P.who, t = st.t, base = IMG[pose + '_base'];
    const head = HEAD[pose], hc = head.getContext('2d');
    // compose the face onto the head canvas
    hc.clearRect(0, 0, head.width, head.height); hc.drawImage(base, 0, 0);
    const part = (kind, v) => { const p = R.parts[kind] && (R.parts[kind][v] || R.parts[kind].rest || R.parts[kind].c || R.parts[kind].n); if (p) hc.drawImage(IMG[p.f], p.x, p.y); };
    const sp = speaking(who, t);
    const brow = st.brow || (isQuestion(sp) ? 'up' : 'n');
    part('brow0', brow); part('brow1', brow);
    let eye = lid(who, t) || (glancing(who, t) && !sp ? 'c' : st.gaze || 'c');
    if (!R.parts.eye0[eye]) eye = eye === 'half' ? 'half' : 'c';
    part('eye0', eye); part('eye1', eye);
    if (R.jaw) jaw(hc, R.jaw, st.mouth === 'laugh' ? .8 : st.mouth === 'smile' ? .1 : jawOpen(who, t), IMG[R.jaw.f]);
    else part('mouth', st.mouth || mouth(who, t) || (st.listen ? 'smile' : 'rest'));
    // pose the whole figure: breathing, and a slow sway
    const ph = who === 'father' ? 1.3 : 0, e = st.energy || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(.003 * Math.sin(t * .6 + ph)); ctx.scale(k, k * (1 + .004 * Math.sin(t * 1.6 + ph))); ctx.translate(-P.seat[0], -P.seat[1]);
    // body from the top of the band down, untouched; then the head, turned about the neck, fading out across the band
    const y0 = P.band[0]; ctx.drawImage(base, 0, y0, base.width, base.height - y0, 0, y0, base.width, base.height - y0);
    const nod = (st.tilt || 0) + .022 * e * Math.sin(t * 2.3 + ph) + .008 * Math.sin(t * .9 + ph * 2) + (sp ? .01 * Math.sin(t * 4.1) * e : 0);
    hc.globalCompositeOperation = 'destination-in'; hc.drawImage(MASK[pose], 0, 0); hc.globalCompositeOperation = 'source-over';
    ctx.translate(P.neck[0], P.neck[1]); ctx.rotate(nod); ctx.translate(-P.neck[0], -P.neck[1]);
    ctx.drawImage(head, 0, 0);
    ctx.restore();
  }
  window.CAST = { load, draw, IMG, POSE, mouth, speaking };
})();
