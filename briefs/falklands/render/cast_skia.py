"""The flat cut-out cast (v2) for the skia renderer: a port of genghis-khan-cooled-the-planet/cast.js.
Rig assets come from genghis-khan-cooled-the-planet/engine/prep_cast.py (build/cast/rig/): each pose is the seated
figure with its features erased plus baked face-kit pieces. Per frame: lip-sync from Rhubarb's cues onto the drawn
mouths (every shape held >= 3 frames), the father's front view opens his own lower lip/beard instead, blinks and
glances, eye-lines per shot, brows per expression, a head tilt/nod about the neck that fades out across the shoulders,
and breathing."""
import json, math, random
import numpy as np, skia
from PIL import Image

RIGDIR = '/home/user/Claude-editor/genghis-khan-cooled-the-planet/build/cast/rig/'
LIN = skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
FPS = 25
POSE = {
    'girl34':   dict(who='F', neck=(880, 900), band=(840, 1060), seat=(900, 2750)),
    'dad34':    dict(who='T', neck=(1040, 940), band=(860, 1080), seat=(1500, 2350)),
    'dadfront': dict(who='T', neck=(880, 960), band=(860, 1020), seat=(880, 2300)),
}
MAP = {'X': 'rest', 'A': 'mbp', 'B': 'e', 'C': 'a', 'D': 'a', 'E': 'o', 'F': 'u', 'G': 'fv', 'H': 'l'}
OPEN = {'rest': 0, 'mbp': 0, 'smile': .06, 'a': 1, 'e': .45, 'o': .75, 'u': .45, 'fv': .18, 'l': .55, 'laugh': .9}
_img, RIG, CUES, TRACK, JAWT = {}, {}, [], [], {}
SPK = []          # [(t0, t1, 'F'|'T')], set by the renderer
HEAD, MASK = {}, {}

def _sk(path):
    if path not in _img:
        a = np.ascontiguousarray(np.asarray(Image.open(path).convert('RGBA')))
        _img[path] = skia.Image.fromarray(a, colorType=skia.kRGBA_8888_ColorType).withDefaultMipmaps()
    return _img[path]
def img(name): return _sk(RIGDIR + name)

def load(lipsync_json, spk):
    global RIG, CUES, SPK
    RIG = json.load(open(RIGDIR + 'rig.json')); CUES = json.load(open(lipsync_json))['mouthCues']; SPK = spk
    for p, m in RIG.items():
        b = img(p + '_base.png'); bh = POSE[p]['band'][1]
        HEAD[p] = skia.Surface(b.width(), bh)
        # alpha ramp: 1 above band[0] → 0 at band[1]
        g = np.zeros((bh, 1, 4), np.uint8); y = np.arange(bh)
        g[:, 0, 3] = (np.clip(1 - (y - POSE[p]['band'][0]) / (POSE[p]['band'][1] - POSE[p]['band'][0]), 0, 1) * 255).astype(np.uint8)
        MASK[p] = skia.Image.fromarray(np.ascontiguousarray(np.repeat(g, 4, 1)), colorType=skia.kRGBA_8888_ColorType)
    _build_tracks()

def speaker(t):
    for a, b, s in SPK:
        if a <= t < b: return s
    return None

def _cue(t):
    lo, hi = 0, len(CUES) - 1
    while lo < hi:
        m = (lo + hi + 1) // 2
        if CUES[m]['start'] <= t: lo = m
        else: hi = m - 1
    return CUES[lo]

def _build_tracks():
    global TRACK
    n = int(math.ceil((CUES[-1]['end'] + 5) * FPS))
    raw = [MAP.get(_cue(f / FPS + .02)['value'], 'rest') for f in range(n)]
    runs = []
    for v in raw:
        if runs and runs[-1][0] == v: runs[-1][1] += 1
        else: runs.append([v, 1])
    for _ in range(3):
        i = 0
        while i < len(runs):
            if runs[i][1] < 3 and len(runs) > 1:
                j = 1 if i == 0 else (i - 1 if i == len(runs) - 1 or runs[i - 1][1] >= runs[i + 1][1] else i + 1)
                runs[j][1] += runs[i][1]; runs.pop(i); continue
            i += 1
    TRACK = [v for v, k in runs for _ in range(k)]
    for w in ('F', 'T'):
        a, v = [], 0.0
        for f in range(len(TRACK)):
            tgt = OPEN.get(TRACK[f], 0) if speaker(f / FPS) == w else 0
            v += (tgt - v) * (.6 if tgt > v else .45); a.append(v)
        JAWT[w] = a

