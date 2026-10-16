"""Cut the presenters out of the character sheet (assets/ref_character_sheet.png) and trace them to SVG.
Run: python3 -I engine/trace_characters.py   → build/chars/<piece>.svg (+ .png previews)"""
import numpy as np, vtracer
from PIL import Image, ImageFilter
from scipy import ndimage
SHEET = Image.open('assets/ref_character_sheet.png').convert('RGB')
K = 8   # upscale before tracing
# name: (crop box in sheet px, trace params)
FINE = dict(color_precision=8, layer_difference=8, filter_speckle=14)
SOFT = dict(color_precision=7, layer_difference=14, filter_speckle=20)
PIECES = {
    'd_front':   ((468, 140, 584, 340), SOFT),
    'd_critical': ((808, 131, 877, 200), SOFT),   # the sheet's "Critical" expression bust
    'f_front':   ((20, 148, 124, 345), FINE),     # arms crossed (listening)
    'f_34':      ((125, 148, 230, 345), FINE),    # relaxed, glasses (talking)
}
for name, (box, prm) in PIECES.items():
    a = np.asarray(SHEET.crop(box)).astype(int)
    corners = np.concatenate([a[:4, :4].reshape(-1, 3), a[:4, -4:].reshape(-1, 3), a[-4:, :4].reshape(-1, 3), a[-4:, -4:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    near = np.sqrt(((a - bg) ** 2).sum(-1)) < 30
    lab, n = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge))
    fg = ~bgmask
    lab2, n2 = ndimage.label(fg)
    if n2: sizes = ndimage.sum(fg, lab2, range(1, n2 + 1)); fg = lab2 == (1 + int(np.argmax(sizes)))
    holes = ndimage.binary_fill_holes(fg) & ~fg       # fill only pin-holes; keep the gaps between arms and body open
    hl, hn = ndimage.label(holes)
    for i in range(1, hn + 1):
        if (hl == i).sum() < 25: fg |= hl == i
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_erosion(fg, iterations=1)   # drop the anti-aliased background fringe
    rgba = np.dstack([a, (fg * 255)]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA'); W, H = im.size
    big = im.resize((W * K, H * K), Image.LANCZOS)
    rgb = big.convert('RGB').filter(ImageFilter.MedianFilter(5)); al = big.split()[3].filter(ImageFilter.GaussianBlur(3)).point(lambda v: 255 if v > 140 else 0)
    out = Image.merge('RGBA', (*rgb.split(), al)); out.save(f'build/chars/{name}.png')
    vtracer.convert_image_to_svg_py(f'build/chars/{name}.png', f'build/chars/{name}.svg', colormode='color', hierarchical='stacked', mode='spline',
        corner_threshold=60, length_threshold=4.0, splice_threshold=45, path_precision=3, **prm)
    print(name, box, f'{W}x{H} →', f'{W*K}x{H*K}')
