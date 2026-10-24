# جنكيز خان برّد الكوكب — Course 3al Saree3
60-second vertical (1080×1920) · two voices · Egyptian Arabic · Tristan da Cunha visual language

## 1. Logline
History's biggest killer is the only person who measurably cooled the planet — by emptying it, not saving it. And even that wasn't enough.

**Arc:** hook question → who he was (map) → the kill count (stat) → farms die, forests return (photo) → the carbon number (map + stat) → "what does that mean?" (study) → one year of petrol (stat) → the four-event comparison (map) → the twist: too small for the ice cores, volcanoes did the rest → the open loop and the subscribe.

**Characters:** بابا (History Presenter – Man, sheet 03/10) and البنت (History Presenter – Daughter, sheet 04/10). Home set: Historical Study (location sheet 02/10). Genghis Khan is the real Yuan-dynasty portrait, cut out and composited like Napoleon in the reference — never drawn as a character.

**Tone:** dry irony. He is never a hero. The trees did the work.

## 2. Inputs — read every file before starting
- @vo/genghis_vo.mp3 — final stitched VO, two voices (locked)
- @assets/G01_genghis_portrait.png — the portrait, cut out as a bust
- @assets/G02_mongolian_steppe.png
- @assets/G03_ploughed_field.png
- @assets/G04_forest_canopy.png
- @assets/G05_antarctic_ice_aerial.png
- @assets/G06_ice_core_sunlight.png
- @assets/G07_volcano_eruption.png
- @assets/G08_channel_endcard.png
- Characters and set: from the character sheets (father, daughter, Historical Study) supplied separately

First step, same as every build: probe @vo/genghis_vo.mp3, run word-level alignment (whisperx, language ar), snap every cue word below to the real timestamps, write `timing.json`, build from that.

## 3. VO script — ElevenLabs v4, dialogue mode
Tamer = بابا · Fatima = البنت · Stability 0.40 / 0.45 · Similarity 0.78. One box per block, speaker on the pill.

| # | Speaker | Target | Line (paste with tags) |
|---|---|---|---|
| 1 | البنت | 0:00–0:05 | `[curious, playful, leaning in] بابا… أكتر واحد قتل ناس في التاريخ… [beat] هو نفسه اللي برّد الكوكب؟` |
| 2 | بابا | 0:05–0:11 | `[dry, storyteller] جنكيز خان. [beat] سنة ألف وميتين وستة طلع من منغوليا بجيش على الخيل… [picking up pace] ووصل من الصين لحد أوروبا.` |
| 3 | بابا | 0:11–0:17 | `[grave, slower] جيشه قتل حوالي أربعين مليون إنسان… [quiet] عشرة في المية من سكان الأرض وقتها.` |
| 4 | بابا | 0:17–0:23 | `[matter-of-fact, lower] المزارع فضيت. [beat] ماحدش بقى يزرع… ولا يقطع شجر… [softly] فالغابات رجعت.` |
| 5 | بابا | 0:23–0:30 | `[precise, picking up] مية واتنين وأربعين ألف كيلومتر مربع غابة جديدة… [emphatic] شفطت من الجو سبعمية مليون طن كربون.` |
| 6 | البنت | 0:30–0:34 | `[skeptical, eyebrow up] يعني إيه سبعمية مليون طن؟` |
| 7 | بابا | 0:34–0:40 | `[wry] يعني الكربون اللي العالم كله بيطلّعه من البنزين في سنة كاملة… [beat] الشجر شفطه.` |
| 8 | بابا | 0:40–0:47 | `[thoughtful, listing] العلماء قارنوا أربع كوارث: الطاعون، سقوط أسرة مينج، غزو أمريكا… [beat] وجنكيز خان بس اللي غاباته لحقت تكبر.` |
| 9 | بابا | 0:47–0:54 | `[twist, dry] بس خدي بالك… [slower] الأثر ده صغير لدرجة إن العلماء ما لقوهوش في تلج القطب الجنوبي، اللي بيحفظ هوا الأرض القديم. [wry] التبريد الكبير وقتها… كان بسبب البراكين.` |
| 10 | البنت → بابا | 0:54–1:01 | Fatima: `[curious, leaning in] طب في حد تاني في التاريخ عمل كده؟` Tamer: `[chuckles] في… [beat, to camera, playful] بس دي حكاية الأسبوع الجاي. اشترك في كورس عالسريع عشان ما تفوتكش.` |

Block 10 is two boxes (Fatima, then Tamer). ~160 words; if over 64s cut «حوالي» (3) and «في التاريخ» (10).

**Listen for:** «كورس عالسريع» as one phrase, *kors 3al-saree3*, not two separate words; «جنكيز» as *gen-GIZ* not *jen-* (write «جِنْكيز» if it drifts); «مينج» one syllable; «القطب الجنوبي» unhurried.

## 4. Captions
Single line, bottom-centre, white with soft shadow, no box (as the reference), max 5 words on screen, appearing word-group by word-group with the VO. Text = the lines above without tags. Numbers as numerals in captions: ٤٠ مليون · ١٤٢,٠٠٠ كم² · ٧٠٠ مليون طن.

## 5. Art direction, beat by beat
Camera language from the reference: every cut-away starts on a map or a real photo, characters are composited on top at 25–35% of frame height, labels are handwritten white with a thin arrow, numbers get a glowing line or a stat grid.

**B1 · 0:00–0:05 · Study**
Historical Study set, evening. Daughter on the ornate sofa with her laptop, father in the armchair with a cup. Slow push-in on the daughter as she asks. On «برّد الكوكب؟» a handwritten label «جنكيز خان؟» pops beside her head with a question mark.

