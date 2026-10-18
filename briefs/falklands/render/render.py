import sys, os, json, math, random, subprocess
import numpy as np, skia
sys.path.insert(0, os.path.dirname(__file__))
from core import *
import core
import mapr
from PIL import Image, ImageFilter

SCR = '/tmp/claude-0/-home-user-Claude-editor/0b46db67-d175-5643-88ce-cb41a2820dbf/scratchpad/'
P = SCR + 'prep/'
A = '/home/user/Claude-editor/briefs/falklands/assets/'
B = '/home/user/Claude-editor/briefs/brand/'
T_END = 161.0
# breathing holds (VO time, seconds): the picture rests on the reveal while the voice pauses
HOLDS = [(15.8, 0.6), (17.7, 0.8), (18.4, 0.8), (19.4, 0.6)]   # opening only: map, penguins, moorland get room to breathe
T_NEW = T_END + sum(d for _, d in HOLDS)
NF = int(round(T_NEW * FPS))
def new2vo(tn):
    off = 0.0
    for T, d in HOLDS:
        if tn < T + off: return tn - off, None
        if tn < T + off + d: return T - 0.001, (tn - T - off) / d
        off += d
    return tn - off, None
def vo2new(tv):
    return tv + sum(d for T, d in HOLDS if T <= tv)
def hold_start(T):
    return T + sum(d for T2, d in HOLDS if T2 < T)
HOLD = [False]

# ---------------------------------------------------------------- assets
def I(path, key=None): return img(path, key)
def pil_crop(path, box, key):
    if key not in core._imgcache: core._imgcache[key] = to_skia(Image.open(path).convert('RGBA').crop(box))
    return core._imgcache[key]
def blurred(path, key, r=18, dark=0.35):
    if key not in core._imgcache:
        im = Image.open(path).convert('RGB'); im.thumbnail((960, 960))
        im = im.filter(ImageFilter.GaussianBlur(r))
        im = Image.blend(im, Image.new('RGB', im.size, (0, 0, 0)), dark)
        core._imgcache[key] = to_skia(im)
    return core._imgcache[key]

RMS = json.load(open(SCR + 'rms25.json'))
# speaker intervals (from the VO transcript; F = daughter, T = father)
SPK = [(0.0, 7.6, 'F'), (7.6, 26.5, 'T'), (26.5, 29.4, 'F'), (29.4, 44.4, 'T'), (44.4, 46.0, 'F'), (46.0, 68.8, 'T'),
       (68.8, 70.4, 'F'), (70.4, 102.7, 'T'), (102.7, 103.8, 'F'), (103.8, 126.1, 'T'), (126.1, 129.4, 'F'),
       (129.4, 149.1, 'T'), (149.1, 151.3, 'F'), (151.3, 159.0, 'T')]
def speaker(t):
    for a, b, s in SPK:
        if a <= t < b: return s
    return None
def mouth(t, who):
    if HOLD[0] or speaker(t) != who: return 'neutral'
    i = int(t * FPS)
    if i >= len(RMS): return 'neutral'
    r = (RMS[i] + RMS[max(i - 1, 0)]) / 2
    if r < 0.025: return 'neutral'
    if r < 0.06: return 'ee'
    if r < 0.11: return 'oh' if (i // 3) % 2 else 'ee'
    return 'ah'
def char_img(who, state):
    pre = 'F' if who == 'T' else 'D'
    return I(P + f'{pre}_{state}_rgba.png', f'{pre}{state}')
def daughter_state(t):
    s = mouth(t, 'F')
    if s == 'neutral':
        ph = (t + 1.3) % 3.7
        if ph < 0.13: return 'closed'
    return s

# ---------------------------------------------------------------- shared drawing
VIG = None
def vignette(c):
    global VIG
    if VIG is None:
        yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
        a = np.clip((d - 0.55) / 0.6, 0, 1) ** 1.6 * 150
        arr = np.zeros((H, W, 4), np.uint8); arr[..., 3] = a.astype(np.uint8)
        VIG = skia.Image.fromarray(arr, colorType=skia.kRGBA_8888_ColorType)
    c.drawImage(VIG, 0, 0)
GRAIN = []
def grain(c, f):
    if not GRAIN:
        rng = np.random.default_rng(3)
        for _ in range(6):
            n = rng.normal(128, 40, (H // 2, W // 2)).clip(0, 255).astype(np.uint8)
            arr = np.dstack([n, n, n, np.full_like(n, 12)])
            GRAIN.append(skia.Image.fromarray(np.ascontiguousarray(arr), colorType=skia.kRGBA_8888_ColorType))
    p = skia.Paint(BlendMode=skia.BlendMode.kOverlay)
    c.drawImageRect(GRAIN[f % 6], skia.Rect.MakeWH(W, H), LIN, p)

def set_bg(c, key, t, z0=1.0, z1=1.04, blur=0.0, fy=0.5, fx=0.5):
    im = I(P + key + '.png', key)
    p_filter = None
    if blur > 0:
        c.save()
        p = skia.Paint(ImageFilter=skia.ImageFilters.Blur(blur, blur))
        c.saveLayer(None, p); cover(c, im, t, z0, z1, fx, fy, fx, fy); c.restore(); c.restore()
    else:
        cover(c, im, t, z0, z1, fx, fy, fx, fy)

def two_shot(c, t, t0, t1):
    u = (t - t0) / max(t1 - t0, 0.1)
    set_bg(c, 'S2H', u, 1.0, 1.035, blur=2.5, fy=0.55)
    # soft floor shadow
    for who, x, flip in (('F', 640, False), ('T', 1290, False)):
        st = daughter_state(t) if who == 'F' else mouth(t, 'T')
        im = char_img(who, st)
        s = 0.285 if who == 'T' else 0.30
        breathe = 1 + 0.004 * math.sin(t * 2.1 + (0 if who == 'F' else 1.4))
        h = im.height() * s
        sh = skia.Paint(AntiAlias=True, Color=0x55000000, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18))
        c.drawOval(skia.Rect.MakeXYWH(x - 210, 1010, 420, 50), sh)
        draw_image(c, im, x, 1040 - h / 2 * breathe, s * breathe)

def two_shot_cta(c, t, t0, t1):
    u = (t - t0) / max(t1 - t0, 0.1)
    set_bg(c, 'S2H', u, 1.03, 1.08, blur=3.0, fy=0.55)
    sh = skia.Paint(AntiAlias=True, Color=0x55000000, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 18))
    im = char_img('F', daughter_state(t)); s = 0.30; h = im.height() * s
    c.drawOval(skia.Rect.MakeXYWH(430, 1010, 420, 50), sh); draw_image(c, im, 640, 1040 - h / 2, s)
    fr = I(P + 'F_front_rgba.png', 'Ffront'); s2 = 0.42; h2 = fr.height() * s2
    breathe = 1 + 0.004 * math.sin(t * 2.1)
    cx, cy = 1300, 1040 - h2 / 2 * breathe
    c.drawOval(skia.Rect.MakeXYWH(cx - 200, 1010, 400, 50), sh)
    draw_image(c, fr, cx, cy, s2 * breathe)
    # procedural mouth (front view): mouth at (390,318) in the 888x1920 cut-out
    st = mouth(t, 'T'); op = {'neutral': 0, 'ee': 0.35, 'oh': 0.7, 'ah': 1.0}[st]
    if op > 0:
        mx = cx + (390 - fr.width() / 2) * s2 * breathe; my = cy + (318 - fr.height() / 2) * s2 * breathe
        w = 15 * (1.0 if st != 'oh' else 0.7); hh = 2 + 9 * op
        c.drawOval(skia.Rect.MakeXYWH(mx - w, my - hh / 2, 2 * w, hh), skia.Paint(AntiAlias=True, Color=0xFF4A1C1C))
        if st in ('ee', 'ah'): c.drawRect(skia.Rect.MakeXYWH(mx - w * 0.7, my - hh / 2, w * 1.4, min(3, hh / 2)), skia.Paint(AntiAlias=True, Color=0xFFF3EEE6))

def close_up(c, t, t0, t1, who, bg):
    u = (t - t0) / max(t1 - t0, 0.1)
    set_bg(c, bg, u, 1.05, 1.10, blur=6)
    st = daughter_state(t) if who == 'F' else mouth(t, 'T')
    im = char_img(who, st)
    s = 0.62 + 0.03 * ease(u)
    x = 760 if who == 'F' else 1160
    draw_image(c, im, x, 1240 + 0 * s, s)

def framed_photo(c, im, cx, cy, h, t, t0, rot=0.0, alpha=1.0, filt=None, slide=None):
    if t < t0: return
    k = eout(prog(t, t0, 0.45))
    s = h / im.height(); w = im.width() * s
    dx = 0; dy = 0
    if slide == 'left': dx = -(1 - k) * (cx + w)
    elif slide == 'right': dx = (1 - k) * (W - cx + w)
    else: s *= 0.9 + 0.1 * k
    a = alpha * (k if slide is None else 1)
    c.save(); c.translate(cx + dx, cy + dy); c.rotate(rot)
    bw = 14
    sp = skia.Paint(AntiAlias=True, Color=0x88000000, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 22)); sp.setAlphaf(0.55 * a)
    W2, H2 = im.width() * s, im.height() * s
    c.drawRect(skia.Rect.MakeXYWH(-W2 / 2 - bw + 10, -H2 / 2 - bw + 16, W2 + 2 * bw, H2 + 2 * bw), sp)
    fp = skia.Paint(AntiAlias=True, Color=0xFFF4EFE6); fp.setAlphaf(a)
    c.drawRect(skia.Rect.MakeXYWH(-W2 / 2 - bw, -H2 / 2 - bw, W2 + 2 * bw, H2 + 2 * bw), fp)
    p = skia.Paint(); p.setAlphaf(a)
    if filt is not None: p.setColorFilter(filt)
    c.drawImageRect(im, skia.Rect.MakeXYWH(-W2 / 2, -H2 / 2, W2, H2), SAMP, p)
    c.restore()

