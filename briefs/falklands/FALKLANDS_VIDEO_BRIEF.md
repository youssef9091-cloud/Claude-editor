# يافطة المالفيناس — Course 3al Saree3
**Master:** 16:9 YouTube (1920×1080, 25 fps), ≈4:06 VO + 14s end screen. **Variation:** 9:16 Shorts/Reels (1080×1920), ≈58s, separate VO (§9).
Two voices · Egyptian Arabic · Tristan da Cunha visual language · formula: `../FORMULA_dad_daughter.md`

## 1. Logline
After Argentina beat England in the 2026 World Cup semi-final, the players held up a banner about islands where almost nobody lives. The banner is the newest of a long line of "this is ours" signs that goes back 330 years. Even the Argentine name for the islands turns out to be French.

**Arc:** hook question (the banner) → "a windy rock at the end of the world" (map) → two names, one archipelago (map + placards) → the war of the plaques (the joke that becomes the episode's motif) → 1816, 1833: Argentina's claim and Britain's return → sheep, and a wolf that disappeared → the road to war (racetrack landing, hijack, junta) → 74 days (grave and quiet) → Borges's comb → Maradona 1986, then 2–1 again in 2026 → the referendum and both arguments → "who's right?" → comments + subscribe.

**Characters:** بابا (History Presenter – Man, sheet 03/10) and البنت (History Presenter – Daughter, sheet 04/10). Home set: Historical Study (location sheet 02/10). Real people (Bougainville, Darwin, Thatcher, Galtieri, Borges, Maradona) are **never drawn**. They are cut-out busts from real photos or portraits, composited like Napoleon in the reference.

**Tone:** dry irony, balanced. The joke is the pile of signs, never either country or its people. The war beat (B16) is grave and quiet, with no joke from the end of B15 to the start of B17. At the end both arguments get equal screen time and equal wording, and he doesn't pick a side.

**Recurring device: the placard pile.** Every time someone claims the islands, a handwritten white placard on a stick is planted on the map, each with a thin stripe in that country's colour and a year. They stack up over the film: `FALKLAND 1690` → `LES MALOUINES 1764` → `MALVINAS 1767` → `«دي أرضنا» 1774` → `«لأ، دي أرضنا إحنا» 1811` → `1820 🇦🇷` → `1833 🇬🇧`. In B22 the newest one lands on top: the real 2026 banner (F01). The film opens on that banner, so it closes on it too.

## 2. Inputs — read every file before starting
- @vo/falklands_vo_wide.mp3 — final stitched VO, two voices (locked after record)
- @vo/falklands_vo_vertical.mp3 — separate vertical VO (§9), recorded in the same session, same voices and settings
- @assets/F01–F22 — see §6. **F01 is supplied** (`assets/F01_banner_atlanta_2026.jpg`); the rest are to source.
- Characters and set: from the character sheets (father, daughter, Historical Study) supplied separately
- @assets/G08_channel_endcard.png — reuse the channel end card from the Genghis build

First step, same as every build: probe the VO, run word-level alignment (whisperx, language ar), snap every cue word below to the real timestamps, write `timing.json`, build from that. Do it separately for each master.

## 3. VO script, wide (16:9) — ElevenLabs v4, dialogue mode
Tamer = بابا · Fatima = البنت · Stability 0.40 / 0.45 · Similarity 0.78. One box per speaker turn, speaker on the pill. In rows with more than one speaker, the turns are listed in order and each is a separate box.

| # | Speaker | Target | Line (paste with tags) |
|---|---|---|---|
| 1 | البنت | 0:00–0:10 | `[curious, puzzled, leaning in] بابا… ليه لاعيبة الأرجنتين، بعد ما كسبوا إنجلترا في نص نهائي كاس العالم، رفعوا يافطة مكتوب عليها «المالفيناس أرجنتينية»؟ [beat] هي المالفيناس دي إيه أصلاً؟` |
| 2 | بابا | 0:10–0:19 | `[dry, amused] جزر يا ستي… في آخر الدنيا. [beat] برد، ورياح، ولا شجرة واحدة. [wry] وبقالها أكتر من تلتمية سنة… كل الناس عايزاها.` |
| 3 | البنت → بابا | 0:19–0:24 | Fatima: `[skeptical] مين كل الناس؟` Tamer: `[listing, picking up] فرنسا، وإسبانيا، وإنجلترا، والأرجنتين. [beat] والسكان الأصليين؟ [deadpan] بطاريق.` |
| 4 | بابا | 0:24–0:35 | `[storyteller] سنة ألف وستمية وتسعين، بحّار إنجليزي اسمه سترونج نزل عليها أول مرة… [beat] وسمّى المضيق اللي في النص على اسم الفايكاونت فوكلاند. [matter-of-fact] والاسم لزق في الجزر كلها.` |
| 5 | البنت → بابا | 0:35–0:48 | Fatima: `[curious] طب و«مالفيناس» جت منين؟` Tamer: `[playful, conspiratorial] دي بقى المفاجأة… [beat] الاسم أصله فرنساوي. [storyteller] سنة ألف سبعمية أربعة وستين، فرنساويين من مدينة سان مالو عملوا أول مستعمرة هناك، وسمّوها «لي مالوين»… [wry] والإسبان ترجموها: «مالفيناس».` |
| 6 | بابا | 0:48–1:02 | `[building, quicker] وفي نفس الوقت، الإنجليز نزلوا في الناحية التانية… [beat] ولا حد فيهم عارف إن التاني موجود! [matter-of-fact] إسبانيا اشترت مستعمرة فرنسا، وسنة ألف سبعمية وسبعين طردت الإنجليز بالسلاح… [slower] وكانت هتقوم حرب، لحد ما اتفقوا والإنجليز رجعوا.` |
| 7 | البنت → بابا → البنت | 1:02–1:19 | Fatima: `[amused] وفي الآخر مين كسب؟` Tamer: `[deadpan] ولا حد. [beat] الإنجليز مشيوا سنة ألف سبعمية أربعة وسبعين، وسابوا لوحة مكتوب عليها «دي أرضنا». [beat] والإسبان مشيوا سنة ألف تمنمية وحداشر… وسابوا لوحة مكتوب عليها… [chuckles] «لأ، دي أرضنا إحنا».` Fatima: `[laughs] يعني اليافطات دي من زمان!` |
| 8 | بابا | 1:19–1:27 | `[storyteller, steady] سنة ألف تمنمية وستاشر الأرجنتين استقلت عن إسبانيا، وقالت: اللي كان بتاع إسبانيا… [emphatic] بقى بتاعي. [beat] وبعتت حاكم يعمّر الجزر.` |
| 9 | بابا | 1:27–1:37 | `[picking up pace] بس الحاكم مسك سفن صيد أمريكاني، فأمريكا بعتت سفينة حربية خربت المستعمرة… [beat, firm] وسنة ألف تمنمية تلاتة وتلاتين، الإنجليز رجعوا. [slower] ومن ساعتها ما مشيوش.` |
| 10 | البنت → بابا | 1:37–1:40 | Fatima: `[sharp, quick] والأرجنتين سكتت؟` Tamer: `[low, steady voice] عمرها ما سكتت.` |
| 11 | بابا | 1:40–1:55 | `[lighter, wry] الإنجليز جابوا غنم… كتير. [beat] لدرجة إن الغنم لحد النهارده أكتر من الناس. [softer, slower] بس مربيين الغنم قتلوا حيوان ما كانش موجود في أي حتة تانية في الدنيا: ذئب فوكلاند. [quiet] داروين شافه بعينه… وبعدها بأقل من خمسين سنة، اختفى.` |
| 12 | بابا | 1:55–2:07 | `[brighter, storyteller] وستانلي، العاصمة، بقت محطة للسفن اللي بتلف حوالين أمريكا الجنوبية أيام حمّى الدهب في كاليفورنيا… [beat] لحد ما قناة بنما اتفتحت سنة ألف تسعمية أربعتاشر… [wry] والجزر رجعت تاني آخر الدنيا.` |
| 13 | البنت → بابا → البنت → بابا | 2:07–2:30 | Fatima: `[curious, leaning in] طب والحرب؟ حصلت إمتى؟` Tamer: `[storyteller, building] الحكاية سخنت قبلها بكتير. [beat] سنة ألف تسعمية أربعة وستين، طيار أرجنتيني نزل بطيارة صغيرة على مضمار سباق خيل في ستانلي، رفع العلم الأرجنتيني… [wry] وساب للأهالي جواب بيقولهم: «امشوا».` Fatima: `[mock-surprised] على مضمار خيل؟!` Tamer: `[dry] آه… ما كانش فيه مطار. [beat] وبعدها بسنتين، شباب أرجنتينيين خطفوا طيارة ركاب… ونزلوا بيها هناك برضه.` |
| 14 | بابا | 2:30–2:42 | `[thoughtful] والغريبة إن في السبعينات، الأرجنتين بقت هي اللي شايلة الجزر: طيارات، وبوستة، وأكل، ومدارس، ومستشفيات. [beat, darker] لحد ما جه انقلاب عسكري سنة ألف تسعمية ستة وسبعين… [low] والجنرالات بدأوا يبصّوا للجزر بعين تانية.` |
| 15 | بابا | 2:42–2:56 | `[lower, grave] سنة واحد وتمانين، بريطانيا قررت تسحب السفينة الحربية اللي بتحرس الجزر عشان توفّر فلوس. [beat] الجنرالات فهموها رسالة… [slower, grave] وفي اتنين أبريل ألف تسعمية اتنين وتمانين، من غير إعلان حرب، الجيش الأرجنتيني دخل ستانلي.` |
| 16 | بابا | 2:56–3:10 | `[grave, steady] مارجريت تاتشر بعتت أسطول قطع حوالي تلاتاشر ألف كيلومتر. [beat] أربعة وسبعين يوم… [quiet, slower] ستمية تسعة وأربعين أرجنتيني، وميتين خمسة وخمسين بريطاني… [softer] وتلات ستات من أهل الجزر… ماتوا. [beat] وفي أربعتاشر يونيو، الأرجنتين استسلمت.` |
| 17 | البنت → بابا | 3:10–3:18 | Fatima: `[quiet, serious] كل ده… عشان جزر ما فيهاش شجرة؟` Tamer: `[thoughtful, soft] الكاتب الأرجنتيني بورخيس وصفها بجملة… [beat, wry] «راجلين قُرع بيتخانقوا على مشط».` |
| 18 | بابا | 3:18–3:30 | `[shifting, building] بس الجرح فضل مفتوح. [beat] وبعدها بأربع سنين بس، في كاس العالم ستة وتمانين… الأرجنتين قابلت إنجلترا. [rising energy] مارادونا جاب جون بإيده… [beat] وبعدها بأربع دقايق، جاب جون القرن. [proud] اتنين واحد.` |
| 19 | البنت → بابا | 3:30–3:39 | Fatima: `[realizing, bright] استنى… وماتش السنة دي برضه خلص اتنين واحد!` Tamer: `[chuckles] بالظبط. [dry] عشان كده في الأرجنتين، ماتش إنجلترا… عمره ما بيبقى ماتش كورة وبس.` |
| 20 | البنت → بابا | 3:39–3:52 | Fatima: `[curious] طب والناس اللي عايشين هناك… هما عايزين إيه؟` Tamer: `[matter-of-fact] سنة ألفين تلاتاشر عملوا استفتاء. [beat] تسعة وتسعين وتمانية من عشرة في المية اختاروا يفضلوا تبع بريطانيا… [dry] تلات أصوات بس قالوا لأ.` |
| 21 | بابا | 3:52–3:58 | `[measured, balanced] بريطانيا بتقول: الناس قالت كلمتها. [beat] والأرجنتين بتقول: الأرض أرضنا… واللي عايشين عليها مستوطنين.` |
| 22 | البنت → بابا | 3:58–4:06 | Fatima: `[playful, teasing] يعني مين الصح؟` Tamer: `[chuckles] ده بقى… [beat, to camera, playful] قولولنا إنتو في الكومنتات. واشترك في كورس عالسريع عشان ما تفوتكش الحكاية الجاية.` |

**Length:** ≈565 words at the Genghis pace (2.6 words/s plus pauses) comes to ≈4:06. If the stitched VO runs past 4:20, cut in this order:
1. Block 12 entirely (Stanley/gold rush/Panama, −12s). The visual in B12 goes too.
2. In block 14, «وبوستة، وأكل،» (−1s).
3. In block 13, Fatima's «على مضمار خيل؟!» and Tamer's «آه… ما كانش فيه مطار.» (−3s). The landing still makes sense without them.

**Chunking:** record per row (22 chunks) so a single bad line can be re-taken. Generate rows 16 and 17 at Stability 0.50 for Tamer so the grave read stays steady.

**Ending (a deliberate change from the formula):** instead of teasing next week's episode, the open loop hands the question to the comments. A sovereignty dispute gets a lot of comments. «الحكاية الجاية» keeps the subscribe line.

**Listen for:**
- «مالفيناس» = *mal-FEE-nas*, stress on the second syllable. Don't let it collapse to *malvinas* with an English v; if it drifts, write «مالْفِيناس».
- «فوكلاند» = *FOK-land*, not *fawk-*.
- «لي مالوين» = *lay ma-LWEEN* (French *Malouines*). If it reads as two Arabic words, write «ليمالْوين».
- «سان مالو» = *san MA-lo*.
- «سترونج» = *strong*; the Egyptian /g/ on ج is correct here.
- «بورخيس» = *bor-KHEES*, with خ, not *borjes*.
- «تاتشر» = *TA-tsher*.
- «كورس عالسريع» = one phrase, *kors 3al-saree3*, same as Genghis.
- «اتنين واحد» in rows 18 and 19 should sound like a scoreline, crisp, with no pause between the words.
- Row 16 numbers: unhurried, a full breath before «وتلات ستات».

## 4. Captions
Same style as Genghis: single line, bottom-centre, white with soft shadow, no box, appearing word-group by word-group with the VO. In 16:9, **max 7 words** on screen (wider line). Text = the lines above without tags. Numbers as numerals:
`١٦٩٠ · ١٧٦٤ · ١٧٧٠ · ١٧٧٤ · ١٨١١ · ١٨١٦ · ١٨٣٣ · ١٩١٤ · ١٩٦٤ · ١٩٧٦ · ٢ أبريل ١٩٨٢ · ١٣,٠٠٠ كم · ٧٤ يوم · ٦٤٩ · ٢٥٥ · ٣ · ١٤ يونيو · ٢–١ · ٢٠١٣ · ٩٩٫٨٪`
Quotations stay in «». Keep the Spanish banner text in the F01 photo untranslated and caption it from the VO.

## 5. Art direction, 16:9, beat by beat
Camera language from the reference: every cut-away starts on a map or a real photo. Characters are composited on top at **30–35% of frame height**, in the **left or right third**, so the other two thirds stay clear for the map. Labels are handwritten white with a thin arrow; numbers get a glowing line or a counter. Map: NASA Blue Marble / Google Earth Studio. Keep the islands in the same position on the map every time (centre-right third) so the placard pile builds in one place.

**B1 · 0:00–0:10 · Study + laptop**
Historical Study, evening. Daughter on the ornate sofa with her laptop, father in the armchair with a cup. Over-the-shoulder push-in onto her laptop screen: F01 (the banner photo) fills it. On «المالفيناس أرجنتينية» the push carries through the screen until F01 is full frame, and a handwritten circle draws around the banner. On «إيه أصلاً؟» cut back to her face, with a handwritten «المالفيناس؟» popping beside her head with a question mark.

**B2 · 0:10–0:19 · Globe → South Atlantic**
Hard cut to satellite Earth. Spin and zoom down to the South Atlantic until the archipelago sits centre-right; glowing marker. On «آخر الدنيا» two thin distance lines draw out: one to the Argentine coast with the label «٤٨٠ كم», one off-frame north-east toward Britain with «١٣,٠٠٠ كم» (the line runs out of frame). On «برد، ورياح» cut to F02 (treeless moorland in wind, grass moving), label «ولا شجرة». Father composited bottom-left, amused expression.

**B3 · 0:19–0:24 · Map flags + penguins**
Back to the map. On each country in «فرنسا، وإسبانيا، وإنجلترا، والأرجنتين» a small hand-drawn flag pin drops onto the islands, one per word, in order. On «بطاريق» hard cut to F03 (penguin colony), and a fifth pin in plain white with a tiny penguin doodle drops into frame. Hold 1s on the penguins. Daughter composited bottom-right, critical/skeptical expression.

**B4 · 0:24–0:35 · Old map + first placard**
F04 (18th-century chart of the islands), slightly warmed, slow push. On «سترونج» a handwritten ship doodle sails in from the right edge. On «المضيق اللي في النص» the strait between the two main islands glows white, label «Falkland Sound». On «لزق في الجزر كلها» the glow spreads to the whole archipelago, and **placard #1** plants itself: `FALKLAND · 1690` with a red-white-blue stripe.

**B5 · 0:35–0:48 · Saint-Malo → Malouines → Malvinas**
Daughter close in the study as she asks (curious expression). On «المفاجأة» hard cut to a map of France, marker on Saint-Malo, label «سان مالو». On «فرنساويين» F05 (Bougainville portrait) slides in from the left as a cut-out bust. On «لي مالوين» a dotted line flies from Saint-Malo across the Atlantic to the islands, and **placard #2** plants: `LES MALOUINES · 1764` (blue-white-red stripe). On «ترجموها» the word "MALOUINES" on the placard morphs letter by letter into "MALVINAS" in front of the viewer. This is the visual payoff of the twist, so give it 1.5s.

**B6 · 0:48–1:02 · Two colonies, one map**
Map of the islands. Marker on the east island: «بورت سان لوي» (French). On «الناحية التانية» a second marker on the west (Saunders Island): «بورت إجمونت» (British), F06 photo inset. On «عارف إن التاني موجود» each marker grows a little handwritten eye doodle looking the wrong way. On «إسبانيا اشترت» the French marker flips to Spanish colours, label «بويرتو سوليداد», and **placard #3** plants: `MALVINAS · 1767` (red-yellow stripe). On «طردت الإنجليز» the British marker is crossed out with a red stroke. On «اتفقوا» the red stroke rubs away. Father composited bottom-left, explaining, one hand up.

**B7 · 1:02–1:19 · The war of the plaques**
Daughter in the study, amused. On «ولا حد» cut to the map. On «سابوا لوحة» a handwritten plaque **#4** plants beside the others: `«دي أرضنا» 1774` (UK stripe). On the second «سابوا لوحة» **#5** plants **on top of it**, slightly crooked: `«لأ، دي أرضنا إحنا» 1811` (Spain stripe). The pile is now visibly messy. On «يعني اليافطات دي من زمان!» quick cut to the daughter laughing, then a 0.5s flash of F01 (the 2026 banner) beside the pile, so the viewer gets the link.

**B8 · 1:19–1:27 · Independence**
Map pulls out to South America. On «استقلت» the Río de la Plata region fills light blue and white, label «١٨١٦». On «بقى بتاعي» a light-blue-and-white arrow sweeps from Buenos Aires to the islands, and **placard #6** plants: `1820 🇦🇷`. On «حاكم» F07 (ruins at Puerto Soledad / Port Louis) as an inset, label «بورت لويس».

**B9 · 1:27–1:37 · 1833**
Map. On «سفن صيد أمريكاني» small whaler/sealer doodles around the islands; one is lassoed toward the settlement. On «سفينة حربية» a US-flag ship doodle sails in and the settlement marker cracks. On «الإنجليز رجعوا» **placard #7** plants: `1833 🇬🇧`, firm and straight, landing with a small dust puff. On «ما مشيوش» the camera holds on the pile: seven placards. The map's colour settles.

**B10 · 1:37–1:40 · Study**
Two-shot in the study. Daughter sharp, leaning forward; father sets the cup down on «عمرها ما سكتت» and looks at her (not at the lens). Short, tight, no graphics.

**B11 · 1:40–1:55 · Sheep → the wolf**
F09 (sheep flock on the islands) full frame. On «أكتر من الناس» a split counter: «🐑» running up fast vs «👤» crawling to «٣,٧٠٠», with the sheep number running off the edge of the frame (don't show a sheep number; it isn't locked). On «ذئب فوكلاند» hard cut to F08 (warrah illustration), cut out on parchment, label «الوارّا – ذئب فوكلاند». On «داروين» F10 (Darwin portrait) slides in small from the right. On «اختفى» the warrah fades out of the frame and leaves only its handwritten outline, label «١٨٧٦». No characters.

**B12 · 1:55–2:07 · Gold rush and Panama** *(first cut if over length)*
Map of the Americas. On «حمّى الدهب» a gold dotted ship route draws from New York around Cape Horn up to California, with a glowing stop at Stanley (label «ستانلي»). F11 (Christ Church Cathedral's whalebone arch or Stanley harbour) as an inset. On «قناة بنما» the route snaps through Panama in one short stroke, and the Cape Horn route fades grey, with the Stanley glow going out last. Label «١٩١٤».

**B13 · 2:07–2:30 · The racetrack and the hijack**
Daughter close, leaning in. Cut to F12 (Stanley racecourse, archival or present-day). On «طيارة صغيرة» a small plane doodle lands across the track, label «١٩٦٤». On «رفع العلم» a tiny hand-drawn Argentine flag pops up. On «جواب» a folded letter doodle opens to show «امشوا». On «على مضمار خيل؟!» cut to the daughter, mock-surprised (sheet). On «ما كانش فيه مطار» a handwritten "airport" label with a red cross appears on the empty map. On «خطفوا طيارة ركاب» an airliner doodle lands on the same track, label «١٩٦٦». Father composited bottom-left, dry.

**B14 · 2:30–2:42 · The 1970s bridge, then the coup**
Map: a white dotted flight line Comodoro Rivadavia ↔ Stanley draws, label «١٩٧١». On the list «طيارات، وبوستة، وأكل، ومدارس، ومستشفيات» five small icons pop along the line, one per word (plane, envelope, crate, book, cross). On «انقلاب عسكري» the frame desaturates and the line goes grey. Label «١٩٧٦». On «بعين تانية» F13 (Galtieri photo) cut out as a bust, sliding in from the left, cold grade.

**B15 · 2:42–2:56 · The patrol ship leaves → invasion**
Map. A small grey patrol-ship doodle circles the islands; on «تسحب» it sails off-frame north. Label «١٩٨١». On «فهموها رسالة» a slow push in onto the islands, with the music thinning. On «اتنين أبريل» handwritten date «٢ أبريل ١٩٨٢» and Argentine arrows land at Stanley. On «من غير إعلان حرب» the label «من غير إعلان حرب» writes on beneath the date. Father composited bottom-right, grave expression (sheet).

**B16 · 2:56–3:10 · 74 days — grave and quiet**
On «تاتشر» F14 (Thatcher photo) cut out as a bust, entering from the right. On «أسطول» an arrow draws from Britain down the whole Atlantic to the islands, with the «١٣,٠٠٠ كم» line from B2 returning. **On «أربعة وسبعين يوم» the music drops to a single low pad and the graphics change register.** Split frame: left F15 (Liberation Memorial, Stanley), right F16 (Argentine Military Cemetery, Darwin), both desaturated, same exposure. The numbers write on in **plain white type, not handwritten**, one by one with the VO, centred: «٦٤٩ أرجنتيني» · «٢٥٥ بريطاني» · «٣ من أهل الجزر». No icons, no grid, no motion except a very slow push. On «استسلمت» fade the numbers and show the date «١٤ يونيو ١٩٨٢». No characters in this beat. No placard either: the pile does not move here.

**B17 · 3:10–3:18 · Borges's comb**
Study, daughter close, quiet/serious expression, laptop closed on her lap. On «بورخيس» F17 (Borges portrait) slides in as a cut-out bust. On «راجلين قُرع» two minimal handwritten bald heads doodle in either side of the islands on the map, and on «مشط» a small comb doodle drops between them. Hold 1s. Father composited bottom-left, thoughtful, soft half-smile. This is the first bit of lightness after B16, so keep it gentle and slow.

**B18 · 3:18–3:30 · Mexico 1986**
On «الجرح فضل مفتوح» the placard pile glows faintly. On «كاس العالم ستة وتمانين» cut to F18 (Maradona, 1986 quarter-final, Hand of God moment), handwritten circle around his hand. On «جون القرن» F19 (the second goal: Maradona running past defenders), with a handwritten dotted line tracing his run. On «اتنين واحد» a scoreboard graphic slams in: «الأرجنتين ٢ – ١ إنجلترا · المكسيك ١٩٨٦». Music lifts.

**B19 · 3:30–3:39 · 1986 = 2026**
On «استنى» split screen: left the 1986 scoreboard, right a matching board «الأرجنتين ٢ – ١ إنجلترا · أتلانتا ٢٠٢٦» over F01. On «اتنين واحد!» both «٢–١» glow at the same moment. Cut to the study: father chuckles. On «ماتش كورة وبس» a handwritten label «مش ماتش كورة وبس» under the split.

**B20 · 3:39–3:52 · The referendum**
Daughter asks in the study (curious). Cut to F20 (Stanley in 2013 referendum week or the ballot), label «٢٠١٣». On «تسعة وتسعين» a big glowing counter climbs to «٩٩٫٨٪». On «تلات أصوات» a tiny tally of three strokes appears in the corner with the label «٣ أصوات». Father composited bottom-right, matter-of-fact.

**B21 · 3:52–3:58 · Both sides, equal**
Map with the islands centred and the placard pile visible. The frame splits evenly through the islands. On «بريطانيا بتقول» the left half takes a UK-blue tint, label «الناس قالت كلمتها». On «والأرجنتين بتقول» the right half takes an Argentine light-blue tint, label «الأرض أرضنا». Same font size, same arrow weight, same screen time on each side. No characters.

**B22 · 3:58–4:06 · Study → banner on the pile → end screen (VO plays through)**
Two-shot in the study. Daughter teases. Father chuckles on «ده بقى…» and turns to camera on «قولولنا إنتو في الكومنتات». **This is the only time he looks at the lens in the film.** On «اشترك» the study pushes back and, in the same move, cuts to the map: F01 (the 2026 banner) drops onto the top of the placard pile as **placard #8**. On «الحكاية الجاية» @assets/G08_channel_endcard.png slides in from the right, landing fully as the VO ends. Do not cut the audio or wait for silence.

**End screen · 4:06–4:20 (14s)**
G08 full frame, static. «لايك» and «اشترك» pulse once each (100→108→100%, 0.4s), لايك first, starting 0.3s after «الجاية» ends. Leave the **left two-thirds clear** for YouTube end-screen elements: one "best for viewer" video tile, one playlist tile, the subscribe button. Nothing else animates.

## 6. Assets
Sourcing rule: public-domain or licensed only. Agency sports and war photos are rights-managed, so **license them before publishing or replace them** with a licensed equivalent.

| File | Beat | Content | Note |
|---|---|---|---|
| F01_banner_atlanta_2026 | B1, B7, B19, B22 | Argentina players with the «Las Malvinas son Argentinas» banner, Atlanta 2026 | **Supplied**, 1500×1059. Agency photo, so licence before publishing. Fine for 16:9; for 9:16, crop around the banner (it's left of centre) |
| F02_moorland_wind | B2 | Treeless Falklands moorland, grass in wind | Video clip preferred (5s) |
| F03_penguin_colony | B3 | Gentoo or rockhopper colony | Video or still |
| F04_old_chart | B4 | 18th-century chart of the islands | Public domain (e.g. a 1770s chart from a map library) |
| F05_bougainville | B5 | Louis-Antoine de Bougainville portrait | Public domain, cut out as a bust |
| F06_saunders_port_egmont | B6 | Saunders Island / Port Egmont site | Inset only |
| F07_puerto_soledad_ruins | B8 | Ruins at Port Louis / Puerto Soledad | Inset only |
| F08_warrah | B11 | Warrah illustration (19th-century zoological plate) | Public domain, cut out |
| F09_sheep_flock | B11 | Sheep on Falklands camp | Video preferred |
| F10_darwin | B11 | Charles Darwin portrait, young (Beagle era) | Public domain, cut out as a bust |
| F11_stanley_whalebone_arch | B12 | Christ Church Cathedral whalebone arch | Drops with B12 if cut |
| F12_stanley_racecourse | B13 | Stanley racecourse | Archival 1964 if available, otherwise present-day |
| F13_galtieri | B14 | Leopoldo Galtieri, 1982 | Licence; cut out as a bust, cold grade |
| F14_thatcher | B16 | Margaret Thatcher, 1982 | Licence; cut out as a bust |
| F15_liberation_memorial | B16 | Liberation Memorial, Stanley | Desaturated; same exposure as F16 |
| F16_argentine_cemetery_darwin | B16 | Argentine Military Cemetery, Darwin | Desaturated; same exposure as F15 |
| F17_borges | B17 | Jorge Luis Borges portrait | Check the photo's public-domain status; otherwise licence |
| F18_maradona_hand | B18 | 22 June 1986, the first goal | **Licence** (Getty/AP/El Gráfico) |
| F19_maradona_run | B18 | The second goal, the run | **Licence** |
| F20_referendum_2013 | B20 | Stanley referendum week / ballot | Licence or Falkland Islands Government press image |
| G08_channel_endcard | B22, End | Channel art | Reuse from Genghis, as is |
| Map | B2–B9, B12–B16, B21–B22 | NASA Blue Marble or Google Earth Studio | Not supplied |
| Doodles | throughout | Placards, flags, ship, plane, letter, icons, bald heads, comb | Hand-drawn in the reference's label style. Placards: white card, black handwriting, 6px country-colour stripe on top |

## 7. Numbers, locked
| Fact | Value | Source |
|---|---|---|
| 2026 match | World Cup semi-final, Atlanta, Argentina 2–1 England; banner «Las Malvinas son Argentinas» after the match; Downing St: "The World Cup might not be ours, but the Falkland Islands definitely are." | Boston Globe / AP, 16 Jul 2026; ESPN; LBC |
| Distance | ≈480 km from Argentina, ≈13,000 km from Britain | Chimu |
| First recorded landing | 1690, John Strong; named after Viscount Falkland | Swoop; user's research script |
| French colony | 1764, Port Saint Louis, Bougainville; *Malouines* after Saint-Malo → *Malvinas* | Swoop; user's research script |
| British Port Egmont | 1765–66, Saunders Island; neither side knew of the other | Swoop |
| Spain takes the French colony | 1767, Puerto Soledad | user's research script |
| Spain expels Britain | 1770; Britain restored 1771 | user's research script |
| Plaques | British leave 1774; Spanish leave 1811, each with a plaque | user's research script; Chimu |
| Independence | 1816, United Provinces of the Río de la Plata | user's research script |
| Argentine claim | 1820, the first formal claim for the United Provinces (placard #6) | public record (David Jewett, Nov 1820) |
| US raid | 1831 (Lexington); not voiced as a year | user's research script |
| British return | 1833, held continuously since, apart from 74 days in 1982 | Chimu; Swoop |
| Warrah | Extinct within ≈45 years of Darwin's visit (last one killed 1876) | Swoop |
| Panama Canal | 1914 | user's research script |
| Racetrack landing | 1964; hijack 1966 | user's research script |
| Air link | 1971 agreement, Comodoro Rivadavia–Stanley | user's research script |
| Coup | 1976 | user's research script |
| Patrol ship withdrawn | 1981 | user's research script |
| Invasion | 2 April 1982, no declaration of war | user's research script |
| War length | 74 days, surrender 14 June 1982 | Swoop |
| Dead | 649 Argentine, 255 British, 3 islanders (all three were women) | Swoop. **Chimu's 694 is a typo, so don't use it** |
| Borges | "two bald men fighting over a comb" | Swoop |
| 1986 | World Cup quarter-final, Mexico City, 22 June 1986, Argentina 2–1 England; Hand of God, then "Goal of the Century" four minutes later | public record |
| Referendum | March 2013; 99.8% to remain a British Overseas Territory; 3 votes against | Chimu; user's research script |
| Today | ≈3,700 residents, ≈1,700 military; squid fishing, tourism, sheep | user's research script |

**Kept out on purpose:** the "someone had already sheared the British sheep in 1833" story (only one source), a sheep headcount (sources vary), and the names of the players holding the banner (reports disagree).

## 8. YouTube packaging (16:9)
**Title options**
1. ليه الأرجنتين رفعت يافطة المالفيناس قدام إنجلترا؟
2. جزر من غير شجر… والكل عايزها من ٣٠٠ سنة
3. المالفيناس ولا الفوكلاند؟ الحكاية في ٤ دقايق

**Thumbnail (1280×720):** left half: F01 cropped tight on the banner. Right half: the daughter's critical/skeptical face from the sheet, large, with a handwritten «ليه؟». Small placard pile doodle in the bottom-right corner. No more than 3 words of text.

**Chapters (description):**
```
0:00 اليافطة
0:10 جزر في آخر الدنيا
0:24 فوكلاند ولا مالفيناس؟
1:02 حرب اللوحات
1:19 ١٨١٦ و١٨٣٣
1:40 الغنم والذئب
2:07 الطريق للحرب
2:56 ٧٤ يوم
3:18 مارادونا
3:39 النهارده
```
Re-time these from `timing.json`. If block 12 is cut, the later chapters shift by −12s.

**Pinned comment:** «إنتو شايفين إيه؟ الأرض ولا الناس؟ 👇 (بالراحة على بعض 🙂)»

## 9. Vertical variation — 9:16 (1080×1920), ≈58s
**This is its own short script, not a crop of the wide one.** The structure is the same (hook → name twist → plaques → 1833 → 1982 → Maradona → 2–1 → referendum → "who's right?"), but each step is one or two lines. Record it in the same session, with the same voices and settings.

### 9.1 VO script, vertical
| # | Speaker | Target | Line (paste with tags) |
|---|---|---|---|
| V1 | البنت | 0:00–0:05 | `[curious, puzzled, leaning in] بابا… ليه لاعيبة الأرجنتين رفعوا يافطة «المالفيناس أرجنتينية»… بعد ما كسبوا إنجلترا؟` |
| V2 | بابا | 0:05–0:11 | `[dry, amused] جزر في آخر الدنيا… برد ورياح، ولا شجرة. [wry] وبقالها تلتمية سنة الكل عايزها.` |
| V3 | بابا | 0:11–0:18 | `[playful, conspiratorial] الإنجليز سمّوها فوكلاند… والفرنساويين سمّوها «لي مالوين»… [beat] والإسبان ترجموها «مالفيناس». [wry] يعني اسمها الأرجنتيني… أصله فرنساوي.` |
| V4 | بابا → البنت | 0:18–0:25 | Tamer: `[deadpan] وكل واحد نزل، مشي… وساب لوحة مكتوب عليها «دي أرضنا».` Fatima: `[laughs] يعني اليافطات دي من زمان!` |
| V5 | بابا | 0:25–0:34 | `[storyteller, firm] سنة ألف تمنمية تلاتة وتلاتين الإنجليز خدوها… [low] والأرجنتين عمرها ما سكتت. [slower, grave] لحد اتنين أبريل ألف تسعمية اتنين وتمانين… الجيش الأرجنتيني دخلها.` |
| V6 | بابا | 0:34–0:39 | `[grave, quiet] أربعة وسبعين يوم حرب… أكتر من تسعمية قتيل… [beat] والأرجنتين استسلمت.` |
| V7 | بابا → البنت | 0:39–0:47 | Tamer: `[shifting, rising energy] وبعدها بأربع سنين، مارادونا جاب في إنجلترا جون بإيده… وجون القرن. [proud] اتنين واحد.` Fatima: `[realizing, bright] وماتش السنة دي برضه اتنين واحد!` |
| V8 | بابا | 0:47–0:53 | `[matter-of-fact] والأهالي؟ تسعة وتسعين وتمانية من عشرة في المية عايزين يفضلوا بريطانيين. [beat] والأرجنتين بتقول: الأرض أرضنا.` |
| V9 | البنت → بابا | 0:53–0:58 | Fatima: `[playful, teasing] يعني مين الصح؟` Tamer: `[chuckles, to camera, playful] قولولنا في الكومنتات… واشترك في كورس عالسريع.` |

≈130 words, ≈58s. If it runs over 60s (the Shorts cap), cut «برد ورياح، ولا شجرة.» in V2 first, then «يعني اسمها الأرجنتيني… أصله فرنساوي.» in V3. Keep the deaths line (V6) and the 2–1 payoff (V7) whatever else goes.

### 9.2 Reframing rules (apply to every vertical beat)
- **Characters** stack vertically instead of sitting side by side: the speaker goes in the **lower half at 30–35% of frame height**, and the map or photo takes the upper 55%.
- **Map:** the islands go in the **upper-centre**, and the placard pile builds **upward** (stacked, not side by side) so it stays readable in a narrow frame.
- **Distance lines** run vertically: Argentina below the islands, Britain off the top edge.
- **Safe zone:** keep labels, numbers and captions out of the bottom 20% and the right-hand 15% (the Shorts/Reels UI). Captions sit in the same place as the Genghis vertical, but nudged up to clear the UI; max 5 words.
- **Split screens** (deaths, 1986/2026, both sides) become **top/bottom** splits.
- **F01** is cropped to 1080×1920 around the banner. The banner sits at about x 430–890 in the 1500×1059 original, so take a 596×1059 window from x≈360 and upscale 1.8×. The players at the edges get cropped out; that's fine. Keep the full banner text legible.

### 9.3 Art direction, vertical
**V1 · 0:00–0:05 · Study + laptop.** Same as B1, but the push-in onto the laptop is vertical. F01 fills the frame on «المالفيناس أرجنتينية», with a handwritten circle around the banner. **In the first 1.5s the banner must already be on screen**, because Shorts viewers scroll away fast.
**V2 · 0:05–0:11 · Globe → islands.** Fast zoom (1.5s) from the globe to the islands in the upper-centre; «٤٨٠ كم» line drawing down to Argentina. On «ولا شجرة» F02 fills the upper 55%. Father in the lower half, amused.
**V3 · 0:11–0:18 · The name morph.** Placard `FALKLAND` plants. On «لي مالوين» placard `LES MALOUINES` stacks on top; on «مالفيناس» its lettering morphs into `MALVINAS`. On «أصله فرنساوي» a small French flag doodle pops on the morphing placard. This is the vertical cut's main visual payoff, so give it the time.
**V4 · 0:18–0:25 · Plaques.** Two plaques slam onto the stack, crooked, on «دي أرضنا». Cut to the daughter laughing in the lower half; F01 flashes for 0.5s on top of the stack.
**V5 · 0:25–0:34 · 1833 → 1982.** `1833 🇬🇧` placard plants firm. On «ما سكتت» the stack wobbles slightly. On «اتنين أبريل» desaturate; date «٢ أبريل ١٩٨٢» writes on; arrows land at Stanley.
**V6 · 0:34–0:39 · Grave.** Top/bottom split of F15/F16, desaturated. Plain white «٧٤ يوم» then «+٩٠٠». Music drops to a single pad. No characters.
**V7 · 0:39–0:47 · 1986 = 2026.** F18 in the top half, scoreboard «٢–١ · ١٩٨٦» slams in. On «السنة دي» the bottom half gets F01 + «٢–١ · ٢٠٢٦». Both «٢–١» glow together on «اتنين واحد!».
**V8 · 0:47–0:53 · Both sides.** Counter «٩٩٫٨٪» in the upper half; on «الأرض أرضنا» the frame splits top/bottom with equal labels «الناس قالت كلمتها» / «الأرض أرضنا».
**V9 · 0:53–0:58 · Study → loop.** Father looks at the lens on «قولولنا». On «اشترك» F01 drops onto the top of the placard stack and holds there until the end. **No separate end card**: the last frame should cut cleanly back to V1's opening frame (F01 with the circle), so the video loops.

### 9.4 Vertical packaging
- **On-screen hook text** (first 2s, top of frame, handwritten): «اليافطة دي وراها ٣٠٠ سنة»
- **Caption:** «ليه الأرجنتين رفعت يافطة المالفيناس؟ 🇦🇷🇬🇧 الحكاية كاملة على القناة»
- Link the full 16:9 video as the Short's related video.
