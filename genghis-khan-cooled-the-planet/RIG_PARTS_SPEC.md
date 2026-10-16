# Rig-ready character sheets — parts spec

Goal: replace the traced cut-outs with properly separated, high-resolution parts so the presenters can be rigged
(head turns, arm gestures, real lip-sync) instead of slid around as flat pictures.

Source of truth for the look: `assets/ref_character_sheet.png` (father, 905 px) and
`assets/ref_character_sheet_daughter.png` (daughter, new sheet). Every part must stay on-model with those sheets:
same faces, hair, outfits, colours, line weight, flat cel shading with dark brown outlines.

Generator: RunComfy (`runcomfy`), **Nano Banana Pro Edit** (`google/nano-banana-pro/edit`) with the sheet as reference
image 1 — identity-preserving, multi-reference. Fallback: **GPT Image 2 Edit** (`openai/gpt-image-2/edit`).
Every part on a flat pure-green `#00FF00` background (keyed out afterwards), 2K resolution, one part-group per image.

## Parts per character

| # | File | Contents | Notes |
|---|------|----------|-------|
| 1 | `<who>_seated_body.png` | Seated on a sofa, front 3/4 view, **no head, no arms** (torso, hips, legs, shoes) | neck stub and shoulder sockets visible; father legs crossed, daughter cross-legged |
| 2 | `<who>_head_front.png` | Head + hair, front, **mouth area blank skin**, eyes open | daughter: hair front and hair back as two separate images |
| 3 | `<who>_head_34.png` | Same head turned 3/4 toward screen-left (father) / screen-right (daughter) | for looking at each other |
| 4 | `<who>_mouths.png` | 9 mouths on a 3×3 grid: rest, M/B/P, A, E, I, O, U, F/V, L | lip-sync visemes, same scale as the head |
| 5 | `<who>_eyes.png` | Eye pairs: open, half, closed, look-left, look-right, surprised | plus 4 brow pairs: neutral, raised, frown, one-raised |
| 6 | `<who>_arms.png` | Upper arm, forearm, hand as separate pieces, both sides | hands: relaxed, pointing, open palm, holding mug (father) / phone (daughter) |
| 7 | `<who>_props.png` | Father: mug, glasses. Daughter: phone, red "critical" glasses | |

Each part is drawn at the **same scale**, about 2000 px for the full seated figure, so the pieces fit together without resizing.

## Prompt template (Nano Banana Pro Edit)

```
Keep this exact character from the reference sheet: same face, hair, outfit, colours, flat cel-shaded
illustration style with dark brown outlines. Draw ONLY <part description>, isolated, centred, on a flat
pure green #00FF00 background, no shadow, no text, no other characters. High resolution, clean edges.
```

## After generation (done by me)

1. Key out the green, trim, and name the layers.
2. Set pivots: neck, shoulders, elbows, wrists, hips.
3. Build the rig in the existing renderer, with an option to export it to Rive.
4. Map the voice to mouth shapes with Rhubarb lip-sync (phonetic mode, since the voice is Arabic).
5. Re-render the study shots. Nothing else in the film changes.
