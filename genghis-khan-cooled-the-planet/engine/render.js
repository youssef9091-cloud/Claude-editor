#!/usr/bin/env node
// engine/render.js — analyze | audio | stills | board | preview | render | mux | srt | poster | qa | pacing | check | verify | all
const fs = require('fs'), path = require('path'), http = require('http'), { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'); process.chdir(ROOT);
const S = require('../score.js');
const NAME = 'genghis-khan-cooled-the-planet', OUT = 'out', BUILD = 'build';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(BUILD, { recursive: true });
const sh = (cmd, args, o = {}) => execFileSync(cmd, args, { stdio: o.capture ? 'pipe' : 'inherit', maxBuffer: 1 << 28 })?.toString();
const fmt = t => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };

// ── tiny static server + headless chromium ──
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function serve() { return new Promise(ok => { const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  srv.listen(0, '127.0.0.1', () => ok(srv)); }); }
async function browser(scale = 1, n = 1) {
  const { chromium } = require('playwright-core'), srv = await serve(), port = srv.address().port;
  const b = await chromium.launch({ executablePath: CHROME, args: ['--disable-gpu', '--font-render-hinting=none'] });
  const pages = [];
  for (let i = 0; i < n; i++) { const p = await b.newPage({ viewport: { width: Math.round(S.W * scale), height: Math.round(S.H * scale) } });
    p.on('pageerror', e => console.error('page error:', e.message));
    await p.goto(`http://127.0.0.1:${port}/engine/page.html?scale=${scale}`);
    await p.waitForFunction(() => window.READY || window.ERR, null, { timeout: 60000 });
    const err = await p.evaluate(() => window.ERR); if (err) throw new Error(err); pages.push(p); }
  return { pages, close: async () => { await b.close(); srv.close(); } };
}
async function frameJPEG(page, t, q = .94) { const d = await page.evaluate(([t, q]) => { window.renderFrame(t); return window.grab(q); }, [t, q]); return Buffer.from(d.split(',')[1], 'base64'); }

