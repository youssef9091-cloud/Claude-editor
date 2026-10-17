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

## 16:9 YouTube cut (FMT=h)

Rig-ready sheets → `assets/sheet2_{dad,daughter,set}.webp`.
```
pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision && pip install spandrel scipy
curl -L -o build/models/anime6B.pth https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth
for n in dad daughter set; do python3 -I engine/upscale.py assets/sheet2_$n.webp build/sheet2_${n}_x4.png; done
python3 -I engine/prep_h.py                         # bodies, 9 mouths, blinks, room plates → build/h/
# Rhubarb 1.13 (phonetic) → build/lipsync.json
build/tools/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb -r phonetic --extendedShapes GHX -f json -o build/lipsync.json build/vo16k.wav
FMT=h node engine/render.js all                     # → out/genghis-khan-cooled-the-planet-16x9.mp4
```
