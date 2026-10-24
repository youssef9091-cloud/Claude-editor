import skia, numpy as np, math, functools
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1920,1080,25
F='/home/user/Claude-editor/briefs/falklands/build/fonts/'
FONT={'cap':F+'cairo700_full.ttf','capb':F+'cairo900_full.ttf','hand':F+'marhey_full.ttf',
      'brand':F+'lalezar_full.ttf','lat':F+'cairo700_full.ttf','latb':F+'lalezar_full.ttf'}
SAMP=skia.SamplingOptions(skia.CubicResampler.Mitchell())
LIN=skia.SamplingOptions(skia.FilterMode.kLinear, skia.MipmapMode.kLinear)
YEL=0xFFFFC414; BLK=0xFF111111; CREAM=0xFFF6EEDC
def to_skia(pil):
    pil=pil.convert('RGBA'); a=np.ascontiguousarray(np.asarray(pil))
    return skia.Image.fromarray(a, colorType=skia.kRGBA_8888_ColorType)
_imgcache={}
def img(path, key=None):
    k=key or path
    if k not in _imgcache: _imgcache[k]=to_skia(Image.open(path))
    return _imgcache[k]
def clamp(x,a=0,b=1): return max(a,min(b,x))
def ease(x): x=clamp(x); return x*x*(3-2*x)
def eout(x): x=clamp(x); return 1-(1-x)**3
def eback(x,s=1.7):
    x=clamp(x); x-=1; return x*x*((s+1)*x+s)+1
