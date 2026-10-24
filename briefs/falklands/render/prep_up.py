import sys,os,time
sys.path.insert(0,os.path.dirname(__file__))
import upscale
from PIL import Image
C='/home/user/Claude-editor/briefs/characters/'; A='/home/user/Claude-editor/briefs/falklands/assets/'; O='prep/'
setsheet=Image.open(C+'set_modern_living_room_S1-S9.webp').convert('RGB')
fs=Image.open(C+'father_side_lipsync.webp').convert('RGB')
ds=Image.open(C+'daughter_side_lipsync.webp').convert('RGB')
fsheet=Image.open(C+'father_sheet_D1-D7.webp').convert('RGB')
anime=[('S1H',setsheet.crop((14,93,552,385))),('S2H',setsheet.crop((836,93,1196,385))),
 ('S7H',setsheet.crop((262,856,527,1063))),('S8H',setsheet.crop((768,856,1043,1063))),
 ('F_neutral',fs.crop((30,0,540,690))),('F_ah',fs.crop((523,0,1033,690))),('F_oh',fs.crop((30,698,540,1388))),('F_ee',fs.crop((523,698,1033,1388))),
 ('D_neutral',ds.crop((10,70,388,775))),('D_ah',ds.crop((333,70,711,775))),('D_oh',ds.crop((672,70,1024,775))),
 ('D_ee',ds.crop((139,812,517,1517))),('D_closed',ds.crop((512,812,890,1517))),
 ('F_front',fsheet.crop((40,40,262,520)))]
m=upscale.load('models/4x-AnimeSharp.pth')
for n,im in anime:
    if os.path.exists(O+n+'.png'): continue
    t=time.time(); upscale.up(m,im).save(O+n+'.png'); print(n,im.size,round(time.time()-t),flush=True)
m=upscale.load('models/RealESRGAN_x4.pth')
for n,f in [('F25','F25_puerto_argentino_notice.jpg'),('F23','F23_argentine_albatross_stanley.jpg'),('F23b','F23b_argentine_F27_stanley.webp'),('F24','F24_hms_endurance.jpg'),('F16','F16_argentine_cemetery_darwin.jpg'),('F20','F20_referendum_2013.webp'),('F18','F18_maradona_hand.avif')]:
    if os.path.exists(O+n+'.png'): continue
    try: im=Image.open(A+f).convert('RGB')
    except Exception as e: print('ERR',n,e); continue
    t=time.time(); upscale.up(m,im).save(O+n+'.png'); print(n,im.size,round(time.time()-t),flush=True)
print('ALL DONE')
