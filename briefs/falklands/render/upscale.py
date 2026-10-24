import sys,torch,numpy as np
from PIL import Image
from spandrel import ModelLoader
torch.set_num_threads(4)
def load(p):
    m=ModelLoader().load_from_file(p); m.eval(); return m
def up(model,img,tile=256,pad=16):
    a=np.asarray(img.convert('RGB')).astype(np.float32)/255.
    H,W,_=a.shape; s=model.scale; out=np.zeros((H*s,W*s,3),np.float32)
    t=torch.from_numpy(a).permute(2,0,1)[None]
    for y in range(0,H,tile):
        for x in range(0,W,tile):
            y0,x0=max(y-pad,0),max(x-pad,0); y1,x1=min(y+tile+pad,H),min(x+tile+pad,W)
            with torch.no_grad(): r=model.model(t[:,:,y0:y1,x0:x1]) if hasattr(model,'model') else model(t[:,:,y0:y1,x0:x1])
            r=r[0].permute(1,2,0).clamp(0,1).numpy()
            yy,xx=(y-y0)*s,(x-x0)*s; h,w=min(tile,H-y)*s,min(tile,W-x)*s
            out[y*s:y*s+h,x*s:x*s+w]=r[yy:yy+h,xx:xx+w]
    return Image.fromarray((out*255+0.5).astype(np.uint8))
if __name__=='__main__':
    m=load(sys.argv[1])
    for src,dst in zip(sys.argv[2::2],sys.argv[3::2]):
        up(m,Image.open(src)).save(dst); print('done',dst,flush=True)