def mouth(who, t):
    if speaker(t) != who: return None
    return TRACK[min(len(TRACK) - 1, max(0, int(round(t * FPS))))]
def jaw_open(who, t): a = JAWT[who]; return a[min(len(a) - 1, max(0, int(round(t * FPS))))]

# blinks (half → closed → half) and short glances, deterministic per character
BL, GL = {}, {}
for n, sd in (('T', 3), ('F', 8)):
    r = random.Random(sd); b, g = [], []; t = .8 + r.random() * 1.2
    while t < 200:
        b.append(t)
        if r.random() < .2: b.append(t + .38)
        t += 2.3 + r.random() * 3
    t = 2 + r.random() * 2
    while t < 200: g.append((t, t + .35 + r.random() * .4)); t += 4 + r.random() * 5
    BL[n], GL[n] = b, g
def lid(who, t):
    for b in BL[who]:
        d = t - b
        if d < 0: break
        if d < .05: return 'half'
        if d < .12: return 'closed'
        if d < .18: return 'half'
    return None
def glancing(who, t): return any(a <= t < b for a, b in GL[who])

def _jaw(c, J, open_, im):
    d = open_ * J['max']
    if d < 1: return
    L = J['line']; cx, hw = J['mouth']; xa, xb = cx - hw, cx + hw
    xs_ = [p[0] for p in L]; ys_ = [p[1] for p in L]
    ly = lambda x: float(np.interp(x, xs_, ys_))
    cl = lambda u: max(0.0, min(1.0, u))
    if J.get('profile'):   # side view: the opening is a wedge, deepest at the lips' front, closed at the corner
        prof = lambda x: cl((xb - x) / (xb - xa)) ** .8
        drop = lambda x: cl((xb + hw * .8 - x) / (xb + hw * .8 - xa)) ** .9
    else:
        prof = lambda x: math.sin(math.pi * cl((x - xa) / (xb - xa))) ** 1.1
        drop = lambda x: math.sin(math.pi * cl((x - (cx - hw * 1.6)) / (hw * 3.2))) ** 1.4
    N = 48; xs = [xa + (xb - xa) * i / N for i in range(N + 1)]
    path = skia.Path(); path.moveTo(xs[0], ly(xs[0]) - 2)
    for x in xs[1:]: path.lineTo(x, ly(x) - 2)
    for x in reversed(xs): path.lineTo(x, ly(x) + d * prof(x) + 4)
    path.close()
    c.save(); c.drawPath(path, skia.Paint(AntiAlias=True, Color=0xFF4A1A17)); c.clipPath(path, doAntiAlias=True)
    th = min(d * .26, 12); tp = skia.Path(); tp.moveTo(xs[0], ly(xs[0]) - 4)
    for x in xs[1:]: tp.lineTo(x, ly(x) - 4)
    for x in reversed(xs): tp.lineTo(x, ly(x) + th * math.sqrt(prof(x)))
    tp.close(); c.drawPath(tp, skia.Paint(AntiAlias=True, Color=0xFFECE4DA))
    if d > 16 and not J.get('profile'): c.drawOval(skia.Rect.MakeXYWH(cx - hw * .55, ly(cx) + d * .95 - d * .38, hw * 1.1, d * .76), skia.Paint(AntiAlias=True, Color=0xFFB5525A))
    c.restore()
    W = im.width(); M = int(math.ceil(W / 3)); cw = W / M
    for i in range(M):
        sx = i * cw; x = J['x'] + sx + cw / 2
        c.drawImageRect(im, skia.Rect.MakeXYWH(sx, 0, cw + .8, im.height()), skia.Rect.MakeXYWH(J['x'] + sx, J['y'] + d * max(drop(x), prof(x)), cw + .8, im.height()), LIN)

