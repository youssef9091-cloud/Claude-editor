import numpy as np, json, sys, subprocess
from scipy import signal
SR=48000
def tone(f,d,kind='saw',det=0.0):
    t=np.arange(int(d*SR))/SR; out=0
    for dd in (-det,0,det):
        ph=2*np.pi*f*(1+dd)*t
        if kind=='saw': out=out+signal.sawtooth(ph)
        elif kind=='tri': out=out+signal.sawtooth(ph,0.5)
        else: out=out+np.sin(ph)
    return out/3
def env(n,a,r):
    e=np.ones(n); A=int(a*SR); R=int(r*SR)
    if A: e[:A]=np.linspace(0,1,A)
    if R: e[-R:]=np.minimum(e[-R:],np.linspace(1,0,R))
    return e
def lp(x,fc,order=2):
    b,a=signal.butter(order,fc/(SR/2)); return signal.lfilter(b,a,x)
def hp(x,fc,order=2):
    b,a=signal.butter(order,fc/(SR/2),'high'); return signal.lfilter(b,a,x)
def reverb(x,t60=2.8,mix=0.35):
    n=int(t60*SR); rng=np.random.default_rng(1)
    ir=rng.standard_normal(n)*np.exp(-6.9*np.arange(n)/n); ir=lp(ir,6000)
    wet=signal.fftconvolve(x,ir)[:len(x)]; wet/=np.max(np.abs(wet))+1e-9
    return x*(1-mix)+wet*mix*np.max(np.abs(x))
N=lambda s:440*2**((s-69)/12)
def pad(chord,d,cut=1200,vol=0.18):
    n=int(d*SR); x=np.zeros(n)
    for m in chord: x+=tone(N(m),d,'saw',0.004)*(0.6 if m>60 else 1.0)
    x=lp(x,cut)*env(n,1.2,1.4)
    return x*vol
def pluck(m,d=0.6,vol=0.12,cut=2500):
    n=int(d*SR); t=np.arange(n)/SR
    x=(tone(N(m),d,'tri')+0.3*tone(N(m+12),d,'sin'))*np.exp(-t*6)
    return lp(x,cut)*vol
def kick(vol=0.35):
    d=0.35; t=np.arange(int(d*SR))/SR; f=55+60*np.exp(-t*30)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*9)*vol
def place(buf,x,t):
    i=int(t*SR); j=min(len(buf),i+len(x))
    if i<len(buf) and j>i: buf[i:j]+=x[:j-i]
def music(T):
    L=np.zeros(int(T*SR)+SR)
    prog_dm=[[50,57,62,65],[46,53,58,62],[41,53,57,60],[48,55,60,64]]   # Dm Bb F C
    prog_warm=[[41,53,57,60],[48,55,60,64],[50,57,62,65],[46,53,58,62]] # F C Dm Bb
    def chords(t0,t1,prog,cl=4.0,cut=1100,vol=0.17):
        t=t0;i=0
        while t<t1-0.5:
            d=min(cl+1.4,t1-t+1.0); place(L,pad(prog[i%4],d,cut,vol),t); t+=cl;i+=1
    # 0-49 intro / origin: soft pad + sparse plucks
    chords(0,49.4,prog_dm,cut=900)
    for k,t in enumerate(np.arange(15.8,49.4,1.0)):
        place(L,pluck([62,65,69,72][k%4],vol=0.05),t)
    # 49-94 road to war: pad + low heartbeat, plucks tighten
    chords(49.4,94.0,prog_dm,cut=800,vol=0.15)
    for t in np.arange(49.4,93.6,0.75): place(L,kick(0.22 if t<79 else 0.30),t)
    for k,t in enumerate(np.arange(61.0,79.2,0.375)): place(L,pluck([50,53,57,53][k%4],0.4,0.04,1500),t)
    # 94-102.7 war: single low drone
    n=int(9.5*SR); drone=(tone(N(38),9.5,'sin')+0.5*tone(N(45),9.5,'sin'))*env(n,0.6,2.5)*0.045
    place(L,lp(drone,400),93.8)
    # 102.7-117.8 aftermath warm
    chords(103.0,118.0,prog_warm,cut=1300,vol=0.15)
    for k,t in enumerate(np.arange(104.0,117.6,0.5)): place(L,pluck([65,69,72,76][k%4],0.5,0.045,3000),t)
    # 117.8-133.6 lift: brighter, driving
    chords(117.8,133.6,prog_warm,cl=2.0,cut=2200,vol=0.15)
    for t in np.arange(119.7,133.4,0.5): place(L,kick(0.24),t)
    for k,t in enumerate(np.arange(119.7,133.4,0.25)): place(L,pluck([69,72,76,81,76,72,69,74][k%8],0.3,0.045,4000),t)
    # 133.6-161 calm resolve
    chords(133.8,158.0,prog_dm,cl=4.0,cut=1000,vol=0.14)
    place(L,pad([50,57,62,66],5.0,1200,0.15),158.0)  # D major lift into end card
    L=reverb(hp(L,40),2.6,0.35)
    return L[:int(T*SR)]
