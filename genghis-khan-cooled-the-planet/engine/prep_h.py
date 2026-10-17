"""Cut the 16:9 film's assets from the Real-ESRGAN x4 sheets (build/sheet2_*_x4.png) → build/h/.
Coordinates are in x4 pixels, measured from gridded crops of the sheets.
Run: python3 -I engine/prep_h.py"""
import json, numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage
OUT = 'build/h/'
import os; os.makedirs(OUT, exist_ok=True)
DAD = Image.open('build/sheet2_dad_x4.png').convert('RGB')
DAU = Image.open('build/sheet2_daughter_x4.png').convert('RGB')
SET = Image.open('build/sheet2_set_x4.png').convert('RGB')

def cutout(img, box, name, tol=34):
    """White-sheet figure → RGBA: background = near-white/light-grey regions connected to the border."""
    a = np.asarray(img.crop(box)).astype(int)
    light = (a.min(-1) > 255 - tol * 2) & ((a.max(-1) - a.min(-1)) < tol)          # whites + pale grey floor shadows
    lab, n = ndimage.label(light)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge))
    lab2, n2 = ndimage.label(fg)
    if n2: fg = lab2 == 1 + int(np.argmax(ndimage.sum(fg, lab2, range(1, n2 + 1))))
    fg = ndimage.binary_fill_holes(fg) & ~(np.isin(lab, list(edge)))
    fg = ndimage.binary_erosion(fg, iterations=2)
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))
    im = Image.fromarray(a.astype(np.uint8)); im.putalpha(alpha); im.save(OUT + name + '.png')
    ys, xs = np.nonzero(fg); return dict(w=im.width, h=im.height, bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())])

def ellipse_patch(img, cx, cy, rx, ry, name, feather):
    box = (cx - rx - feather, cy - ry - feather, cx + rx + feather, cy + ry + feather)
    p = img.crop(box); m = Image.new('L', p.size, 0); d = ImageDraw.Draw(m)
    d.ellipse((feather, feather, feather + 2 * rx, feather + 2 * ry), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather / 2)); p.putalpha(m); p.save(OUT + name + '.png')
    return dict(w=p.width, h=p.height)

meta = {}
# ── bodies (x4 crops of the seated model sheets) ──
meta['dad_34'] = cutout(DAD, (1120, 150, 2068, 2030), 'dad_34')       # 3/4, facing left (toward her)
meta['dad_front'] = cutout(DAD, (150, 150, 1060, 2030), 'dad_front')  # front, to camera
meta['dau_34'] = cutout(DAU, (1050, 185, 1962, 2030), 'dau_34')       # 3/4, facing right (toward him)
meta['dau_front'] = cutout(DAU, (95, 185, 1050, 2030), 'dau_front')

# ── mouths: 3x3 charts, order rest, MBP, A, E, I, O, U, FV, L ──
VIS = ['rest', 'mbp', 'a', 'e', 'i', 'o', 'u', 'fv', 'l']
DAD_COLS, DAD_ROWS = [4350, 4950, 5560], [1150, 1590, 2060]
for k, v in enumerate(VIS):
    x0, y0 = DAD_COLS[k % 3], DAD_ROWS[k // 3]
    meta['dad_m_' + v] = ellipse_patch(DAD, x0 + 262, y0 + 112, 175, 100, 'dad_m_' + v, 34)
DAU_COLS, DAU_ROWS = [53, 553, 1020], [2213, 2730, 3263]
for k, v in enumerate(VIS):
    x0, y0 = DAU_COLS[k % 3], DAU_ROWS[k // 3]
    meta['dau_m_' + v] = ellipse_patch(DAU, x0 + 215, y0 + 150, 150, 92, 'dau_m_' + v, 30)

# ── blinks: half-closed and closed eye pairs (each eye its own feathered patch) ──
for who, img, half, closed, rx, ry in [('dad', DAD, ((884, 2455), (1184, 2455)), ((1573, 2455), (1873, 2455)), 92, 40),
                                       ('dau', DAU, ((2153, 2313), (2387, 2313)), ((2637, 2313), (2870, 2313)), 95, 52)]:
    for state, pts in [('half', half), ('closed', closed)]:
        for side, (cx, cy) in zip(['l', 'r'], pts):
            meta[f'{who}_eye_{state}_{side}'] = ellipse_patch(img, cx, cy, rx, ry, f'{who}_eye_{state}_{side}', 16)

# ── room plates (x4 crops) → 1920x1080 ──
def plate(box, name, y_off=None, x_off=None, blur=0):
    p = SET.crop(box); w, h = p.size
    if w / h > 16 / 9: nw = int(h * 16 / 9); xo = (w - nw) // 2 if x_off is None else x_off; p = p.crop((xo, 0, xo + nw, h))
    else: nh = int(w * 9 / 16); yo = (h - nh) // 2 if y_off is None else y_off; p = p.crop((0, yo, w, yo + nh))
    meta[name + '_src'] = dict(box=box, crop=list(p.getbbox()))
    p = p.resize((1920, 1080), Image.LANCZOS)
    if blur: p = p.filter(ImageFilter.GaussianBlur(blur))
    p.save(OUT + name + '.jpg', quality=94)
plate((3364, 404, 4772, 1516), 'room_two', y_off=150)      # S2-H two-shot
plate((72, 404, 2188, 1516), 'room_wide')                  # S1-H establishing
plate((1060, 3432, 2084, 4236), 'room_bg_dau', y_off=150, blur=2)   # S7-H (she sits on the left third)
plate((3080, 3432, 4140, 4236), 'room_bg_dad', y_off=150, blur=2)   # S8-H (he sits on the right third)
plate((4204, 3432, 5032, 4236), 'room_art', y_off=180)     # S9-H artwork wall

# foreground coffee table (S5, magenta keyed)
t = np.asarray(SET.crop((104, 2728, 800, 3256))).astype(int)
mag = (t[..., 0] > 170) & (t[..., 2] > 170) & (t[..., 1] < 110)
alpha = Image.fromarray((~ndimage.binary_dilation(mag, iterations=2) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
ti = Image.fromarray(t.astype(np.uint8)); ti.putalpha(alpha); ti.save(OUT + 'table.png')
json.dump(meta, open(OUT + 'meta.json', 'w'), indent=1)
print('assets →', OUT, len(meta), 'entries')
