// Music bed + SFX synthesis (deterministic) and VO envelope analysis.
const fs = require('fs'), { execFileSync } = require('child_process');
const U = require('./util.js'), S = require('../score.js');
const SR = 48000, N = Math.ceil(S.DURATION * SR);

function writeWav(path, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(U.clamp(L[i], -1, 1) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(U.clamp(R[i], -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path, b);
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------- music: D minor, 100 BPM, i–VI–III–VII, no drums under speech ----------
function music() {
  const L = new Float32Array(N), R = new Float32Array(N), beat = 60 / 100, bar = beat * 4;
  const chords = [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]]; // Dm Bb F C
  const rnd = U.mulberry32(7);
  const add = (t0, dur, f, amp, harm, att, rel, pan = 0) => {
    const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + dur + rel) * SR));
    const ph = rnd() * 6.28;
    for (let i = i0; i < i1; i++) {
      const t = i / SR - t0; let e = Math.min(1, t / att); if (t > dur) e *= Math.max(0, 1 - (t - dur) / rel);
      let v = 0; for (let h = 1; h <= harm; h++) v += Math.sin(2 * Math.PI * f * h * t + ph * h) / (h * h);
      v *= amp * e; L[i] += v * (1 - pan) ; R[i] += v * (1 + pan);
    }
  };
  const pluck = (t0, f, amp, pan) => {
    const i0 = Math.floor(t0 * SR), i1 = Math.min(N, i0 + Math.floor(0.9 * SR));
    for (let i = i0; i < i1; i++) { const t = (i - i0) / SR, e = Math.exp(-t * 6) * Math.min(1, t / 0.004);
      const v = amp * e * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t * 12));
      L[i] += v * (1 - pan); R[i] += v * (1 + pan); }
  };
  const bars = Math.ceil(S.DURATION / bar);
  const vol = (t) => { // arrangement shape
    if (t < 6.3) return 0.55; if (t > 14 && t < 19.6) return 0.6;  // sparse on the kill count
    if (t > 57 && t < 57.7) return 0.25; return 1; };
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = chords[b % 4], v = vol(t0 + 0.1);
    const end = t0 + bar > S.DURATION - 1.5;
    for (const m of ch) add(t0, bar - 0.05, hz(m), 0.035 * v, 5, 0.5, 0.6, (m % 3 - 1) * 0.3);
    add(t0, bar - 0.05, hz(ch[0] - 12), 0.06 * v, 2, 0.3, 0.4);
    if (t0 > 7.8 && !(t0 > 14 && t0 < 19.2) && !end) {  // eighth-note arp
      for (let k = 0; k < 8; k++) { const tt = t0 + k * beat / 2; if (tt > 57 && tt < 57.7) continue;
        pluck(tt, hz(ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12), 0.03 * v * (k % 2 ? 0.7 : 1), k % 2 ? 0.35 : -0.35); }
    }
  }
  // drums only after the voice has finished
  for (let t = Math.ceil(S.anchors.voEnd / beat) * beat; t < S.DURATION - 0.8; t += beat) {
    const i0 = Math.floor(t * SR);
    for (let i = i0; i < Math.min(N, i0 + 0.35 * SR); i++) { const tt = (i - i0) / SR;
      const v = 0.22 * Math.exp(-tt * 14) * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-tt * 30)) * tt); L[i] += v; R[i] += v; }
  }
  // fade out last 1.6 s, fade in 0.4 s
  for (let i = 0; i < N; i++) { const t = i / SR, g = Math.min(1, t / 0.4, (S.DURATION - t) / 1.6); L[i] *= g; R[i] *= g; }
  // duck envelope from timing.json (MIX.duck equivalent): -10 dB under speech, 120 ms attack, 350 ms release
  const duck = new Float32Array(N).fill(1);
  for (const p of S.vo) {
    for (let i = Math.floor((p.start - 0.12) * SR); i < Math.min(N, Math.floor((p.end + 0.35) * SR)); i++) {
      const t = i / SR; let d = 1;
      if (t < p.start) d = (p.start - t) / 0.12; else if (t > p.end) d = (t - p.end) / 0.35; else d = 0;
      duck[i] = Math.min(duck[i], 0.316 + 0.684 * U.clamp(d));
    }
  }
  for (let i = 0; i < N; i++) { L[i] *= duck[i]; R[i] *= duck[i]; }
  return [L, R];
}