def bust(c, im, cx, cy, h, t, t0, side='left', alpha=1.0, filt=None, t_out=None):
    """photo cut into a soft-edged rounded card (used for real people)"""
    if t < t0: return
    k = eout(prog(t, t0, 0.5)); a = alpha
    if t_out is not None and t > t_out: a *= 1 - prog(t, t_out, 0.6)
    if a <= 0: return
    s = h / im.height(); w = im.width() * s
    dx = -(1 - k) * (cx + w) if side == 'left' else (1 - k) * (W - cx + w)
    framed_photo(c, im, cx + dx, cy, h, t, -1, rot=-2 if side == 'left' else 2, alpha=a, filt=filt)

# ---------------------------------------------------------------- flags
def flag(c, nat, x, y, w=72, h=48):
    """draw a small national flag with top-left at (x, y)"""
    c.save(); c.clipRect(skia.Rect.MakeXYWH(x, y, w, h), doAntiAlias=True)
    P_ = lambda col: skia.Paint(AntiAlias=True, Color=col)
    if nat == 'UK':
        c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), P_(0xFF012169))
        for wd, col in ((h * 0.22, 0xFFFFFFFF), (h * 0.08, 0xFFC8102E)):
            q = P_(col); q.setStrokeWidth(wd)
            c.drawLine(x, y, x + w, y + h, q); c.drawLine(x + w, y, x, y + h, q)
        c.drawRect(skia.Rect.MakeXYWH(x + w / 2 - h * 0.17, y, h * 0.34, h), P_(0xFFFFFFFF))
        c.drawRect(skia.Rect.MakeXYWH(x, y + h / 2 - h * 0.17, w, h * 0.34), P_(0xFFFFFFFF))
        c.drawRect(skia.Rect.MakeXYWH(x + w / 2 - h * 0.1, y, h * 0.2, h), P_(0xFFC8102E))
        c.drawRect(skia.Rect.MakeXYWH(x, y + h / 2 - h * 0.1, w, h * 0.2), P_(0xFFC8102E))
    elif nat == 'EN':
        c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), P_(0xFFFFFFFF))
        c.drawRect(skia.Rect.MakeXYWH(x + w / 2 - h * 0.1, y, h * 0.2, h), P_(0xFFC8102E))
        c.drawRect(skia.Rect.MakeXYWH(x, y + h / 2 - h * 0.1, w, h * 0.2), P_(0xFFC8102E))
    elif nat == 'FR':
        for i, col in enumerate((0xFF0055A4, 0xFFFFFFFF, 0xFFEF4135)): c.drawRect(skia.Rect.MakeXYWH(x + i * w / 3, y, w / 3 + 1, h), P_(col))
    elif nat == 'ES':
        c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), P_(0xFFAA151B)); c.drawRect(skia.Rect.MakeXYWH(x, y + h / 4, w, h / 2), P_(0xFFF1BF00))
    elif nat == 'AR':
        for i, col in enumerate((0xFF74ACDF, 0xFFFFFFFF, 0xFF74ACDF)): c.drawRect(skia.Rect.MakeXYWH(x, y + i * h / 3, w, h / 3 + 1), P_(col))
        c.drawCircle(x + w / 2, y + h / 2, h * 0.11, P_(0xFFF6B40E))
    c.restore()
    c.drawRect(skia.Rect.MakeXYWH(x, y, w, h), WPEN(2, 0x55000000))
NAT_AR = {'UK': 'بريطانيا', 'FR': 'فرنسا', 'ES': 'إسبانيا', 'AR': 'الأرجنتين'}
def control_badge(c, t, nats, name):
    """top-right badge: who controls the islands right now in the story"""
    title = text_img('مين ماسك الجزر؟', 'cap', 30, (255, 255, 255, 220), 0, (0, 0, 0, 255), False, False)
    nm = text_img(name, 'brand', 46, (255, 196, 20, 255), 0, (0, 0, 0, 255), False, False)
    fw = 64 * len(nats) + 10 * (len(nats) - 1) if nats else 0
    w = max(title.width(), nm.width() + fw + 20) + 20; x = W - 40 - w; y = 36
    rrect(c, x, y, w, 128, 18, 0xE60B1B2B, 1, 0xFFFFC414, 3)
    draw_image(c, title, x + w / 2, y + 30)
    if nats:
        fx = x + 22
        for n in nats: flag(c, n, fx, y + 62, 64, 42); fx += 74
        draw_image(c, nm, fx + (x + w - 12 - fx) / 2, y + 84)
    else:
        draw_image(c, nm, x + w / 2, y + 84)

# ---------------------------------------------------------------- placards
STRIPE = {'UK': [0xFF012169, 0xFFFFFFFF, 0xFFC8102E], 'FR': [0xFF0055A4, 0xFFFFFFFF, 0xFFEF4135], 'ES': [0xFFAA151B, 0xFFF1BF00, 0xFFAA151B],
          'AR': [0xFF74ACDF, 0xFFFFFFFF, 0xFF74ACDF]}
def placard(c, x, y, text, nat, t, t0, rot=0.0, latin=False, size=40, morph=None):
    if t < t0: return
    k = eback(prog(t, t0, 0.4), 1.3)
    yy = y - (1 - k) * 260
    a = clamp(prog(t, t0, 0.12))
    txt = text; xf = None
    if morph and t >= morph[0]:
        u = clamp((t - morph[0]) / morph[2])
        if u >= 1: txt = morph[1]; nat = morph[3]
        else: xf = u
    tim = text_img(txt, 'hand' if not latin else 'latb', size, (25, 25, 25, 255), 0, (0, 0, 0, 255), latin, False)
    w = tim.width() * 0.9 + 100; h = size * 1.6
    c.save(); c.translate(x, yy); c.rotate(rot)
    sp = skia.Paint(AntiAlias=True, Color=0xFF5B3A1E, StrokeWidth=10, StrokeCap=skia.Paint.kRound_Cap); sp.setAlphaf(a)
    c.drawLine(0, 0, 0, 120, sp)
    sh = skia.Paint(AntiAlias=True, Color=0x77000000, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 10)); sh.setAlphaf(a * 0.7)
    c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(-w / 2 + 6, -h + 10, w, h), 10, 10), sh)
    rrect(c, -w / 2, -h, w, h, 10, 0xFFFFFBF2, a)
    if a > 0.5: flag(c, nat, -w / 2 + 12, -h + (h - 40) / 2, 60, 40)
    if xf is None:
        draw_image(c, tim, 40, -h / 2 + 4, 0.9, a)
    else:
        nim = text_img(morph[1], 'latb', size, (25, 25, 25, 255), 0, (0, 0, 0, 255), True, False)
        draw_image(c, tim, 40, -h / 2 + 4, 0.9 * (1 - 0.3 * xf), a * (1 - xf))
        draw_image(c, nim, 40, -h / 2 + 4, 0.9 * (0.7 + 0.3 * eback(xf)), a * xf)
    c.restore()
    if prog(t, t0 + 0.28, 0.25) > 0 and prog(t, t0 + 0.28, 0.25) < 1:  # dust puff
        pr = prog(t, t0 + 0.28, 0.25)
        q = skia.Paint(AntiAlias=True, Color=0xFFE8DCC0); q.setAlphaf(0.5 * (1 - pr))
        for i in range(6):
            ang = math.pi * (0.1 + 0.16 * i); r = 30 + 60 * pr
            c.drawCircle(x + r * math.cos(ang) * (1 if i % 2 else -1), y + 120 - 10 * pr, 8 + 10 * pr, q)

