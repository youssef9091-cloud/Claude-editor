# كورس عالسريع — the dad & daughter formula
Distilled from `reference/GENGHIS_VIDEO_BRIEF.md`. Every new episode brief follows this unless the user says otherwise.

## Cast and set
- **بابا** — History Presenter – Man (sheet 03/10). ElevenLabs voice **Tamer**. Dry, wry storyteller. Never gushes.
- **البنت** — History Presenter – Daughter (sheet 04/10). ElevenLabs voice **Fatima**. Curious, skeptical, quick.
- **Home set** — Historical Study (location sheet 02/10), evening. She's on the ornate sofa with her laptop, he's in the armchair with a cup.
- Real historical people are **never drawn as characters**: use a real portrait or photo, cut out as a bust and composited (the "Napoleon" treatment).

## How the back-and-forth goes
1. **She opens with a hook question** that sounds like a paradox or a "wait, what?" (`[curious, playful, leaning in]`). She sets up the episode in one breath.
2. **He answers by naming the thing**, flat and dry, then a `[beat]`, then starts telling the story (`[dry, storyteller]`).
3. **He carries the facts in short blocks**, each one idea with one number. His tone changes with every block: storyteller → grave → matter-of-fact → precise → wry. No two blocks in a row have the same energy.
4. **She interrupts at the point where the audience would be lost**, asking for the number in plain words (`[skeptical, eyebrow up] يعني إيه…؟`). She's the viewer's voice, and she asks short questions.
5. **He translates the number into something you can picture** (one year of petrol), and ends on a wry line.
6. **The twist** — `[twist, dry] بس خدي بالك…` — complicates the story so the audience doesn't take away the easy version.
7. **The open loop** — she asks a follow-up, he chuckles «في…», turns to camera (**the only look to the lens in the film**), and teases the next episode + «اشترك في كورس عالسريع عشان ما تفوتكش».

**Tone rule:** dry irony. No one in the story is a hero. Punchlines come from the facts, not from mocking people. When there are deaths, it's grave and quiet, with no joke within one block either side.

## VO mechanics
- ElevenLabs v4, **dialogue mode**. Tamer = بابا, Fatima = البنت. Stability 0.40 (Tamer) / 0.45 (Fatima), Similarity 0.78. One box per block, speaker on the pill.
- Egyptian Arabic (عامية بيضا), numbers spelled out in words, English tags in `[ ]`.
- Brief always includes: the target time per block, a word count with named cuts if over length, and a "Listen for" pronunciation list.
- Build step: probe the VO mp3 → whisperx word alignment (language ar) → snap every cue word to real timestamps → `timing.json` → build from that.

## Visual language (Tristan da Cunha reference)
- Every cut-away starts on **a map or a real photo**. Characters are composited on top at **25–35% of frame height**, with the expression taken from the sheet.
- Labels are **handwritten white with a thin arrow**. Numbers get a **glowing line, a counter or a stat grid**.
- Captions are a single line, bottom-centre, white with a soft shadow, no box, appearing word-group by word-group. Numbers in captions are Arabic-Indic numerals.
- Each beat is cued to a **specific word** in the VO («on «X» the Y happens»).
- End: the study pushes back, the channel end card slides in while the VO plays through (never wait for silence), «لايك» then «اشترك» pulse 100→108→100% over 0.4s, then hold 3s.

## Brief structure (sections, in order)
1. Logline + arc + characters + tone
2. Inputs (VO, numbered assets, sheets) + the alignment first step
3. VO script table (#, speaker, target time, line with tags) + cuts + Listen for
4. Captions
5. Art direction, beat by beat
6. Assets table (file, beat, resolution/upscale note, replace-before-final flags)
7. Numbers, locked (with source)
