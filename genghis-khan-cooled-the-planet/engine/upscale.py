"""Real-ESRGAN (anime 6B, x4) upscale of the composite sheets, tiled on CPU.
python3 -I engine/upscale.py in.png out.png"""
import sys, torch, numpy as np, spandrel
from PIL import Image
torch.set_num_threads(4)
m = spandrel.ModelLoader().load_from_file('build/models/anime6B.pth').eval()
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape; T, P, S = 192, 16, 4
out = np.zeros((H * S, W * S, 3), np.float32)
with torch.no_grad():
    for y in range(0, H, T):
        for x in range(0, W, T):
            y0, x0, y1, x1 = max(0, y - P), max(0, x - P), min(H, y + T + P), min(W, x + T + P)
            t = torch.from_numpy(im[y0:y1, x0:x1]).permute(2, 0, 1)[None]
            r = m(t)[0].permute(1, 2, 0).clamp(0, 1).numpy()
            oy, ox = (y - y0) * S, (x - x0) * S; h, w = min(T, H - y) * S, min(T, W - x) * S
            out[y * S:y * S + h, x * S:x * S + w] = r[oy:oy + h, ox:ox + w]
        print(f'  row {y}/{H}', flush=True)
Image.fromarray((out * 255).round().astype(np.uint8)).save(sys.argv[2])
