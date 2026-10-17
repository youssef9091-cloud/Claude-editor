"""Face rig assets for the 16:9 presenters (face_h.json → build/h/):
  {pose}_lower.png  the lower lip + a band of chin, cut along the drawn lip line, feathered below — the jaw piece that
                    drops when the mouth opens (the interior is painted procedurally behind it, in the character's palette)
  face.json         per-pose colours sampled from the drawing (skin under each eye for the lids, mouth interior)
Run after prep_h.py: python3 -I engine/prep_face.py"""
import json, numpy as np
from PIL import Image
OUT = 'build/h/'
F = json.load(open('face_h.json'))
res = {}
def line_y(pts, x):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; return float(np.interp(x, xs, ys))
for k, f in F.items():
    if k.startswith('_'): continue
    im = Image.open(OUT + k + '.png').convert('RGBA'); a = np.asarray(im).astype(float)
    L = f['line']; x0, x1 = L[0][0], L[-1][0]; dep = f['depth']; fe = 12; pad = 6
    top = int(min(p[1] for p in L)) - 2; bot = int(max(p[1] for p in L) + dep + fe + 2)
    bx0, bx1 = int(x0 - pad), int(x1 + pad)
    H, W = bot - top, bx1 - bx0
    m = np.zeros((H, W))
    for j in range(W):
        x = bx0 + j; ly = line_y(L, min(max(x, x0), x1))
        u = (x - x0) / (x1 - x0); side = np.clip(min(u, 1 - u) * 6, 0, 1) if 0 <= u <= 1 else 0
        for i in range(H):
            y = top + i; d = y - ly
            if d < 1.0: v = 0 if d < 0 else d          # hard-ish top edge just under the lip line
            elif d <= dep: v = 1
            else: v = max(0, 1 - (d - dep) / fe)        # feather into the chin
            m[i, j] = v * (0.35 + 0.65 * side) if v else 0
    patch = a[top:bot, bx0:bx1].copy(); patch[..., 3] = patch[..., 3] * m
    Image.fromarray(patch.astype(np.uint8), 'RGBA').save(OUT + k + '_lower.png')
    # colours: skin just under each eye (lids), lip tone at the line
    lids = []
    for e in f['eyes']:
        cx = (e['a'][0] + e['b'][0]) / 2; by = (e['a'][1] + e['b'][1]) / 4 + e['lo'][1] / 2
        ty = (e['a'][1] + e['b'][1]) / 4 + e['up'][1] / 2          # top of the eye opening → the lid skin sits just above the lash
        below = a[int(by + 5):int(by + 9), int(cx - 4):int(cx + 4), :3].reshape(-1, 3).mean(0)
        above = a[int(ty - 13):int(ty - 9), int(cx - 4):int(cx + 4), :3].reshape(-1, 3).mean(0)
        lids.append([int(v) for v in ((below * .55 + above * .45) if k.startswith('dau') else below * .95)])   # his: glasses sit above the lash
    mx = int((x0 + x1) / 2); my = int(line_y(L, mx))
    lip = a[my + 6:my + 10, mx - 4:mx + 4, :3].reshape(-1, 3).mean(0)
    res[k] = dict(lower=dict(x=bx0, y=top), lids=lids, lip=[int(v) for v in lip])
json.dump(res, open(OUT + 'face.json', 'w'), indent=1)
print('face rig →', res)
