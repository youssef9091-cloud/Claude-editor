import numpy as np, sys, json
from PIL import Image
P=json.loads(sys.argv[1])
K=np.asarray(Image.open('assets/cast_v2/dad_2_kit_34left.png').convert('RGB')).astype(float)
F=np.asarray(Image.open('assets/cast_v2/dad_3_face_34left.png').convert('RGB')).astype(float)
PAGE=np.median(F[5:60,600:1500].reshape(-1,3),0)
X0,Y0,X1,Y1=205,90,385,250
base=K[Y0:Y1,X0:X1].copy(); Hh,Ww=base.shape[:2]; yy,xx=np.mgrid[0:Hh,0:Ww]
# lens interior: the skin+eye pixels inside the glasses frame (flood from the eye centre, stopping at the black frame)
from scipy import ndimage
frame=base.mean(-1)<60
bx=P['lensbox']; inbox=np.zeros_like(frame); inbox[bx[1]-Y0:bx[3]-Y0,bx[0]-X0:bx[2]-X0]=True
lab,n=ndimage.label((~frame)&inbox); lens=lab==lab[P['lens'][1]-Y0,P['lens'][0]-X0]
lens=ndimage.binary_erosion(lens,iterations=1)
skin=(~lens)&(base.mean(-1)>120)
fill=base.copy(); fill[lens]=np.median(base[(base.mean(-1)>120)&(np.abs(yy-(P['lens'][1]-Y0))<25)&(np.abs(xx-(P['lens'][0]-X0))<40)],0)
EYE={'l':(393,272,442,320),'c':(589,270,636,319),'r':(788,268,835,318),'half':(973,275,1027,320),'closed':(1162,278,1212,313),'squint':(1356,277,1408,315)}
MZ={'rest':(20,672,166,847),'smile':(169,672,317,847),'mbp':(319,672,464,847),'a':(467,672,618,847),'e':(624,672,772,847),'o':(775,672,919,847),'u':(919,672,1064,847),'fv':(1071,672,1219,847),'l':(1223,672,1373,847),'chuckle':(1378,672,1526,847)}
def piece(box,s,pad=6):
    x0,y0,x1,y1=box; p=F[y0-pad:y1+pad,x0-pad:x1+pad]
    w,h=max(2,int(p.shape[1]*s)),max(2,int(p.shape[0]*s))
    return np.asarray(Image.fromarray(p.astype(np.uint8)).resize((w,h),Image.LANCZOS)).astype(float)
def put(c,p,cx,cy,clip=None,feather=.3):
    h,w=p.shape[:2]; x,y=int(cx-X0-w/2),int(cy-Y0-h/2); reg=c[y:y+h,x:x+w]
    page=np.clip(1-np.abs(p-PAGE).sum(-1,keepdims=True)/70,0,1); p=p+(reg-PAGE)*page
    gy,gx=np.mgrid[0:h,0:w]; d=((gx-w/2)/(w/2))**2+((gy-h/2)/(h/2))**2; f=np.clip((1-d)/feather,0,1)[...,None]
    if clip is not None: f=f*clip[y:y+h,x:x+w][...,None]
    c[y:y+h,x:x+w]=reg*(1-f)+p*f
tiles=[fill.copy()]
for e,m in P['combos']:
    c=fill.copy()
    put(c,piece(EYE[e],P['es']),*P['eye'],clip=lens.astype(float),feather=.6)
    put(c,piece(MZ[m],P['ms']),*P['mz'],feather=.25)
    tiles.append(c)
W=np.concatenate([np.asarray(Image.fromarray(t.clip(0,255).astype(np.uint8)).resize((Ww*2,Hh*2),Image.LANCZOS)) for t in tiles],1)
Image.fromarray(W).save(sys.argv[2])