# island-map placard positions (screen coords on VIEWS['isl'])
PILE = [(1200, 300, -3), (1650, 300, 3), (1200, 520, 2), (1650, 520, -2), (1200, 740, -3), (1650, 740, 3), (1430, 160, 0)]
def pile(c, t, upto=None, glow=0.0, extra=None):
    items = [
        ('FALKLAND', 'UK', 21.2, True, None),
        ('LES MALOUINES', 'FR', 23.6, True, (25.8, 'MALVINAS', 0.9, 'ES')),
        ('دي أرضنا ١٧٧٤', 'UK', 32.6, False, None),
        ('دي أرضنا ١٨١١', 'ES', 33.5, False, None),
        ('الأرجنتين ١٨١٦', 'AR', 39.1, False, None),
        ('بريطانيا ١٨٣٣', 'UK', 42.9, False, None),
    ]
    if extra: items += extra
    for i, (txt, nat, t0, lat, morph) in enumerate(items):
        if upto is not None and i >= upto: break
        x, y, r = PILE[i % len(PILE)]
        placard(c, x, y, txt, nat, t, t0, r, lat, 50 if not lat else 46, morph)
    if glow > 0:
        q = skia.Paint(AntiAlias=True, Color=0xFFFFE9A8, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 60)); q.setAlphaf(0.35 * glow)
        c.drawCircle(1420, 500, 260, q)

# ---------------------------------------------------------------- doodles
WPEN = lambda w=5, col=0xFFFFFFFF: skia.Paint(AntiAlias=True, Color=col, StrokeWidth=w, Style=skia.Paint.kStroke_Style, StrokeCap=skia.Paint.kRound_Cap, StrokeJoin=skia.Paint.kRound_Join)
def plane_icon(c, x, y, s, ang=0, col=0xFFFFFFFF, big=False):
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s)
    p = skia.Path()
    p.moveTo(-60, 0); p.lineTo(50, -6); p.quadTo(70, 0, 50, 6); p.close()
    p.moveTo(-5, -4); p.lineTo(-25, -45 if big else -38); p.lineTo(-10, -45 if big else -38); p.lineTo(18, -4); p.close()
    p.moveTo(-5, 4); p.lineTo(-25, 45 if big else 38); p.lineTo(-10, 45 if big else 38); p.lineTo(18, 4); p.close()
    p.moveTo(-58, -2); p.lineTo(-68, -20); p.lineTo(-60, -20); p.lineTo(-48, -2); p.close()
    p.moveTo(-58, 2); p.lineTo(-68, 20); p.lineTo(-60, 20); p.lineTo(-48, 2); p.close()
    sh = skia.Paint(AntiAlias=True, Color=0x66000000, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 6))
    c.save(); c.translate(6, 10); c.drawPath(p, sh); c.restore()
    c.drawPath(p, skia.Paint(AntiAlias=True, Color=col)); c.drawPath(p, WPEN(2.5, 0xFF222222))
    c.restore()
def envelope(c, x, y, s, t, t0, text=None):
    if t < t0: return
    k = eback(prog(t, t0, 0.4)); c.save(); c.translate(x, y); c.scale(s * k, s * k); c.rotate(-6)
    rrect(c, -90, -60, 180, 120, 8, 0xFFFFFBF2); c.drawRect(skia.Rect.MakeXYWH(-90, -60, 180, 120), WPEN(4, 0xFF333333))
    pth = skia.Path(); pth.moveTo(-90, -60); pth.lineTo(0, 10); pth.lineTo(90, -60); c.drawPath(pth, WPEN(4, 0xFF333333))
    c.restore()
    if text: label(c, text, x, y + 110 * s, t, t0 + 0.3, 70)
def flag_ar(c, x, y, s, t, t0):
    if t < t0: return
    k = eback(prog(t, t0, 0.4)); c.save(); c.translate(x, y); c.scale(s, s * k)
    c.drawLine(0, 0, 0, -160, WPEN(6, 0xFFDDDDDD))
    wave = math.sin(t * 6) * 4
    for i, col in enumerate((0xFF74ACDF, 0xFFFFFFFF, 0xFF74ACDF)):
        r = skia.Path(); r.moveTo(0, -160 + i * 25); r.quadTo(50, -165 + i * 25 + wave, 100, -160 + i * 25); r.lineTo(100, -135 + i * 25); r.quadTo(50, -140 + i * 25 + wave, 0, -135 + i * 25); r.close()
        c.drawPath(r, skia.Paint(AntiAlias=True, Color=col))
    c.drawCircle(50, -122 + wave * 0.5, 7, skia.Paint(AntiAlias=True, Color=0xFFF6B40E))
    c.restore()
def ship_icon(c, x, y, s, col=0xFFFFFFFF):
    c.save(); c.translate(x, y); c.scale(s, s)
    h = skia.Path(); h.moveTo(-90, 0); h.lineTo(90, 0); h.lineTo(70, 30); h.lineTo(-75, 30); h.close()
    c.drawPath(h, skia.Paint(AntiAlias=True, Color=0xFFD9443A)); c.drawPath(h, WPEN(3, 0xFF222222))
    rrect(c, -40, -35, 70, 35, 4, col); c.drawRect(skia.Rect.MakeXYWH(-40, -35, 70, 35), WPEN(3, 0xFF222222))
    c.drawLine(0, -35, 0, -70, WPEN(3, 0xFF222222))
    c.restore()
def icon_row(c, t, items, y=880):
    # items: (t0, kind, label)
    n = len(items); x0 = W / 2 - (n - 1) * 150
    for i, (t0, kind, lab) in enumerate(items):
        if t < t0: continue
        k = eback(prog(t, t0, 0.35)); x = x0 + i * 300
        c.save(); c.translate(x, y); c.scale(k, k)
        c.drawCircle(0, 0, 70, skia.Paint(AntiAlias=True, Color=0xEE10263A)); c.drawCircle(0, 0, 70, WPEN(4))
        if kind == 'plane': plane_icon(c, 0, 0, 0.75, -15)
        elif kind == 'food':
            rrect(c, -38, -20, 76, 50, 6, 0xFFE0B26A); c.drawLine(-38, 0, 38, 0, WPEN(3, 0xFF6B4A1E)); c.drawCircle(-15, -28, 12, skia.Paint(AntiAlias=True, Color=0xFFE53935)); c.drawCircle(12, -30, 12, skia.Paint(AntiAlias=True, Color=0xFF7CB342))
        elif kind == 'cross':
            p = skia.Paint(AntiAlias=True, Color=0xFFE53935); c.drawRect(skia.Rect.MakeXYWH(-14, -42, 28, 84), p); c.drawRect(skia.Rect.MakeXYWH(-42, -14, 84, 28), p)
        elif kind == 'book':
            rrect(c, -42, -30, 40, 60, 4, 0xFFFFFBF2); rrect(c, 2, -30, 40, 60, 4, 0xFFFFFBF2); c.drawLine(0, -30, 0, 30, WPEN(3, 0xFF333333))
            for yy in (-15, 0, 15): c.drawLine(-34, yy, -10, yy, WPEN(2, 0xFF777777)); c.drawLine(10, yy, 34, yy, WPEN(2, 0xFF777777))
        c.restore()
        label(c, lab, x, y + 115, t, t0 + 0.1, 46)
def heart(c, x, y, s, t, t0, crack_t=None):
    if t < t0: return
    k = eback(prog(t, t0, 0.4)); c.save(); c.translate(x, y); c.scale(s * k, s * k)
    p = skia.Path(); p.moveTo(0, 30); p.cubicTo(-70, -20, -40, -75, 0, -40); p.cubicTo(40, -75, 70, -20, 0, 30); p.close()
    if crack_t and t >= crack_t:
        pr = eout(prog(t, crack_t, 0.4))
        for side in (-1, 1):
            c.save(); c.translate(side * 14 * pr, 6 * pr); c.rotate(side * 10 * pr)
            c.clipRect(skia.Rect.MakeXYWH(-80 if side < 0 else 0, -80, 80, 160))
            c.drawPath(p, skia.Paint(AntiAlias=True, Color=0xFFE53950)); c.restore()
        z = skia.Path(); z.moveTo(0, -40); z.lineTo(-8, -20); z.lineTo(6, -5); z.lineTo(-6, 12); z.lineTo(0, 30)
        c.drawPath(z, WPEN(4, 0xFF10263A))
    else:
        c.drawPath(p, skia.Paint(AntiAlias=True, Color=0xFFE53950))
    c.restore()
