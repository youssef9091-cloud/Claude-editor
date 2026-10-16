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

// ---------- music: calm storytelling bed (felt piano + warm strings pad + soft bass), 72 BPM, no drums ----------
function reverb(L, R, mix = .28) {   // small stereo Schroeder reverb
  const combs = [1557, 1617, 1491, 1422], aps = [225, 556], out = [new Float32Array(N), new Float32Array(N)];
  [L, R].forEach((x, ch) => { const y = out[ch];
    for (const [k, d0] of combs.entries()) { const d = d0 + ch * 23, buf = new Float32Array(d); let i2 = 0, lp = 0;
      for (let i = 0; i < N; i++) { const o = buf[i2]; lp = o * .7 + lp * .3; buf[i2] = x[i] + lp * .8; i2 = (i2 + 1) % d; y[i] += o * .25; } }
    for (const d0 of aps) { const d = d0 + ch * 7, buf = new Float32Array(d); let i2 = 0;
      for (let i = 0; i < N; i++) { const b = buf[i2], v = y[i] + b * .5; buf[i2] = v; y[i] = b - .5 * v; i2 = (i2 + 1) % d; } } });
  for (let i = 0; i < N; i++) { L[i] = L[i] * (1 - mix) + out[0][i] * mix; R[i] = R[i] * (1 - mix) + out[1][i] * mix; }
}
function music() {
  const L = new Float32Array(N), R = new Float32Array(N), beat = 60 / 72, bar = beat * 4, rnd = U.mulberry32(7);
  const chords = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64]];   // Dm  Bb  F  C
  const pad = (t0, dur, f, amp, pan) => { const i0 = Math.max(0, Math.floor(t0 * SR)), i1 = Math.min(N, Math.floor((t0 + dur + 1.6) * SR));
    for (let i = i0; i < i1; i++) { const t = i / SR - t0; let e = Math.min(1, t / 1.4); if (t > dur) e *= Math.max(0, 1 - (t - dur) / 1.6);
      let v = 0; for (const dt of [-.0016, .0016]) for (let h = 1; h <= 4; h++) v += Math.sin(2 * Math.PI * f * (1 + dt) * h * t) / (h * h * 1.6);
      v *= amp * e * (1 + .08 * Math.sin(2 * Math.PI * .22 * t)); L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };
  const piano = (t0, f, amp, pan) => { const i0 = Math.floor(t0 * SR), i1 = Math.min(N, i0 + Math.floor(3.2 * SR));
    for (let i = i0; i < i1; i++) { const t = (i - i0) / SR, att = Math.min(1, t / .006);
      const v = amp * att * (Math.exp(-t * 1.3) * Math.sin(2 * Math.PI * f * t) + .35 * Math.exp(-t * 3) * Math.sin(4 * Math.PI * f * t) + .12 * Math.exp(-t * 6) * Math.sin(6 * Math.PI * f * t));
      L[i] += v * (1 - pan); R[i] += v * (1 + pan); } };
  const bars = Math.ceil(S.DURATION / bar), vEnd = S.anchors.voEnd;
  for (let b = 0; b < bars; b++) { const t0 = b * bar, ch = chords[b % 4];
    const last = t0 + bar > S.DURATION - .5, c = last ? chords[0] : ch;   // resolve home on the end card
    for (const [k, m] of c.entries()) pad(t0, bar - .1, hz(m), .016, (k - 1.5) * .25);
    pad(t0, bar - .1, hz(c[0] - 12), .03, 0);
    const sparse = (t0 > 13.5 && t0 < 19.5) || (t0 > 56.6 && t0 < 57.8);   // let the kill count and the volcano breathe
    if (t0 >= bar && !sparse) { const pat = [0, 1, 2, 1, 3, 1, 2, 1];
      for (let k = 0; k < 8; k++) { const tt = t0 + k * beat / 2; if (tt > S.DURATION - 2.5) break;
        piano(tt + (rnd() - .5) * .015, hz(c[pat[k]] + 12), (.05 + rnd() * .015) * (k % 2 ? .6 : 1), k % 2 ? .3 : -.3); } }
    if (last || (t0 <= vEnd && t0 + bar > vEnd)) piano(Math.max(t0, vEnd + .4), hz(62 + 12), .06, 0);
  }
  reverb(L, R, .3);
  for (let i = 0; i < N; i++) { const t = i / SR, g = Math.min(1, t / 1.5, (S.DURATION - t) / 2.5); L[i] *= g; R[i] *= g; }
  // duck under the voice (MIX.duck equivalent): -12 dB under speech, 150 ms attack, 450 ms release
  const duck = new Float32Array(N).fill(1);
  for (const p of S.vo) for (let i = Math.max(0, Math.floor((p.start - .15) * SR)); i < Math.min(N, Math.floor((p.end + .45) * SR)); i++) {
    const t = i / SR, d = t < p.start ? (p.start - t) / .15 : t > p.end ? (t - p.end) / .45 : 0; duck[i] = Math.min(duck[i], .25 + .75 * U.clamp(d)); }
  for (let i = 0; i < N; i++) { L[i] *= duck[i]; R[i] *= duck[i]; }
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

module.exports = { music, voEnvelope, writeWav, SR };
if (require.main === module) {
  const [ml, mr] = music(); writeWav('build/music.wav', ml, mr);
  fs.writeFileSync('build/vo_env.json', JSON.stringify(voEnvelope()));
  console.log('audio stems written');
}