def sfx(kind):
    rng=np.random.default_rng(abs(hash(kind))%2**32)
    if kind=='whoosh':
        d=0.55; n=int(d*SR); x=rng.standard_normal(n); out=np.zeros(n); 
        for i,f in enumerate(np.linspace(300,4000,8)):
            seg=slice(i*n//8,(i+1)*n//8)
        b,a=signal.butter(2,[400/(SR/2),5000/(SR/2)],'band'); out=signal.lfilter(b,a,x)
        e=np.sin(np.linspace(0,np.pi,n))**2; return out*e*0.25
    if kind=='pop':
        d=0.09; t=np.arange(int(d*SR))/SR; f=500+700*t/d
        return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*40)*0.22
    if kind=='slam':
        d=0.4; t=np.arange(int(d*SR))/SR; f=60+80*np.exp(-t*25)
        th=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*12)*0.5
        cl=lp(rng.standard_normal(len(t)),3000)*np.exp(-t*60)*0.25
        return th+cl
    if kind=='tick':
        d=0.05; t=np.arange(int(d*SR))/SR; return np.sin(2*np.pi*2200*t)*np.exp(-t*120)*0.18
    if kind=='scribble':
        d=0.6; n=int(d*SR); x=signal.lfilter(*signal.butter(2,[1500/(SR/2),6000/(SR/2)],'band'),rng.standard_normal(n))
        mod=0.5+0.5*np.sin(np.linspace(0,40,n)); return x*mod*np.sin(np.linspace(0,np.pi,n))*0.07
    if kind=='ding':
        d=1.0; t=np.arange(int(d*SR))/SR
        return (np.sin(2*np.pi*1318*t)+0.6*np.sin(2*np.pi*1975*t))*np.exp(-t*4)*0.10
    if kind=='sting':
        w=sfx('whoosh'); k=kick(0.4); out=np.zeros(int(1.0*SR)); out[:len(w)]+=w; o=int(0.3*SR); out[o:o+len(k)]+=k; return out
    raise ValueError(kind)
if __name__=='__main__':
    vo,events,T,out=sys.argv[1],sys.argv[2],float(sys.argv[3]),sys.argv[4]
    raw=subprocess.run(['ffmpeg','-v','error','-i',vo,'-ar',str(SR),'-ac','1','-f','f32le','-'],capture_output=True).stdout
    v=np.frombuffer(raw,np.float32).astype(np.float64); V=np.zeros(int(T*SR)); V[:len(v)]=v[:len(V)]
    M=music(T)
    # sidechain duck
    e=np.abs(V); e=signal.lfilter([1-0.999],[1,-0.999],e); e=e/ (e.max()+1e-9)
    duck=1-0.55*np.clip(e*3,0,1); M=M*duck
    X=np.zeros(int(T*SR))
    for t,k in json.load(open(events)): place(X,sfx(k),t)
    fade=np.ones(len(M)); fo=int(2.0*SR); fade[-fo:]=np.linspace(1,0,fo)
    mix=V*1.0+M*0.40*fade+X*0.7
    st=np.stack([mix,mix],1)
    st=st/ (np.max(np.abs(st))+1e-9)*0.95
    st.astype(np.float32).tofile(out+'.f32')
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i',out+'.f32','-af','loudnorm=I=-14:TP=-1.0:LRA=11','-ar','48000','-c:a','pcm_s16le',out],check=True)
    print('audio ok')