def scoreboard(c, x, y, sub, t, t0, glow_t=None, s=1.0):
    if t < t0: return
    k = eback(prog(t, t0, 0.35)); c.save(); c.translate(x, y); c.scale(s * k, s * k)
    rrect(c, -420, -130, 840, 260, 26, 0xF0101010, 1.0, 0xFFFFC414, 6)
    g = 0
    if glow_t and t >= glow_t: g = 1 - prog(t, glow_t + 0.4, 1.2)
    if g > 0:
        q = skia.Paint(AntiAlias=True, Color=0xFFFFC414, MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, 40)); q.setAlphaf(0.6 * g)
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(-130, -110, 260, 130), 30, 30), q)
    sc = text_img('٢ – ١', 'brand', 120, (255, 196, 20, 255), 0, (0, 0, 0, 255), False, False)
    draw_image(c, sc, 0, -40, 1.0 + 0.08 * g)
    # Argentina on the right (Arabic reads right-to-left), England on the left
    flag(c, 'AR', 250, -95, 84, 56); draw_image(c, text_img('الأرجنتين', 'brand', 50, (246, 238, 220, 255), 0, (0, 0, 0, 255), False, False), 292, 0)
    flag(c, 'EN', -334, -95, 84, 56); draw_image(c, text_img('إنجلترا', 'brand', 50, (246, 238, 220, 255), 0, (0, 0, 0, 255), False, False), -292, 0)
    c.drawLine(-380, 40, 380, 40, WPEN(2, 0x55FFFFFF))
    draw_image(c, text_img(sub, 'cap', 44, (246, 238, 220, 255), 0, (0, 0, 0, 255), False, False), 0, 82)
    c.restore()
def plain_num(c, text, x, y, t, t0, size=88):
    if t < t0: return
    a = ease(prog(t, t0, 0.8))
    draw_image(c, text_img(text, 'cap', size, (255, 255, 255, 255), 0, (0, 0, 0, 255), False, True), x, y, 1.0, a)

# ---------------------------------------------------------------- brand
def end_btn(key):
    box = {'sub': (1300, 505, 1618, 605), 'like': (1024, 505, 1280, 605)}[key]
    return pil_crop(B + 'G08_channel_endcard.jpg', box, 'btn_' + key)
def streaks(c, pr, color=YEL, n=7):
    for i in range(n):
        y = 120 + i * (H - 240) / (n - 1)
        L = W * (0.5 + 0.4 * ((i * 37) % 7) / 7)
        x1 = W + 200 - (W + L + 400) * pr + ((i * 53) % 5) * 60
        p = skia.Paint(AntiAlias=True, Color=color, StrokeWidth=26 if i % 2 else 14, StrokeCap=skia.Paint.kRound_Cap)
        c.drawLine(x1, y, x1 + L, y, p)
def chapter_card(c, t, t0, num, title):
    d = 0.9
    if not (t0 - 0.05 <= t <= t0 + d + 2.2): return
    pr = prog(t, t0, d)
    if pr < 1:
        streaks(c, pr)
        a = clamp(1 - abs(pr - 0.5) * 3.2)
        if a > 0:
            fill(c, 0xFF111111, a * 0.55)
            k = eback(prog(t, t0 + 0.15, 0.35))
            pill = text_img(f'{num} – {title}', 'brand', 120, (17, 17, 17, 255), 0, (0, 0, 0, 255), False, False)
            c.save(); c.translate(W / 2, H / 2); c.scale(k, k)
            rrect(c, -pill.width() / 2 + 30, -95, pill.width() - 60, 190, 95, CREAM, a, BLK, 8)
            draw_image(c, pill, 0, 6, 1.0, a); c.restore()
    # small tag top-left for 2s
    ta = clamp(prog(t, t0 + d * 0.6, 0.3)) * (1 - prog(t, t0 + d + 1.6, 0.5))
    if ta > 0:
        tag = text_img(f'{num} – {title}', 'brand', 46, (17, 17, 17, 255), 0, (0, 0, 0, 255), False, False)
        rrect(c, 60, 50, tag.width() - 10, 76, 38, YEL, ta, BLK, 4)
        draw_image(c, tag, 60 + (tag.width() - 10) / 2, 92, 1.0, ta)
def logo_sting(c, t, t0):
    if not (t0 <= t <= t0 + 0.85): return
    pr = prog(t, t0, 0.85)
    streaks(c, pr)
    a = clamp(1 - abs(pr - 0.45) * 2.4)
    if a > 0:
        fill(c, 0xFF111111, a * 0.7)
        lg = I(B + 'channel_logo.webp', 'logo')
        draw_image(c, lg, W / 2, H / 2, 0.55 * eback(prog(t, t0, 0.3)), a)

# ---------------------------------------------------------------- captions
CAPS = [
 (0.0, 'بابا… ليه لاعيبة الأرجنتين'), (2.5, 'رفعوا يافطة «المالفيناس أرجنتينية»…'), (5.0, 'بعد ما كسبوا إنجلترا في كاس العالم؟'),
 (7.6, 'عشان تفهمي اليافطة دي…'), (9.4, 'لازم نرجع تلتمية سنة لورا.'), (12.3, 'البداية… والحرب… واللي حصل بعدها.'),
 (15.8, 'جزر صغيرة في آخر الدنيا…'), (18.4, 'ولا فيها شجرة.'), (19.4, 'بحّار إنجليزي سمّاها فوكلاند…'),
 (21.8, 'والفرنساويين سمّوها «مالوين»…'), (24.2, 'والإسبان ترجموها «مالفيناس».'),
 (26.5, 'يعني الاسم الأرجنتيني أصله فرنساوي؟!'), (29.4, 'والإنجليز والإسبان…'), (30.8, 'كل واحد لما مشي، ساب لوحة:'), (33.5, '«دي أرضنا».'),
 (34.3, 'وبعدين الأرجنتين استقلت عن إسبانيا'), (36.9, 'وقالت: اللي كان بتاعها… بقى بتاعي.'), (39.8, 'بس سنة ١٨٣٣، الإنجليز رجعوا…'), (43.2, 'وما مشيوش.'),
 (44.4, 'والأرجنتين سكتت؟'), (46.0, 'عمرها ما سكتت.'), (47.6, 'ودي بداية الحكاية.'),
 (49.4, 'في الستينات، طيار أرجنتيني'), (51.7, 'نزل على مضمار خيل، رفع العلم،'), (53.9, 'وساب جواب: «امشوا».'), (55.8, 'وبعدها شباب خطفوا طيارة…'), (57.9, 'ونزلوا على نفس المضمار…'), (59.4, 'لأن ما كانش فيه مطار.'),
 (61.0, 'وفي السبعينات، الأرجنتين بقت'), (63.5, 'هي اللي شايلة الجزر:'), (64.3, 'طيارات، وأكل، ومستشفيات…'), (67.0, 'وحتى مدرسين إسباني.'),
 (68.8, 'يعني كانت بتكسبهم!'), (70.4, 'كانت قرّبت.'),
 (72.0, 'لحد ما الجنرالات حكموا الأرجنتين…'), (74.5, 'ولما بريطانيا سحبت سفينة الحراسة'), (76.7, 'عشان توفّر فلوس، فهموها رسالة.'),
 (79.2, '٢ أبريل ١٩٨٢…'), (81.9, 'من غير إعلان حرب، دخلوا الجزر.'), (84.5, 'فرضوا الإسباني، وسمّوا العاصمة'), (86.8, '«بويرتو أرخنتينو»…'), (88.1, 'وحاولوا يخلّوا الناس تسوق على اليمين.'),
 (90.4, 'تاتشر بعتت أسطول قطع ١٣ ألف كيلو.'), (94.0, '٧٤ يوم حرب…'), (95.8, 'أكتر من ٩٠٠ عسكري من الجيشين…'), (98.3, 'وتلات ستات من أهل الجزر.'), (100.5, 'والأرجنتين استسلمت.'),
 (102.7, 'وبعد الحرب؟'), (103.8, 'في الأرجنتين، الجنرالات وقعوا…'), (106.8, 'والديمقراطية رجعت.'), (108.0, 'وفي بريطانيا، تاتشر كسبت الانتخابات.'),
 (111.0, 'وبريطانيا صرفت على الجزر بجد…'), (113.2, 'واكتشفوا إن بحرها مليان سبيط…'), (115.7, 'والسبيط عمل منهم أغنيا.'),
 (117.8, 'بس الجرح فضل مفتوح…'), (119.7, 'وفي كاس العالم ٨٦،'), (121.2, 'مارادونا جاب في إنجلترا جون بإيده…'), (123.9, 'وجون القرن!'), (125.0, 'اتنين واحد.'),
 (126.1, 'استنى…'), (127.0, 'وماتش السنة دي برضه اتنين واحد!'), (129.4, 'ماتش إنجلترا…'), (131.6, 'عمره ما بيبقى ماتش كورة وبس.'),
 (133.6, 'وفي استفتاء ٢٠١٣…'), (135.7, 'تلات أصوات بس قالوا لأ لبريطانيا.'), (139.1, 'يعني الحرب ضيّعت على الأرجنتين'), (141.4, 'اللي كانت قرّبت تكسبه…'), (143.3, 'الناس.'),
 (144.1, 'والأرجنتين لسه بتقول: الأرض أرضنا،'), (147.3, 'والسكان مستوطنين.'),
 (149.1, 'يعني مين الصح؟'), (151.7, 'قولولنا إنتو في الكومنتات:'), (153.1, 'الأرض ولا الناس؟'), (154.8, 'ولو الحكاية عجبتك،'), (156.3, 'دوس لايك واشترك في كورس عالسريع.'),
]
def caption(c, t):
    if t >= 158.75: return
    cur = None
    for i, (t0, txt) in enumerate(CAPS):
        nxt = CAPS[i + 1][0] if i + 1 < len(CAPS) else 158.75
        if t0 <= t < nxt: cur = (t0, txt, nxt); break
    if not cur: return
    t0, txt, nxt = cur
    a = clamp(prog(t, t0, 0.12)) * (1 - prog(t, nxt - 0.08, 0.08))
    im = text_img(txt, 'cap', 54, (255, 255, 255, 255), 3, (10, 10, 10, 200), False, True)
    draw_image(c, im, W / 2, H - 88, 1.0, a)

