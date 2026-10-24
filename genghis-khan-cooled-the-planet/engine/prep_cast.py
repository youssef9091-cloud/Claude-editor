"""Cast v2 (flat cut-out characters from the ChatGPT kits in assets/cast_v2/) → build/cast/rig/.
For each pose: the assembled seated figure (Real-ESRGAN x4, build/cast/x4/) cut off its white page, with its eyes,
brows and mouth erased (Laplace fill from the surrounding skin; the drawn nose stays), plus every face-kit piece baked
for that face: lifted off the kit's skin-coloured page with a feathered oval, the page colour swapped for the face's
own skin underneath, so a piece drawn at its (x, y) over the base is seamless. Glasses poses clip the eyes to the lens.
Coordinates below are in the kit images' pixels; everything is scaled x4 here. Run: python3 -I engine/prep_cast.py"""
import json, os, numpy as np
from PIL import Image
from scipy import ndimage
X4, OUT = 'build/cast/x4/', 'build/cast/rig/'
os.makedirs(OUT, exist_ok=True)
S = 4

GIRL_FACE = {  # girl_3_face_34right.png (eyes/brows: [near, far])
 'eye': {'r': [(469, 365, 546, 417), (577, 368, 627, 418)], 'c': [(635, 366, 705, 417), (738, 368, 803, 418)],
         'l': [(814, 367, 885, 418), (919, 369, 981, 418)], 'half': [(993, 371, 1068, 418), (1100, 373, 1161, 418)],
         'closed': [(1174, 374, 1248, 418), (1280, 375, 1342, 417)], 'happy': [(1357, 377, 1434, 414), (1461, 373, 1516, 410)]},
 'brow': {'n': [(479, 567, 586, 595), (618, 569, 694, 597)], 'up': [(739, 543, 848, 592), (887, 552, 956, 593)],
          'down': [(998, 568, 1108, 607), (1138, 571, 1219, 608)], 'skep': [(1270, 579, 1385, 608), (1416, 548, 1497, 586)]},
 'mouth': {'rest': (39, 776, 143, 829), 'smile': (189, 773, 301, 828), 'mbp': (351, 776, 454, 828), 'a': (511, 763, 608, 844),
           'e': (656, 764, 757, 835), 'o': (818, 762, 894, 843), 'u': (952, 765, 1018, 835), 'fv': (1072, 768, 1175, 825),
           'l': (1229, 763, 1327, 841), 'laugh': (1387, 755, 1500, 843)}}
DAD34_FACE = {  # dad_3_face_34left.png (eye pairs: only the first drawn eye is used, it sits in the near lens)
 'eye': {'l': [(393, 272, 442, 320)], 'c': [(589, 270, 636, 319)], 'r': [(788, 268, 835, 318)], 'half': [(973, 275, 1027, 320)],
         'closed': [(1162, 278, 1212, 313)], 'squint': [(1356, 277, 1408, 315)]},
 'mouth': {'rest': (20, 672, 166, 847), 'smile': (169, 672, 317, 847), 'mbp': (319, 672, 464, 847), 'a': (467, 672, 618, 847),
           'e': (624, 672, 772, 847), 'o': (775, 672, 919, 847), 'u': (919, 672, 1064, 847), 'fv': (1071, 672, 1219, 847),
           'l': (1223, 672, 1373, 847), 'laugh': (1378, 672, 1526, 847)}}
DADFR_FACE = {  # dad_5_face_front.png (eye pairs: [screen-left, screen-right])
 'eye': {'c': [(345, 244, 416, 302), (445, 243, 516, 303)], 'l': [(551, 243, 618, 302), (647, 243, 718, 302)],
         'r': [(748, 244, 815, 302), (842, 243, 913, 303)], 'half': [(966, 247, 1030, 302), (1058, 244, 1129, 304)],
         'closed': [(1163, 245, 1228, 304), (1256, 244, 1324, 304)], 'squint': [(1352, 247, 1423, 299), (1446, 247, 1518, 299)]},
 'mouth': {'rest': (19, 625, 159, 791), 'smile': (171, 625, 311, 793), 'mbp': (324, 625, 461, 788), 'a': (474, 624, 610, 796),
           'e': (624, 623, 763, 796), 'o': (776, 623, 910, 795), 'u': (923, 624, 1055, 795), 'fv': (1070, 624, 1213, 796),
           'l': (1226, 624, 1366, 796), 'laugh': (1379, 624, 1519, 796)}}