def draw(c, pose, x, y, k, t, gaze='c', tilt=0.0, mouth_=None, brow=None, listen=False, energy=0.0, hold=False):
    """(x, y): where the seat point lands on screen; k: screen px per x4 px."""
    P, R = POSE[pose], RIG[pose]; who = P['who']; base = img(pose + '_base.png')
    surf = HEAD[pose]
    sp = speaker(t) == who and not hold
    with surf as hc:
        hc.clear(0x00000000); hc.drawImage(base, 0, 0)
        def part(kind, v):
            ks = R['parts'].get(kind)
            if not ks: return
            p = ks.get(v) or ks.get('rest') or ks.get('c') or ks.get('n')
            if p: hc.drawImage(img(p['f']), p['x'], p['y'])
        b = brow or 'n'
        part('brow0', b); part('brow1', b)
        e = lid(who, t) or ('c' if glancing(who, t) and not sp else gaze)
        if 'eye0' in R['parts'] and e not in R['parts']['eye0']: e = 'half' if e == 'half' else 'c'
        part('eye0', e); part('eye1', e)
        if 'jaw' in R:
            o = .8 if mouth_ == 'laugh' else .1 if mouth_ == 'smile' else (jaw_open(who, t) if not hold else 0)
            _jaw(hc, R['jaw'], o, img(R['jaw']['f']))
        else:
            m = mouth_ or (mouth(who, t) if sp else None) or ('smile' if listen else 'rest')
            part('mouth', m)
        hc.drawImage(MASK[pose], 0, 0, skia.SamplingOptions(), skia.Paint(BlendMode=skia.BlendMode.kDstIn))
    head = surf.makeImageSnapshot().withDefaultMipmaps()
    ph = 1.3 if who == 'T' else 0.0
    c.save(); c.translate(x, y); c.rotate(math.degrees(.003 * math.sin(t * .6 + ph)))
    c.scale(k, k * (1 + .004 * math.sin(t * 1.6 + ph))); c.translate(-P['seat'][0], -P['seat'][1])
    y0 = P['band'][0]
    c.drawImageRect(base, skia.Rect.MakeXYWH(0, y0, base.width(), base.height() - y0), skia.Rect.MakeXYWH(0, y0, base.width(), base.height() - y0), LIN)
    nod = tilt + .022 * energy * math.sin(t * 2.3 + ph) + .008 * math.sin(t * .9 + ph * 2) + (.01 * math.sin(t * 4.1) * energy if sp else 0)
    c.translate(P['neck'][0], P['neck'][1]); c.rotate(math.degrees(nod)); c.translate(-P['neck'][0], -P['neck'][1])
    c.drawImage(head, 0, 0, LIN)
    c.restore()

# ── the room (2560x1440 plates drawn to 1920x1080) and the coffee table foreground ──
_TABLE = [None]
def room(c, key, z=1.0, fx=960, fy=540, W=1920, H=1080):
    c.save(); c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy)
    c.drawImageRect(img(key + '.jpg'), skia.Rect.MakeWH(W, H), LIN); c.restore()
def table(c, W=1920, H=1080):
    if _TABLE[0] is None:
        s = skia.Surface(W, H)
        with s as g:
            p = skia.Path()
            for (cx, cy, rx, ry) in ((948, 826, 360, 60), (948, 856, 360, 46), (943, 986, 259, 31), (840, 806, 52, 36), (987, 772, 47, 50)):
                p.addOval(skia.Rect.MakeLTRB(cx - rx, cy - ry, cx + rx, cy + ry))
            for (x, y, w, h) in ((588, 826, 720, 30), (684, 856, 518, 132), (893, 788, 190, 78)): p.addRect(skia.Rect.MakeXYWH(x, y, w, h))
            p.setFillType(skia.PathFillType.kWinding)
            g.clipPath(p, doAntiAlias=True); g.drawImageRect(img('room_wide.jpg'), skia.Rect.MakeWH(W, H), LIN)
        _TABLE[0] = s.makeImageSnapshot()
    c.drawImage(_TABLE[0], 0, 0)