# ---------------------------------------------------------------- scenes
SFX = []
def sfx(t, k): SFX.append((round(t, 3), k))

def scene(c, t, f):
    V = mapr.VIEWS
    # ---------------- 1 · hook
    if t < 2.5:
        close_up(c, t, 0, 2.5, 'F', 'S8H')
    elif t < 5.0:
        im = I(A + 'F01_banner_atlanta_2026.jpg', 'F01')
        cover(c, im, (t - 2.5) / 2.5, 1.0, 1.12, 0.45, 0.55, 0.44, 0.62)
        # banner region ~ x 430-890, y 330-1040 of 1500x1059 → screen approx
        circle_draw(c, 870, 650, 360, 470, t, 3.0, 0.7)
    elif t < 7.6:
        close_up(c, t, 5.0, 7.6, 'F', 'S8H')
        label(c, 'المالفيناس؟', 1250, 330, t, 6.8, 84, arrow=None)
    # ---------------- 2 · signpost
    elif t < 15.8:
        two_shot(c, t, 7.6, 15.8)
        for i, (tt, txt) in enumerate(((12.3, '١ البداية'), (13.5, '٢ الحرب'), (14.6, '٣ اللي بعدها'))):
            if t >= tt:
                k = eback(prog(t, tt, 0.3)); tag = text_img(txt, 'brand', 52, (17, 17, 17, 255), 0, (0, 0, 0, 255), False, False)
                x = W / 2 + (1 - i) * 360
                c.save(); c.translate(x, 150); c.scale(k, k); rrect(c, -tag.width() / 2 + 10, -42, tag.width() - 20, 84, 42, YEL, 1, BLK, 4); draw_image(c, tag, 0, 4); c.restore()
    # ---------------- 3 · islands, names
    elif t < 17.7:
        u = prog(t, 15.8, 1.9); v = mapr.lerp_view(V['atl'], V['satl'], u)
        mapr.draw_map(c, v)
        sx, sy = mapr.to_screen(v, -59.2, -51.75)
        q = skia.Paint(AntiAlias=True, Color=0xFFFFC414); q.setAlphaf(0.5 + 0.5 * math.sin(t * 8))
        c.drawCircle(sx, sy, 16, q); c.drawCircle(sx, sy, 30 + 10 * math.sin(t * 8), WPEN(3, 0xFFFFC414))
        label(c, 'جزر فوكلاند / المالفيناس', sx + 40, sy - 110, t, 16.4, 54)
    elif t < 18.4:
        cover(c, I(A + 'F02_islands_penguins.jpg', 'F02'), (t - 17.7) / 0.7, 1.0, 1.05, 0.5, 0.6, 0.52, 0.62)
    elif t < 19.4:
        cover(c, I(A + 'F02b_moorland.jpg', 'F02b'), (t - 18.4) / 1.0, 1.0, 1.04, 0.5, 0.5, 0.55, 0.5)
        label(c, 'ولا شجرة', 960, 330, t, 18.9, 96)
    elif t < 24.2:
        im = I(A + 'F04_old_chart_malouines_falkland.webp', 'F04')
        # pan: FALKLAND (right) first, then MALOUINES (left)
        pan = ease(prog(t, 22.8, 0.8)); z = 1.25
        fx = 0.72 + (0.30 - 0.72) * pan; fy = 0.24 - 0.2 * pan
        sc = max(W / im.width(), H / im.height()) * z; vw, vh = W / sc, H / sc
        x0 = clamp(fx * im.width() - vw / 2, 0, im.width() - vw); y0 = clamp(fy * im.height() - vh / 2, 0, im.height() - vh)
        c.drawImageRect(im, skia.Rect.MakeXYWH(x0, y0, vw, vh), skia.Rect.MakeWH(W, H), SAMP)
        to_s = lambda ix, iy: ((ix - x0) * sc, (iy - y0) * sc)
        if 20.9 <= t < 23.0:   # circle the word FALKLAND (image coords ~ 1110..1600 x, 95..380 y)
            cx, cy = to_s(1365, 245)
            c.save(); c.translate(cx, cy); c.rotate(33); circle_draw(c, 0, 0, 330, 95, t, 20.9, 0.6, 8, 0xFFC8102E); c.restore()
            label(c, 'فوكلاند (إنجليزي)', cx - 120, cy + 260, t, 21.3, 58)
        if t >= 23.4:   # circle MALOUINES (image coords ~ 300..870 x, 20..130 y)
            cx, cy = to_s(590, 85)
            c.save(); c.translate(cx, cy); c.rotate(-4); circle_draw(c, 0, 0, 330, 80, t, 23.4, 0.6, 8, 0xFF0055A4); c.restore()
            label(c, 'مالوين (فرنساوي)', cx, cy + 190, t, 23.7, 58)
        bust(c, I(A + 'F05_bougainville.jpg', 'F05'), 1560, 600, 600, t, 23.2, 'right')
        if t >= 23.5: label(c, 'بوجانفيل – فرنسا ١٧٦٤', 1560, 230, t, 23.5, 46)
    elif t < 26.5:
        mapr.draw_map(c, V['isl']); pile(c, t, upto=2)
        control_badge(c, t, ['FR', 'UK'], 'فرنسا وبريطانيا')
        label(c, 'فوكلاند', 1380, 760, t, 24.3, 56)
        if t >= 25.8: label(c, '«مالوين» بقت «مالفيناس»', 960, 180, t, 25.8, 62)
    # ---------------- 4 · daughter surprised
    elif t < 29.4:
        close_up(c, t, 26.5, 29.4, 'F', 'S8H')
        label(c, 'فرنساوي؟!', 1260, 340, t, 28.5, 84)
    # ---------------- plaques
    elif t < 34.3:
        mapr.draw_map(c, V['isl']); pile(c, t, upto=4)
        if t < 33.5: control_badge(c, t, ['ES'], 'إسبانيا')
        else: control_badge(c, t, [], 'ولا حد!')
    # ---------------- 5 · Argentina's claim, 1833
    elif t < 39.8:
        v = V['arg']
        mapr.draw_map(c, v, highlight={'032': 0xFF74ACDF}, hl_alpha=ease(prog(t, 35.7, 0.8)) * 0.75)
        if t >= 35.7: label(c, 'استقلال الأرجنتين ١٨١٦', 560, 330, t, 35.9, 60)
        isl = mapr.to_screen(v, -59.3, -51.75)
        q = skia.Paint(AntiAlias=True, Color=0xFFFFC414); q.setAlphaf(0.6 + 0.4 * math.sin(t * 7))
        c.drawCircle(isl[0], isl[1], 70 + 6 * math.sin(t * 7), WPEN(5, 0xFFFFC414))
        label(c, 'جزر المالفيناس / فوكلاند', isl[0] + 420, isl[1] - 10, t, 34.6, 52)
        if t >= 38.6: control_badge(c, t, ['AR'], 'الأرجنتين')
        else: control_badge(c, t, [], 'ولا حد')
        if t >= 38.4:
            a0 = mapr.to_screen(v, -58.4, -34.6); a1 = (isl[0], isl[1] - 60)
            pr = ease(prog(t, 38.4, 0.9)); ex, ey = a0[0] + (a1[0] - a0[0]) * pr, a0[1] + (a1[1] - a0[1]) * pr
            pth = skia.Path(); pth.moveTo(*a0); pth.quadTo(a0[0] + 220, (a0[1] + ey) / 2, ex, ey); c.drawPath(pth, WPEN(8, 0xFF74ACDF))
            c.drawCircle(ex, ey, 10, skia.Paint(AntiAlias=True, Color=0xFFFFFFFF))
            label(c, 'اللي كان بتاع إسبانيا… بقى بتاعي', 1340, 560, t, 38.6, 52)
    elif t < 44.4:
        u = prog(t, 39.8, 0.9); v = mapr.lerp_view(V['arg'], V['isl'], u)
        mapr.draw_map(c, v)
        if u >= 1: pile(c, t, upto=6)
        if t < 42.9: control_badge(c, t, ['AR'], 'الأرجنتين')
        else: control_badge(c, t, ['UK'], 'بريطانيا')
        if t >= 43.2: label(c, 'من ١٨٣٣ لحد النهارده', 640, 860, t, 43.3, 60)
    # ---------------- 6 · two-shot
    elif t < 49.4:
        two_shot(c, t, 44.4, 49.4)
    # ---------------- 7 · racecourse
    elif t < 61.0:
        im = I(A + 'F12_stanley_racecourse.jpg', 'F12')
        cover(c, im, (t - 49.4) / 11.6, 1.0, 1.1, 0.45, 0.45, 0.55, 0.5, filt=grey_filter(0.25))
        if t >= 50.5:
            pr = eout(prog(t, 50.5, 1.9)); x = 2050 - 1730 * pr; y = 150 + 760 * pr
            plane_icon(c, x, y, 2.3, 180 - 25 * (1 - pr))
            label(c, '١٩٦٤', 420, 640, t, 51.6, 72)
        flag_ar(c, 170, 820, 1.6, t, 52.9)
        envelope(c, 1480, 250, 1.3, t, 54.4, 'امشوا')
        if t >= 56.9:
            pr = eout(prog(t, 56.9, 1.6)); x = -300 + 1950 * pr; y = 100 + 820 * pr
            plane_icon(c, x, y, 3.0, 25 * (1 - pr), big=True)
            label(c, 'طيارة مخطوفة ١٩٦٦', 960, 140, t, 57.3, 64)
        if t >= 60.3: label(c, 'ما فيش مطار!', 960, 330, t, 60.3, 80)
    # ---------------- 8 · 1970s lifeline
    elif t < 68.8:
        if t < 65.3:
            im = I(P + 'F23.png', 'pF23'); cover(c, im, (t - 61.0) / 4.3, 1.0, 1.15, 0.35, 0.6, 0.3, 0.62)
            label(c, 'طيارات الأرجنتين ١٩٧١', 1400, 150, t, 61.6, 60)
        else:
            cover(c, blurred(A + 'F23b_argentine_F27_stanley.webp', 'bF23b', 22, 0.45), 0, 1.0, 1.0)
            framed_photo(c, I(P + 'F23b.png', 'pF23b'), W / 2, 400, 560, t, 65.3, rot=-1.5)
        fill(c, 0xFF000000, 0.15)
        icon_row(c, t, [(64.3, 'plane', 'طيارات'), (65.3, 'food', 'أكل'), (65.9, 'cross', 'مستشفيات'), (67.7, 'book', 'مدرسين إسباني')], y=760)
    # ---------------- 9 · two-shot
    elif t < 72.0:
        two_shot(c, t, 68.8, 72.0)
    # ---------------- 10 · generals + patrol ship
    elif t < 79.2:
        dark = ease(prog(t, 78.3, 0.8))
        mapr.draw_map(c, V['isl'], dim=0.25 + 0.3 * dark)
        control_badge(c, t, ['UK'], 'بريطانيا')
        bust(c, I(A + 'F13_galtieri.jpg', 'F13'), 420, 540, 760, t, 72.3, 'left', filt=grey_filter(0.6))
        if t >= 72.6: label(c, 'حكم الجنرالات ١٩٧٦', 420, 105, t, 72.6, 52)
        if t >= 75.6:
            pr = ease(prog(t, 75.6, 2.6))
            framed_photo(c, I(P + 'F24.png', 'pF24'), 1300 + 700 * pr, 470 - 120 * pr, 420, t, 75.6, rot=3)
            label(c, 'سفينة الحراسة بتمشي ١٩٨١', 1300, 830, t, 76.0, 54)
    # ---------------- 11 · invasion, Puerto Argentino, right side of road
    elif t < 86.4:
        mapr.draw_map(c, V['isl'], dim=0.45)
        if t >= 79.3: plain_num(c, '٢ أبريل ١٩٨٢', 600, 300, t, 79.3, 100)
        if t >= 81.9: label(c, 'من غير إعلان حرب', 600, 430, t, 81.9, 64)
        v = V['isl']; st = mapr.to_screen(v, -57.85, -51.69)
        landed = t >= 84.1
        # flag pole at Stanley: British before the landing, Argentine after
        c.drawLine(st[0], st[1], st[0], st[1] - 110, WPEN(5, 0xFFEEEEEE))
        if landed:
            k2 = eback(prog(t, 84.1, 0.4)); c.save(); c.translate(st[0] + 3, st[1] - 110); c.scale(k2, k2); flag(c, 'AR', 0, 0, 84, 56); c.restore()
        else:
            flag(c, 'UK', st[0] + 3, st[1] - 110, 84, 56)
        label(c, 'ستانلي', st[0] - 10, st[1] + 60, t, 79.5, 50)
        if t >= 83.2:
            starts = ((st[0] + 560, st[1] - 400), (st[0] + 620, st[1] + 230), (st[0] - 260, st[1] - 470))
            for i, (lx, ly) in enumerate(starts):
                pr = ease(prog(t, 83.2 + i * 0.18, 0.8))
                ex, ey = lx + (st[0] - 40 - lx) * pr, ly + (st[1] - 20 - ly) * pr
                c.drawLine(lx, ly, ex, ey, WPEN(14, 0xFF74ACDF)); c.drawLine(lx, ly, ex, ey, WPEN(5, 0xFFFFFFFF))
                ang = math.atan2(ey - ly, ex - lx)
                for d in (2.5, -2.5): c.drawLine(ex, ey, ex + 34 * math.cos(ang + d), ey + 34 * math.sin(ang + d), WPEN(12, 0xFF74ACDF))
                if i == 0: flag(c, 'AR', lx - 30, ly - 60, 60, 40)
            label(c, 'القوات الأرجنتينية', st[0] + 200, st[1] + 330, t, 83.5, 54)
        if t < 84.1: control_badge(c, t, ['UK'], 'بريطانيا')
        else: control_badge(c, t, ['AR'], 'الأرجنتين')
    elif t < 90.4:
        im = I(P + 'F25.png', 'pF25')
        c.save(); cover(c, blurred(A + 'F25_puerto_argentino_notice.jpg', 'bF25'), 0, 1.0, 1.0); c.restore()
        framed_photo(c, im, W / 2 - 120, H / 2 - 20, 820, t, 86.4, rot=-1.5)
        circle_draw(c, W / 2 - 160, 250, 470, 70, t, 86.9, 0.6, 7, 0xFFFFC414)
        if t >= 88.6:
            pr = ease(prog(t, 88.6, 0.8)); cx = 1640; cy = 760
            rrect(c, cx - 170, cy - 110, 340, 220, 20, 0xEE10263A, 1, 0xFFFFFFFF, 4)
            ang = math.pi * pr; dx = math.cos(ang) * 110
            c.drawLine(cx + dx, cy, cx - dx, cy, WPEN(14))
            hx = cx - dx; sgn = -1 if dx > 0 else 1
            c.drawLine(hx, cy, hx - sgn * 34, cy - 30, WPEN(14)); c.drawLine(hx, cy, hx - sgn * 34, cy + 30, WPEN(14))
            label(c, 'على اليمين!', cx, cy + 170, t, 89.4, 56)
    # ---------------- 12 · war
    elif t < 94.0:
        mapr.draw_map(c, V['atl'], dim=0.2)
        v = V['atl']; uk = mapr.to_screen(v, -2.0, 50.5); fk = mapr.to_screen(v, -59.0, -51.7)
        if t >= 91.2:
            pr = ease(prog(t, 91.2, 2.2))
            pth = skia.Path(); pth.moveTo(*uk)
            mid = (uk[0] - 120, (uk[1] + fk[1]) / 2)
            # trace quadratic manually up to pr
            pts = [((1 - s) ** 2 * uk[0] + 2 * (1 - s) * s * mid[0] + s * s * fk[0], (1 - s) ** 2 * uk[1] + 2 * (1 - s) * s * mid[1] + s * s * fk[1]) for s in np.linspace(0, pr, 40)]
            for p_ in pts[1:]: pth.lineTo(*p_)
            dp = WPEN(7, 0xFFFFFFFF); dp.setPathEffect(skia.DashPathEffect.Make([22, 16], 0)); c.drawPath(pth, dp)
            ship_icon(c, pts[-1][0], pts[-1][1], 0.7); flag(c, 'UK', pts[-1][0] - 30, pts[-1][1] - 95, 60, 40)
            label(c, 'الأسطول البريطاني', mid[0] - 230, mid[1] - 70, t, 91.6, 56)
            label(c, '١٣,٠٠٠ كم', mid[0] - 230, mid[1] + 20, t, 92.2, 64)
        control_badge(c, t, ['AR'], 'الأرجنتين')
        bust(c, I(A + 'F14_thatcher.webp', 'F14'), 1530, 520, 700, t, 90.4, 'right')
        if t >= 90.8: label(c, 'تاتشر', 1530, 915, t, 90.8, 56)
    elif t < 102.9:
        # split: British memorial | Argentine cemetery — equal weight, desaturated
        g = grey_filter(0.85)
        for side, (path, key, fx) in enumerate(((A + 'F15_liberation_memorial.jpg', 'F15', 0.62), (P + 'F16.png', 'pF16', 0.5))):
            im = I(path, key); c.save(); c.clipRect(skia.Rect.MakeXYWH(side * W / 2, 0, W / 2, H))
            u = (t - 94.0) / 8.9; s = max((W / 2) / im.width(), H / im.height()) * (1.02 + 0.05 * u)
            vw, vh = (W / 2) / s, H / s; x0 = clamp(fx * im.width() - vw / 2, 0, im.width() - vw); y0 = clamp(0.5 * im.height() - vh / 2, 0, im.height() - vh)
            p = skia.Paint(); p.setColorFilter(g)
            c.drawImageRect(im, skia.Rect.MakeXYWH(x0, y0, vw, vh), skia.Rect.MakeXYWH(side * W / 2, 0, W / 2, H), SAMP, p)
            c.restore()
        fill(c, 0xFF000000, 0.42)
        c.drawLine(W / 2, 0, W / 2, H, skia.Paint(Color=0xFF000000, StrokeWidth=4))
        plain_num(c, '٧٤ يوم', W / 2, 300, t, 94.0, 110)
        plain_num(c, '+٩٠٠ عسكري من الجيشين', W / 2, 470, t, 95.8, 80)
        plain_num(c, '٣ من أهل الجزر', W / 2, 610, t, 98.3, 80)
        plain_num(c, '١٤ يونيو ١٩٨٢', W / 2, 790, t, 101.7, 62)
        out = prog(t, 102.4, 0.5); fill(c, 0xFF000000, out)
    # ---------------- 13 · aftermath: politics
    elif t < 103.8:
        close_up(c, t, 102.9, 103.8, 'F', 'S8H')
    elif t < 111.0:
        mapr.draw_map(c, V['atl'], dim=0.5)
        control_badge(c, t, ['UK'], 'بريطانيا')
        fa = 1 - prog(t, 106.1, 0.8)
        bust(c, I(A + 'F13_galtieri.jpg', 'F13'), 520, 500, 640, t, 103.9, 'left', filt=grey_filter(1.0), alpha=max(fa, 0.0))
        if t >= 106.4:
            k = eback(prog(t, 106.4, 0.4)); c.save(); c.translate(520, 520); c.scale(k, k)
            pr2 = eout(prog(t, 106.6, 0.6))
            c.save(); c.translate(0, -150 + 90 * pr2); c.rotate(-8 * (1 - pr2))
            rrect(c, -55, -70, 110, 140, 6, 0xFFFFFFFF, 1, 0xFF333333, 3); c.drawLine(-30, -30, 30, -30, WPEN(4, 0xFF999999)); c.drawLine(-30, 0, 30, 0, WPEN(4, 0xFF999999))
            pth = skia.Path(); pth.moveTo(-20, 30); pth.lineTo(-6, 44); pth.lineTo(24, 14); c.drawPath(pth, WPEN(6, 0xFF2E7D32)); c.restore()
            rrect(c, -130, -50, 260, 170, 12, 0xFF74ACDF, 1, 0xFF333333, 4)
            rrect(c, -70, -58, 140, 16, 6, 0xFF333333)
            draw_image(c, text_img('انتخابات', 'brand', 46, (255, 255, 255, 255), 0, (0, 0, 0, 255), False, False), 0, 40)
            c.restore(); label(c, 'الديمقراطية رجعت ١٩٨٣', 520, 760, t, 106.6, 52)
        bust(c, I(A + 'F14_thatcher.webp', 'F14'), 1400, 500, 640, t, 108.0, 'right')
        if t >= 109.8:
            k = eback(prog(t, 109.8, 0.4)); c.save(); c.translate(1640, 760); c.scale(k, k)
            c.drawCircle(0, 0, 60, skia.Paint(AntiAlias=True, Color=0xFF2E7D32))
            pth = skia.Path(); pth.moveTo(-28, 2); pth.lineTo(-8, 24); pth.lineTo(30, -22); c.drawPath(pth, WPEN(12)); c.restore()
            label(c, 'كسبت الانتخابات', 1400, 880, t, 110.0, 50)
        if t < 103.9 + 0.1: pass
    # ---------------- 14 · islands get rich
    elif t < 117.8:
        if t < 114.4:
            im = I(A + 'F26_stanley_whalebone_arch.jpg', 'F26')
            cover(c, im, (t - 111.0) / 3.4, 1.12, 1.18, 0.62, 0.52, 0.66, 0.5)
            label(c, 'ستانلي النهارده', 1450, 180, t, 111.5, 58)
        else:
            im = I(A + 'F27_squid_jigger_night.webp', 'F27')
            cover(c, im, (t - 114.4) / 3.4, 1.0, 1.1, 0.5, 0.5, 0.5, 0.45)
            label(c, 'سبيط!', 380, 220, t, 114.9, 84)
            if t >= 116.5:
                for k_ in range(6):
                    tt = 116.5 + k_ * 0.12
                    if t < tt: continue
                    kk = eback(prog(t, tt, 0.3)); cy = 940 - k_ * 34
                    c.save(); c.translate(1560, cy); c.scale(kk, kk)
                    c.drawOval(skia.Rect.MakeXYWH(-90, -22, 180, 44), skia.Paint(AntiAlias=True, Color=0xFFE0A800))
                    c.drawOval(skia.Rect.MakeXYWH(-90, -26, 180, 44), skia.Paint(AntiAlias=True, Color=0xFFFFC414))
                    c.drawOval(skia.Rect.MakeXYWH(-90, -26, 180, 44), WPEN(3, 0xFF8A6200)); c.restore()
                label(c, 'أغنيا', 1560, 620, t, 117.0, 80)
    # ---------------- 15 · Maradona 1986
    elif t < 121.2:
        mapr.draw_map(c, V['isl'], dim=0.35); pile(c, t, upto=6, glow=ease(prog(t, 117.9, 0.8)))
        control_badge(c, t, ['UK'], 'بريطانيا')
        if t >= 119.8: label(c, 'كاس العالم ١٩٨٦ في المكسيك', 960, 180, t, 119.8, 62)
    elif t < 123.9:
        im = I(P + 'F18.png', 'pF18'); cover(c, im, (t - 121.2) / 2.7, 1.0, 1.12, 0.45, 0.4, 0.43, 0.38)
        circle_draw(c, 1140, 150, 160, 140, t, 122.9, 0.5, 8, 0xFFFFC414)
        label(c, 'جون بإيده', 1520, 360, t, 123.2, 72, arrow=(-260, -170))
    elif t < 126.1:
        im = I(A + 'F19_maradona_run.webp', 'F19'); cover(c, im, (t - 123.9) / 2.2, 1.0, 1.06, 0.4, 0.6, 0.45, 0.6)
        if t >= 124.0:
            pr = ease(prog(t, 124.0, 1.0)); pts = [(200, 760), (450, 700), (650, 760), (820, 720), (1000, 800)]
            pth = skia.Path(); pth.moveTo(*pts[0])
            n = 1 + int(pr * (len(pts) - 1));
            for p_ in pts[1:n + 1]: pth.lineTo(*p_)
            dp = WPEN(7, 0xFFFFC414); dp.setPathEffect(skia.DashPathEffect.Make([18, 14], 0)); c.drawPath(pth, dp)
            label(c, 'جون القرن', 1450, 200, t, 124.3, 72)
        scoreboard(c, W / 2, 470, 'كاس العالم ١٩٨٦ – المكسيك', t, 125.0, None, 1.0)
    # ---------------- 16 · 1986 = 2026
    elif t < 129.4:
        im = I(A + 'F01_banner_atlanta_2026.jpg', 'F01'); cover(c, im, (t - 126.1) / 3.3, 1.0, 1.05, 0.5, 0.55, 0.5, 0.55)
        fill(c, 0xFF000000, 0.5)
        label(c, 'نفس النتيجة!', W / 2, 200, t, 126.3, 92)
        scoreboard(c, 1440, 560, 'كاس العالم ١٩٨٦ – المكسيك', t, 126.2, 128.6, 0.98)
        scoreboard(c, 480, 560, 'كاس العالم ٢٠٢٦ – أتلانتا', t, 127.4, 128.6, 0.98)
    elif t < 133.6:
        two_shot(c, t, 129.4, 133.6)
        label(c, 'مش ماتش كورة وبس', 960, 170, t, 132.7, 70)
    # ---------------- 17 · referendum
    elif t < 144.1:
        im = I(P + 'F20.png', 'pF20'); cover(c, im, (t - 133.6) / 10.5, 1.0, 1.15, 0.4, 0.45, 0.5, 0.4)
        if t >= 133.8:
            a_ = ease(prog(t, 133.8, 0.4))
            rrect(c, 360, 40, 1200, 170, 22, 0xE60B1B2B, a_, 0xFFFFC414, 3)
            if a_ > 0:
                draw_image(c, text_img('استفتاء ٢٠١٣ – ستانلي، جزر فوكلاند', 'brand', 60, (255, 196, 20, 255), 0, (0, 0, 0, 255), False, False), W / 2, 92, 1, a_)
                draw_image(c, text_img('أهل الجزر بيصوّتوا: يفضلوا تبع بريطانيا ولا لأ؟', 'cap', 44, (255, 255, 255, 255), 0, (0, 0, 0, 255), False, False), W / 2, 160, 1, a_)
        if t >= 136.6:
            k_ = eback(prog(t, 136.6, 0.35)); c.save(); c.translate(1500, 700); c.scale(k_, k_)
            rrect(c, -330, -120, 660, 240, 22, 0xEE0B1B2B, 1, 0xFFFFFFFF, 3)
            draw_image(c, text_img('٩٩٫٨٪ قالوا آه', 'brand', 72, (120, 220, 120, 255), 0, (0, 0, 0, 255), False, False), 0, -45)
            draw_image(c, text_img('٣ أصوات بس قالوا لأ', 'brand', 56, (255, 140, 140, 255), 0, (0, 0, 0, 255), False, False), 0, 55)
            c.restore()
        if t >= 139.1:
            fill(c, 0xFF000000, 0.35 * ease(prog(t, 139.1, 0.5)))
            heart(c, 960, 520, 3.0, t, 139.3, crack_t=143.2)
            if t >= 143.3: label(c, 'الناس', 960, 760, t, 143.3, 90)
    elif t < 149.1:
        mapr.draw_map(c, V['isl'], dim=0.2)
        u = ease(prog(t, 144.2, 0.6))
        q = skia.Paint(Color=0xFF012169); q.setAlphaf(0.45 * u); c.drawRect(skia.Rect.MakeXYWH(0, 0, W / 2, H), q)
        q = skia.Paint(Color=0xFF74ACDF); q.setAlphaf(0.45 * u); c.drawRect(skia.Rect.MakeXYWH(W / 2, 0, W / 2, H), q)
        c.drawLine(W / 2, 0, W / 2, H, WPEN(4))
        label(c, 'بريطانيا: الناس قالت كلمتها', W * 0.25, 230, t, 144.3, 52)
        label(c, 'الأرجنتين: الأرض أرضنا', W * 0.75, 230, t, 145.9, 52)
    # ---------------- 18 · close + CTA
    elif t < 151.6:
        two_shot(c, t, 149.1, 151.6)
    elif t < 158.6:
        two_shot(c, t, 151.6, 158.6)
        for i, (tt, txt, x) in enumerate(((153.1, 'الأرض', 560), (154.3, 'الناس', 960))):
            if t >= tt and t < 156.3:
                k = eback(prog(t, tt, 0.3)); tim = text_img(txt, 'brand', 70, (17, 17, 17, 255), 0, (0, 0, 0, 255), False, False)
                c.save(); c.translate(x, 210); c.scale(k, k); rrect(c, -150, -55, 300, 110, 55, CREAM, 1, BLK, 5); draw_image(c, tim, 0, 6); c.restore()
        if 156.3 <= t < 158.6:
            for key, x, tt in (('like', 560, 156.6), ('sub', 960, 157.0)):
                if t >= tt:
                    k = eback(prog(t, tt, 0.3)); pulse = 1 + 0.08 * math.sin(clamp(prog(t, tt + 0.3, 0.4)) * math.pi)
                    draw_image(c, end_btn(key), x, 210, k * pulse * 1.15)
    # ---------------- end card (slides in from 157.1, lands 158.6)
    if t >= 157.1:
        pr = eout(prog(t, 157.1, 1.5))
        ec = I(B + 'G08_channel_endcard.jpg', 'G08')
        c.save(); c.translate((1 - pr) * W, 0)
        c.drawImageRect(ec, skia.Rect.MakeWH(W, H), SAMP)
        # pulses: like at 158.9, subscribe at 159.4
        for key, tt, (cx, cy) in (('like', 158.9, (1152, 555)), ('sub', 159.4, (1459, 555))):
            if t >= tt:
                pp = math.sin(clamp(prog(t, tt, 0.4)) * math.pi) * 0.08
                if pp > 0: draw_image(c, end_btn(key), cx, cy, 1 + pp)
        c.restore()
    # ---------------- overlays
    caption(c, t)

