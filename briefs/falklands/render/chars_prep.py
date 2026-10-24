import numpy as np, cv2, sys
from PIL import Image, ImageFilter
from scipy import ndimage as nd
P='prep/'
def cutout(a):
    """a: RGB uint8 -> alpha via near-white flood from border"""
    g=a.astype(int); white=(g.min(2)>241)&((g.max(2)-g.min(2))<14)
    lab,n=nd.label(white)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))
    # also remove big enclosed white areas? keep (sneaker soles etc.)
    bg=nd.binary_opening(bg,iterations=2)
    alpha=(~bg).astype(np.float32)
    alpha=nd.binary_erosion(alpha>0.5,iterations=4).astype(np.float32)
    alpha=cv2.GaussianBlur(alpha,(0,0),1.6)
    # remove floating label text: keep largest component
    lab2,n2=nd.label(alpha>0.5)
    if n2>1:
        sizes=nd.sum(np.ones_like(alpha),lab2,range(1,n2+1)); keep=1+int(np.argmax(sizes))
        mask=nd.binary_dilation(lab2==keep,iterations=4)
        alpha*=mask
    return alpha
def align(base,img):
    b=cv2.cvtColor(base,cv2.COLOR_RGB2GRAY); i=cv2.cvtColor(img,cv2.COLOR_RGB2GRAY)
    H,W=b.shape; m=120
    tpl=b[int(H*0.05):int(H*0.32), m:W-m]   # head/shoulder band, exclude borders
    res=cv2.matchTemplate(i,tpl,cv2.TM_CCOEFF_NORMED)
    _,_,_,loc=cv2.minMaxLoc(res)
    return loc[0]-m, loc[1]-int(H*0.05)
def build(prefix, variants, out, mouth=None):
    base=np.asarray(Image.open(P+prefix+'_neutral.png').convert('RGB'))
    H,W=base.shape[:2]; alpha=cutout(base)
    res={'neutral':np.dstack([base,(alpha*255).astype(np.uint8)])}
    for v in variants:
        im=np.asarray(Image.open(P+f'{prefix}_{v}.png').convert('RGB'))
        pad=np.full((H,W,3),255,np.uint8); hh=min(H,im.shape[0]); ww=min(W,im.shape[1]); pad[:hh,:ww]=im[:hh,:ww]
        dx,dy=align(base,pad); M=np.float32([[1,0,-dx],[0,1,-dy]])
        al=cv2.warpAffine(pad,M,(W,H),flags=cv2.INTER_CUBIC,borderValue=(255,255,255))
        cx,cy,rx,ry=mouth
        m=np.zeros((H,W),np.float32); yy,xx=np.mgrid[:H,:W]; m[((xx-cx)/rx)**2+((yy-cy)/ry)**2<=1]=1
        m=cv2.GaussianBlur(m,(0,0),12)
        comp=(base*(1-m[...,None])+al*m[...,None]).astype(np.uint8)
        av=cutout(al); am=alpha*(1-m)+av*m
        res[v]=np.dstack([comp,(np.clip(am,0,1)*255).astype(np.uint8)])
        print(prefix,v,'shift',round(dx,1),round(dy,1),flush=True)
    for k,a in res.items(): Image.fromarray(a).save(f'{out}{prefix}_{k}_rgba.png')
if __name__=='__main__':
    build(sys.argv[1], sys.argv[2].split(','), P, tuple(map(float,sys.argv[3].split(','))))
