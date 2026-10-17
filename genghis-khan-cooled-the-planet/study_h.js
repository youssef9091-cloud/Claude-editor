// study_h.js — the presenters for the 16:9 film: rigged from the rig-ready sheets (build/h/, engine/prep_h.py).
// Bodies are the sheets' seated model poses (Real-ESRGAN x4). Mouths are the 9-shape lip-sync charts driven by
// Rhubarb's phonetic cues (build/lipsync.json). Blinks are the half/closed eye charts. All coordinates are in the
// x4 crop pixels of each body.
(function () {
  const { clamp, lerp, mulberry32, prog, easeInOut } = U;
  const H_ = {};
  const RIG = {
    dad_34:    { who: 'father',   mouth: [287, 311], ms: .28, mx: .86, mr: -.13, eyes: [[203, 236], [299, 223]], es: .32, er: -.135, seat: [470, 1190] },
    dad_front: { who: 'father',   mouth: [394, 327], ms: .33, mx: 1,   mr: -.18, eyes: [[319, 240], [427, 215]], es: .37, er: -.226, seat: [420, 1190] },
    dau_34:    { who: 'daughter', mouth: [487, 396], ms: .35, mx: .9,  mr: -.04, eyes: [[432, 288], [541, 283]], es: .47, er: -.045, seat: [470, 1395] },
    dau_front: { who: 'daughter', mouth: [462, 387], ms: .40, mx: 1,   mr: 0,    eyes: [[396, 275], [525, 273]], es: .55, er: 0,     seat: [470, 1395] },
  };
  const VIS = ['rest', 'mbp', 'a', 'e', 'i', 'o', 'u', 'fv', 'l'];
  // Rhubarb (Preston Blair) → chart mouths
  const MAP = { X: 'rest', A: 'mbp', B: 'i', C: 'e', D: 'a', E: 'o', F: 'u', G: 'fv', H: 'l' };
  let CUES = [];
  const load1 = (k, f) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { H_[k] = i; ok(); }; i.onerror = () => no(new Error('missing ' + f)); i.src = '../build/h/' + f; });
  async function load() {
    const names = ['dad_34', 'dad_front', 'dau_34', 'dau_front', 'room_two', 'room_wide', 'room_bg_dau', 'room_bg_dad', 'room_art', 'table'];
    const jobs = names.map(n => load1(n, n + (n.startsWith('room') ? '.jpg' : '.png')));
    for (const w of ['dad', 'dau']) { for (const v of VIS) jobs.push(load1(`${w}_m_${v}`, `${w}_m_${v}.png`));
      for (const s of ['half', 'closed']) for (const e of ['l', 'r']) jobs.push(load1(`${w}_eye_${s}_${e}`, `${w}_eye_${s}_${e}.png`)); }
    await Promise.all(jobs);
    CUES = (await (await fetch('../build/lipsync.json')).json()).mouthCues;
  }
  // which mouth for this speaker at t (null = their own drawn mouth: they're not speaking)
  function viseme(who, t) {
    const p = SCORE.vo.find(v => t >= v.start - .05 && t <= v.end + .08); if (!p || p.speaker !== who) return null;
    let lo = 0, hi = CUES.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUES[m].start <= t) lo = m; else hi = m - 1; }
    return MAP[CUES[lo].value] || 'rest';
  }
  const blinks = {}; for (const [n, sd] of [['father', 3], ['daughter', 8]]) { const r = mulberry32(sd), a = []; let t = .9 + r() * 2; while (t < 90) { a.push(t); t += 2.6 + r() * 2.8; } blinks[n] = a; }
  function blinkState(who, t) { for (const b of blinks[who]) { const d = t - b; if (d >= 0 && d < .2) return d < .05 || d > .14 ? 'half' : 'closed'; } return null; }

  // draw one rigged body: (x, y) = where its seat point lands; k = screen px per x4 px
  function body(ctx, key, x, y, k, st, alpha = 1) {
    const R = RIG[key], img = H_[key], pre = R.who === 'father' ? 'dad' : 'dau'; if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const t = st.t, ph = R.who === 'father' ? 1.3 : 0, e = st.energy || 0;
    // breathing + sway + speech emphasis, all pivoting on the seat
    ctx.translate(x, y); ctx.rotate((st.lean || 0) + .006 * Math.sin(t * .8 + ph) + .01 * e * Math.sin(t * 5.3 + ph)); ctx.scale(1, 1 + .006 * Math.sin(t * 1.7 + ph));
    ctx.translate(-R.seat[0] * k, -R.seat[1] * k); ctx.scale(k, k);
    ctx.drawImage(img, 0, 0);
    // eyes
    const bs = blinkState(R.who, t);
    if (bs) for (const [i, [ex, ey]] of R.eyes.entries()) { const p = H_[`${pre}_eye_${bs}_${i ? 'r' : 'l'}`];
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(R.er); ctx.scale(R.es * (R.mx < 1 ? .95 : 1), R.es); ctx.drawImage(p, -p.width / 2, -p.height / 2); ctx.restore(); }
    // mouth
    const v = st.forceMouth || viseme(R.who, t);
    if (v) { const p = H_[`${pre}_m_${v}`]; ctx.save(); ctx.translate(R.mouth[0], R.mouth[1]); ctx.rotate(R.mr); ctx.scale(R.ms * R.mx, R.ms); ctx.drawImage(p, -p.width / 2, -p.height / 2); ctx.restore(); }
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
  window.STUDY_H = { load, body, two, single, H: H_, RIG, viseme };
})();
