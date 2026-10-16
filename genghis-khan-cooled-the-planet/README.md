# جنكيز خان برّد الكوكب — build

Custom canvas renderer (headless Chromium + ffmpeg). Every time comes from `timing.json` via `score.js`.

```
npm install
python3 -I engine/prep_assets.py          # assets/ → build/ (key G01, upscale, crop G08)
node engine/render.js audio               # music bed + SFX + VO, ducked, -14 LUFS → build/mix.wav
node engine/render.js stills|board        # marker stills → out/stills, out/board.jpg
node engine/render.js qa|pacing           # rule checks
node engine/render.js preview             # 540×960 15 fps → out/preview.mp4
node engine/render.js render && node engine/render.js mux
node engine/render.js srt|poster|check|verify
```

# Presenters are cut-out puppets traced from the character sheet:
#   pip install vtracer scipy && python3 -I engine/trace_characters.py   → build/chars/*.svg
# The study is the location sheet (assets/ref_location_sheet.png), prepared by engine/prep_assets.py.
