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
    }
    await Promise.all(jobs);
    CUES = (await (await fetch('../build/lipsync.json')).json()).mouthCues;
    for (const p of Object.keys(RIG)) { const b = IMG[p + '_base'], c = document.createElement('canvas'); c.width = b.width; c.height = POSE[p].band[1]; HEAD[p] = c; }
  }
  const HEAD = {};

  // ── mouths: Rhubarb (Preston Blair) → the kit's drawn mouths; every shape holds ≥ 2 frames ──
  const MAP = { X: 'rest', A: 'mbp', B: 'e', C: 'a', D: 'a', E: 'o', F: 'u', G: 'fv', H: 'l' };
  function cueAt(t) { let lo = 0, hi = CUES.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUES[m].start <= t) lo = m; else hi = m - 1; } return CUES[lo]; }
  function speaking(who, t) { const p = SCORE.vo.find(v => t >= v.start - .03 && t <= v.end + .05); return p && p.speaker === who ? p : null; }
  function mouth(who, t) {
    if (!speaking(who, t)) return null;
    const c = cueAt(t + .02); if (t - c.start < 2 / 30 && c.start > 0) { const prev = cueAt(c.start - .001); if (c.start - prev.start < 2 / 30) return MAP[prev.value] || 'rest'; }
    return MAP[c.value] || 'rest';
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
    part('mouth', st.mouth || mouth(who, t) || (st.listen ? 'smile' : 'rest'));
    // pose the whole figure: breathing, and a slow sway
    const ph = who === 'father' ? 1.3 : 0, e = st.energy || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(.003 * Math.sin(t * .6 + ph)); ctx.scale(k, k * (1 + .004 * Math.sin(t * 1.6 + ph))); ctx.translate(-P.seat[0], -P.seat[1]);
    // body below the band, untouched
    const yb = P.band[1]; ctx.drawImage(base, 0, yb, base.width, base.height - yb, 0, yb, base.width, base.height - yb);
    // head + band: strips rotated about the neck, weight 1 above band[0] → 0 at band[1]
    const nod = (st.tilt || 0) + .022 * e * Math.sin(t * 2.3 + ph) + .008 * Math.sin(t * .9 + ph * 2) + (sp ? .01 * Math.sin(t * 4.1) * e : 0);
    const N = 6;
    for (let sy = 0; sy < yb; sy += N) {
      const w = sy + N <= P.band[0] ? 1 : clamp(1 - (sy - P.band[0]) / (P.band[1] - P.band[0])), a = nod * easeInOut(w);
      ctx.save(); ctx.translate(P.neck[0], P.neck[1]); ctx.rotate(a); ctx.translate(-P.neck[0], -P.neck[1]);
      ctx.drawImage(head, 0, sy, head.width, Math.min(N + 1, yb - sy), 0, sy, head.width, Math.min(N + 1, yb - sy));
      ctx.restore();
    }
    ctx.restore();
  }
  window.CAST = { load, draw, IMG, POSE, mouth, speaking };
})();
