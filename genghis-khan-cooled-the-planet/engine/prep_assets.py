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
for name, f in [('G09_forest_before', 4.3), ('G10_forest_after', 4.0)]:   # before/after forests (replace G04)
    im = Image.open(A + name + '.png').convert('RGB'); im = im.resize((int(im.width * f), int(im.height * f)), Image.LANCZOS)
    im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)).save(B + name + '.jpg', quality=93)
print('forests → build/')
# the study, from the location sheet (assets/ref_location_sheet.png): a 9:16 wide plate + soft backgrounds for the singles
L = Image.open(A + 'ref_location_sheet.png').convert('RGB')
wide = L.crop((245, 330, 545, 863)).resize((1080, 1919), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
wide.save(B + 'room_wide.jpg', quality=93)
for name, box in [('room_bg_daughter', (150, 430, 344, 775)), ('room_bg_father', (446, 430, 640, 775))]:
    L.crop(box).resize((1080, 1920), Image.LANCZOS).filter(ImageFilter.GaussianBlur(9)).save(B + name + '.jpg', quality=92)
print('room plates → build/')
for name, f in [('G11_ice_drilling', 1.7), ('G12_lava_haze', 2.0)]:   # ice drilling (replaces G05 in the Antarctica beat), volcanic haze (behind the temperature chart)
    im = Image.open(A + name + '.png').convert('RGB'); im = im.resize((int(im.width * f), int(im.height * f)), Image.LANCZOS)
    im.filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=2)).save(B + name + '.jpg', quality=93)
print('drilling + lava → build/')