**B2 · 0:05–0:11 · Map + portrait**
Hard cut to satellite Earth, spin and zoom into Mongolia, glowing marker + label «منغوليا». On «جنكيز خان» @assets/G01_genghis_portrait.png slides in from the left edge, cut out as a bust (drop the green background), like Napoleon in the reference. On «وصل من الصين لحد أوروبا» a red tide spreads west across the map from Mongolia to Hungary and the Middle East, with a counter in the corner climbing to «٢٢٪ من اليابسة».

**B3 · 0:11–0:17 · Stat grid**
@assets/G02_mongolian_steppe.png, darkened 50%, horses and gers kept in the bottom third. A 10×10 grid of small white person icons fades in. On «أربعين مليون» ten of them turn red and drop out of the grid; big handwritten «٤٠ مليون» beside it. Father composited bottom-left, small, pensive expression (sheet), looking at the grid.

**B4 · 0:17–0:23 · Tilt-up**
@assets/G03_ploughed_field.png full frame on «المزارع فضيت», label «المزارع فضيت» over the furrows. On «ماحدش يقطع شجر» the camera tilts up past the horizon into sky, and on «رجعت» the sky dissolves into @assets/G04_forest_canopy.png (the canopy shot looking straight up), label «الغابات رجعت». No characters. The tilt sells the time passing; do not cross-fade the two photos flat.

**B5 · 0:23–0:30 · Map + stat**
Back to the map of the empire. Green patches bloom across it on «غابة جديدة», counter «١٤٢,٠٠٠ كم²». On «شفطت» small CO₂ bubbles drift down from the sky into the green; counter flips to «٧٠٠ مليون طن». Father composited bottom-right, explaining expression, one hand up.

**B6 · 0:30–0:34 · Study**
Cut back to the study, close on the daughter, critical/skeptical expression from the sheet, head tilted. Speech bubble with «يعني إيه؟» as she says it.

**B7 · 0:34–0:40 · Stat**
Dark background. A row of petrol-pump icons fills the frame on «البنزين», a calendar page flips «٣٦٥ يوم» on «في سنة», then on «الشجر شفطه» the row is swallowed by a green canopy sweeping up from the bottom of the frame. Label «سنة بنزين كاملة».

**B8 · 0:40–0:47 · Map pins**
Map pulls out to the whole world. Four glowing pins with handwritten labels appear in order as he lists them: «الطاعون ١٣٥٠» on Europe, «أسرة مينج ١٦٥٠» on China, «غزو أمريكا ١٥٠٠» on the Americas, «المغول ١٢٠٠» on Asia. On «غاباته لحقت تكبر» three pins dim to grey and the Mongol pin pulses bigger, with small trees sprouting around it.

**B9 · 0:47–0:54 · The twist**
@assets/G05_antarctic_ice_aerial.png full frame on «القطب الجنوبي». @assets/G06_ice_core_sunlight.png cuts in on «ما لقوهوش», core held against the sun, push in slowly; on «بيحفظ هوا الأرض القديم» a few bubbles in the core glow and a tiny label «هوا من ٨٠٠ سنة» points at them; a thin CO₂ line draws across it and stays flat. On «البراكين» hard cut to @assets/G07_volcano_eruption.png full frame, 2s, then the core returns with the line spiking. Label «البراكين» with an arrow to the spike. Father composited small bottom-left, wry smile.

**B10 · 0:54–1:01 · Study → end card (VO plays through)**
Two-shot in the study. Daughter asks, leaning in. Father chuckles on «في…» and turns to camera on «بس دي حكاية الأسبوع الجاي» — the only time he looks at the lens in the film. On «اشترك» the study pushes back and @assets/G08_channel_endcard.png slides in from the right, landing fully by «ما تفوتكش». Do not cut the audio or wait for silence.

**End card · 1:01–1:05**
@assets/G08_channel_endcard.png full frame, static. The «لايك» and «اشترك» buttons pulse once each (100→108→100%, 0.4s), لايك first, starting 0.3s after «تفوتكش» ends. Hold 3s. No other graphics.

## 6. Assets, as supplied
| File | Beat | Note |
|---|---|---|
| @assets/G01_genghis_portrait.png | B2 | Japanese woodblock portrait, border already cropped; cut out the bust, drop the green |
| @assets/G02_mongolian_steppe.png | B3 | 707 px — **replace with the original before final**, upscale 3× meanwhile |
| @assets/G03_ploughed_field.png | B4 | 512 px — **replace with the original before final**, upscale 4× meanwhile |
| @assets/G04_forest_canopy.png | B4 | 1000 px, fine |
| @assets/G05_antarctic_ice_aerial.png | B9 | 1356 px, fine |
| @assets/G06_ice_core_sunlight.png | B9 | 820 px, upscale 2× |
| @assets/G07_volcano_eruption.png | B9 | 478 px — **replace with the original before final**, upscale 4× meanwhile |
| @assets/G08_channel_endcard.png | End | Channel art, as is |
| Map | B2, B5, B8 | NASA Blue Marble or Google Earth Studio, not supplied |
| Icons | B3, B5, B7 | Person, petrol pump, calendar, CO₂ bubble — hand-drawn in the reference's label style |

## 7. Numbers, locked (Pongratz et al. 2011, *The Holocene*)
Invasion 1200–1380 · empire ≈22% of land · ≈40 million dead (≈30% of the 115 million encountered, ≈10% of world population) · 142,000 km² forest regrowth · ≈700 million tonnes carbon (684 in the paper) ≈ one year of global petrol emissions today · four events compared, only the Mongol invasion offset concurrent emissions · effect ≈0.18 ppm, too small to appear in Antarctic ice cores · the recorded dips were mainly volcanic.
