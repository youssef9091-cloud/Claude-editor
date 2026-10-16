"""Prepare assets/ → build/: key the green off G01 (and crop the inscription), upscale the small photos, crop G08's side bars.
Run: python3 -I engine/prep_assets.py  (from the project folder)"""
from PIL import Image, ImageFilter
A, B = 'assets/', 'build/'
g = Image.open(A + 'G01_genghis_portrait.png').convert('RGBA')
g = g.crop((42, 0, g.width, g.height))           # drop the inscription + seal on the left edge
px = g.load(); W, H = g.size
for y in range(H):
    for x in range(W):
        r, gg, b, a = px[x, y]; d = gg - max(r, b)
        al = 255 if d < 8 else (0 if d > 26 else int(255 * (26 - d) / 18))
        if d > 0 and al > 0: gg = max(r, b) + min(d, 4)   # despill
        if y > H - 90: al = int(al * max(0, (H - y)) / 90)  # fade the bust's bottom edge
        px[x, y] = (r, gg, b, al)
g.putalpha(g.split()[3].filter(ImageFilter.MedianFilter(5)))
g.resize((W * 2, H * 2), Image.LANCZOS).save(B + 'G01_cutout.png')
for name, f in [('G02_mongolian_steppe', 3), ('G03_ploughed_field', 4), ('G04_forest_canopy', 2), ('G05_antarctic_ice_aerial', 1.5),
                ('G06_ice_core_sunlight', 2.5), ('G07_volcano_eruption', 4)]:
    im = Image.open(A + name + '.png').convert('RGB'); im = im.resize((int(im.width * f), int(im.height * f)), Image.LANCZOS)
    im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)).save(B + name + '.jpg', quality=93)
Image.open(A + 'G08_channel_endcard.png').convert('RGB').crop((104, 0, 1513, 671)).save(B + 'G08_endcard.png')
print('assets → build/')
