// score.js — the timing layer. Every time below is derived from timing.json.
(function (root) {
  const TIMING = (typeof require !== 'undefined') ? require('./timing.json') : root.TIMING;
  const FPS = 30, W = 1080, H = 1920, HOLD = 4;
  const P = i => TIMING.phrases.find(p => p.i === i);
  const words = p => p.text.split(/\s+/);
  const clean = w => w.replace(/[.,،…:؟?]/g, '');
  // a cue word sits at start + (index / count) × length
  function cue(i, word) {
    const p = P(i), w = words(p), k = w.findIndex(x => clean(x).startsWith(word));
    if (k < 0) throw new Error(`cue «${word}» not in phrase ${i}`);
    return +(p.start + (k / w.length) * (p.end - p.start)).toFixed(3);
  }
  const start = i => P(i).start, end = i => P(i).end;

  const vo = TIMING.phrases.map(p => ({ i: p.i, speaker: p.speaker, start: p.start, end: p.end, text: p.text }));

  // subtitles: one line, max 5 words, word groups timed by position inside the phrase
  const subtitles = [];
  for (const p of TIMING.phrases) {
    const w = words(p), n = Math.ceil(w.length / 5), per = Math.ceil(w.length / n), len = p.end - p.start;
    for (let g = 0; g < w.length; g += per) {
      const a = p.start + (g / w.length) * len, b = p.start + (Math.min(w.length, g + per) / w.length) * len;
      subtitles.push({ phrase: p.i, start: +a.toFixed(3), end: +b.toFixed(3), text: w.slice(g, g + per).join(' ') });
    }
  }

  const M = (name, phrase, t, sync, what) => ({ name, phrase, t, sync, what });
  const markers = [
    M('hook', 3, end(3), 'av', 'label «جنكيز خان؟» pops by the daughter'),
    M('portrait', 4, start(4), 'av', 'G01 slides in from the left'),
    M('tide', 6, cue(6, 'ووصل'), 'av', 'red tide spreads west; counter to ٢٢٪'),
    M('forty', 7, cue(7, '٤٠'), 'av', '10 of 100 figures turn red and drop'),
    M('farms', 9, cue(9, 'فضيت'), 'v', 'label over the furrows'),
    M('before', 10, cue(10, 'يقطع'), 'v', 'dissolve to G09 sparse forest (before)'),
    M('forest', 11, cue(11, 'رجعت'), 'av', 'dissolve to G10 green valley (after)'),
    M('blooms', 12, start(12), 'v', 'green patches bloom, counter ١٤٢٬٠٠٠ كم²'),
    M('carbon', 13, cue(13, 'شفطت'), 'av', 'CO₂ bubbles fall, counter ٧٠٠ مليون طن'),
    M('whatmeans', 14, start(14), 'v', 'daughter close-up, bubble «يعني إيه؟»'),
    M('pumps', 16, cue(16, 'البنزين'), 'v', 'petrol-pump row fills the frame'),
    M('year', 16, cue(16, 'في'), 'av', 'calendar flips ٣٦٥ يوم'),
    M('swallow', 17, cue(17, 'شفطه'), 'av', 'canopy sweeps up and swallows the pumps'),
    M('pin1', 19, cue(19, 'الطاعون'), 'v', 'pin الطاعون ١٣٥٠ — Europe'),
    M('pin2', 20, cue(20, 'مينج'), 'v', 'pin أسرة مينج ١٦٥٠ — China'),
    M('pin3', 20, cue(20, 'أمريكا'), 'v', 'pin غزو أمريكا ١٥٠٠ — Americas'),
    M('pin4', 21, cue(21, 'وجنكيز'), 'v', 'pin المغول ١٢٠٠ — Asia'),
    M('only', 21, cue(21, 'غاباته'), 'av', 'three pins dim, Mongol pin pulses, trees sprout'),
    M('twist', 22, start(22), 'v', 'CO₂ chart 1000–1600, Mongol era highlighted'),
    M('tiny', 23, cue(23, 'صغير'), 'v', 'magnifier over the Mongol era: «أثر صغير جدًا»'),
    M('notfound', 23, cue(23, 'ما'), 'av', 'stamp «مش باين!» on the Mongol era'),
    M('qutb', 23, cue(23, 'القطب'), 'v', 'G05 Antarctica, «القطب الجنوبي»'),
    M('bubbles', 24, cue(24, 'بيحفظ'), 'v', 'G06 ice core: bubbles glow, «فقاعات = هوا قديم»'),
    M('cooling', 25, start(25), 'v', 'temperature chart dips, «التبريد الكبير»'),
    M('volcano', 26, cue(26, 'البراكين'), 'av', 'volcano icons on the dips → hard cut to G07'),
    M('back', 27, start(27), 'v', 'study wide shot, then the daughter asks'),
    M('tocamera', 28, cue(28, 'بس'), 'v', 'father single, straight to the lens'),
    M('endcard', 29, cue(29, 'اشترك'), 'av', 'G08 slides in from the right'),
    M('buttons', 29, +(end(29) + 0.3).toFixed(3), 'av', 'لايك then اشترك pulse'),
  ];
  const mk = Object.fromEntries(markers.map(m => [m.name, m.t]));
  // derived, non-marker anchors (all from timing.json)
  const anchors = {
    mongolia: cue(5, 'منغوليا'),          // «منغوليا» label
    year1206: cue(5, '١٢٠٦'),               // «١٢٠٦» label
    ghaba: cue(12, 'غابة'),                 // «غابة جديدة» label
    world: cue(15, 'العالم'),               // «العالم كله» globe
    arba3: cue(18, 'أربع'),                 // «٤ كوارث» header
    takbar: cue(21, 'تكبر'),
    volcLine: start(26),                    // «كان بسبب البراكين»: icons pop on the dips
    chuckle: start(28),                     // father chuckles on «في…»
    tenpct: start(8),                       // «١٠٪ من سكان الأرض»
    landEndcard: cue(29, 'ما'),             // end card must be fully on by «ما تفوتكش»
    portraitDeadline: end(4),               // portrait fully on before «جنكيز خان.» ends
    voEnd: end(29),
  };
  const DURATION = +(TIMING.duration + HOLD).toFixed(3);

  const SCORE = { cue, FPS, W, H, STYLE: 'paper', DURATION, VO: TIMING.vo, vo, subtitles, markers, mk, anchors,
    SAFE: { x: 60, y: 230, w: 960, h: 1340 } /* top 230, bottom 350 kept clear for platform UI */ };
  if (typeof module !== 'undefined') module.exports = SCORE; else root.SCORE = SCORE;
})(typeof window !== 'undefined' ? window : globalThis);
