"""Face-kit test: erase the features on ChatGPT's seated face (keep its nose), then lay the kit's eyes, brows and
mouths back on. The kit is drawn on a flat skin-colour page, so each piece is lifted with a feathered oval and its
page colour is shifted to the face's own skin under it. Run: python3 -I engine/face_kit_test.py '<json params>' out.png"""
import numpy as np, sys, json
from PIL import Image, ImageFilter
P = json.loads(sys.argv[1]); OUT = sys.argv[2]
K = np.asarray(Image.open('assets/cast_v2/girl_2_kit_34right.png').convert('RGB')).astype(float)
F = np.asarray(Image.open('assets/cast_v2/girl_3_face_34right.png').convert('RGB')).astype(float)
PAGE = np.median(F[5:60, 600:1500].reshape(-1, 3), 0)
X0, Y0, X1, Y1 = 200, 150, 380, 340
base = K[Y0:Y1, X0:X1].copy(); Hh, Ww = base.shape[:2]
yy, xx = np.mgrid[0:Hh, 0:Ww]
ell = lambda cx, cy, rx, ry: ((xx + X0 - cx) / rx) ** 2 + ((yy + Y0 - cy) / ry) ** 2 <= 1
mask = np.zeros((Hh, Ww), bool)
for e in P['erase']: mask |= ell(*e)
skin = (~mask) & (base.mean(-1) > 150)
fill = base.copy(); fill[mask] = np.median(base[skin], 0)
for it in range(1500):                                   # Laplace fill against skin-only boundary
    acc = np.zeros_like(fill); cnt = np.zeros((Hh, Ww))
    for dy, dx in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        ok = np.roll(np.roll(mask | skin, dy, 0), dx, 1); acc += np.roll(np.roll(fill, dy, 0), dx, 1) * ok[..., None]; cnt += ok
    fill[mask] = acc[mask] / np.maximum(cnt[mask], 1)[:, None]
BOX = {  # kit pieces (x0,y0,x1,y1)
 'eye_r': [(469, 365, 546, 417), (577, 368, 627, 418)], 'eye_c': [(635, 366, 705, 417), (738, 368, 803, 418)],
 'eye_l': [(814, 367, 885, 418), (919, 369, 981, 418)], 'eye_half': [(993, 371, 1068, 418), (1100, 373, 1161, 418)],
 'eye_closed': [(1174, 374, 1248, 418), (1280, 375, 1342, 417)], 'eye_happy': [(1357, 377, 1434, 414), (1461, 373, 1516, 410)],
 'brow_n': [(479, 567, 586, 595), (618, 569, 694, 597)], 'brow_up': [(739, 543, 848, 592), (887, 552, 956, 593)],
 'brow_down': [(998, 568, 1108, 607), (1138, 571, 1219, 608)],
 'm_rest': (39, 776, 143, 829), 'm_smile': (189, 773, 301, 828), 'm_mbp': (351, 776, 454, 828), 'm_a': (511, 763, 608, 844),
 'm_e': (656, 764, 757, 835), 'm_o': (818, 762, 894, 843), 'm_u': (952, 765, 1018, 835), 'm_fv': (1072, 768, 1175, 825),
 'm_l': (1229, 763, 1327, 841), 'm_laugh': (1387, 755, 1500, 843)}
def put(c, box, cx, cy, s, sx=1, pad=8):
    x0, y0, x1, y1 = box; p = F[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
    w, h = max(2, int(p.shape[1] * s * sx)), max(2, int(p.shape[0] * s))
    p = np.asarray(Image.fromarray(p.astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(float)
    x, y = int(cx - X0 - w / 2), int(cy - Y0 - h / 2); reg = c[y:y + h, x:x + w]
    page = np.clip(1 - np.abs(p - PAGE).sum(-1, keepdims=True) / 60, 0, 1)       # how much of each pixel is page
    p = p + (reg - PAGE) * page                                                   # page colour → the face's skin
    gy, gx = np.mgrid[0:h, 0:w]; d = ((gx - w / 2) / (w / 2)) ** 2 + ((gy - h / 2) / (h / 2)) ** 2
    f = np.clip((1 - d) / .3, 0, 1)[..., None]
    c[y:y + h, x:x + w] = reg * (1 - f) + p * f
tiles = [fill.copy()]
for eye, brow, mo in P['combos']:
    c = fill.copy()
    for i, side in enumerate(['near', 'far']):
        put(c, BOX['brow_' + brow][i], *P[side + '_brow'], P['bs'], P['fsx'] if i else 1)
        put(c, BOX['eye_' + eye][i], *P[side], P['es'], P['fsx'] if i else 1)
    put(c, BOX['m_' + mo], *P['mouth'], P['ms'])
    tiles.append(c)
W = np.concatenate([np.asarray(Image.fromarray(t.clip(0, 255).astype(np.uint8)).resize((Ww * 2, Hh * 2), Image.LANCZOS)) for t in tiles], 1)
Image.fromarray(W).save(OUT)