// ---------- SFX on the 'av' markers ----------
function sfx() {
  const L = new Float32Array(N), R = new Float32Array(N), rnd = U.mulberry32(99), mk = S.mk;
  const put = (t0, dur, fn) => { const i0 = Math.floor(t0 * SR);
    for (let i = i0; i < Math.min(N, i0 + dur * SR); i++) { const [l, r] = fn((i - i0) / SR); L[i] += l; R[i] += r; } };
  const tone = (t0, f, amp, dec, dur = 2) => put(t0, dur, t => { const v = amp * Math.exp(-t * dec) * Math.min(1, t / 0.003) * Math.sin(2 * Math.PI * f * t); return [v, v]; });
  const noise = (t0, dur, amp, env, cut) => { let y = 0; const a = Math.exp(-2 * Math.PI * cut / SR);
    put(t0, dur, t => { y = a * y + (1 - a) * (rnd() * 2 - 1); const v = amp * env(t / dur) * y; return [v, v]; }); };
  // hook: small chime
  tone(mk.hook, 1568, 0.10, 3.5); tone(mk.hook + 0.07, 2093, 0.08, 3.5);
  // portrait: low drone hit
  tone(mk.portrait, 55, 0.35, 1.2, 3); tone(mk.portrait, 82.4, 0.18, 1.5, 3); noise(mk.portrait, 0.6, 0.25, x => Math.exp(-x * 6), 400);
  // tide: low rushing swell
  noise(mk.tide, 2.0, 0.22, x => Math.sin(Math.PI * x), 600);
  // forty: thud
  put(mk.forty, 0.6, t => { const v = 0.5 * Math.exp(-t * 9) * Math.sin(2 * Math.PI * (45 + 70 * Math.exp(-t * 25)) * t); return [v, v]; });
  // forest: soft swell
  noise(mk.forest - 0.4, 1.6, 0.12, x => Math.pow(Math.sin(Math.PI * x), 2), 2500);
  for (const f of [587, 880, 1175]) put(mk.forest - 0.3, 1.8, t => { const v = 0.025 * Math.sin(Math.PI * U.clamp(t / 1.8)) * Math.sin(2 * Math.PI * f * t); return [v, v]; });
  // carbon: bubble blips
  for (let k = 0; k < 9; k++) { const t0 = mk.carbon + k * 0.24 + rnd() * 0.1, f0 = 500 + rnd() * 500;
    put(t0, 0.12, t => { const v = 0.06 * Math.exp(-t * 30) * Math.sin(2 * Math.PI * (f0 + 3000 * t) * t); return [v * (k % 2 ? .6 : 1), v * (k % 2 ? 1 : .6)]; }); }
  // year: calendar flick + tick
  noise(S.mk.year - 0.05, 0.12, 0.25, x => Math.exp(-x * 4), 5000); tone(mk.year + 0.05, 1800, 0.12, 60, 0.15);
  // swallow: rising whoosh
  noise(mk.swallow - 0.3, 0.9, 0.2, x => Math.pow(x, 2) * (1 - Math.pow(x, 8)), 1800);
  // only: shimmer
  [1047, 1319, 1568, 2093].forEach((f, k) => tone(mk.only + k * 0.08, f, 0.04, 3));
  // core: glassy ping
  put(mk.core, 2.5, t => { const v = 0.11 * Math.exp(-t * 2.2) * (Math.sin(2 * Math.PI * 2637 * t) + 0.4 * Math.sin(2 * Math.PI * 3951 * t + 0.4 * Math.sin(2 * Math.PI * 5 * t))); return [v, v]; });
  // volcano: boom
  put(mk.volcano, 2.5, t => { const v = 0.6 * Math.exp(-t * 2.5) * Math.sin(2 * Math.PI * (32 + 40 * Math.exp(-t * 8)) * t); return [v, v]; });
  noise(mk.volcano, 2.2, 0.5, x => Math.exp(-x * 5), 300);
  // endcard: stinger (D minor hit)
  for (const m of [62, 65, 69, 74]) put(mk.endcard, 1.5, t => { const f = hz(m); let v = 0; for (let h = 1; h < 6; h++) v += Math.sin(2 * Math.PI * f * h * t) / h;
    v *= 0.025 * Math.exp(-t * 2.5) * Math.min(1, t / 0.01); return [v, v]; });
  // buttons: two pops, لايك then اشترك
  [0, 0.4].forEach((d, k) => put(mk.buttons + d, 0.15, t => { const v = 0.12 * Math.exp(-t * 35) * Math.sin(2 * Math.PI * (k ? 1320 : 880) * (1 + 2 * t) * t); return [v, v]; }));
  return [L, R];
}

// ---------- VO envelope for lip-sync ----------
function voEnvelope() {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', S.VO, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), hop = 16000 / S.FPS, env = [];
  for (let f = 0; f * hop < x.length; f++) { let s = 0; const a = Math.floor(f * hop), b = Math.min(x.length, Math.floor((f + 1) * hop));
    for (let i = a; i < b; i++) s += x[i] * x[i]; env.push(Math.sqrt(s / Math.max(1, b - a))); }
  const peak = env.slice().sort((a, b) => a - b)[Math.floor(env.length * 0.98)];
  return env.map(v => +U.clamp(v / peak).toFixed(3));
}

module.exports = { music, sfx, voEnvelope, writeWav, SR };
if (require.main === module) {
  const [ml, mr] = music(); writeWav('build/music.wav', ml, mr);
  const [sl, sr] = sfx(); writeWav('build/sfx.wav', sl, sr);
  fs.writeFileSync('build/vo_env.json', JSON.stringify(voEnvelope()));
  console.log('audio stems written');
}