def overlays(c, tn):
    logo_sting(c, tn, vo2new(7.45))
    chapter_card(c, tn, hold_start(15.8) - 0.1, '١', 'البداية')
    chapter_card(c, tn, hold_start(49.4) - 0.1, '٢', 'الحرب')
    chapter_card(c, tn, hold_start(102.7) + 0.1, '٣', 'اللي بعدها')

def sfx_list():
    ev = [(12.3, 'tick'), (13.5, 'tick'), (14.6, 'tick'),
          (3.0, 'scribble'), (21.2, 'scribble'), (23.6, 'scribble'), (21.2, 'slam'), (23.6, 'slam'), (32.6, 'slam'), (33.5, 'slam'), (39.1, 'slam'), (42.9, 'slam'),
          (25.8, 'pop'), (6.8, 'pop'), (16.4, 'pop'), (18.9, 'pop'), (28.5, 'pop'), (51.0, 'pop'), (52.9, 'pop'), (54.4, 'pop'), (57.3, 'pop'), (60.3, 'pop'),
          (64.3, 'pop'), (65.3, 'pop'), (65.9, 'pop'), (67.7, 'pop'), (72.6, 'pop'), (76.0, 'pop'), (81.9, 'pop'), (86.9, 'scribble'), (89.4, 'pop'),
          (90.8, 'pop'), (92.2, 'pop'), (106.4, 'pop'), (109.8, 'ding'), (114.9, 'pop'), (116.5, 'ding'), (122.9, 'scribble'), (123.2, 'pop'), (124.3, 'pop'),
          (125.0, 'slam'), (126.2, 'slam'), (127.4, 'slam'), (128.6, 'ding'), (132.7, 'pop'), (134.0, 'pop'), (136.7, 'tick'), (136.95, 'tick'), (137.2, 'tick'),
          (139.3, 'pop'), (143.2, 'slam'), (144.3, 'pop'), (145.9, 'pop'), (153.1, 'pop'), (154.3, 'pop'), (156.6, 'pop'), (157.0, 'pop'), (157.1, 'whoosh'),
          (158.9, 'tick'), (159.4, 'tick'), (2.5, 'whoosh'), (5.0, 'whoosh'), (17.7, 'whoosh'), (24.2, 'whoosh'), (61.0, 'whoosh'), (111.0, 'whoosh'), (121.2, 'whoosh'), (133.6, 'whoosh')]
    ev = [(round(vo2new(t), 3), k) for t, k in ev]
    ev += [(vo2new(7.45), 'sting'), (hold_start(15.8) - 0.1, 'whoosh'), (hold_start(49.4) - 0.1, 'whoosh'), (hold_start(102.7) + 0.1, 'whoosh')]
    return ev