POSES = {
 'girl34': dict(src='girl34', crop0=(49, 110), face='girlface', face0=(0, 340), kit=GIRL_FACE,
                erase=[(286, 231, 17, 22), (328, 234, 10, 20), (304, 291, 26, 11)],
                eye=[(283, 239, .5, 1), (327, 239, .5, .9)], brow=[(284, 217, .36, 1), (328, 219, .36, .9)],
                mouth=(304, 291, .40, .40), feather=dict(eye=.3, brow=.35, mouth=.3), hair_pockets=(760, 0, 1250, 1900)),
 'dad34': dict(src='dad34', crop0=(29, 25), face='dadface34', face0=(0, 250), kit=DAD34_FACE,
               lens=[((263, 147), (250, 124, 300, 160))], erase=[],
               eye=[(275, 139, .42, 1)], lips=(253, 199, 36), lips_at=(.32, .38), lips_skip=('smile', 'mbp'), feather=dict(eye=.6, mouth=.25), hair_pockets=(0, 0, 0, 760)),
 'dadfront': dict(src='dadfront', crop0=(46, 9), face='dadfacefront', face0=(0, 220), kit=DADFR_FACE,
                  lens=[((214, 152), (203, 124, 263, 162)), ((306, 147), (267, 116, 320, 157))], erase=[],
                  eye=[(236, 141, .33, 1), (294, 137, .33, 1)], own_face=True, own_eyes=[((716, 527), (766, 501), (823, 526), (770, 545)), ((933, 501), (980, 477), (1030, 498), (981, 509))],
                  jaw=dict(line=[(762, 737), (820, 734), (900, 728), (980, 718), (1040, 707)], region=(900, 800, 210, 125, .25), max=58, mouth=(898, 105)), feather=dict(eye=.6, mouth=.25), hair_pockets=(0, 0, 0, 620)),
}

def load(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)

def cutout(a):
    """figure off its white page: near-white regions touching the border are background"""
    white = (a.min(-1) > 236) & ((a.max(-1) - a.min(-1)) < 20)
    lab, n = ndimage.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    alpha = ~bg
    lab2, n2 = ndimage.label(alpha)
    if n2: alpha = lab2 == 1 + int(np.argmax(ndimage.sum(alpha, lab2, range(1, n2 + 1))))
    alpha = ndimage.binary_erosion(alpha, iterations=3)
    # decontaminate: page-white pixels on the silhouette's rim go transparent (no white sliver along the hair)
    rim = alpha & ~ndimage.binary_erosion(alpha, iterations=6)
    alpha &= ~(rim & (a.min(-1) > 200))
    return np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(1.5))).astype(np.float32) / 255

