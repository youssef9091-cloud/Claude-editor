# Claude Code — build «جنكيز خان برّد الكوكب» with the animation-studio skill

## 0. Folder to prepare before pasting (one time)

```
genghis-khan-cooled-the-planet/        ← open Claude Code here
├── CLAUDE_CODE_PROMPT.md               ← this file
├── GENGHIS_VIDEO_BRIEF.md              ← story, script, art direction, locked numbers
├── timing.json                         ← measured start/end of all 29 spoken phrases
├── vo/genghis_vo.mp3                   ← the final ElevenLabs dialogue (65.6 s)
└── assets/
    ├── G01_genghis_portrait.png        ← woodblock portrait (border cropped)
    ├── G02_mongolian_steppe.png
    ├── G03_ploughed_field.png
    ├── G04_forest_canopy.png
    ├── G05_antarctic_ice_aerial.png
    ├── G06_ice_core_sunlight.png
    ├── G07_volcano_eruption.png
    └── G08_channel_endcard.png
```

Install the animation-studio skill in Claude Code first (the full folder: SKILL.md + engine + scripts + references). Node 22, ffmpeg and Chrome must be on the machine; the skill's preflight will tell you.

---

## 1. The message to paste (copy everything between the lines)

---------------------------------------------------------------------

Use the **animation-studio** skill to make a 9:16 short film from a finished voiceover. Read @GENGHIS_VIDEO_BRIEF.md, @timing.json and this message fully before scaffolding.

**What this is.** A 65-second Egyptian Arabic explainer for the YouTube channel كورس عالسريع: history's biggest killer, Genghis Khan, is the only person who measurably cooled the planet — by emptying it. Two presenters talk in a study; the story is told in cut-aways: map zooms, real photos as taped prints or Ken Burns pans, stat grids, labels. Dark irony, never glorification. The exact script, numbers and beat-by-beat art direction are in the brief; follow it.

**Non-negotiables**
1. The soundtrack is my own VO at @vo/genghis_vo.mp3 — do not synthesize speech. Run `node engine/render.js analyze vo/genghis_vo.mp3`, load it with `MIX.loadAudio`, and put a soft music bed under it ducked with `MIX.duck` (musical-explainer shape, 100 BPM, no drums under spoken words, nothing louder than the voice). Loudness target -14 LUFS.
2. @timing.json has the measured start/end of every spoken phrase (29 phrases, speaker-tagged). Put every one into `score.js` as a `vo` line and as the `subtitles`, and derive every event time from these — never from guessed seconds. A cue word inside a phrase sits at (word index / word count) × phrase length; make `markers` for the sync hits listed in §3 and give them `sync: 'av'`.
3. Format 9:16, 1080×1920, 30 fps, `STYLE: 'paper'`. Keep text, faces and the end card inside `G.SAFE`.
4. Captions: one line, `Subs.draw` style `clean`, white with a soft shadow, from `SCORE.subtitles`. Arabic must shape correctly (the engine handles it). Numbers as Arabic-Indic numerals as written in timing.json.
5. Build the two presenters with `Ch.person` from §2 — do not use any preset person or the mascot. They appear only in the study scenes (phrases 1–3, 14, 27–29) and are never composited onto the photo cut-aways.
6. Use the photos in `assets/` exactly where the brief places them: G01 enters as a cut-out slide-in like the Napoleon shot in the reference (`G.photo` with the green keyed out); G02–G07 as `G.kenBurns` full-frame pans; G08 only as the end card. No photo appears anywhere the brief doesn't name it.
7. Determinism: `U.mulberry32` for every random element (blooms, bubbles, grid). No `Math.random`.

**Workflow I want**
- Scaffold with `--from template --format 9:16` into this folder (name the output `genghis-khan-cooled-the-planet`).
- Write `score.js` first and show me the marker table before writing `film.js`.
- Render `board` + `stills` at every marker, run `qa` and `pacing`, fix, and give me the `preview` link before the full render.
- Full render, `mux`, `check`, `verify`; report any ✗ and fix it in `score.js`.
- Deliver `out/genghis-khan-cooled-the-planet.mp4`, `srt`, and `poster` thumbnails.

Start by confirming the preflight and listing the markers you derived from timing.json.

---------------------------------------------------------------------

## 2. The presenters, as `Ch.person` options (paste if Claude Code asks)