def render(f0, f1, out):
    surf = skia.Surface(W, H)
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-tune', 'animation', out], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        tn = f / FPS
        t, hp = new2vo(tn); HOLD[0] = hp is not None
        with surf as c:
            c.clear(0xFF000000)
            c.save()
            if hp is not None:
                z = 1 + 0.012 * ease(hp); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2)
            scene(c, t, f)
            c.restore()
            overlays(c, tn)
            vignette(c); grain(c, f)
        ff.stdin.write(surf.makeImageSnapshot().tobytes())
        if f % 100 == 0: print(out, f, flush=True)
    ff.stdin.close(); ff.wait()

def still(t, out):
    surf = skia.Surface(W, H)
    with surf as c:
        c.clear(0xFF000000); scene(c, t, int(t * FPS)); overlays(c, vo2new(t)); vignette(c); grain(c, int(t * FPS))
    surf.makeImageSnapshot().save(out)

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'still':
        for t in sys.argv[2:]: still(float(t), SCR + os.environ.get('STILLS','stills') + f'/s_{float(t):06.1f}.png')
    elif mode == 'sfx':
        json.dump(sfx_list(), open(SCR + 'sfx.json', 'w'))
        json.dump({'holds': HOLDS, 'T_new': T_NEW}, open(SCR + 'holds.json', 'w'))
    else:
        render(int(sys.argv[2]), int(sys.argv[3]), sys.argv[4])
