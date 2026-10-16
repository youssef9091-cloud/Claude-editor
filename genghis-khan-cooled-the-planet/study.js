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

  // open palm, fingers spread up (a "what?" / explaining hand)
  function openHand(ctx, x, y, u, skin) {
    for (const [a, l] of [[-.55, .42], [-.2, .5], [.12, .52], [.42, .44]]) limb(ctx, [[x + a * .3 * u, y - .1 * u], [x + a * .62 * u, y - l * u - .1 * u]], .11 * u, skin, INK, 2.2);
    limb(ctx, [[x + .18 * u, y + .05 * u], [x + .42 * u, y - .12 * u]], .12 * u, skin, INK, 2.2);
    blob(ctx, skin, () => ell(ctx, x, y, .24 * u, .22 * u), 2.4);
  }
  // ── the people ──
  const FATHER = { name: 'father', skin: '#b98258', skinSh: '#9c6a46', hair: '#9b9a96', hairHi: '#c4c3bf', beard: '#b9b7b1', beardSh: '#8f8d88', brow: '#5c5650',
    shirt: '#8ea6c6', shirtSh: '#7389ab', trousers: '#2c3950', trousersSh: '#222c3f', belt: '#3a2a20', shoes: '#4a2c1e', glasses: '#26221f', u: 58 };
  const DAUGHTER = { name: 'daughter', skin: '#b97a52', skinSh: '#9d6340', hair: '#141414', hairHi: '#343434', brow: '#1a1210',
    shirt: '#1c1c1c', shirtSh: '#111', jeans: '#7d97b4', jeansSh: '#6880a0', shoes: '#1d1d1d', u: 54 };

  const EXPR = {
    knowledgeable: { b: [.03, .03], knit: 0, smile: .3 }, storyteller: { b: [.09, .09], knit: 0, smile: .4 }, pensive: { b: [-.02, -.02], knit: .1, smile: -.05, eye: .8, lookY: .5 },
    curious: { b: [.14, .02], knit: 0, smile: .2 }, chuckle: { b: [.07, .07], knit: 0, smile: 1, eye: .3 }, wry: { b: [.13, 0], knit: 0, smile: .55, smirk: .5 },
    eager: { b: [.12, .12], knit: 0, smile: .5 }, critical: { b: [.18, -.04], knit: .12, smile: -.2, smirk: -.4, eye: .85 },
    surprised: { b: [.2, .2], knit: 0, smile: 0, eye: 1.25, o: true }, explaining: { b: [.07, .07], knit: 0, smile: .25 },
  };
  const blinks = {}; for (const [n, sd] of [['father', 3], ['daughter', 8]]) { const r = mulberry32(sd), a = []; let t = .8 + r() * 2; while (t < 90) { a.push(t); t += 2.2 + r() * 2.6; } blinks[n] = a; }
  const blinkAt = (n, t) => { for (const b of blinks[n]) if (t >= b && t < b + .13) return Math.sin(Math.PI * (t - b) / .13); return 0; };

  // head: hx,hy centre; look -1..1 (−1 = toward screen-left); st.mouth 0..1
  function head(ctx, P, hx, hy, u, st) {
    const E = EXPR[st.expr] || EXPR.knowledgeable, lk = st.look || 0, fx = lk * .26 * u, isF = P.name === 'father';
    const hw = .86 * u, hh = 1.08 * u;
    // back hair (daughter's wolf cut)
    if (!isF) { blob(ctx, P.hair, () => { ctx.moveTo(hx - 1.02 * u, hy - .5 * u);
        const tips = [[-1.18, .5], [-1.05, .9], [-1.25, 1.25], [-1.0, 1.55], [-1.15, 1.95], [-.85, 1.8], [-.7, 2.15], [-.5, 1.7]];
        for (const [a, b] of tips) ctx.lineTo(hx + a * u + Math.sin(st.t * 1.3 + b) * .03 * u, hy + b * u);
        ctx.lineTo(hx + .5 * u, hy + 1.7 * u); for (const [a, b] of tips.slice().reverse()) ctx.lineTo(hx - a * u + Math.sin(st.t * 1.2 + b) * .03 * u, hy + b * u);
        ctx.lineTo(hx + 1.02 * u, hy - .5 * u); ctx.quadraticCurveTo(hx + 1.05 * u, hy - 1.42 * u, hx, hy - 1.42 * u); ctx.quadraticCurveTo(hx - 1.05 * u, hy - 1.42 * u, hx - 1.02 * u, hy - .5 * u); }, 2.4, '#000'); }
    // neck
    blob(ctx, P.skinSh, () => ctx.rect(hx - .36 * u, hy + .6 * u, .72 * u, .85 * u), 0);
    // ears
    for (const s of [-1, 1]) { if (s * lk > .6) continue; blob(ctx, P.skin, () => ell(ctx, hx + s * hw + fx * .25, hy + .05 * u, .16 * u, .26 * u)); }
    // face
    blob(ctx, P.skin, () => { ctx.moveTo(hx, hy - hh); ctx.bezierCurveTo(hx + hw * 1.12, hy - hh, hx + hw * 1.05, hy + .35 * u, hx + .55 * u + fx * .2, hy + .82 * u);
      ctx.quadraticCurveTo(hx + fx * .4, hy + 1.18 * u, hx - .55 * u + fx * .2, hy + .82 * u); ctx.bezierCurveTo(hx - hw * 1.05, hy + .35 * u, hx - hw * 1.12, hy - hh, hx, hy - hh); });
    ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(120,60,30,.16)'; ctx.beginPath(); ell(ctx, hx - Math.sign(lk || 1) * .62 * u, hy + .1 * u, .45 * u, 1.2 * u); ctx.fill(); ctx.restore();
    // beard
    if (isF) { blob(ctx, P.beard, () => { ctx.moveTo(hx - .84 * u + fx * .2, hy + .05 * u); ctx.quadraticCurveTo(hx - .8 * u + fx * .3, hy + .78 * u, hx - .3 * u + fx * .4, hy + 1.02 * u);
        ctx.quadraticCurveTo(hx + fx * .5, hy + 1.22 * u, hx + .3 * u + fx * .4, hy + 1.02 * u); ctx.quadraticCurveTo(hx + .8 * u + fx * .3, hy + .78 * u, hx + .84 * u + fx * .2, hy + .05 * u);
        ctx.lineTo(hx + .7 * u + fx * .3, hy + .2 * u); ctx.quadraticCurveTo(hx + .45 * u + fx, hy + .5 * u, hx + fx, hy + .56 * u); ctx.quadraticCurveTo(hx - .45 * u + fx, hy + .5 * u, hx - .7 * u + fx * .3, hy + .2 * u); ctx.closePath(); }, 2.4);
      ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = P.beardSh; ctx.lineWidth = 1.5; const r = mulberry32(2);
      for (let i = 0; i < 40; i++) { const a = -2.5 + r() * 2, d = .75 + r() * .3; const x = hx + fx * .4 + Math.cos(a + Math.PI) * .8 * u * d * -1, y = hy + .5 * u + r() * .55 * u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y + 6); ctx.stroke(); } ctx.restore(); }
    // eyes
    const blink = blinkAt(P.name, st.t), eo = (E.eye ?? 1) * (1 - blink), ey = hy - .08 * u, lookY = (st.lookY ?? E.lookY ?? 0);
    for (const s of [-1, 1]) { const ex = hx + s * .34 * u + fx, sq = s * lk > .3 ? .8 : 1, ew = (isF ? .17 : .2) * u * sq, eh = (isF ? .1 : .135) * u * eo;
      if (eh > .5) { blob(ctx, '#fbf6ef', () => ell(ctx, ex, ey, ew, eh), 0); ctx.save(); ctx.beginPath(); ell(ctx, ex, ey, ew, eh); ctx.clip();
        blob(ctx, isF ? '#3a2416' : '#2a170c', () => ell(ctx, ex + lk * .07 * u, ey + lookY * .05 * u, (isF ? .085 : .105) * u, (isF ? .1 : .12) * u), 0);
        blob(ctx, '#0d0806', () => ell(ctx, ex + lk * .07 * u, ey + lookY * .05 * u, .045 * u, .05 * u), 0);
        blob(ctx, '#fff', () => ell(ctx, ex + lk * .07 * u + .035 * u, ey - .04 * u, .025 * u, .025 * u), 0); ctx.restore(); }
      ctx.strokeStyle = INK; ctx.lineWidth = isF ? 2.6 : 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(ex, ey, ew, Math.max(1, eh), 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      if (!isF && eo > .2) { ctx.beginPath(); ctx.moveTo(ex + s * ew * .9, ey - eh * .5); ctx.lineTo(ex + s * (ew + .07 * u), ey - eh * .9); ctx.stroke(); }
      // brows
      const lift = E.b[s < 0 ? 0 : 1] * u, by = ey - (isF ? .3 : .33) * u - lift, knit = (E.knit || 0) * u;
      ctx.strokeStyle = P.brow; ctx.lineWidth = (isF ? .09 : .08) * u; ctx.beginPath(); ctx.moveTo(ex + s * .2 * u, by + .02 * u); ctx.quadraticCurveTo(ex + s * .02 * u, by - .07 * u, ex - s * .16 * u, by + knit); ctx.stroke(); }
    // glasses: father always; daughter in 'critical' (as on the sheet)
    if (isF || st.glasses) { const gc = isF ? P.glasses : '#b8452a'; ctx.strokeStyle = gc; ctx.lineWidth = isF ? 3.2 : 3.6;
      for (const s of [-1, 1]) { const ex = hx + s * .34 * u + fx; ctx.beginPath(); ctx.roundRect(ex - .25 * u, ey - .17 * u, .5 * u, .34 * u, .07 * u); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(hx - .09 * u + fx, ey - .04 * u); ctx.quadraticCurveTo(hx + fx, ey - .1 * u, hx + .09 * u + fx, ey - .04 * u); ctx.stroke();
      for (const s of [-1, 1]) { if (s * lk > .5) continue; ctx.beginPath(); ctx.moveTo(hx + s * .59 * u + fx, ey - .08 * u); ctx.lineTo(hx + s * .84 * u + fx * .3, ey - .02 * u); ctx.stroke(); } }
    // nose
    ctx.strokeStyle = 'rgba(70,35,18,.75)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; const nx = hx + fx * 1.25;
    ctx.beginPath(); ctx.moveTo(nx + lk * .03 * u, hy + .02 * u); ctx.quadraticCurveTo(nx + lk * .12 * u + .04 * u, hy + .26 * u, nx + .02 * u, hy + .33 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx - .1 * u, hy + .31 * u); ctx.quadraticCurveTo(nx, hy + .37 * u, nx + .11 * u, hy + .31 * u); ctx.stroke();
    if (!isF) { ctx.strokeStyle = '#a9a9b2'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(nx + .005 * u, hy + .335 * u, .04 * u, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); }  // septum ring
    // mouth
    const mo = st.mouth || 0, mx = hx + fx * 1.15, my = hy + .58 * u, sm = st.smile ?? E.smile, sk = E.smirk || 0, mw = (isF ? .2 : .19) * u * (1 + .2 * sm);
    if (mo > .07 || E.o) { const h = E.o && mo < .07 ? .12 * u : (.05 + .2 * mo) * u;
      blob(ctx, '#5b1d16', () => { ctx.moveTo(mx - mw, my - sm * .03 * u); ctx.quadraticCurveTo(mx, my - h * .5 - sm * .04 * u, mx + mw, my - sm * .03 * u); ctx.quadraticCurveTo(mx, my + h * 1.2, mx - mw, my - sm * .03 * u); }, 2.4);
      if (mo > .25) blob(ctx, '#f4ece4', () => ctx.rect(mx - mw * .6, my - h * .45, mw * 1.2, h * .28), 0);
      if (mo > .35) blob(ctx, '#c4524a', () => ell(ctx, mx, my + h * .55, mw * .45, h * .22), 0); }
    else { ctx.strokeStyle = '#5a2418'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(mx - mw, my - (sm * .06 + sk * .07) * u); ctx.quadraticCurveTo(mx, my + sm * .14 * u, mx + mw, my - (sm * .06 - sk * .07) * u); ctx.stroke();
      if (!isF) { ctx.strokeStyle = 'rgba(150,70,50,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - mw * .5, my + .08 * u); ctx.quadraticCurveTo(mx, my + .13 * u, mx + mw * .5, my + .08 * u); ctx.stroke(); } }
    if (isF) blob(ctx, P.beard, () => { ctx.moveTo(mx - .32 * u, my - .01 * u); ctx.quadraticCurveTo(mx - .16 * u, my - .2 * u, mx, my - .12 * u); ctx.quadraticCurveTo(mx + .16 * u, my - .2 * u, mx + .32 * u, my - .01 * u); ctx.quadraticCurveTo(mx, my - .08 * u, mx - .32 * u, my - .01 * u); }, 2);
    // front hair
    if (isF) { blob(ctx, P.hair, () => { ctx.moveTo(hx - .9 * u, hy - .05 * u); ctx.quadraticCurveTo(hx - 1.0 * u, hy - 1.2 * u, hx - .15 * u, hy - 1.24 * u);
        ctx.quadraticCurveTo(hx + .85 * u, hy - 1.28 * u, hx + .92 * u, hy - .4 * u); ctx.lineTo(hx + .9 * u, hy - .05 * u); ctx.quadraticCurveTo(hx + .78 * u, hy - .62 * u, hx + .3 * u + fx * .3, hy - .82 * u);
        ctx.quadraticCurveTo(hx - .3 * u, hy - .9 * u, hx - .72 * u, hy - .62 * u); ctx.quadraticCurveTo(hx - .82 * u, hy - .4 * u, hx - .9 * u, hy - .05 * u); }, 2.6);
      ctx.strokeStyle = P.hairHi; ctx.lineWidth = 2.5; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(hx - .6 * u + i * .22 * u, hy - 1.1 * u); ctx.quadraticCurveTo(hx - .4 * u + i * .24 * u, hy - 1.0 * u, hx - .3 * u + i * .22 * u, hy - .9 * u); ctx.stroke(); } }
    else { blob(ctx, P.hair, () => { ctx.moveTo(hx - .98 * u, hy + .9 * u); ctx.lineTo(hx - .92 * u, hy - .5 * u); ctx.quadraticCurveTo(hx - .9 * u, hy - 1.3 * u, hx, hy - 1.3 * u);
        ctx.quadraticCurveTo(hx + .9 * u, hy - 1.3 * u, hx + .92 * u, hy - .5 * u); ctx.lineTo(hx + .98 * u, hy + .9 * u); ctx.lineTo(hx + .82 * u, hy + .6 * u); ctx.lineTo(hx + .76 * u, hy + .95 * u);
        ctx.lineTo(hx + .7 * u, hy - .25 * u);
        const bang = [[.62, -.4], [.48, -.3], [.36, -.42], [.2, -.32], [.06, -.44], [-.1, -.33], [-.24, -.45], [-.38, -.32], [-.52, -.43], [-.64, -.3]];
        for (const [a, b] of bang) ctx.lineTo(hx + a * u + fx * .35, hy + b * u);
        ctx.lineTo(hx - .7 * u, hy - .25 * u); ctx.lineTo(hx - .76 * u, hy + .95 * u); ctx.lineTo(hx - .82 * u, hy + .6 * u); ctx.closePath(); }, 2.4, '#000');
      ctx.strokeStyle = P.hairHi; ctx.lineWidth = 2.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(hx - .5 * u + i * .25 * u, hy - 1.15 * u); ctx.quadraticCurveTo(hx - .4 * u + i * .25 * u, hy - .8 * u, hx - .45 * u + i * .25 * u, hy - .5 * u); ctx.stroke(); } }
  }

  // seated body. seat = hip point on the cushion. st: t, look, mouth, expr, gesture 0..1, lean, nod
  function father(ctx, seat, st) {
    const P = FATHER, u = P.u, x = seat.x, y = seat.y + Math.sin(st.t * 1.6) * 1.2, g = st.gesture || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(st.lean || 0); ctx.translate(-x, -y);
    // legs: left leg down, right leg crossed over toward his left (screen-left)
    limb(ctx, [[x - .55 * u, y + .1 * u], [x - .62 * u, y + .7 * u], [x - .5 * u, y + 3.55 * u]], 1.0 * u, P.trousersSh);
    blob(ctx, P.shoes, () => ell(ctx, x - .62 * u, y + 3.75 * u, .62 * u, .26 * u));
    limb(ctx, [[x + .6 * u, y + .05 * u], [x - .2 * u, y + .5 * u], [x - 1.55 * u, y + 2.25 * u]], 1.05 * u, P.trousers);
    blob(ctx, P.shoes, () => ell(ctx, x - 1.85 * u, y + 2.45 * u, .6 * u, .25 * u, -.5));
    blob(ctx, '#e6ddd0', () => ell(ctx, x - 1.55 * u, y + 2.23 * u, .26 * u, .12 * u, -.9), 0);
    // torso (shirt)
    const sy = y - 3.85 * u;
    blob(ctx, P.shirt, () => { ctx.moveTo(x - 1.55 * u, sy + .55 * u); ctx.quadraticCurveTo(x - 1.6 * u, sy, x - .7 * u, sy - .12 * u); ctx.lineTo(x + .7 * u, sy - .12 * u);
      ctx.quadraticCurveTo(x + 1.6 * u, sy, x + 1.55 * u, sy + .55 * u); ctx.lineTo(x + 1.28 * u, y - .05 * u); ctx.lineTo(x - 1.28 * u, y - .05 * u); ctx.closePath(); });
    ctx.save(); ctx.clip(); ctx.fillStyle = P.shirtSh; ctx.fillRect(x + .75 * u, sy - u, 1.2 * u, 5 * u); ctx.restore();
    ctx.strokeStyle = 'rgba(40,55,80,.45)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x + .05 * u, sy + .55 * u); ctx.lineTo(x + .05 * u, y - .35 * u); ctx.stroke();
    for (let i = 0; i < 4; i++) blob(ctx, '#dfe6ef', () => ell(ctx, x + .14 * u, sy + (.8 + i * .7) * u, .045 * u, .045 * u), 1.2);
    blob(ctx, P.belt, () => ctx.rect(x - 1.3 * u, y - .4 * u, 2.6 * u, .3 * u), 2.4); blob(ctx, '#9a8460', () => ctx.rect(x - .05 * u, y - .38 * u, .26 * u, .26 * u), 2);
    // collar
    for (const s of [-1, 1]) blob(ctx, P.shirt, () => { ctx.moveTo(x, sy + .62 * u); ctx.lineTo(x + s * .52 * u, sy - .14 * u); ctx.lineTo(x + s * .2 * u, sy - .2 * u); ctx.closePath(); }, 2.4);
    blob(ctx, P.skinSh, () => { ctx.moveTo(x - .22 * u, sy - .16 * u); ctx.lineTo(x, sy + .55 * u); ctx.lineTo(x + .22 * u, sy - .16 * u); ctx.closePath(); }, 0);
    // head (nods with the voice)
    const hy = sy - 1.35 * u - (st.nod || 0) * .06 * u; ctx.save(); ctx.translate(x, hy + u); ctx.rotate((st.tilt || 0)); ctx.translate(-x, -hy - u);
    head(ctx, P, x + (st.look || 0) * .08 * u, hy, u, st); ctx.restore();
    // arms: mug hand on his knee, gesture hand rises with the voice
    const sl = [x + 1.4 * u, sy + .35 * u], sr = [x - 1.4 * u, sy + .35 * u];
    const mugH = [x + .25 * u, y + .1 * u]; limb(ctx, [sl, [x + 1.75 * u, y - 1.6 * u]], .78 * u, P.shirt); limb(ctx, [[x + 1.75 * u, y - 1.6 * u], [x + 1.78 * u, y - 1.25 * u]], .8 * u, '#7f97b9');
    limb(ctx, [[x + 1.75 * u, y - 1.2 * u], mugH], .56 * u, P.skin);
    blob(ctx, '#3d4554', () => ctx.roundRect(mugH[0] - .32 * u, mugH[1] - .62 * u, .56 * u, .66 * u, .08 * u)); ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(mugH[0] + .3 * u, mugH[1] - .32 * u, .16 * u, -1.3, 1.3); ctx.stroke();
    blob(ctx, P.skin, () => ell(ctx, mugH[0] - .02 * u, mugH[1] - .18 * u, .26 * u, .2 * u));
    const dir = st.pointDir ?? -1, el = [lerp(x - 1.75 * u, x - 1.95 * u, g), lerp(y - 1.6 * u, y - 2.2 * u, g)];
    const hand = [lerp(x - .6 * u, x + (dir === 0 ? -.9 : -2.4) * u, g), lerp(y + .05 * u, y - (dir === 0 ? 3.0 : 3.25) * u, g)];
    limb(ctx, [sr, el], .78 * u, P.shirt); limb(ctx, [el, [lerp(el[0], hand[0], .18), lerp(el[1], hand[1], .18)]], .8 * u, '#7f97b9'); limb(ctx, [[lerp(el[0], hand[0], .15), lerp(el[1], hand[1], .15)], hand], .56 * u, P.skin);
    blob(ctx, P.skin, () => ell(ctx, hand[0], hand[1], .26 * u, .22 * u));
    if (g > .5) limb(ctx, [hand, [hand[0] + (dir === 0 ? .05 : -.25) * u, hand[1] - .42 * u]], .12 * u, P.skin, INK, 2);
    ctx.restore();
  }
  function daughter(ctx, seat, st) {
    const P = DAUGHTER, u = P.u, x = seat.x, y = seat.y + Math.sin(st.t * 1.7 + 1) * 1.2, g = st.gesture || 0;
    ctx.save(); ctx.translate(x, y); ctx.rotate(st.lean || 0); ctx.translate(-x, -y);
    // legs: knees together, angled toward her father (screen-right)
    for (const [s, c] of [[-1, P.jeansSh], [1, P.jeans]]) { limb(ctx, [[x + s * .55 * u, y + .05 * u], [x + s * .35 * u + .35 * u, y + .7 * u], [x + s * .42 * u + .55 * u, y + 3.3 * u]], 1.0 * u, c);
      blob(ctx, '#9fb3c9', () => ctx.roundRect(x + s * .42 * u + .55 * u - .55 * u, y + 3.05 * u, 1.1 * u, .32 * u, .1 * u), 2.4);
      blob(ctx, P.shoes, () => ell(ctx, x + s * .42 * u + .7 * u, y + 3.62 * u, .56 * u, .3 * u)); blob(ctx, '#f2f0ea', () => ctx.rect(x + s * .42 * u + .16 * u, y + 3.72 * u, 1.08 * u, .14 * u), 2);
      ctx.strokeStyle = '#f2f0ea'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + s * .42 * u + .55 * u, y + (3.42 + k * .08) * u); ctx.lineTo(x + s * .42 * u + .85 * u, y + (3.42 + k * .08) * u); ctx.stroke(); } }
    // torso (black tee + jeans waist)
    const sy = y - 3.6 * u;
    blob(ctx, P.jeans, () => ctx.rect(x - 1.15 * u, y - .55 * u, 2.3 * u, .65 * u), 2.6);
    blob(ctx, P.shirt, () => { ctx.moveTo(x - 1.35 * u, sy + .5 * u); ctx.quadraticCurveTo(x - 1.4 * u, sy, x - .6 * u, sy - .1 * u); ctx.lineTo(x + .6 * u, sy - .1 * u);
      ctx.quadraticCurveTo(x + 1.4 * u, sy, x + 1.35 * u, sy + .5 * u); ctx.lineTo(x + 1.18 * u, y - .45 * u); ctx.lineTo(x - 1.18 * u, y - .45 * u); ctx.closePath(); }, 2.6, '#000');
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - .9 * u, y - 1.4 * u); ctx.quadraticCurveTo(x - .5 * u, y - 1.2 * u, x - .2 * u, y - 1.5 * u); ctx.stroke();
    blob(ctx, P.skinSh, () => { ctx.arc(x, sy - .12 * u, .32 * u, 0, Math.PI); }, 0); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = .1 * u; ctx.beginPath(); ctx.arc(x, sy - .1 * u, .36 * u, .05 * Math.PI, .95 * Math.PI); ctx.stroke();
    // head
    const hy = sy - 1.3 * u - (st.nod || 0) * .06 * u; ctx.save(); ctx.translate(x, hy + u); ctx.rotate(st.tilt || 0); ctx.translate(-x, -hy - u);
    head(ctx, P, x + (st.look || 0) * .08 * u, hy, u, st); ctx.restore();
    // arms: phone in her left hand on her lap, right hand gestures (open palm)
    const ph = [x - .15 * u, y - .7 * u], sl = [x - 1.25 * u, sy + .3 * u], sr = [x + 1.25 * u, sy + .3 * u];
    limb(ctx, [sl, [x - 1.45 * u, sy + 1.0 * u]], .74 * u, P.shirt, '#000'); limb(ctx, [[x - 1.45 * u, sy + .95 * u], [x - 1.4 * u, y - 1.3 * u], ph], .5 * u, P.skin);
    ctx.save(); ctx.translate(ph[0] + .15 * u, ph[1] - .25 * u); ctx.rotate(-.2); blob(ctx, '#202020', () => ctx.roundRect(-.28 * u, -.5 * u, .56 * u, 1.0 * u, .1 * u), 2.4, '#000');
    blob(ctx, '#6e9bd0', () => ctx.rect(-.22 * u, -.42 * u, .44 * u, .82 * u), 0); ctx.restore();
    blob(ctx, P.skin, () => ell(ctx, ph[0], ph[1], .24 * u, .2 * u));
    const el = [lerp(x + 1.5 * u, x + 1.75 * u, g), lerp(sy + 1.6 * u, sy + 1.2 * u, g)], hand = [lerp(x + .3 * u, x + 1.55 * u, g), lerp(y - .55 * u, sy + .2 * u, g)];
    limb(ctx, [sr, [lerp(sr[0], el[0], .45), lerp(sr[1], el[1], .45)]], .74 * u, P.shirt, '#000'); limb(ctx, [[lerp(sr[0], el[0], .4), lerp(sr[1], el[1], .4)], el, hand], .5 * u, P.skin);
    if (g > .5) openHand(ctx, hand[0], hand[1], u, P.skin); else blob(ctx, P.skin, () => ell(ctx, hand[0], hand[1], .24 * u, .2 * u));
    ctx.restore();
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
    ctx.restore(); ctx.fillStyle = 'rgba(255,235,190,.08)'; ctx.fillRect(x, y, w, h);
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
  function coffeeTable(ctx) {
    blob(ctx, '#3e2416', () => { ctx.moveTo(250, 1560); ctx.lineTo(830, 1560); ctx.lineTo(860, 1610); ctx.lineTo(220, 1610); ctx.closePath(); }, 3.5, '#1a0e07');
    blob(ctx, '#2f1b10', () => ctx.rect(225, 1610, 630, 50), 3.5, '#1a0e07');
    ctx.fillStyle = '#c9a24e'; ctx.beginPath(); ctx.ellipse(540, 1635, 40, 16, 0, 0, 7); ctx.fill();
    for (const x of [240, 820]) blob(ctx, '#3e2416', () => { ctx.moveTo(x, 1660); ctx.quadraticCurveTo(x - 20, 1720, x + 5, 1800); ctx.lineTo(x + 25, 1800); ctx.quadraticCurveTo(x + 10, 1720, x + 20, 1660); ctx.closePath(); }, 3, '#1a0e07');
    blob(ctx, '#e8dfcf', () => ctx.rect(600, 1560, 110, 18), 2); blob(ctx, '#2b4a6b', () => ctx.rect(600, 1554, 110, 8), 1.5);
    ctx.strokeStyle = 'rgba(230,235,245,.85)'; ctx.lineWidth = 3; for (const x of [380, 420]) { ctx.beginPath(); ctx.moveTo(x - 14, 1495); ctx.quadraticCurveTo(x, 1545, x + 14, 1495); ctx.moveTo(x, 1535); ctx.lineTo(x, 1572); ctx.moveTo(x - 12, 1574); ctx.lineTo(x + 12, 1574); ctx.stroke(); }
  }
  function lamp(ctx) {
    blob(ctx, '#3e2416', () => ctx.rect(1000, 1080, 140, 20), 3); blob(ctx, '#3e2416', () => ctx.rect(1060, 1100, 22, 110), 3);
    blob(ctx, '#b08b3a', () => { ctx.ellipse(1070, 1040, 26, 40, 0, 0, 7); }, 3); blob(ctx, '#b08b3a', () => ctx.rect(1066, 930, 8, 80), 2);
    blob(ctx, '#ead9b1', () => { ctx.moveTo(1010, 930); ctx.lineTo(1130, 930); ctx.lineTo(1105, 850); ctx.lineTo(1035, 850); ctx.closePath(); }, 3);
    ctx.strokeStyle = '#c9a24e'; ctx.lineWidth = 2; for (let x = 1012; x < 1130; x += 7) { ctx.beginPath(); ctx.moveTo(x, 932); ctx.lineTo(x, 948); ctx.stroke(); }
    const g = ctx.createRadialGradient(1070, 900, 10, 1070, 900, 520); g.addColorStop(0, 'rgba(255,200,130,.35)'); g.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(500, 400, 1100, 1100); ctx.restore();
  }
  const SEAT_D = { x: 330, y: 1150 }, SEAT_F = { x: 770, y: 1150 };
  function room(ctx, t, dState, fState) {
    wall(ctx); windowBay(ctx, -230, t); windowBay(ctx, 1010, t); painting(ctx); floor(ctx); sofaBack(ctx); sofaFront(ctx);
    // warm evening grade on the set; the people get only a touch of it so their colours stay true to the sheet
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,190,120,.35)'; ctx.fillRect(-500, -500, 2080, 2920); ctx.restore();
    daughter(ctx, SEAT_D, dState); father(ctx, SEAT_F, fState); lamp(ctx); coffeeTable(ctx); chandelier(ctx, t);
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,200,140,.12)'; ctx.fillRect(-500, -500, 2080, 2920); ctx.restore();
  }
  const headPos = (who) => who === 'daughter' ? { x: SEAT_D.x, y: SEAT_D.y - 3.6 * DAUGHTER.u - 1.3 * DAUGHTER.u } : { x: SEAT_F.x, y: SEAT_F.y - 3.85 * FATHER.u - 1.35 * FATHER.u };
  window.STUDY = { room, headPos, father, daughter, FATHER, DAUGHTER };
})();