def laplace_fill(img, mask, src_ok, iters=900):
    """fill `mask` by relaxing toward the surrounding pixels allowed by `src_ok` (skin), on a tight window"""
    ys, xs = np.nonzero(mask)
    if not len(ys): return img
    y0, y1, x0, x1 = max(0, ys.min() - 4), ys.max() + 5, max(0, xs.min() - 4), xs.max() + 5
    sub, m, ok = img[y0:y1, x0:x1].copy(), mask[y0:y1, x0:x1], src_ok[y0:y1, x0:x1]
    if ok.any(): sub[m] = np.median(sub[ok], 0)
    # coarse-to-fine: relax at 1/4 resolution first, then full
    for scale in (4, 1):
        if scale > 1:
            small = np.asarray(Image.fromarray(sub.clip(0, 255).astype(np.uint8)).resize((max(1, sub.shape[1] // scale), max(1, sub.shape[0] // scale)), Image.BILINEAR)).astype(np.float32)
            sm = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize(small.shape[1::-1], Image.NEAREST)) > 0
            so = np.asarray(Image.fromarray((ok * 255).astype(np.uint8)).resize(small.shape[1::-1], Image.NEAREST)) > 0
            small = relax(small, sm, so, iters)
            up = np.asarray(Image.fromarray(small.clip(0, 255).astype(np.uint8)).resize(sub.shape[1::-1], Image.BILINEAR)).astype(np.float32)
            sub[m] = up[m]
        else:
            sub = relax(sub, m, ok, iters // 3)
    img[y0:y1, x0:x1] = sub
    return img

def relax(a, m, ok, iters):
    use = m | ok
    for _ in range(iters):
        acc = np.zeros_like(a); cnt = np.zeros(m.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            u = np.roll(np.roll(use, dy, 0), dx, 1); acc += np.roll(np.roll(a, dy, 0), dx, 1) * u[..., None]; cnt += u
        a[m] = acc[m] / np.maximum(cnt[m], 1)[:, None]
    return a

def ellmask(shape, cx, cy, rx, ry):
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1

def mouth_only(P, K, face, fx0, fy0, tb, base, alpha, name, meta):
    """The dad's kit draws each mouth inside a whole moustache+beard block in a different hand from his face, so only
    the mouth itself (lips, teeth, tongue, the dark inside) is lifted and set under HIS drawn moustache, at his drawn
    lips. Sized so the kit's open 'a' mouth spans his lip width; 'rest' keeps his own drawn lips (no piece)."""
    cx, cy, lw = P['lips']; bx, by = tb(cx, cy); W4 = lw * S; MX, MY = P.get('lips_at', (.5, .45))
    def cutm(box, pad=6):
        x0, y0, x1, y1 = box
        p = face[(y0 - fy0 - pad) * S:(y1 - fy0 + pad) * S, (x0 - fx0 - pad) * S:(x1 - fx0 + pad) * S]
        r, g, b = p[..., 0], p[..., 1], p[..., 2]
        red = ((r - g > 70) & (r - b > 45) & (np.abs(g - b) < 45)) | ((p.mean(-1) < 75) & (r - g > 28) & (r - b > 22))
        red = ndimage.binary_opening(red, iterations=3)
        red |= (p.min(-1) > 225) & ndimage.binary_dilation(red, iterations=14)   # the teeth belong to the mouth's extent too
        lab, n = ndimage.label(ndimage.binary_closing(red, iterations=8))
        if not n: return None, None
        h, w = p.shape[:2]
        best = max(range(1, n + 1), key=lambda i: ndimage.sum(red, lab, i) / (1 + 6 * abs(ndimage.center_of_mass(lab == i)[1] / w - MX) + 6 * abs(ndimage.center_of_mass(lab == i)[0] / h - MY)))
        ys, xs = np.nonzero(lab == best)
        # a soft oval just around the mouth (lips, teeth, tongue and the dark inside, with only a sliver of the kit's beard)
        cy, cx, ry, rx = (ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2, (ys.max() - ys.min()) / 2 * 1.25 + 6, (xs.max() - xs.min()) / 2 * 1.12 + 6
        gy, gx = np.mgrid[0:h, 0:w]; d = ((gx - cx) / rx) ** 2 + ((gy - cy) / ry) ** 2
        m = np.clip((1 - d) / .45, 0, 1)
        return p, m
    # every drawn mouth brought to one consistent size, as a fraction of his lip width (the kit drew them at random sizes)
    RATIO = {'smile': 1.0, 'mbp': .9, 'a': 1.0, 'e': .95, 'o': .62, 'u': .5, 'fv': .9, 'l': .9, 'laugh': 1.08}
    for v, box in K['mouth'].items():
        if v == 'rest' or v in P.get('lips_skip', ()): continue      # closed lips: his own drawn mouth reads better
        p, m = cutm(box)
        if m is None: continue
        ys, xs = np.nonzero(m > .5); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sc = W4 * RATIO.get(v, 1) * 1.12 / (x1 - x0)
        # how far the upper lip sits below the mask top (anchor: the top lip always tucks under the moustache at the same line)
        pad = 10; y0, x0 = max(0, y0 - pad), max(0, x0 - pad); y1, x1 = y1 + pad, x1 + pad
        p, m = p[y0:y1, x0:x1], m[y0:y1, x0:x1]
        w, h = max(2, int(p.shape[1] * sc)), max(2, int(p.shape[0] * sc))
        p = np.asarray(Image.fromarray(p.clip(0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(np.float32)
        f = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(np.float32) / 255
        pg = np.abs(p - np.median(face[8:200, face.shape[1] // 3: face.shape[1] * 2 // 3].reshape(-1, 3), 0)).sum(-1, keepdims=True)
        reg = base[int(by - pad * sc - 3 * S):int(by - pad * sc - 3 * S) + h, int(bx - w / 2):int(bx - w / 2) + w]
        if reg.shape[:2] == p.shape[:2]: p = p + (reg - np.median(face[8:200, face.shape[1] // 3: face.shape[1] * 2 // 3].reshape(-1, 3), 0)) * np.clip(1 - pg / 70, 0, 1)   # kit skin → his skin
        X, Y = int(bx - w / 2), int(by - pad * sc - 3 * S)              # mask top on the lip line, same for every shape
        f = f * alpha[Y:Y + h, X:X + w]
        out = np.dstack([p, f * 255]).clip(0, 255).astype(np.uint8)
        fn = f'{name}_mouth_{v}.png'; Image.fromarray(out, 'RGBA').save(OUT + fn)
        meta[name]['parts'].setdefault('mouth', {})[v] = {'f': fn, 'x': X, 'y': Y}

def own_blink(P, REG, alpha, name, meta):
    """Blinks for a pose that keeps its own drawn eyes: a lid of his own skin (the eye filled in, REG) closes over each
    drawn eye, its edge a lash line in the drawing's own dark brown. Eyes: (a, top, b, bottom) in x4 base px."""
    from PIL import ImageDraw
    def q(p0, p1, p2, n=24): return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/n for i in range(n+1)]]
    for i, (a, top, b, bot) in enumerate(P['own_eyes']):
        for state, k in (('half', .5), ('closed', 1.0)):
            pad = 14; x0, y0 = int(min(a[0], b[0]) - pad), int(top[1] - pad - 6); x1, y1 = int(max(a[0], b[0]) + pad), int(bot[1] + pad)
            # control point that pulls the upper lid curve (2*top - mid of a,b) and its lowered version
            cu = (2 * top[0] - (a[0] + b[0]) / 2, 2 * top[1] - (a[1] + b[1]) / 2)
            cl = (cu[0], cu[1] + (2 * bot[1] - (a[1] + b[1]) / 2 + 6 - cu[1]) * k * .92)
            upper = q(a, (cu[0], cu[1] - 10), b); edge = q(b, cl, a)
            m = Image.new('L', (x1 - x0, y1 - y0), 0); d = ImageDraw.Draw(m)
            d.polygon([(x - x0, y - y0) for x, y in upper + edge], fill=255)
            from PIL import ImageFilter
            m = m.filter(ImageFilter.GaussianBlur(1.2))
            patch = Image.fromarray(REG[y0:y1, x0:x1].clip(0, 255).astype(np.uint8)).convert('RGBA'); patch.putalpha(m)
            d2 = ImageDraw.Draw(patch)
            d2.line([(x - x0, y - y0) for x, y in edge], fill=(40, 24, 18, 255), width=6, joint='curve')
            fn = f'{name}_eye{i}_{state}.png'; patch.save(OUT + fn)
            meta[name]['parts'].setdefault(f'eye{i}', {})[state] = {'f': fn, 'x': x0, 'y': y0}

def jaw_piece(P, base, alpha, name, meta):
    """His own lower lip + chin beard, cut along the drawn lip line under the moustache (hard top edge, feathered
    sides/bottom). In the film it drops a few px over a mouth interior drawn in the same flat style."""
    J = P['jaw']; L = J['line']; cx, cy, rx, ry, fe = J['region']
    xs = np.array([p[0] for p in L], float); ys = np.array([p[1] for p in L], float)
    H, W = base.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
    below = yy > np.interp(xx, xs, ys) + 2
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    f = np.clip((1 - d) / fe + 1, 0, 1) * below * (xx >= xs[0] - 40) * (xx <= xs[-1] + 40)
    f = ndimage.gaussian_filter(f.astype(np.float32), 2) * below * alpha
    y0, y1 = int(ys.min()), int(cy + ry); x0, x1 = int(cx - rx), int(cx + rx)
    out = np.dstack([base[y0:y1, x0:x1], f[y0:y1, x0:x1] * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(OUT + f'{name}_jaw.png')
    meta[name]['jaw'] = {'f': f'{name}_jaw.png', 'x': x0, 'y': y0, 'line': L, 'max': J['max'], 'mouth': J['mouth']}

meta = {}
for name, P in POSES.items():
    fig = load(X4 + P['src'] + '.png'); face = load(X4 + P['face'] + '.png')
    PAGE = np.median(face[8:200, face.shape[1] // 3: face.shape[1] * 2 // 3].reshape(-1, 3), 0)
    alpha = cutout(fig)
    if 'hair_pockets' in P:   # white paper trapped between hair strands (not the eyes, teeth or shoes): transparent
        x0, y0, x1, y1 = P['hair_pockets']   # x4 base px: rows y0..y1, except the column x0..x1
        wh = (fig.min(-1) > 212) & ((fig.max(-1) - fig.min(-1)) < 30)
        lab, n = ndimage.label(wh); keep = np.zeros_like(wh)
        for i, sl in enumerate(ndimage.find_objects(lab)):
            cy, cx = (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2
            if y0 <= cy <= y1 and (cx < x0 or cx > x1) and (sl[0].stop - sl[0].start) * (sl[1].stop - sl[1].start) < 40000: keep |= lab == i + 1
        alpha = alpha * ~ndimage.binary_dilation(keep, iterations=2)
    cx0, cy0 = P['crop0']; fx0, fy0 = P['face0']
    tb = lambda x, y: ((x - cx0) * S, (y - cy0) * S)            # kit coords → x4 base coords
    base = fig.copy()
    skin = (base.mean(-1) > 150) & (alpha > .5)
    # erase eyes/brows/mouth (girl) or the eyes inside each lens (dad)
    mask = np.zeros(base.shape[:2], bool)
    for (x, y, rx, ry) in P['erase']:
        bx, by = tb(x, y); mask |= ellmask(mask.shape, bx, by, rx * S, ry * S)
    lens_masks = []
    for (seed, box) in P.get('lens', []):
        x0, y0 = tb(box[0], box[1]); x1, y1 = tb(box[2], box[3])
        frame = base.mean(-1) < 70
        inbox = np.zeros_like(frame); inbox[int(y0):int(y1), int(x0):int(x1)] = True
        lab, n = ndimage.label((~frame) & inbox); sx, sy = tb(*seed)
        if lab[int(sy), int(sx)] == 0:                                   # seed landed on a line: nearest skin pixel
            yy, xx = np.nonzero((lab > 0) & (base.mean(-1) > 120)); i = np.argmin((yy - sy) ** 2 + (xx - sx) ** 2); sy, sx = yy[i], xx[i]
        lm = lab == lab[int(sy), int(sx)]
        print('  lens', name, int(lm.sum()), 'px')
        lm = ndimage.binary_erosion(lm, iterations=2); lens_masks.append(lm)
        if not P.get('own_face'): mask |= lm
    REG = None
    if P.get('own_face'):   # blinks are baked against a copy with the eyes filled in (so a lid never picks up the iris)
        from PIL import ImageDraw
        em = Image.new('L', (mask.shape[1], mask.shape[0]), 0); de = ImageDraw.Draw(em)
        for (a, top, b, bot) in P['own_eyes']:   # the drawn eye itself (lids, lashes, iris) → filled with skin
            de.ellipse(((a[0] - 8), top[1] - 14, b[0] + 8, bot[1] + 8), fill=255)
        lmask = np.asarray(em) > 0
        REG = laplace_fill(base.copy(), lmask, (base.mean(-1) > 150) & (alpha > .5) & ~lmask)
    base = laplace_fill(base, mask, skin & ~mask)
    if REG is None: REG = base
    rgba = np.dstack([base, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(OUT + f'{name}_base.png')
    meta[name] = {'w': base.shape[1], 'h': base.shape[0], 'parts': {}}

    def bake(kind, variant, box, at, sx, sy, feather, clip=None, pad=8):
        x0, y0, x1, y1 = box
        p = face[(y0 - fy0 - pad) * S:(y1 - fy0 + pad) * S, (x0 - fx0 - pad) * S:(x1 - fx0 + pad) * S]
        w, h = max(2, int(p.shape[1] * sx)), max(2, int(p.shape[0] * sy))
        p = np.asarray(Image.fromarray(p.clip(0, 255).astype(np.uint8)).resize((w, h), Image.LANCZOS)).astype(np.float32)
        bx, by = tb(*at); X, Y = int(bx - w / 2), int(by - h / 2)
        reg = REG[Y:Y + h, X:X + w]
        page = np.clip(1 - np.abs(p - PAGE).sum(-1, keepdims=True) / 70, 0, 1)
        p = p + (reg - PAGE) * page
        gy, gx = np.mgrid[0:h, 0:w]; d = ((gx - w / 2) / (w / 2)) ** 2 + ((gy - h / 2) / (h / 2)) ** 2
        f = np.clip((1 - d) / feather, 0, 1)
        if clip is not None: f = f * clip[Y:Y + h, X:X + w]
        f = f * alpha[Y:Y + h, X:X + w]                               # never past the silhouette
        out = np.dstack([p, f * 255]).clip(0, 255).astype(np.uint8)
        fn = f'{name}_{kind}_{variant}.png'; Image.fromarray(out, 'RGBA').save(OUT + fn)
        meta[name]['parts'].setdefault(kind, {})[variant] = {'f': fn, 'x': X, 'y': Y}

    K, fe = P['kit'], P['feather']
    for v, boxes in K['eye'].items():
        if P.get('own_face'): continue   # his own drawn eyes stay; blinks are drawn from his own lids (own_blink)
        for i, box in enumerate(boxes[:len(P['eye'])]):
            x, y, s, fsx = P['eye'][i]
            clip = ndimage.gaussian_filter(lens_masks[i].astype(np.float32), 2) if lens_masks else None
            bake(f'eye{i}', v, box, (x, y), s * fsx * S / S, s, fe['eye'], clip)
    for v, boxes in K.get('brow', {}).items():
        for i, box in enumerate(boxes):
            x, y, s, fsx = P['brow'][i]; bake(f'brow{i}', v, box, (x, y), s * fsx, s, fe['brow'])
    if P.get('own_face'): own_blink(P, REG, alpha, name, meta)
    if 'jaw' in P: jaw_piece(P, base, alpha, name, meta)
    elif 'lips' in P: mouth_only(P, K, face, fx0, fy0, tb, base, alpha, name, meta)
    else:
        mx, my, msx, msy = P['mouth']
        for v, box in K['mouth'].items(): bake('mouth', v, box, (mx, my), msx, msy, fe['mouth'])
    # pivots (x4 base coords) for the head warp: neck point and head top
    print(name, base.shape, len(meta[name]['parts']))
json.dump(meta, open(OUT + 'rig.json', 'w'), indent=1)
for r, n in (('room1', 'room_wide'), ('room2', 'room_left'), ('room3', 'room_right')):
    Image.open(X4 + r + '.png').convert('RGB').resize((2560, 1440), Image.LANCZOS).save(OUT + n + '.jpg', quality=93)
print('rig →', OUT)