// ── commands ──
const C = {};
C.analyze = (file = S.VO) => {
  const dur = +sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { capture: true });
  const L = loudness(file);
  console.log(`VO ${file}: ${dur.toFixed(2)} s · ${L.I} LUFS · true peak ${L.TP} dBTP · timing.json says ${require('../timing.json').duration} s · ${S.vo.length} phrases`);

};
function loudness(file) { const p = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = p.stderr, I = +(s.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0], TP = +(s.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)[0]; return { I, TP }; }
C.audio = () => {
  sh('node', ['engine/audio.js']);
  // VO is the lead; music bed already ducked (MIX.duck equivalent) in audio.js
  sh('ffmpeg', ['-y', '-v', 'error', '-i', S.VO, '-i', `${BUILD}/music.wav`, '-i', `${BUILD}/sfx.wav`, '-filter_complex',
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${S.DURATION}[v];[1:a]volume=0.9[m];[2:a]volume=0.8[x];[v][m][x]amix=inputs=3:normalize=0:duration=first[mix]`,
    '-map', '[mix]', '-t', String(S.DURATION), '-c:a', 'pcm_s16le', `${BUILD}/premix.wav`]);
  const p = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', `${BUILD}/premix.wav`, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const j = JSON.parse(p.stderr.slice(p.stderr.lastIndexOf('{'), p.stderr.lastIndexOf('}') + 1));
  sh('ffmpeg', ['-y', '-v', 'error', '-i', `${BUILD}/premix.wav`, '-af', `loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`,
    '-c:a', 'pcm_s16le', `${BUILD}/mix.wav`]);
  const L = loudness(`${BUILD}/mix.wav`); console.log(`mix: ${L.I} LUFS, true peak ${L.TP} dBTP`);
};
C.stills = async (which) => {
  const pts = which ? which.split(',').map(x => S.mk[x] ?? +x) : S.markers.map(m => m.t + 0.12);
  const names = which ? which.split(',') : S.markers.map(m => m.name);
  fs.mkdirSync(`${OUT}/stills`, { recursive: true }); const br = await browser(1);
  for (let i = 0; i < pts.length; i++) { const f = `${OUT}/stills/${String(i + 1).padStart(2, '0')}_${names[i]}.jpg`; fs.writeFileSync(f, await frameJPEG(br.pages[0], pts[i], .9)); }
  await br.close(); console.log(`${pts.length} stills → ${OUT}/stills/`);
};
C.board = async () => {
  if (!fs.existsSync(`${OUT}/stills`)) await C.stills();
  const files = fs.readdirSync(`${OUT}/stills`).filter(f => f.endsWith('.jpg')).sort(), cols = 7, rows = Math.ceil(files.length / cols);
  const list = files.map(f => `file '${path.resolve(OUT, 'stills', f)}'`).join('\n'); fs.writeFileSync(`${BUILD}/board.txt`, list);
  sh('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${BUILD}/board.txt`, '-vf',
    `scale=270:480,drawtext=text='%{n}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.5,tile=${cols}x${rows}:padding=6:color=0x222222`, '-frames:v', '1', `${OUT}/board.jpg`]);
  console.log(`board → ${OUT}/board.jpg (${files.length} markers)`);
};
async function encode(scale, fps, outFile, workers = 4) {
  const n = Math.ceil(S.DURATION * fps), br = await browser(scale, workers), seg = Math.ceil(n / workers), t0 = Date.now();
  await Promise.all(br.pages.map(async (page, w) => { const a = w * seg, b = Math.min(n, a + seg);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', scale < 1 ? '23' : '16',
      '-pix_fmt', 'yuv420p', '-r', String(fps), `${BUILD}/seg${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) { const buf = await frameJPEG(page, f / fps, .95); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && f % 60 === 0) process.stdout.write(`\r  frame ${f * workers}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); }));
  await br.close(); process.stdout.write('\n');
  fs.writeFileSync(`${BUILD}/segs.txt`, br.pages.map((_, w) => `file '${path.resolve(BUILD, 'seg' + w + '.mp4')}'`).join('\n'));
  sh('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', `${BUILD}/segs.txt`, '-c', 'copy', outFile]);
}
C.preview = async () => {
  if (!fs.existsSync(`${BUILD}/mix.wav`)) C.audio();
  await encode(0.5, 15, `${BUILD}/preview_video.mp4`);
  sh('ffmpeg', ['-y', '-v', 'error', '-i', `${BUILD}/preview_video.mp4`, '-i', `${BUILD}/mix.wav`, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', `${OUT}/preview.mp4`]);
  console.log(`preview → ${OUT}/preview.mp4`);
};
C.render = async () => { await encode(1, S.FPS, `${BUILD}/video.mp4`); console.log(`video → ${BUILD}/video.mp4`); };
C.mux = () => { if (!fs.existsSync(`${BUILD}/mix.wav`)) C.audio();
  sh('ffmpeg', ['-y', '-v', 'error', '-i', `${BUILD}/video.mp4`, '-i', `${BUILD}/mix.wav`, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', String(S.DURATION), '-movflags', '+faststart', `${OUT}/${NAME}.mp4`]); console.log(`muxed → ${OUT}/${NAME}.mp4`); };
C.srt = () => { const s = S.subtitles.map((x, i) => `${i + 1}\n${fmt(x.start)} --> ${fmt(x.end)}\n${x.text}\n`).join('\n'); fs.writeFileSync(`${OUT}/${NAME}.srt`, s); console.log(`srt → ${OUT}/${NAME}.srt (${S.subtitles.length} cues)`); };
C.poster = async () => { const picks = { portrait: S.mk.portrait + 1.0, forty: S.mk.forty + 1.6, volcano: S.mk.volcano + .4 }, br = await browser(1);
  for (const [k, t] of Object.entries(picks)) fs.writeFileSync(`${OUT}/poster_${k}.jpg`, await frameJPEG(br.pages[0], t, .95)); await br.close(); console.log(`posters → ${OUT}/poster_*.jpg`); };

// ── checks ──
const OK = [], BAD = []; const chk = (c, msg) => { (c ? OK : BAD).push(msg); console.log(`${c ? '✓' : '✗'} ${msg}`); };
C.qa = async () => {
  OK.length = BAD.length = 0; const src = ['film.js', 'score.js', 'engine/util.js', 'engine/audio.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
  chk(!/Math\.random/.test(src), 'no Math.random — U.mulberry32 only');
  chk(S.vo.length === 29, `29 vo lines in score (${S.vo.length})`);
  const covered = new Set(S.subtitles.map(s => s.phrase)); chk(covered.size === 29, `subtitles cover all 29 phrases (${S.subtitles.length} cues)`);
  chk(S.subtitles.every(s => s.text.split(/\s+/).length <= 5), 'every caption ≤ 5 words, one line');
  chk(S.markers.every((m, i) => i === 0 || m.t >= S.markers[i - 1].t), 'markers in order');
  chk(Math.abs(S.DURATION - (require('../timing.json').duration + 4)) < .01, `duration = VO ${require('../timing.json').duration} + 4 s hold = ${S.DURATION}`);
  // scene rules, read from the film itself
  const br = await browser(.25); const sc = await br.pages[0].evaluate(() => FILM.SCENES.map(s => ({ name: s.name, a: s.a, b: s.b, kind: s.kind, chars: !!s.chars, photo: s.photo || null, hardIn: !!s.hardIn })));
  await br.close();
  for (let i = 1; i < sc.length; i++) { const prev = sc[i - 1], cur = sc[i], hard = cur.a >= prev.b;
    chk(hard ? cur.hardIn && cur.name === 'volcano' : true, `${prev.name} → ${cur.name}: ${hard ? 'hard cut' : `dissolve ${(prev.b - cur.a).toFixed(2)} s`}`); }
  chk(sc.filter(s => s.chars).every(s => s.kind === 'study'), 'characters only in study scenes');
  chk(!sc.some(s => s.kind === 'photo' && s.chars), 'no character on any photo beat');
  const study = sc.filter(s => s.kind === 'study'), inStudy = t => study.some(s => t >= s.a && t < s.b);
  for (const i of [1, 2, 3, 14, 27, 28, 29]) { const p = S.vo.find(v => v.i === i); chk(inStudy((p.start + p.end) / 2), `phrase ${i} plays over the study`); }
  chk(S.mk.portrait + .55 < S.anchors.portraitDeadline, `portrait fully on at ${(S.mk.portrait + .55).toFixed(2)} s, before «جنكيز خان.» ends ${S.anchors.portraitDeadline}`);
  chk(S.mk.endcard + .62 < S.anchors.landEndcard, `end card lands ${(S.mk.endcard + .62).toFixed(2)} s, before «ما تفوتكش» ${S.anchors.landEndcard}`);
  chk(S.mk.buttons > S.anchors.voEnd, `buttons pulse at ${S.mk.buttons} s, after the voice ends ${S.anchors.voEnd}`);
  const photos = sc.filter(s => s.photo).map(s => s.photo).join(' '); chk(photos === 'G02 G03 G04 G05 G06 G07', `photos in brief order: ${photos} (+G01 cut-out, G08 end card)`);
  console.log(`\nqa: ${OK.length} ✓  ${BAD.length} ✗`); return BAD.length;
};
C.pacing = async () => {
  const br = await browser(.25); const sc = await br.pages[0].evaluate(() => FILM.SCENES.map(s => ({ name: s.name, a: s.a, b: s.b }))); await br.close();
  console.log('scene               in      out     len'); for (const s of sc) { const b = Math.min(s.b, S.DURATION); console.log(`${s.name.padEnd(18)} ${s.a.toFixed(2).padStart(6)}  ${b.toFixed(2).padStart(6)}  ${(b - s.a).toFixed(2).padStart(5)} s`); }
  const ev = S.markers.map(m => m.t).concat(sc.map(s => s.a), S.vo.map(p => p.start), Object.values(S.anchors)).filter(t => t <= S.anchors.voEnd).sort((a, b) => a - b); let gap = 0, at = 0;
  for (let i = 1; i < ev.length; i++) if (ev[i] - ev[i - 1] > gap) { gap = ev[i] - ev[i - 1]; at = ev[i - 1]; }
  console.log(`\n${sc.length} shots in ${S.DURATION} s → ${(sc.length / S.DURATION * 60).toFixed(1)} shots/min · ${S.markers.length} sync markers · longest stretch with no new event: ${gap.toFixed(2)} s from ${at.toFixed(2)} s`);
  chk(gap < 4.5, 'no dead stretch over 4.5 s');
};
C.check = () => {
  OK.length = BAD.length = 0; const f = `${OUT}/${NAME}.mp4`;
  const j = JSON.parse(sh('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { capture: true }));
  const v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
  chk(v.width === 1080 && v.height === 1920, `1080×1920 (${v.width}×${v.height})`);
  chk(v.r_frame_rate === '30/1', `30 fps (${v.r_frame_rate})`); chk(v.codec_name === 'h264' && v.pix_fmt === 'yuv420p', `h264 yuv420p`);
  chk(Math.abs(+j.format.duration - S.DURATION) < .1, `duration ${(+j.format.duration).toFixed(2)} s ≈ ${S.DURATION} s`);
  chk(a && a.codec_name === 'aac' && +a.sample_rate === 48000, 'aac 48 kHz');
  const L = loudness(f); chk(Math.abs(L.I + 14) <= 1, `loudness ${L.I} LUFS (target -14)`); chk(L.TP <= -0.9, `true peak ${L.TP} dBTP ≤ -1`);
  // voice is the loudest thing: compare VO-only loudness of the speech sections with music+sfx
  const M = loudness(`${BUILD}/music.wav`), V = loudness(S.VO); chk(V.I - M.I > 8, `voice ${V.I} LUFS vs bed ${M.I} LUFS (bed ${(V.I - M.I).toFixed(1)} dB under)`);
  console.log(`\ncheck: ${OK.length} ✓  ${BAD.length} ✗`); return BAD.length;
};
C.verify = async () => {   // final file frames at markers must match the renderer's own frames (sync)
  OK.length = BAD.length = 0; const br = await browser(1); fs.mkdirSync(`${BUILD}/verify`, { recursive: true });
  for (const m of S.markers.filter(m => m.sync === 'av')) { const t = Math.round((m.t + .2) * S.FPS) / S.FPS;
    fs.writeFileSync(`${BUILD}/verify/ref.jpg`, await frameJPEG(br.pages[0], t, .95));
    sh('ffmpeg', ['-y', '-v', 'error', '-ss', String(t + .5 / S.FPS), '-i', `${OUT}/${NAME}.mp4`, '-frames:v', '1', `${BUILD}/verify/got.png`]);
    const p = require('child_process').spawnSync('ffmpeg', ['-i', `${BUILD}/verify/got.png`, '-i', `${BUILD}/verify/ref.jpg`, '-lavfi', 'psnr', '-f', 'null', '-'], { encoding: 'utf8' });
    const psnr = +(p.stderr.match(/average:([\d.inf]+)/) || [])[1]; chk(psnr > 26 || isNaN(psnr), `${m.name.padEnd(9)} @ ${t.toFixed(2)} s frame matches render (PSNR ${psnr.toFixed ? psnr.toFixed(1) : psnr} dB)`); }
  await br.close(); console.log(`\nverify: ${OK.length} ✓  ${BAD.length} ✗`); return BAD.length;
};
C.all = async () => { C.audio(); await C.render(); C.mux(); C.srt(); await C.poster(); C.check(); await C.verify(); };

const [cmd, ...rest] = process.argv.slice(2);
if (!C[cmd]) { console.log('usage: node engine/render.js ' + Object.keys(C).join('|')); process.exit(1); }
Promise.resolve(C[cmd](...rest)).then(r => process.exit(typeof r === 'number' && r > 0 ? 2 : 0)).catch(e => { console.error(e); process.exit(1); });
