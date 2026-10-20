import numpy as np, sys, json
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
S='/tmp/claude-0/-home-user-Claude-editor/84d00c9e-55c4-5cf4-9519-95577347c3fb/scratchpad/qa/'
P=json.loads(sys.argv[1])
def cut(f, box):
    a=np.asarray(Image.open(f).convert('RGB').crop(box)).astype(int)
    # colour-to-alpha against the white page, so soft fades (eyeshadow) blend instead of leaving a pale halo
    al=np.clip((255-a.min(-1))/(255-205),0,1)
    col=np.clip((a-(1-al[...,None])*255)/np.maximum(al[...,None],1e-3),0,255)
    # ...except the whites INSIDE the eye (sclera, catch-lights): enclosed by the dark outline -> keep opaque
    white=(a.min(-1)>200)
    lab,n=ndimage.label(white); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    enclosed=white&~np.isin(lab,list(edge))
    col[enclosed]=a[enclosed]; al[enclosed]=1
    im=Image.fromarray(np.dstack([col,al*255]).astype(np.uint8),'RGBA')
    raw=Image.fromarray(np.dstack([a,np.full(a.shape[:2],255)]).astype(np.uint8),'RGBA')
    im.raw=raw; im.encl=enclosed; return im
K=np.asarray(Image.open('assets/cast_v2/girl_2_kit_34right.png').convert('RGB')).astype(float)
X0,Y0,X1,Y1=200,150,380,340
base=K[Y0:Y1,X0:X1].copy()
mask=np.zeros(base.shape[:2],bool)
def ell(cx,cy,rx,ry):
    yy,xx=np.mgrid[0:mask.shape[0],0:mask.shape[1]]; return ((xx+X0-cx)/rx)**2+((yy+Y0-cy)/ry)**2<=1
for e in P['erase']: mask|=ell(*e)
dark=base.mean(-1)<130
lab,n=ndimage.label(dark)
out_area=ndimage.sum(dark&~mask,lab,range(1,n+1))
hairc=[i+1 for i in range(n) if out_area[i]>400]
hairm=np.isin(lab,hairc)
# a brow/lash touching the hair would be protected too: only protect the outer rim of the ellipses
inner=np.zeros_like(mask)
for e in P['erase']: inner|=ell(e[0],e[1],e[2]*.72,e[3]*.72)
pass
# only erase non-hair pixels inside the ellipses (keep hair strands that cross)
hair=(base.mean(-1)<95)&(base[...,0]-base[...,2]<60)&~ell(*P['erase'][0])&~ell(*P['erase'][1])&~ell(*P['erase'][2])
fill=base.copy(); known=~mask
# diffuse skin colour into the hole
for it in range(400):
    acc=np.zeros_like(fill); cnt=np.zeros(mask.shape)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
        sh=np.roll(np.roll(fill,dy,0),dx,1); kn=np.roll(np.roll(known&(fill.mean(-1)>150),dy,0),dx,1)
        acc+=sh*kn[...,None]; cnt+=kn
    upd=mask&(cnt>0)&~known
    fill[upd]=acc[upd]/cnt[upd][:,None]; known=known|upd
    if known.all(): break
# relax the hole (Laplace) against skin-only boundary so it reads as smooth flat skin
skin=(~mask)&(base.mean(-1)>150)
for it in range(1500):
    acc=np.zeros_like(fill); cnt=np.zeros(mask.shape)
    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
        ok=np.roll(np.roll(mask|skin,dy,0),dx,1); acc+=np.roll(np.roll(fill,dy,0),dx,1)*ok[...,None]; cnt+=ok
    fill[mask]=(acc[mask]/np.maximum(cnt[mask],1)[:,None])
# smooth the filled area so it reads as flat skin
sm=np.asarray(Image.fromarray(fill.astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))).astype(float)
pass
head=Image.fromarray(fill.astype(np.uint8)).convert('RGBA')
F='assets/cast_v2/girl_3_face_34right.png'
eyes={'near_open':(599,305,694,383),'far_open':(719,311,773,384),'near_r':(411,305,509,383),'far_r':(532,315,578,384),'near_half':(981,320,1076,388),'far_half':(1100,328,1148,390),'near_closed':(1171,329,1259,387),'far_closed':(1285,332,1335,385)}
mouths={'smile':(180,754,300,810),'neutral':(20,760,125,807),'A':(501,744,598,827),'E':(634,746,757,826),'O':(811,746,878,822),'U':(938,752,1014,813)}
def put(c,p,cx,cy,s,sx=1,mul=False):
    p=p.resize((max(1,int(p.width*s*sx)),int(p.height*s)),Image.LANCZOS); x,y=int(cx-X0-p.width/2),int(cy-Y0-p.height/2)
    if not mul: c.alpha_composite(p,(x,y)); return
    reg=np.asarray(c.crop((x,y,x+p.width,y+p.height))).astype(float); src=np.asarray(p.raw).astype(float)
    m=reg[...,:3]*src[...,:3]/255
    sa=src[...,3:4]/255; m=reg[...,:3]*(1-sa*0)+(m-reg[...,:3])*1  # multiply everywhere (white = no change)
    e=p.enc; out=np.where(e[...,None],src[...,:3],m)
    c.paste(Image.fromarray(np.dstack([out,reg[...,3]]).astype(np.uint8),'RGBA'),(x,y))
tiles=[]
blank=Image.new('RGBA',head.size,'white'); blank.alpha_composite(head); tiles.append(blank)
for en,mk in [('r','smile'),('open','A'),('r','E'),('half','O'),('closed','neutral')]:
    c=head.copy()
    for side,sx in [('near',1),('far',P['fsx'])]:
        q=cut(F,eyes[side+'_'+en]); W_,H_=int(q.width*P['es']*sx),int(q.height*P['es'])
        src=np.asarray(q.raw.resize((W_,H_),Image.LANCZOS)).astype(float)[...,:3]
        enc=np.asarray(Image.fromarray((q.encl*255).astype(np.uint8)).resize((W_,H_),Image.LANCZOS)).astype(float)[...,None]/255
        x,y=int(P[side][0]-X0-W_/2),int(P[side][1]-Y0-H_/2)
        reg=np.asarray(c.crop((x,y,x+W_,y+H_))).astype(float)
        # the kit is drawn over white: swap the white page for the face's own skin under it (soft fades keep their tint)
        m0=150; al=np.clip(1-(src.min(-1,keepdims=True)-m0)/(255-m0),0,1)
        onskin=src-(1-al)*(255-reg[...,:3])
        out=onskin*(1-enc)+src*enc
        # feathered oval so the patch edge disappears
        yy,xx=np.mgrid[0:H_,0:W_]; d=((xx-W_/2)/(W_/2))**2+((yy-H_/2)/(H_/2))**2
        f=np.clip((1-d)/.35,0,1)[...,None]
        out=reg[...,:3]*(1-f)+out*f
        c.paste(Image.fromarray(np.dstack([out,reg[...,3]]).clip(0,255).astype(np.uint8),'RGBA'),(x,y))
    put(c,cut(F,mouths[mk]),*P['mouth'],P['ms'])
    bg=Image.new('RGBA',c.size,'white'); bg.alpha_composite(c); tiles.append(bg)
W=Image.new('RGB',(tiles[0].width*len(tiles)*2,tiles[0].height*2),'white')
for i,t in enumerate(tiles): W.paste(t.convert('RGB').resize((t.width*2,t.height*2),Image.LANCZOS),(i*t.width*2,0))
W.save(S+'testface2.png')