def prog(t,t0,d): return clamp((t-t0)/d) if d>0 else float(t>=t0)
@functools.lru_cache(maxsize=512)
def text_pil(text, font='hand', size=60, fill=(255,255,255,255), stroke=0, stroke_fill=(0,0,0,255), latin=False, shadow=True):
    fpath=FONT[font]
    if latin and font in ('cap','capb','hand'): fpath=FONT['lat']
    if latin and font=='brand': fpath=FONT['latb']
    f=ImageFont.truetype(fpath,size,layout_engine=ImageFont.Layout.RAQM)
    kw=dict(direction='ltr') if latin else dict(direction='rtl',language='ar')
    bb=ImageDraw.Draw(Image.new('L',(1,1))).textbbox((0,0),text,font=f,stroke_width=stroke,**kw)
    pad=int(size*0.5)
    w,h=bb[2]-bb[0]+2*pad, bb[3]-bb[1]+2*pad
    im=Image.new('RGBA',(w,h),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.text((pad-bb[0],pad-bb[1]),text,font=f,fill=fill,stroke_width=stroke,stroke_fill=stroke_fill,**kw)
    if shadow:
        sh=Image.new('RGBA',(w,h),(0,0,0,0)); a=im.split()[3].filter(ImageFilter.GaussianBlur(size*0.08))
        sh.putalpha(a.point(lambda v:int(v*0.75)))
        base=Image.new('RGBA',(w,h),(0,0,0,0)); base.alpha_composite(sh,(int(size*0.03),int(size*0.05))); base.alpha_composite(im); im=base
    return im
@functools.lru_cache(maxsize=512)
def text_img(*a,**k): return to_skia(text_pil(*a,**k))
def draw_image(c, im, cx, cy, scale=1.0, alpha=1.0, rot=0.0, sampling=SAMP):
    if alpha<=0.001 or im is None: return
    c.save(); c.translate(cx,cy); 
    if rot: c.rotate(rot)
    c.scale(scale,scale)
    p=skia.Paint(); p.setAlphaf(clamp(alpha))
    c.drawImageRect(im, skia.Rect.MakeXYWH(-im.width()/2,-im.height()/2,im.width(),im.height()), sampling, p)
    c.restore()
def cover(c, im, t, z0=1.0, z1=1.08, fx0=0.5, fy0=0.5, fx1=0.5, fy1=0.5, alpha=1.0, filt=None):
    # Ken Burns: t in 0..1; focus fractions in image coords
    z=z0+(z1-z0)*ease(t); fx=fx0+(fx1-fx0)*ease(t); fy=fy0+(fy1-fy0)*ease(t)
    s=max(W/im.width(),H/im.height())*z
    vw,vh=W/s,H/s
    x0=clamp(fx*im.width()-vw/2,0,im.width()-vw); y0=clamp(fy*im.height()-vh/2,0,im.height()-vh)
    p=skia.Paint(); p.setAlphaf(alpha)
    if filt is not None: p.setColorFilter(filt)
    c.drawImageRect(im, skia.Rect.MakeXYWH(x0,y0,vw,vh), skia.Rect.MakeWH(W,H), SAMP, p)
def grey_filter(amount=1.0, dark=0.0):
    a=amount; r,g,b=0.299,0.587,0.114; k=1-dark
    m=[ (1-a)+a*r, a*g, a*b, 0, 0,
         a*r, (1-a)+a*g, a*b, 0, 0,
         a*r, a*g, (1-a)+a*b, 0, 0,
         0,0,0,1,0]
    m=[v*k if i%5<3 and i<15 else v for i,v in enumerate(m)]
    return skia.ColorFilters.Matrix(m)
def label(c, text, x, y, t, t0, size=64, font='hand', latin=False, color=(255,255,255,255), arrow=None, anchor='c'):
    """pop-in handwritten label; arrow=(dx,dy) tip offset from label centre"""
    if t<t0: return
    k=eback(prog(t,t0,0.35)); a=clamp(prog(t,t0,0.15))
    im=text_img(text,font,size,color,0,(0,0,0,255),latin)
    draw_image(c,im,x,y,scale=0.6+0.4*k,alpha=a)
    if arrow:
        pa=prog(t,t0+0.2,0.35)
        if pa>0:
            p=skia.Paint(AntiAlias=True,Color=0xFFFFFFFF,StrokeWidth=4,Style=skia.Paint.kStroke_Style,StrokeCap=skia.Paint.kRound_Cap)
            sx,sy=x+arrow[0]*0.25,y+arrow[1]*0.25+size*0.3; ex,ey=x+arrow[0],y+arrow[1]
            mx,my=sx+(ex-sx)*pa,sy+(ey-sy)*pa
            path=skia.Path(); path.moveTo(sx,sy); path.quadTo((sx+mx)/2+20,(sy+my)/2-20,mx,my); c.drawPath(path,p)
            if pa>=1:
                ang=math.atan2(ey-sy,ex-sx)
                for d in (2.6,-2.6):
                    c.drawLine(ex,ey,ex+18*math.cos(ang+d),ey+18*math.sin(ang+d),p)
def circle_draw(c, cx, cy, rx, ry, t, t0, d=0.6, width=7, color=0xFFFFFFFF):
    pr=ease(prog(t,t0,d))
    if pr<=0: return
    p=skia.Paint(AntiAlias=True,Color=color,StrokeWidth=width,Style=skia.Paint.kStroke_Style,StrokeCap=skia.Paint.kRound_Cap)
    path=skia.Path(); n=60
    for i in range(int(n*1.08*pr)+1):
        a=-1.9+2*math.pi*i/n; wob=1+0.03*math.sin(i*0.7)
        px,py=cx+rx*wob*math.cos(a), cy+ry*wob*math.sin(a)
        path.moveTo(px,py) if i==0 else path.lineTo(px,py)
    c.drawPath(path,p)
def rrect(c,x,y,w,h,r,color,alpha=1.0,stroke=None,sw=0):
    p=skia.Paint(AntiAlias=True,Color=color); p.setAlphaf(alpha*p.getAlphaf())
    c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x,y,w,h),r,r),p)
    if stroke is not None:
        q=skia.Paint(AntiAlias=True,Color=stroke,Style=skia.Paint.kStroke_Style,StrokeWidth=sw); q.setAlphaf(alpha)
        c.drawRRect(skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x,y,w,h),r,r),q)
def fill(c,color,alpha=1.0):
    p=skia.Paint(Color=color); p.setAlphaf(alpha); c.drawRect(skia.Rect.MakeWH(W,H),p)