Father — «بابا», ~60, historian:
```
Ch.person({ name: 'father', build: 'medium', height: 1.0,
  skin: '#c68b5a', hair: { style: 'short', color: '#8a8a8a' }, beard: { style: 'full-short', color: '#9a9a9a' },
  glasses: false, outfit: 'shirt', shirtColor: '#9fb6cf', trouserColor: '#2f3a4a', shoes: '#4a2e1e',
  pose: 'stand', gesture: 'point', expressions: ['knowledgeable','curious','pensive','storyteller'] })
```
Daughter — «البنت», 29, quick-witted:
```
Ch.person({ name: 'daughter', build: 'slim', height: 0.93,
  skin: '#b97a52', hair: { style: 'long-wavy', color: '#141414', bangs: true },
  outfit: 'tshirt', shirtColor: '#161616', trouserColor: '#6f8aa6', shoes: '#1a1a1a', noseRing: true,
  pose: 'stand', gesture: 'phone', expressions: ['eager','critical','surprised','explaining'] })
```
If an option name doesn't exist in `references/custom-characters.md`, use the nearest one and tell me which you changed. Palette for the study: olive drapes `#6b6b3a`, grey-blue walls `#8d94a3`, dark wood `#3b2a1e`, a classical horse painting on the wall, a chandelier. Warm evening light.

## 3. Sync markers (from timing.json — cue word → phrase → position)

| marker | phrase | cue | sync | what happens on it |
|---|---|---|---|---|
| hook | 3 | «برّد الكوكب؟» end | av | label «جنكيز خان؟» pops by the daughter; small chime |
| portrait | 4 | «جنكيز خان.» start | av | G01 slides in from the left; low drone hit |
| tide | 6 | «ووصل» | av | red tide spreads west on the map; counter to ٢٢٪ |
| forty | 7 | «أربعين» | av | 10 of 100 figures turn red and drop; thud |
| farms | 9 | «فضيت» | v | label over the furrows |
| tiltup | 10 | «يقطع شجر» | v | camera tilts up into sky |
| forest | 11 | «رجعت» | av | dissolve into G04 canopy; soft swell |
| blooms | 12 | start | v | green patches bloom on the map, counter ١٤٢٬٠٠٠ كم² |
| carbon | 13 | «شفطت» | av | CO₂ bubbles fall into the green, counter ٧٠٠ مليون طن |
| whatmeans | 14 | start | v | cut to daughter close-up, bubble «يعني إيه؟» |
| pumps | 15 | «البنزين» | v | petrol-pump row fills the frame |
| year | 16 | «في سنة» | av | calendar flips ٣٦٥ يوم; tick |
| swallow | 17 | «شفطه» | av | canopy sweeps up and swallows the pumps |
| pin1–pin4 | 18–20 | each name | v | the four map pins appear in order |
| only | 21 | «غاباته لحقت تكبر» | av | three pins dim, the Mongol pin pulses, trees sprout |
| ice | 22 | start | v | G05 Antarctic aerial |
| core | 23 | «ما لقوهوش» | av | G06 ice core, flat CO₂ line draws; glassy ping |
| bubbles | 24 | «بيحفظ هوا» | v | label «هوا من ٨٠٠ سنة» on the bubbles |
| volcano | 26 | «البراكين» | av | hard cut to G07; the line spikes; boom |
| back | 27 | start | v | study two-shot |
| tocamera | 28 | «بس دي حكاية» | v | father turns to the lens |
| endcard | 29 | «اشترك» | av | G08 slides in from the right; stinger |
| buttons | 29 | 0.3 s after end | av | لايك then اشترك pulse |

The brief's §5 has the full visual description of each beat; this table is only the sync layer.

## 4. After the first preview — what to check (send Claude Code the ones that fail)
- Phrase 4 «جنكيز خان.» must have the portrait fully on screen before the word ends.
- The tide (phrase 6) must not cover the ocean.
- Nothing but the Bar-Lev-style full-frame hard cut on «البراكين» is a hard cut; everything else dissolves.
- No character on any photo beat.
- End card fully on screen by «ما تفوتكش»; buttons pulse after the voice, never over it.
- Total length = 65.6 s VO + 4 s hold.

## 5. If the skill's preflight fails
Chrome missing → install Google Chrome or Chromium and re-run. Node < 22 → `nvm install 22`. The skill refuses to scaffold inside its own folder — always run from the project folder above.
