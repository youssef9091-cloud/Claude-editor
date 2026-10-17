# Face edits: the last character material the rig needs

## Why the characters still look stiff
1. **Not facing each other.** On the sheets, both seated poses face mostly toward the camera (her 3/4, him almost
   front). A 2D picture can't turn a head that was drawn facing the lens, so on a sofa they look out into the room.
   **Fix:** a seated *side-profile* pose of each, facing the other.
2. **Mouths and eyes.** The mouth and eye charts on the sheets are drawn front-on, at a different size and in a
   glossier style than the faces in the poses, so pasted in they look wrong. The current video draws mouths and blinks
   by code, which is clean but limited. **Fix:** the *same pose image* re-drawn by ChatGPT with only the mouth or the
   eyes changed. I cut out just the face area and swap it in time with the voice, so it's the original artist's
   drawing at the exact angle.

With these, every pose has hand-drawn talking mouths and blinks, and the two can face each other.

## How
Upload the base image (from `assets/rig_bases/`) to ChatGPT and send the prompt. Download each result as PNG and
name it as shown. Keep the **same chat** for one character so the style stays locked.

### Step 1: two new poses (one prompt each, upload the matching 3/4 image as reference)

**`dau_profile.png`**, upload `dau_34.png`:
> Same girl, same outfit, same art style, colours and line weight as the reference. Draw her seated on a sofa seen
> exactly from the side (full profile), facing RIGHT, legs crossed, phone in her lap, looking straight ahead to the
> right at eye level, mouth closed with a slight smile. Full body, plain pure-white background, no shadow, no sofa,
> no text. Same scale as the reference, 2:3 portrait.

**`dad_profile.png`**, upload `dad_34.png`:
> Same man, same outfit, glasses, hair and beard, same art style, colours and line weight as the reference. Draw
> him seated seen exactly from the side (full profile), facing LEFT, legs crossed, hands on his knee, looking straight
> ahead to the left at eye level, mouth closed, calm. Full body, plain pure-white background, no shadow, no chair, no
> text. Same scale as the reference, 2:3 portrait.

### Step 2: face edits (4 per pose)
Do these for **dau_34, dad_34, dau_profile, dad_profile** (16 images). Upload the pose image and send each prompt
on its own. *Every* prompt starts with this line:

> Edit this image. Change ONLY the [mouth / eyes] as described. Keep everything else pixel-identical: same pose,
> head angle, position, size, framing, hair, clothes, colours, line style, white background.

| File name | Add after the line above |
|---|---|
| `<pose>_ah.png` | Mouth: open wide as if saying "AH", upper teeth and a little tongue visible, drawn in the same style as the face. |
| `<pose>_oh.png` | Mouth: rounded open "OH" shape, lips pushed slightly forward. |
| `<pose>_ee.png` | Mouth: wide "EE" shape, teeth together and visible, corners pulled back. |
| `<pose>_blink.png` | Eyes: both fully closed, relaxed lids, lashes as a single curved line. Mouth unchanged (closed). |

Example: `dau_profile_ah.png`, `dad_34_blink.png`.

### Optional, for the endings
The same 4 edits for **dau_front** and **dad_front** (8 images). The current video handles these poses by code, so
skip them if you're short on time.

## Then
Drop the PNGs in `assets/rig_bases/` (or send them here). The rig lines them up with the base image automatically,
blends in only the face area, and drives them from the voice. It works the same for the vertical Shorts version, so
the vertical one won't need anything else.
