import skia, numpy as np, math, pickle, os
from core import *
import geo
_P=None
FOCUS={'032':0xFFE6D6B0,'238':0xFFF7E9C4,'826':0xFFE6D6B0}
def paths():
    global _P
    if _P is None:
        cache='geo/paths.pkl'
        C=geo.load_topo('geo/c10.json')
        _P=[]
        for k,(n,polys) in C.items():
            p=skia.Path(); p.setFillType(skia.PathFillType.kEvenOdd)
            for poly in polys:
                for ring in poly:
                    x,y=geo.merc(ring[:,0],ring[:,1])
                    lon=ring[:,0]
                    p.moveTo(float(x[0]),float(y[0]))
                    for i in range(1,len(x)):
                        if abs(lon[i]-lon[i-1])>180: p.moveTo(float(x[i]),float(y[i]))
                        else: p.lineTo(float(x[i]),float(y[i]))
                    p.close()
            _P.append((k,n,p))
    return _P
def view(lon,lat,span):
    x,y=geo.merc(np.array([lon]),np.array([lat])); k=W/math.radians(span)
    return (float(x[0]),float(y[0]),k)
def lerp_view(v0,v1,u):
    u=ease(u); lk=math.log(v0[2])+(math.log(v1[2])-math.log(v0[2]))*u
    # interpolate centre in screen-consistent way
    k=math.exp(lk); w=(k-v0[2])/(v1[2]-v0[2]) if v1[2]!=v0[2] else u
    return (v0[0]+(v1[0]-v0[0])*w, v0[1]+(v1[1]-v0[1])*w, k)
def to_screen(v,lon,lat):
    x,y=geo.merc(np.array([lon]),np.array([lat]))
    return (W/2+(float(x[0])-v[0])*v[2], H/2-(float(y[0])-v[1])*v[2])
def draw_map(c,v,tint=None,dim=0.0,highlight=None,hl_alpha=1.0):
    # ocean
    p=skia.Paint(Shader=skia.GradientShader.MakeRadial((W*0.5,H*0.45),W*0.75,[0xFF123A5C,0xFF071827]))
    c.drawRect(skia.Rect.MakeWH(W,H),p)
    # graticule
    g=skia.Paint(AntiAlias=True,Color=0x22FFFFFF,StrokeWidth=1,Style=skia.Paint.kStroke_Style)
    step=10 if v[2]<W/math.radians(30) else (1 if v[2]>W/math.radians(8) else 5)
    for lon in range(-180,181,step):
        x=W/2+(math.radians(lon)-v[0])*v[2]
        if -5<x<W+5: c.drawLine(x,0,x,H,g)
    for lat in range(-80,81,step):
        y=H/2-(float(geo.merc(np.array([0.]),np.array([float(lat)]))[1][0])-v[1])*v[2]
        if -5<y<H+5: c.drawLine(0,y,W,y,g)
    c.save(); c.translate(W/2,H/2); c.scale(v[2],-v[2]); c.translate(-v[0],-v[1])
    rect=skia.Rect.MakeLTRB(v[0]-W/2/v[2],v[1]-H/2/v[2],v[0]+W/2/v[2],v[1]+H/2/v[2])
    lf=skia.Paint(AntiAlias=True); st=skia.Paint(AntiAlias=True,Color=0x99FFFFFF,Style=skia.Paint.kStroke_Style,StrokeWidth=1.6/v[2])
    for k,n,path in paths():
        if not skia.Rect.Intersects(path.getBounds(),rect): continue
        if k=='010': continue
        c.save(); c.translate(0,-6/v[2]); sp=skia.Paint(AntiAlias=True,Color=0x66000000,MaskFilter=skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle,6/v[2])); c.drawPath(path,sp); c.restore()
        lf.setColor(FOCUS.get(k,0xFFB9AC8C)); c.drawPath(path,lf)
        if highlight and k in highlight:
            hp=skia.Paint(AntiAlias=True,Color=highlight[k]); hp.setAlphaf(hl_alpha*hp.getAlphaf()); c.drawPath(path,hp)
        c.drawPath(path,st)
    c.restore()
    if dim>0: fill(c,0xFF000000,dim)
VIEWS={'satl':view(-55,-44,60),'isl':view(-59.4,-51.75,5.6),'atl':view(-30,0,262),'samer':view(-60,-38,48),'arg':view(-60,-45,56)}
